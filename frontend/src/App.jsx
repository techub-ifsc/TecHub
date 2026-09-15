import { Route, Routes } from "react-router-dom";

import EmptyState from "./components/EmptyState";
import Header from "./components/Header";
import PrivateRoute from "./components/PrivateRoute";

import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Favorites from "./pages/Favorites";
import HomePage from "./pages/HomePage";
import Login from "./pages/Login";
import NewProjectPage from "./pages/NewProjectPage";
import OrderDetail from "./pages/OrderDetail";
import Orders from "./pages/Orders";
import ProductDetail from "./pages/ProductDetail";
import Profile from "./pages/Profile";
import ProjectsPage from "./pages/ProjectsPage";
import Register from "./pages/Register";
import SignUpPage from "./pages/SignUpPage";

export default function App() {
  return (
    <div className="app-shell">
      <Header />

      <div className="app-content">
        <Routes>
          <Route path="/" element={<HomePage />} />

          <Route path="/projetos" element={<ProjectsPage />} />
          <Route path="/projeto/novo" element={<NewProjectPage />} />

          <Route path="/cadastro" element={<SignUpPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/products/:id" element={<ProductDetail />} />

          <Route element={<PrivateRoute />}>
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/favorites" element={<Favorites />} />
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
      </div>
    </div>
  );
}