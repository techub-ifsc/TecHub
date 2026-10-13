import axiosClient from './axiosClient';

// Lista os projetos da moderação com o prazo de análise e os totais por situação.
// "pending" usa a fila dedicada; "all" traz todas as situações.
export async function fetchModerationProjects(status = 'pending') {
  if (status === 'pending') {
    const { data } = await axiosClient.get('/admin/projects/pending');
    return data;
  }

  const { data } = await axiosClient.get('/admin/projects', {
    params: status === 'all' ? {} : { status },
  });
  return data;
}

// Aprova o projeto; o comentário para o criador é opcional.
export async function approveProject(id, reviewNotes) {
  const { data } = await axiosClient.patch(`/admin/projects/${id}/approve`, {
    reviewNotes: reviewNotes || null,
  });
  return data;
}

// Rejeita o projeto com a justificativa que será exibida ao criador.
export async function rejectProject(id, reviewNotes) {
  const { data } = await axiosClient.patch(`/admin/projects/${id}/reject`, { reviewNotes });
  return data;
}
