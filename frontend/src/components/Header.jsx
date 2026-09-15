import { useState } from "react";
import { Link, NavLink } from "react-router-dom";

import "./Header.css";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="site-header">
      <div className="site-header__content">
        <Link
          to="/"
          className="site-header__brand"
          onClick={closeMenu}
        >
          <span
            className="site-header__symbol"
            aria-hidden="true"
          >
            &lt;/&gt;
          </span>

          <span className="logo-title-navbar">TecHub</span>
        </Link>

        <button
          type="button"
          className="site-header__menu-button"
          onClick={() =>
            setMenuOpen((currentValue) => !currentValue)
          }
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menuOpen}
          aria-controls="site-header-menu"
        >
          <i
            className={`fa-solid ${
              menuOpen ? "fa-xmark" : "fa-bars"
            }`}
            aria-hidden="true"
          />
        </button>

        <div
          id="site-header-menu"
          className={`site-header__menu${
            menuOpen ? " is-open" : ""
          }`}
        >
          <nav
            className="site-header__navigation"
            aria-label="Navegação principal"
          >
            <NavLink
              to="/projetos"
              className={({ isActive }) =>
                `site-header__nav-item${
                  isActive ? " is-active" : ""
                }`
              }
              onClick={closeMenu}
            >
              Projetos
            </NavLink>

            <button
              type="button"
              className="site-header__nav-item"
              disabled
            >
              Criadores
            </button>
          </nav>

          <div className="site-header__actions">
            <button
              type="button"
              className="site-header__login"
              disabled
            >
              Entrar
            </button>

            <NavLink
              to="/cadastro"
              className={({ isActive }) =>
                `site-header__signup${
                  isActive ? " is-active" : ""
                }`
              }
              onClick={closeMenu}
            >
              Criar conta
            </NavLink>
          </div>
        </div>
      </div>
    </header>
  );
}