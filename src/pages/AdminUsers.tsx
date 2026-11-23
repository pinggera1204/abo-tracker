import { FunctionsHttpError } from "@supabase/supabase-js";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { Profile } from "../auth/AuthProvider";
import { formatDate } from "../lib/subscriptions";
import { supabase } from "../lib/supabase";

export default function AdminUsers() {
  const [users, setUsers] = useState<Profile[] | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from("profiles")
      .select("id, email, role, created_at")
      .order("created_at", { ascending: true });
    if (loadError) setError("Die Benutzer konnten nicht geladen werden.");
    else setUsers((data ?? []) as Profile[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function invite(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setError(null);
    setSuccess(null);
    const target = email.trim();
    const { error: inviteError } = await supabase.functions.invoke("invite-user", {
      body: { email: target },
    });
    setSending(false);
    if (inviteError) {
      let message = "Die Einladung konnte nicht versendet werden.";
      if (inviteError instanceof FunctionsHttpError) {
        const body = await inviteError.context.json().catch(() => null);
        if (typeof body?.error === "string") message = body.error;
      }
      setError(message);
      return;
    }
    setSuccess(`Einladung an ${target} wurde versendet.`);
    setEmail("");
    await load();
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Benutzer</h1>

      <form onSubmit={invite} className="card space-y-3">
        <h2 className="font-semibold">Benutzer einladen</h2>
        {error && <p role="alert" className="alert-error">{error}</p>}
        {success && <p role="status" className="alert-success">{success}</p>}
        <div className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="invite-email" className="sr-only">E-Mail-Adresse</label>
          <input id="invite-email" type="email" required placeholder="name@beispiel.at" className="input"
            value={email} onChange={(e) => setEmail(e.target.value)} />
          <button type="submit" className="btn-primary shrink-0" disabled={sending}>
            {sending ? "Wird gesendet …" : "Einladen"}
          </button>
        </div>
      </form>

      <section className="card">
        <h2 className="mb-3 font-semibold">Alle Benutzer</h2>
        {users === null ? (
          <p className="text-sm text-slate-500">Wird geladen …</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {users.map((user) => (
              <li key={user.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{user.email}</p>
                  <p className="text-xs text-slate-500">seit {formatDate(user.created_at.slice(0, 10))}</p>
                </div>
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                  user.role === "admin" ? "bg-teal-100 text-teal-800" : "bg-slate-100 text-slate-700"
                }`}>
                  {user.role === "admin" ? "Admin" : "Benutzer"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
