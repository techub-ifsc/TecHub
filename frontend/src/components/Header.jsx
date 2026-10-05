import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";

import "./Header.css";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  function closeMenu() {
    setMenuOpen(false);
  }

  function handleProfileClick(event) {
    event.preventDefault();
    closeMenu();

    const token =
      localStorage.getItem("techub_token") ||
      localStorage.getItem("token");

    const rawUser = localStorage.getItem("techub_user");
    let user = null;
    try {
      user = rawUser ? JSON.parse(rawUser) : null;
    } catch {
      user = null;
    }

    if (!token || !user?.id) {
      alert("Entre na sua conta primeiro.");
      navigate("/login");
      return;
    }

    navigate(`/criadores/${user.id}`);
  }

  return (
    <header className="site-header">
      <div className="site-header__content">
        <Link to="/" className="site-header__brand" onClick={closeMenu}>
          <span className="site-header__symbol" aria-hidden="true">
            &lt;/&gt;
          </span>

          <span className="logo-title-navbar">TecHub</span>
        </Link>

        <button
          type="button"
          className="site-header__menu-button"
          onClick={() => setMenuOpen((currentValue) => !currentValue)}
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menuOpen}
          aria-controls="site-header-menu"
        >
          <i
            className={`fa-solid ${menuOpen ? "fa-xmark" : "fa-bars"}`}
            aria-hidden="true"
          />
        </button>

        <div
          id="site-header-menu"
          className={`site-header__menu${menuOpen ? " is-open" : ""}`}
        >
          <nav
            className="site-header__navigation"
            aria-label="Navegação principal"
          >
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `site-header__nav-item${isActive ? " is-active" : ""}`
              }
              onClick={closeMenu}
            >
              Início
            </NavLink>
            <NavLink
              to="/projetos"
              className={({ isActive }) =>
                `site-header__nav-item${isActive ? " is-active" : ""}`
              }
              onClick={closeMenu}
            >
              Projetos
            </NavLink>

            <NavLink
              to="/criadores"
              className={({ isActive }) =>
                `site-header__nav-item${isActive ? " is-active" : ""}`
              }
              onClick={closeMenu}
            >
              Criadores
            </NavLink>
          </nav>

          <div className="site-header__actions">
            <NavLink
              to="/login"
              className={({ isActive }) =>
                `site-header__login${isActive ? " is-active" : ""}`
              }
              onClick={closeMenu}
            >
              Entrar
            </NavLink>

            <NavLink
              to="/cadastro"
              className={({ isActive }) =>
                `site-header__signup${isActive ? " is-active" : ""}`
              }
              onClick={closeMenu}
            >
              Criar conta
            </NavLink>

            <NavLink
              to="/perfil"
              className={({ isActive }) =>
                `site-header__nav-item${isActive ? " is-active" : ""}`
              }
              onClick={handleProfileClick}
            >
              Perfil
            </NavLink>
          </div>
        </div>
      </div>
    </header>
  );
}