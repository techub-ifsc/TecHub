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

    const token = localStorage.getItem("token");

    if (!token) {
      setLoading(false);
      return;
    }

    fetchCurrentUser()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (credentials) => {
    const { user: loggedUser, token } = await loginUser(credentials);
    localStorage.setItem("token", token);
    setUser(loggedUser);
    return loggedUser;
  }, []);

  const register = useCallback(async (payload) => {
    const { user: newUser, token } = await registerUser(payload);

    if (token) {
      localStorage.setItem("token", token);
    }

    setUser(newUser);
    return newUser;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (payload) => {
    const updatedUser = await updateProfileApi(payload);
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
