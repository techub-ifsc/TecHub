import { useEffect, useRef, useState } from "react";

import { API_URL } from "../api/apiUrl";
import { getYoutubeVideoId } from "../utils/youtube";

export const MAX_MEDIA = 10;
export const MAX_MEDIA_FILE_SIZE = 20 * 1024 * 1024;

// Formatos aceitos pelo backend (POST /media/upload) e o tipo de mídia correspondente.
export const ALLOWED_MEDIA_TYPES = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "video/mp4": "video",
  "video/webm": "video",
};

function youtubeUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

// Envia os arquivos locais ao storage e devolve as URLs na mesma ordem.
async function uploadMediaFiles(fileItems, token) {
  const formData = new FormData();
  fileItems.forEach((item) => formData.append("files", item.file));

  const response = await fetch(`${API_URL}/media/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Não foi possível enviar as mídias.");
  }

  return data.media.map((uploaded) => uploaded.url);
}

// Estado da galeria de um projeto. Cada item é:
// - "file": arquivo escolhido agora ({ file, previewUrl }; ganha uploadedUrl depois do envio);
// - "youtube": link de vídeo do YouTube ({ url, videoId });
// - "stored": mídia já cadastrada no projeto ({ uploadedUrl }).
// onError(message) recebe a mensagem de erro do campo, ou "" para limpá-la.
export function useProjectMedia({ onError }) {
  const [media, setMedia] = useState([]);
  const [coverId, setCoverId] = useState(null);
  const nextId = useRef(0);
  const mediaRef = useRef(media);
  mediaRef.current = media;

  // A capa é a imagem escolhida pelo usuário ou, por padrão, a primeira imagem.
  const imageItems = media.filter((item) => item.mediaType === "image");
  const coverItemId = imageItems.some((item) => item.id === coverId)
    ? coverId
    : imageItems[0]?.id ?? null;

  // Libera as pré-visualizações criadas com URL.createObjectURL ao sair da página.
  useEffect(() => {
    return () => {
      mediaRef.current.forEach((item) => {
        if (item.kind === "file") URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, []);

  function createId() {
    nextId.current += 1;
    return nextId.current;
  }

  // Carrega as mídias que o projeto já possui (resposta do GET /projects/:id).
  function loadSavedMedia(savedMedia) {
    const items = savedMedia.map((saved) => {
      const videoId = saved.mediaType === "video" ? getYoutubeVideoId(saved.url) : null;
      return videoId
        ? { id: createId(), kind: "youtube", url: youtubeUrl(videoId), videoId, mediaType: "video" }
        : {
            id: createId(),
            kind: "stored",
            mediaType: saved.mediaType,
            uploadedUrl: saved.url,
            previewUrl: saved.mediaType === "image" ? saved.url : null,
          };
    });

    setMedia(items);
    setCoverId(items[savedMedia.findIndex((saved) => saved.isCover)]?.id ?? null);
  }

  function addFiles(fileList) {
    const acceptedItems = [];
    const rejectedMessages = [];

    for (const file of Array.from(fileList)) {
      const mediaType = ALLOWED_MEDIA_TYPES[file.type];

      if (!mediaType) {
        rejectedMessages.push(`${file.name}: formato não permitido.`);
        continue;
      }

      if (file.size > MAX_MEDIA_FILE_SIZE) {
        rejectedMessages.push(`${file.name}: tamanho superior a 20 MB.`);
        continue;
      }

      const isDuplicate = [...media, ...acceptedItems].some(
        (item) =>
          item.kind === "file" &&
          item.file.name === file.name &&
          item.file.size === file.size
      );

      if (isDuplicate) {
        rejectedMessages.push(`${file.name}: arquivo já adicionado.`);
        continue;
      }

      if (media.length + acceptedItems.length >= MAX_MEDIA) {
        rejectedMessages.push(`O limite é de ${MAX_MEDIA} mídias.`);
        break;
      }

      acceptedItems.push({
        id: createId(),
        kind: "file",
        file,
        mediaType,
        previewUrl: mediaType === "image" ? URL.createObjectURL(file) : null,
      });
    }

    if (acceptedItems.length > 0) {
      setMedia((curr) => [...curr, ...acceptedItems]);
    }

    onError(rejectedMessages.join(" "));
  }

  // Retorna true quando o link foi adicionado.
  function addYoutubeLink(link) {
    const videoId = getYoutubeVideoId(link.trim());
    let message = "";

    if (!videoId) {
      message = "Informe um link válido do YouTube.";
    } else if (media.some((item) => item.kind === "youtube" && item.videoId === videoId)) {
      message = "Esse vídeo do YouTube já foi adicionado.";
    } else if (media.length >= MAX_MEDIA) {
      message = `O limite é de ${MAX_MEDIA} mídias.`;
    }

    onError(message);
    if (message) return false;

    setMedia((curr) => [
      ...curr,
      { id: createId(), kind: "youtube", url: youtubeUrl(videoId), videoId, mediaType: "video" },
    ]);
    return true;
  }

  function removeMedia(id) {
    const item = media.find((current) => current.id === id);
    if (item?.kind === "file") URL.revokeObjectURL(item.previewUrl);
    setMedia((curr) => curr.filter((current) => current.id !== id));
  }

  const hasPendingUploads = media.some((item) => item.kind === "file" && !item.uploadedUrl);

  // Envia ao storage somente os arquivos que ainda não subiram e monta o campo
  // "media" do projeto. Reenviar após um erro não duplica arquivos.
  // Lança Error com a mensagem do backend se o upload falhar.
  async function buildMediaPayload(token) {
    const uploadedUrlById = new Map(
      media.filter((item) => item.uploadedUrl).map((item) => [item.id, item.uploadedUrl])
    );
    const pendingItems = media.filter((item) => item.kind === "file" && !item.uploadedUrl);

    if (pendingItems.length > 0) {
      const urls = await uploadMediaFiles(pendingItems, token);
      pendingItems.forEach((item, index) => uploadedUrlById.set(item.id, urls[index]));
      setMedia((curr) =>
        curr.map((item) =>
          uploadedUrlById.has(item.id)
            ? { ...item, uploadedUrl: uploadedUrlById.get(item.id) }
            : item
        )
      );
    }

    return media.map((item) => ({
      url: item.kind === "youtube" ? item.url : uploadedUrlById.get(item.id),
      mediaType: item.mediaType,
      isCover: item.id === coverItemId,
    }));
  }

  return {
    media,
    coverItemId,
    setCoverId,
    loadSavedMedia,
    addFiles,
    addYoutubeLink,
    removeMedia,
    hasPendingUploads,
    buildMediaPayload,
  };
}
