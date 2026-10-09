import { Route, Routes } from "react-router-dom";

import AdminRoute from "./components/AdminRoute";
import CreatorRoute from "./components/CreatorRoute";
import CreatorProfileRoute from "./components/CreatorProfileRoute";
import EmptyState from "./components/EmptyState";
import Footer from "./components/Footer";
import Header from "./components/Header";

import CreatorProfilePage from "./pages/CreatorProfilePage";
import CreatorsPage from "./pages/CreatorsPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import NewProjectPage from "./pages/NewProjectPage";
import ProfileEditPage from "./pages/ProfileEditPage";
import ProjectDetailsPage from "./pages/ProjectDetailsPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectValidationPage from "./pages/ProjectValidationPage";
import SignUpPage from "./pages/SignUpPage";

export default function App() {
  return (
    <div className="app-shell">
      <Header />

      <main className="app-content">
        <Routes>
          <Route path="/" element={<HomePage />} />

          <Route path="/projetos" element={<ProjectsPage />} />

          <Route
            path="/projetos/:id"
            element={<ProjectDetailsPage />}
          />
          <Route path="/criadores" element={<CreatorsPage />} />

          <Route element={<CreatorRoute />}>
            <Route
              path="/projeto/novo"
              element={<NewProjectPage />}
            />
            <Route
              path="/projetos/:id/editar"
              element={<NewProjectPage />}
            />
          </Route>

          <Route element={<CreatorProfileRoute />}>
            <Route
              path="/criadores/:id/editar"
              element={<ProfileEditPage />}
            />
          </Route>

          <Route
            path="/criadores/:id"
            element={<CreatorProfilePage />}
          />

          <Route path="/cadastro" element={<SignUpPage />} />

          <Route path="/login" element={<LoginPage />} />

          <Route element={<AdminRoute />}>
            <Route
              path="/admin/projetos/pendentes"
              element={<ProjectValidationPage />}
            />
          </Route>

          <Route
            path="*"
            element={
              <EmptyState
                icon="compass"
                title="Página não encontrada"
                description="Verifique o endereço e tente novamente."
              />
            }
          />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}
