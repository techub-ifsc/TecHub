import { Navigate, Outlet, useLocation, useParams } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import Spinner from "./Spinner";

export default function CreatorProfileRoute() {
  const { user, isAuthenticated, loading } = useAuth();
  const { id } = useParams();
  const location = useLocation();

  if (loading) {
    return <Spinner size="lg" label="Verificando acesso..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const isProfileOwner =
    user?.role === "creator" && String(user?.id) === String(id);

  if (!isProfileOwner) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}