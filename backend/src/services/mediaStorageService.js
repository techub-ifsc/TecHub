const crypto = require('crypto');
const { cloudinary, cloudName } = require('../config/cloudinary');
const { ALLOWED_MIME_TYPES, MEDIA_TYPES, MEDIA_STORAGE_FOLDER } = require('../constants/media');

// Imagens são sempre reprocessadas pelo Cloudinary: redimensionadas (até 1920px) e
// convertidas para webp. Arquivos que não são imagens válidas são recusados por ele.
// Obs.: allowed_formats não é usado em imagens porque desativa a conversão de formato.
const IMAGE_UPLOAD_PARAMS = {
  format: 'webp',
  transformation: 'c_limit,h_1920,q_auto,w_1920',
};

// Vídeos são guardados como enviados; somente mp4 e webm são aceitos.
const VIDEO_UPLOAD_PARAMS = {
  allowed_formats: 'mp4,webm',
};

// Gera os parâmetros assinados para o navegador enviar UM arquivo direto ao Cloudinary.
// A pasta, o nome, a conversão e os formatos ficam travados na assinatura: qualquer
// alteração faz o Cloudinary recusar o envio. O API Secret nunca sai do servidor.
function createUploadSignature(mimeType) {
  const mediaType = ALLOWED_MIME_TYPES[mimeType];
  const params = {
    timestamp: Math.round(Date.now() / 1000),
    folder: MEDIA_STORAGE_FOLDER,
    public_id: `media_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`,
    overwrite: false, // reutilizar a assinatura não substitui o arquivo já enviado
    ...(mediaType === MEDIA_TYPES.IMAGE ? IMAGE_UPLOAD_PARAMS : VIDEO_UPLOAD_PARAMS),
  };
  const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET);

  return {
    mediaType,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/${mediaType}/upload`,
    fields: { ...params, api_key: process.env.CLOUDINARY_API_KEY, signature },
  };
}

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Aceita somente URLs exatamente no formato gerado pelas assinaturas desta conta do Cloudinary.
// Isso impede links de terceiros e URLs com transformações embutidas (que consomem créditos).
function isManagedMediaUrl(value, mediaType) {
  if (!cloudName) return false;
  const extensions = mediaType === MEDIA_TYPES.IMAGE ? 'webp' : 'mp4|webm';
  const pattern = new RegExp(
    `^/${escapeRegExp(cloudName)}/${mediaType}/upload/v\\d+/${escapeRegExp(MEDIA_STORAGE_FOLDER)}` +
      `/media_\\d+_[0-9a-f]{16}\\.(?:${extensions})$`
  );
  try {
    const url = new URL(value);
    return (
      url.href === value && // rejeita formas não normalizadas, como caminhos com "../"
      url.protocol === 'https:' &&
      url.hostname === 'res.cloudinary.com' &&
      !url.search &&
      !url.hash &&
      pattern.test(url.pathname)
    );
  } catch {
    return false;
  }
}

module.exports = { createUploadSignature, isManagedMediaUrl };
