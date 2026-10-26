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

  // Quem não é o dono vê o perfil público, em vez de ir para o início sem explicação.
  if (!isProfileOwner) {
    return <Navigate to={`/criadores/${id}`} replace />;
  }

  return <Outlet />;
}