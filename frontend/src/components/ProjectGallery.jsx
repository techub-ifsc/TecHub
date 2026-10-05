import { useState } from "react";

import { ALLOWED_MEDIA_TYPES, MAX_MEDIA } from "../hooks/useProjectMedia";

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function describeItem(item) {
  if (item.kind === "file") {
    return { name: item.file.name, detail: formatFileSize(item.file.size) };
  }
  if (item.kind === "youtube") {
    return { name: item.url, detail: "Vídeo do YouTube" };
  }
  return {
    name: item.mediaType === "image" ? "Imagem do projeto" : "Vídeo do projeto",
    detail: "Já enviada",
  };
}

// Campo "Galeria do projeto" usado no cadastro e na edição.
// gallery é o retorno de useProjectMedia; error é a mensagem do campo.
export default function ProjectGallery({ gallery, error, onInputChange }) {
  const { media, coverItemId, setCoverId, addFiles, addYoutubeLink, removeMedia } = gallery;
  const [youtubeInput, setYoutubeInput] = useState("");
  const [dragOver, setDragOver] = useState(false);

  function handleAddYoutube() {
    if (addYoutubeLink(youtubeInput)) setYoutubeInput("");
  }

  return (
    <div className="form-field">
      <span className="form-label">
        Galeria do projeto
        <span className="required" aria-hidden="true">
          *
        </span>
      </span>

      <label
        className={`upload-area ${dragOver ? "drag-over" : ""} ${error ? "is-invalid" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          addFiles(event.dataTransfer.files);
        }}
      >
        <input
          type="file"
          multiple
          accept={Object.keys(ALLOWED_MEDIA_TYPES).join(",")}
          className="upload-input"
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = "";
          }}
        />

        <i className="fa-solid fa-plus upload-icon" aria-hidden="true" />

        <div className="upload-text">
          <p className="upload-title">Adicionar fotos ou vídeos</p>
          <p className="upload-helper">
            JPG, PNG, WEBP, MP4 ou WEBM · até {MAX_MEDIA} mídias de no máximo 10 MB cada
          </p>
        </div>
      </label>

      <div className="youtube-link-field">
        <i className="fa-brands fa-youtube" aria-hidden="true" />
        <input
          type="url"
          className="project-input"
          placeholder="Ou cole um link do YouTube"
          aria-label="Link de vídeo do YouTube"
          value={youtubeInput}
          onChange={(event) => {
            setYoutubeInput(event.target.value);
            onInputChange?.();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleAddYoutube();
            }
          }}
        />
        <button
          type="button"
          className="youtube-link-add"
          onClick={handleAddYoutube}
          disabled={!youtubeInput.trim()}
        >
          Adicionar
        </button>
      </div>

      {error && (
        <span className="field-error" role="alert">
          {error}
        </span>
      )}

      {media.length > 0 && (
        <ul className="upload-file-list">
          {media.map((item) => {
            const isImage = item.mediaType === "image";
            const isCover = item.id === coverItemId;
            const { name, detail } = describeItem(item);

            return (
              <li key={item.id} className={`upload-file ${isCover ? "is-cover" : ""}`}>
                {item.previewUrl ? (
                  <img className="upload-file-thumb" src={item.previewUrl} alt="" />
                ) : (
                  <span className="upload-file-thumb" aria-hidden="true">
                    <i
                      className={
                        item.kind === "youtube" ? "fa-brands fa-youtube" : "fa-solid fa-film"
                      }
                    />
                  </span>
                )}

                <span className="upload-file-information">
                  <strong>{name}</strong>
                  <small>{detail}</small>
                </span>

                {isImage && (
                  <label className="upload-file-cover">
                    <input
                      type="radio"
                      name="project-cover"
                      checked={isCover}
                      onChange={() => setCoverId(item.id)}
                    />
                    Capa
                  </label>
                )}

                <button
                  type="button"
                  className="upload-file-remove"
                  onClick={() => removeMedia(item.id)}
                  aria-label={`Remover ${name}`}
                  title={`Remover ${name}`}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
