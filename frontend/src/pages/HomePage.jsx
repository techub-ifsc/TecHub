import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import FeatureCard from "../components/FeatureCard";
import logoTecHub from "../assets/LogoTecHub.svg";
import RadarNetworkIcon from "../assets/RadarNetworkIcon.svg";
import CheckShieldIcon from "../assets/CheckShieldIcon.svg";
import GraduationIcon from "../assets/GraduationIcon.svg";
import "./HomePage.css";

export default function HomePage() {
  const { user } = useAuth();

  const canPublish =
    user?.role === "creator" || user?.role === "super_admin";

  const publishDestination = canPublish
    ? "/projeto/novo"
    : "/login";

  return (
    <div className="home-page">
      <section className="home-hero">
        <img
          src={logoTecHub}
          alt="Logo do TecHub"
          className="home-hero__logo"
        />
        <h1 className="logo-title">TecHub</h1>
        <h1 className="home-hero__title">
          Mostre o que você sabe
          <br />
          construir, o mercado quer ver.
        </h1>

        <p className="home-hero__description">
          Conecte seus projetos a recrutadores
          <br />
          através de um portfólio visual.
        </p>

        <div className="home-hero__actions">
          <Link
            to={publishDestination}
            state={
              canPublish
                ? undefined
                : {
                    from: { pathname: "/projeto/novo" },
                    accessMessage:
                      "Apenas contas de criador podem publicar projetos.",
                  }
            }
            className="home-hero__primary-button"
          >
            Publique seu projeto
          </Link>

          <Link to="/projetos" className="home-hero__secondary-button">
            Explore projetos
          </Link>
        </div>
      </section>

      <section className="home-features" aria-labelledby="features-title">
        <h2 id="features-title" className="home-features__title">
          Como funciona
        </h2>

        <div className="home-features__grid">
          <FeatureCard
            icon={GraduationIcon}
            title="Crie seu Portfólio"
            description="Cadastre seu perfil institucional e transforme seus aprendizados em portfólio real."
          />

          <FeatureCard
            icon={CheckShieldIcon}
            title="Projetos Checados"
            description="Os envios passam por uma moderação básica antes de ficarem visíveis na plataforma."
          />

          <FeatureCard
            icon={RadarNetworkIcon}
            title="Conexão e Vitrine"
            description="Publique, entre no radar e fique disponível para o contato de recrutadores da região."
          />
        </div>
      </section>
    </div>
  );
}
