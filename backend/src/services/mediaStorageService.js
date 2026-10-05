const crypto = require('crypto');
const { cloudinary, cloudName } = require('../config/cloudinary');
const { ALLOWED_MIME_TYPES, MEDIA_TYPES, MEDIA_STORAGE_FOLDER } = require('../constants/media');

// Confere a assinatura binária do arquivo, pois o MIME informado pelo navegador
// pode ser falsificado. Retorna true quando o conteúdo condiz com o tipo declarado.
function matchesDeclaredType(buffer, mimeType) {
  const startsWith = (bytes, offset = 0) =>
    buffer.length >= offset + bytes.length &&
    bytes.every((byte, index) => buffer[offset + index] === byte);
  const ascii = (text) => [...text].map((char) => char.charCodeAt(0));

  switch (mimeType) {
    case 'image/jpeg':
      return startsWith([0xff, 0xd8, 0xff]);
    case 'image/png':
      return startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case 'image/webp':
      return startsWith(ascii('RIFF')) && startsWith(ascii('WEBP'), 8);
    case 'video/mp4':
      return startsWith(ascii('ftyp'), 4);
    case 'video/webm':
      return startsWith([0x1a, 0x45, 0xdf, 0xa3]);
    default:
      return false;
  }
}

// Envia o arquivo ao Cloudinary e retorna a URL pública permanente.
// Imagens são redimensionadas (até 1920px) e convertidas para webp para deixar o feed leve;
// vídeos mantêm o formato declarado (mp4 ou webm).
function uploadMedia(buffer, mimeType) {
  const mediaType = ALLOWED_MIME_TYPES[mimeType];
  const isImage = mediaType === MEDIA_TYPES.IMAGE;
  const options = {
    folder: MEDIA_STORAGE_FOLDER,
    public_id: `media_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`,
    resource_type: mediaType,
    overwrite: false,
    format: isImage ? 'webp' : mimeType.split('/')[1],
    ...(isImage && {
      transformation: [{ width: 1920, height: 1920, crop: 'limit', quality: 'auto' }],
    }),
  };

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(options, (error, result) => (error ? reject(error) : resolve(result.secure_url)))
      .end(buffer);
  });
}

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Aceita somente URLs exatamente no formato gerado por uploadMedia nesta conta do Cloudinary.
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

module.exports = { matchesDeclaredType, uploadMedia, isManagedMediaUrl };
