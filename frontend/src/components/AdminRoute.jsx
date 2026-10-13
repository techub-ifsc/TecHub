import { Link, Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import Spinner from "./Spinner";
import "./AdminRoute.css";

export default function AdminRoute() {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Spinner size="lg" label="Verificando acesso..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Usuário logado sem perfil de administrador vê o bloqueio, e não o painel.
  if (!isAdmin) {
    return (
      <section className="admin-blocked" role="alert">
        <span className="admin-blocked__icon" aria-hidden="true">
          <i className="fa-solid fa-lock" />
        </span>

        <h1>Acesso restrito</h1>

        <p>Esta área é exclusiva para administradores do TecHub.</p>

        <Link to="/" className="admin-blocked__back">
          Voltar para o início
        </Link>
      </section>
    );
  }

  return <Outlet />;
}
