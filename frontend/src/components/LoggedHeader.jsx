import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import ConfirmationModal from "./ConfirmationModal";
import "./Header.css";
import "./LoggedHeader.css";

const ROLE_LABELS = {
  visitor: "Visitante",
  creator: "Criador",
  super_admin: "Administrador",
};

export default function LoggedHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [logoutConfirmationOpen, setLogoutConfirmationOpen] =
    useState(false);
  const accountMenuRef = useRef(null);

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isCreator = user?.role === "creator";
  const isAdmin = user?.role === "super_admin";

  const userInitial =
    user?.name?.trim().charAt(0).toUpperCase() || "U";

  function closeMenu() {
    setMenuOpen(false);
  }

  function handleLogout() {
    setAccountMenuOpen(false);
    setMenuOpen(false);
    logout();
    navigate("/", { replace: true });
  }

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target)
      ) {
        setAccountMenuOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setAccountMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

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
          aria-controls="logged-header-menu"
        >
          <i
            className={`fa-solid ${
              menuOpen ? "fa-xmark" : "fa-bars"
            }`}
            aria-hidden="true"
          />
        </button>

        <div
          id="logged-header-menu"
          className={`site-header__menu${
            menuOpen ? " is-open" : ""
          }`}
        >
          <nav
            className="site-header__navigation"
            aria-label="Navegação principal"
          >
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `site-header__nav-item${
                  isActive ? " is-active" : ""
                }`
              }
              onClick={closeMenu}
            >
              Início
            </NavLink>

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

            <NavLink
              to="/criadores"
              className={({ isActive }) =>
                `site-header__nav-item${
                  isActive ? " is-active" : ""
                }`
              }
              onClick={closeMenu}
            >
              Criadores
            </NavLink>

            {isCreator && (
              <NavLink
                to="/projeto/novo"
                className={({ isActive }) =>
                  `site-header__nav-item${
                    isActive ? " is-active" : ""
                  }`
                }
                onClick={closeMenu}
              >
                Novo projeto
              </NavLink>
            )}

            {isAdmin && (
              <NavLink
                to="/admin/projetos/pendentes"
                className={({ isActive }) =>
                  `site-header__nav-item${
                    isActive ? " is-active" : ""
                  }`
                }
                onClick={closeMenu}
              >
                Validação
              </NavLink>
            )}
          </nav>

          <div className="site-header__actions logged-header__actions">
            <div
              className="logged-header__account"
              ref={accountMenuRef}
            >
              <span className="logged-header__trigger-identity">
                <strong>{user?.name || "Usuário"}</strong>
                <small>
                  {ROLE_LABELS[user?.role] || "Usuário"}
                </small>
              </span>

              <span
                className="logged-header__trigger-divider"
                aria-hidden="true"
              />

              <button
                type="button"
                className={`logged-header__avatar-button${
                  accountMenuOpen ? " is-open" : ""
                }`}
                onClick={() =>
                  setAccountMenuOpen(
                    (currentValue) => !currentValue,
                  )
                }
                aria-label="Abrir menu da conta"
                aria-haspopup="menu"
                aria-expanded={accountMenuOpen}
              >
                <span
                  className="logged-header__trigger-avatar"
                  aria-hidden="true"
                >
                  {userInitial}
                </span>
              </button>

              {accountMenuOpen && (
                <div
                  className="logged-header__dropdown"
                  role="menu"
                >
                  {isCreator && (
                    <>
                      <Link
                        to={`/criadores/${user?.id}/editar`}
                        className="logged-header__profile-edit"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          closeMenu();
                        }}
                        role="menuitem"
                      >
                        <i
                          className="fa-solid fa-user-pen"
                          aria-hidden="true"
                        />
                        Editar perfil
                      </Link>

                      <div
                        className="logged-header__divider"
                        aria-hidden="true"
                      />
                    </>
                  )}

                  <button
                    type="button"
                    className="logged-header__logout"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      setLogoutConfirmationOpen(true);
                    }}
                    role="menuitem"
                  >
                    <i
                      className="fa-solid fa-arrow-right-from-bracket"
                      aria-hidden="true"
                    />
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    <ConfirmationModal
        open={logoutConfirmationOpen}
        tone="danger"
        title="Sair da conta?"
        description="Você precisará entrar novamente para acessar os recursos da sua conta."
        confirmLabel="Sim, sair"
        cancelLabel="Cancelar"
        onCancel={() => setLogoutConfirmationOpen(false)}
        onConfirm={() => {
          setLogoutConfirmationOpen(false);
          handleLogout();
        }}
      />
      </header>
  );
}