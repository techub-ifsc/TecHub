import axiosClient from './axiosClient';

// Perfil público de um criador (sem login e sem e-mail). Retorna null se não existir.
export async function fetchPublicProfile(id) {
  try {
    const { data } = await axiosClient.get(`/users/${id}`);
    return data.profile;
  } catch (error) {
    if (error.response?.status === 404) return null;
    throw error;
  }
}

export async function fetchEditableProfile() {
  const { data } = await axiosClient.get('/users/me');
  return data.user;
}
// images: { avatar, banner } com os arquivos novos (ou null) e
// removeImages: { avatar, banner } indicando o que deve ser apagado.
export async function saveEditableProfile(values, resumeFile, removeResume, onProgress, images = {}, removeImages = {}) {
  const body = new FormData();
  for (const [key, value] of Object.entries(values)) body.append(key, value == null ? '' : String(value));
  body.append('remove_resume', String(Boolean(removeResume)));
  body.append('remove_avatar', String(Boolean(removeImages.avatar)));
  body.append('remove_banner', String(Boolean(removeImages.banner)));
  if (resumeFile) body.append('resume', resumeFile);
  if (images.avatar) body.append('avatar', images.avatar);
  if (images.banner) body.append('banner', images.banner);
  const { data } = await axiosClient.put('/users/me', body, {
    onUploadProgress: event => {
      if (event.total && onProgress) onProgress(Math.min(100, Math.round(event.loaded * 100 / event.total)));
    },
  });
  return data.user;
}
