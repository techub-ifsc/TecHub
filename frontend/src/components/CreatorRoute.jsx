import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import Spinner from "./Spinner";

const ALLOWED_ROLES = ["creator", "super_admin"];

export default function CreatorRoute() {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Spinner size="lg" label="Verificando acesso..." />;
  }

  const hasPermission =
    isAuthenticated && ALLOWED_ROLES.includes(user?.role);

  if (!hasPermission) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  return <Outlet />;
}