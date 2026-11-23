import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { supabase } from "../lib/supabase";

export default function Login() {
  const { session, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && session) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setError(
        signInError.status === 400
          ? "E-Mail-Adresse oder Passwort ist falsch."
          : "Anmeldung derzeit nicht möglich. Bitte später erneut versuchen.",
      );
    }
    setSubmitting(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-teal-800">Abo-Tracker</h1>
          <p className="mt-1 text-sm text-slate-500">Melde dich an, um deine Abos zu sehen.</p>
        </div>
        {error && <p role="alert" className="alert-error">{error}</p>}
        <div>
          <label htmlFor="email" className="label">E-Mail</label>
          <input id="email" type="email" required autoComplete="username" className="input"
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label htmlFor="password" className="label">Passwort</label>
          <input id="password" type="password" required autoComplete="current-password" className="input"
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? "Wird angemeldet …" : "Anmelden"}
        </button>
        <p className="text-center text-xs text-slate-500">Zugang nur auf Einladung.</p>
      </form>
    </div>
  );
}
