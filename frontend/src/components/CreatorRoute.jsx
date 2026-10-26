import { Link, Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import Spinner from "./Spinner";
import "./AdminRoute.css";

const ALLOWED_ROLES = ["creator", "super_admin"];

export default function CreatorRoute() {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Spinner size="lg" label="Verificando acesso..." />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  // Visitante logado vê o aviso, em vez de cair na tela de login como se tivesse saído.
  if (!ALLOWED_ROLES.includes(user?.role)) {
    return (
      <section className="admin-blocked" role="alert">
        <span className="admin-blocked__icon" aria-hidden="true">
          <i className="fa-solid fa-lock" />
        </span>

        <h1>Área de criadores</h1>

        <p>
          Publicar e editar projetos é só para contas de criador. Com a conta de
          visitante você pode explorar os projetos e conversar com os criadores.
        </p>

        <Link to="/criadores" className="admin-blocked__back">
          Conhecer criadores
        </Link>
      </section>
    );
  }

  return <Outlet />;
}