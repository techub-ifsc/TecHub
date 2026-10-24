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

// Consome o token recebido no e-mail; confirmar a conta não inicia uma sessão.
export async function verifyEmail(token) {
  const { data } = await axiosClient.post('/auth/verify-email', { token });
  return data;
}

// Resposta genérica: não informa se o endereço pertence a uma conta.
export async function resendVerification(email) {
  const { data } = await axiosClient.post('/auth/resend-verification', { email });
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

// Envia as alterações da conta (sempre com a senha atual). Retorna o usuário, a mensagem
// e, se a senha mudou, o token novo.
export async function updateProfile(payload) {
  const { data } = await axiosClient.patch('/auth/me', payload, { keepSessionOn401: true });
  return data;
}
