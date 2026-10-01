import { Link } from "react-router-dom";

import "./Footer.css";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer__content">
        <div className="site-footer__identity">
          <Link
            to="/"
            className="site-footer__brand"
            aria-label="Ir para a página inicial do TecHub"
          >
            <span
              className="site-footer__symbol"
              aria-hidden="true"
            >
              &lt;/&gt;
            </span>

            <span>TecHub</span>
          </Link>

          <p>
            Uma vitrine para projetos, talentos e experiências
            desenvolvidas pela comunidade acadêmica do IFSC.
          </p>
        </div>

        <div className="site-footer__information">
          <p>
            © {currentYear} TecHub — IFSC Câmpus Lages
          </p>

          <p>
            Desenvolvido para valorizar projetos e criadores.
          </p>
        </div>
      </div>
    </footer>
  );
}