import axiosClient from './axiosClient';

// Projetos do usuário logado (como autor ou colaborador), em qualquer situação da moderação.
export async function fetchMyProjects() {
  const { data } = await axiosClient.get('/projects/mine');
  return Array.isArray(data.projects) ? data.projects : [];
}

// Exclui um projeto. A API só permite ao dono.
export async function deleteProject(id) {
  await axiosClient.delete(`/projects/${id}`);
}
