import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthProvider";
import Layout from "./components/Layout";
import AdminUsers from "./pages/AdminUsers";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import SetPassword from "./pages/SetPassword";
import Subscriptions from "./pages/Subscriptions";

function Loading() {
  return <p className="p-8 text-center text-slate-500">Wird geladen …</p>;
}

function RequireAuth() {
  const { session, loading } = useAuth();
  if (loading) return <Loading />;
  return session ? <Outlet /> : <Navigate to="/login" replace />;
}

function RequireAdmin() {
  const { profile, loading } = useAuth();
  if (loading) return <Loading />;
  return profile?.role === "admin" ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/passwort-setzen" element={<SetPassword />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/abos" element={<Subscriptions />} />
          <Route element={<RequireAdmin />}>
            <Route path="/admin/benutzer" element={<AdminUsers />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
