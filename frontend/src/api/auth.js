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

// Solicita um link sem revelar se o e-mail possui uma conta.
export async function requestPasswordReset(email) {
  const { data } = await axiosClient.post('/auth/forgot-password', { email });
  return data;
}

// Consome o token de uso único e define a nova senha; não inicia sessão.
export async function resetPassword({ token, password, confirmPassword }) {
  const { data } = await axiosClient.post('/auth/reset-password', {
    token,
    password,
    confirmPassword,
  });
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
