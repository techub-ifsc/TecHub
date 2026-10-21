const { Readable } = require('stream');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');
const { profileSchema } = require('../validators/userProfileValidators');
const { ApiError } = require('../middlewares/errorHandler');

const MAX_RESUME_BYTES = 5 * 1024 * 1024;
function pdfLooksValid(file) {
  return !!file && file.mimetype === 'application/pdf' &&
    file.size > 0 && file.size <= MAX_RESUME_BYTES &&
    file.buffer.subarray(0, 5).toString() === '%PDF-';
}
function uploadResume(file, userId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      resource_type: 'raw',
      folder: 'techub/resumes',
      public_id: `resume_${userId}_${Date.now()}.pdf`,
      overwrite: false,
    }, (error, result) => error ? reject(error) : resolve(result));
    Readable.from(file.buffer).pipe(stream);
  });
}
function deleteResume(publicId) {
  return cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
}
async function getMe(req, res) {
  res.json({ user: req.user.toSafeJSON() });
}
async function updateMe(req, res, next) {
  let newlyUploadedId = null;
  try {
    const values = profileSchema.parse(req.body);
    if (req.file && !pdfLooksValid(req.file)) throw new ApiError(400, 'O currículo deve ser PDF válido de até 5 MB.');
    if (req.file && values.remove_resume === 'true') throw new ApiError(400, 'Envie um currículo ou escolha remover, não ambos.');
    if (req.file && !isCloudinaryConfigured()) throw new ApiError(503, 'Armazenamento de currículos indisponível.');
    const user = req.user;
    const oldResumeId = user.resume_public_id;
    let uploaded = null;
    if (req.file) {
      uploaded = await uploadResume(req.file, user.id);
      if (!uploaded?.secure_url?.startsWith('https://') || !uploaded.public_id) {
        throw new ApiError(502, 'O storage não retornou uma URL segura.');
      }
      newlyUploadedId = uploaded.public_id;
    }
    user.name = values.name;
    user.github_url = values.github_url;
    user.linkedin_url = values.linkedin_url;
    user.bio = values.bio;
    user.major = values.major;
    if (uploaded) {
      user.resume_url = uploaded.secure_url;
      user.resume_public_id = uploaded.public_id;
    } else if (values.remove_resume === 'true') {
      user.resume_url = null;
      user.resume_public_id = null;
    }
    await user.save();
    newlyUploadedId = null;
    res.json({ user: user.toSafeJSON() });
    if (oldResumeId && oldResumeId !== user.resume_public_id) {
      deleteResume(oldResumeId).catch(err => console.error('Não foi possível limpar currículo anterior:', err));
    }
  } catch (error) {
    if (newlyUploadedId) {
      try { await deleteResume(newlyUploadedId); }
      catch (cleanupError) { console.error('Falha na limpeza do upload:', cleanupError); }
    }
    next(error);
  }
}
module.exports = { getMe, updateMe, pdfLooksValid, MAX_RESUME_BYTES };
