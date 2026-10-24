import { createContext, useCallback, useContext, useEffect, useState } from "react";

import {
  fetchCurrentUser,
  loginUser,
  registerUser,
  updateProfile as updateProfileApi,
} from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const mockRole = import.meta.env.DEV
      ? import.meta.env.VITE_MOCK_AUTH
      : null;

    if (["visitor", "creator", "super_admin"].includes(mockRole)) {
      setUser({
        id: "local-development-user",
        name:
          mockRole === "super_admin"
            ? "Administrador Local"
            : "Usuário Local",
        email: "usuario@localhost",
        role: mockRole,
      });

      setLoading(false);
      return;
    }

    const token =
      localStorage.getItem("token") || localStorage.getItem("techub_token");

    if (!token) {
      setLoading(false);
      return;
    }

    localStorage.setItem("token", token);
    fetchCurrentUser()
      .then((currentUser) => {
        localStorage.setItem("techub_token", token);
        localStorage.setItem("techub_user", JSON.stringify(currentUser));
        setUser(currentUser);
      })
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("techub_token");
        localStorage.removeItem("techub_user");
        localStorage.removeItem("user");
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (credentials) => {
    const { user: loggedUser, token } = await loginUser(credentials);
    localStorage.setItem("token", token);
    localStorage.setItem("techub_token", token);
    localStorage.setItem("techub_user", JSON.stringify(loggedUser));
    setUser(loggedUser);
    return loggedUser;
  }, []);

  const register = useCallback(async (payload) => {
    const { user: newUser, token } = await registerUser(payload);

    if (token) {
      localStorage.setItem("token", token);
      localStorage.setItem("techub_token", token);
      localStorage.setItem("techub_user", JSON.stringify(newUser));
    }

    setUser(newUser);
    return newUser;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("techub_token");
    localStorage.removeItem("techub_user");
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  // Retorna o usuário e a mensagem da API (a troca de e-mail avisa que falta confirmar).
  const updateProfile = useCallback(async (payload) => {
    const { user: updatedUser, token, message } = await updateProfileApi(payload);
    // Trocar a senha invalida o token anterior; guarda o novo para a sessão continuar.
    if (token) {
      localStorage.setItem("token", token);
      localStorage.setItem("techub_token", token);
    }
    localStorage.setItem("techub_user", JSON.stringify(updatedUser));
    setUser(updatedUser);
    return { user: updatedUser, message };
  }, []);

  // Relê a conta na API, por exemplo depois de confirmar um e-mail novo.
  const refreshUser = useCallback(async () => {
    const currentUser = await fetchCurrentUser();
    localStorage.setItem("techub_user", JSON.stringify(currentUser));
    setUser(currentUser);
    return currentUser;
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
        refreshUser,
        isAuthenticated: Boolean(user),
        isCreator: user?.role === "creator",
        isAdmin: user?.role === "super_admin",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }

  return context;
}