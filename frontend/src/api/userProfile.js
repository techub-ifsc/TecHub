import axiosClient from './axiosClient';

export async function fetchEditableProfile() {
  const { data } = await axiosClient.get('/users/me');
  return data.user;
}
export async function saveEditableProfile(values, resumeFile, removeResume, onProgress) {
  const body = new FormData();
  for (const [key, value] of Object.entries(values)) body.append(key, value == null ? '' : String(value));
  body.append('remove_resume', String(Boolean(removeResume)));
  if (resumeFile) body.append('resume', resumeFile);
  const { data } = await axiosClient.put('/users/me', body, {
    onUploadProgress: event => {
      if (event.total && onProgress) onProgress(Math.min(100, Math.round(event.loaded * 100 / event.total)));
    },
  });
  return data.user;
}
