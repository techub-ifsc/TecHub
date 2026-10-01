import axiosClient from './axiosClient';

// Envia os dados de cadastro e retorna o usuário e o token criados pela API.
export async function registerUser({ name, email, password, accountType }) {
  const { data } = await axiosClient.post('/auth/register', { name, email, password, accountType });
  return data;
}

// Autentica as credenciais informadas e retorna os dados da sessão.
export async function loginUser({ email, password }) {
  const { data } = await axiosClient.post('/auth/login', { email, password });
  return data;
}

// Consulta os dados atuais do usuário associado ao token armazenado.
export async function fetchCurrentUser() {
  const { data } = await axiosClient.get('/auth/me');
  return data.user;
}

// Envia as alterações do perfil e retorna o usuário atualizado.
export async function updateProfile(payload) {
  const { data } = await axiosClient.patch('/auth/me', payload);
  return data.user;
}
