import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

function linkClass({ isActive }: { isActive: boolean }) {
  return `rounded-lg px-3 py-2 text-sm font-medium ${
    isActive ? "bg-teal-50 text-teal-800" : "text-slate-600 hover:bg-slate-100"
  }`;
}

export default function Layout() {
  const { profile, session, signOut } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-3">
          <span className="mr-3 text-lg font-bold text-teal-800">Abo-Tracker</span>
          <nav className="flex flex-wrap gap-1">
            <NavLink to="/dashboard" className={linkClass}>Übersicht</NavLink>
            <NavLink to="/abos" className={linkClass}>Abos</NavLink>
            {profile?.role === "admin" && (
              <NavLink to="/admin/benutzer" className={linkClass}>Benutzer</NavLink>
            )}
          </nav>
          <div className="ml-auto flex min-w-0 items-center gap-3">
            <span className="hidden truncate text-sm text-slate-500 sm:inline">{session?.user.email}</span>
            <button type="button" className="btn-secondary" onClick={() => void signOut()}>
              Abmelden
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
