import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { supabase } from "../lib/supabase";

const MIN_LENGTH = 10;

export default function SetPassword() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (password.length < MIN_LENGTH) {
      setError(`Das Passwort muss mindestens ${MIN_LENGTH} Zeichen lang sein.`);
      return;
    }
    if (password !== repeat) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) {
      setError("Das Passwort konnte nicht gespeichert werden.");
      return;
    }
    navigate("/dashboard", { replace: true });
  }

  if (loading) return <p className="p-8 text-center text-slate-500">Wird geladen …</p>;

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="card w-full max-w-sm space-y-3 text-center">
          <h1 className="text-xl font-bold">Link ungültig</h1>
          <p className="text-sm text-slate-600">Der Einladungslink ist abgelaufen oder wurde bereits verwendet.</p>
          <Link to="/login" className="btn-secondary">Zur Anmeldung</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-teal-800">Passwort festlegen</h1>
          <p className="mt-1 break-words text-sm text-slate-500">für {session.user.email}</p>
        </div>
        {error && <p role="alert" className="alert-error">{error}</p>}
        <div>
          <label htmlFor="new-password" className="label">Neues Passwort</label>
          <input id="new-password" type="password" required minLength={MIN_LENGTH} autoComplete="new-password"
            className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div>
          <label htmlFor="repeat-password" className="label">Passwort wiederholen</label>
          <input id="repeat-password" type="password" required autoComplete="new-password"
            className="input" value={repeat} onChange={(e) => setRepeat(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? "Wird gespeichert …" : "Passwort speichern"}
        </button>
      </form>
    </div>
  );
}
