const crypto = require('crypto');
const { Readable } = require('stream');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');
const { profileSchema } = require('../validators/userProfileValidators');
const { ApiError } = require('../middlewares/errorHandler');
const { User } = require('../models');
const { ROLES } = require('../constants/roles');

const MAX_RESUME_BYTES = 5 * 1024 * 1024;
const MAX_AVATAR_BYTES = 3 * 1024 * 1024;
const MAX_BANNER_BYTES = 5 * 1024 * 1024;
// Maior limite entre os arquivos; o multer barra antes de ler o resto.
const MAX_PROFILE_FILE_BYTES = Math.max(MAX_RESUME_BYTES, MAX_AVATAR_BYTES, MAX_BANNER_BYTES);

function pdfLooksValid(file) {
  return !!file && file.mimetype === 'application/pdf' &&
    file.size > 0 && file.size <= MAX_RESUME_BYTES &&
    file.buffer.subarray(0, 5).toString() === '%PDF-';
}

// Descobre o formato pelo conteúdo do arquivo, e não pelo tipo informado pelo navegador.
function detectImageType(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
  return null;
}

function imageLooksValid(file, maxBytes) {
  return !!file && file.size > 0 && file.size <= maxBytes &&
    detectImageType(file.buffer) === file.mimetype;
}

// Cada arquivo do perfil: como validar, onde guardar no Cloudinary e em quais colunas.
const PROFILE_FILES = {
  resume: {
    urlField: 'resume_url',
    idField: 'resume_public_id',
    removeFlag: 'remove_resume',
    resourceType: 'raw',
    isValid: pdfLooksValid,
    invalidMessage: 'O currículo deve ser PDF válido de até 5 MB.',
    uploadOptions: (userId) => ({
      folder: 'techub/resumes',
      public_id: `resume_${userId}_${Date.now()}.pdf`,
    }),
  },
  avatar: {
    urlField: 'avatar_url',
    idField: 'avatar_public_id',
    removeFlag: 'remove_avatar',
    resourceType: 'image',
    isValid: (file) => imageLooksValid(file, MAX_AVATAR_BYTES),
    invalidMessage: 'A foto de perfil deve ser JPG, PNG ou WEBP de até 3 MB.',
    // Quadrada, até 500x500, centrada no rosto quando houver, convertida para webp.
    uploadOptions: (userId) => ({
      folder: `techub/users/${userId}`,
      public_id: `avatar_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      format: 'webp',
      transformation: 'c_fill,g_face,h_500,w_500,q_auto',
    }),
  },
  banner: {
    urlField: 'banner_url',
    idField: 'banner_public_id',
    removeFlag: 'remove_banner',
    resourceType: 'image',
    isValid: (file) => imageLooksValid(file, MAX_BANNER_BYTES),
    invalidMessage: 'A foto de capa deve ser JPG, PNG ou WEBP de até 5 MB.',
    // Reduzida para no máximo 1600x900 e comprimida, para a página do criador abrir rápido.
    uploadOptions: (userId) => ({
      folder: `techub/users/${userId}`,
      public_id: `banner_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      format: 'webp',
      transformation: 'c_limit,h_900,w_1600,q_auto',
    }),
  },
};

function uploadProfileFile(kind, file, userId) {
  const config = PROFILE_FILES[kind];
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      resource_type: config.resourceType,
      overwrite: false,
      ...config.uploadOptions(userId),
    }, (error, result) => error ? reject(error) : resolve(result));
    Readable.from(file.buffer).pipe(stream);
  });
}

function deleteProfileFile(kind, publicId) {
  return cloudinary.uploader.destroy(publicId, { resource_type: PROFILE_FILES[kind].resourceType });
}

// Perfil público de um criador. Visitantes e administradores não têm perfil público.
async function getPublicProfile(req, res, next) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user || user.role !== ROLES.CREATOR) throw new ApiError(404, 'Perfil não encontrado.');
    res.json({ profile: user.toPublicProfileJSON() });
  } catch (error) {
    next(error);
  }
}
async function getMe(req, res) {
  res.json({ user: req.user.toSafeJSON() });
}
async function updateMe(req, res, next) {
  // Arquivos já enviados nesta requisição: são apagados se algo falhar depois.
  const newlyUploaded = [];
  try {
    const values = profileSchema.parse(req.body);
    const files = Object.fromEntries(
      Object.keys(PROFILE_FILES).map((kind) => [kind, req.files?.[kind]?.[0] || null])
    );

    for (const [kind, file] of Object.entries(files)) {
      if (!file) continue;
      const config = PROFILE_FILES[kind];
      if (!config.isValid(file)) throw new ApiError(400, config.invalidMessage);
      if (values[config.removeFlag] === 'true') {
        throw new ApiError(400, 'Envie um arquivo novo ou escolha remover, não ambos.');
      }
    }
    if (Object.values(files).some(Boolean) && !isCloudinaryConfigured()) {
      throw new ApiError(503, 'Armazenamento de arquivos indisponível.');
    }

    const user = req.user;
    const previousIds = Object.fromEntries(
      Object.entries(PROFILE_FILES).map(([kind, config]) => [kind, user[config.idField]])
    );

    const uploaded = {};
    for (const [kind, file] of Object.entries(files)) {
      if (!file) continue;
      const result = await uploadProfileFile(kind, file, user.id);
      if (result?.public_id) newlyUploaded.push({ kind, publicId: result.public_id });
      if (!result?.secure_url?.startsWith('https://') || !result.public_id) {
        throw new ApiError(502, 'O storage não retornou uma URL segura.');
      }
      uploaded[kind] = result;
    }

    user.name = values.name;
    user.github_url = values.github_url;
    user.linkedin_url = values.linkedin_url;
    user.bio = values.bio;
    user.major = values.major;
    user.expected_graduation = values.expected_graduation;
    for (const [kind, config] of Object.entries(PROFILE_FILES)) {
      if (uploaded[kind]) {
        user[config.urlField] = uploaded[kind].secure_url;
        user[config.idField] = uploaded[kind].public_id;
      } else if (values[config.removeFlag] === 'true') {
        user[config.urlField] = null;
        user[config.idField] = null;
      }
    }
    await user.save();
    newlyUploaded.length = 0;
    res.json({ user: user.toSafeJSON() });

    // O arquivo anterior só é apagado depois que o novo já está salvo no banco.
    for (const [kind, config] of Object.entries(PROFILE_FILES)) {
      const previousId = previousIds[kind];
      if (previousId && previousId !== user[config.idField]) {
        deleteProfileFile(kind, previousId)
          .catch((err) => console.error(`Não foi possível apagar o arquivo anterior (${kind}):`, err));
      }
    }
  } catch (error) {
    for (const { kind, publicId } of newlyUploaded) {
      try { await deleteProfileFile(kind, publicId); }
      catch (cleanupError) { console.error('Falha na limpeza do upload:', cleanupError); }
    }
    next(error);
  }
}
module.exports = {
  getMe,
  getPublicProfile,
  updateMe,
  pdfLooksValid,
  detectImageType,
  imageLooksValid,
  MAX_RESUME_BYTES,
  MAX_AVATAR_BYTES,
  MAX_BANNER_BYTES,
  MAX_PROFILE_FILE_BYTES,
};
