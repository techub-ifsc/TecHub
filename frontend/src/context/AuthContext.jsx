import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { loginUser, registerUser, fetchCurrentUser, updateProfile as updateProfileApi } from '../api/auth';

const AuthContext = createContext(null);

// Centraliza a sessão, restaura o login e expõe as ações de autenticação.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('techub_token');
    if (!token) {
      setLoading(false);
      return;
    }

    localStorage.setItem('token', token);
    fetchCurrentUser()
      .then((currentUser) => {
        localStorage.setItem('techub_token', token);
        localStorage.setItem('techub_user', JSON.stringify(currentUser));
        setUser(currentUser);
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('techub_token');
        localStorage.removeItem('techub_user');
        localStorage.removeItem('user');
      })
      .finally(() => setLoading(false));
  }, []);

  // Autentica, armazena o token e atualiza o usuário da sessão.
  const login = useCallback(async (credentials) => {
    const { user: loggedUser, token } = await loginUser(credentials);
    localStorage.setItem('token', token);
    localStorage.setItem('techub_token', token);
    localStorage.setItem('techub_user', JSON.stringify(loggedUser));
    setUser(loggedUser);
    return loggedUser;
  }, []);

  // Cria a conta, armazena o token recebido e inicia a sessão.
  const register = useCallback(async (payload) => {
    const { user: newUser, token } = await registerUser(payload);
    localStorage.setItem('token', token);
    setUser(newUser);
    return newUser;
  }, []);

  // Remove os dados locais de autenticação e encerra a sessão atual.
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('techub_token');
    localStorage.removeItem('techub_user');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  // Persiste as alterações e sincroniza o usuário disponível no contexto.
  const updateProfile = useCallback(async (payload) => {
    const updatedUser = await updateProfileApi(payload);
    localStorage.setItem('techub_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
    return updatedUser;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateProfile,
        isAuthenticated: !!user,
        isSeller: user?.role === 'seller',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Fornece acesso seguro ao contexto de autenticação nos componentes filhos.
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
