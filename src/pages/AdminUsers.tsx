import { FunctionsHttpError } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { Profile } from "../auth/AuthProvider";
import { formatDate } from "../lib/subscriptions";
import { supabase } from "../lib/supabase";

interface CreatedInvite {
  email: string;
  link: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<Profile[] | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<CreatedInvite | null>(null);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const linkInput = useRef<HTMLInputElement>(null);

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

  async function createInvite(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setError(null);
    setInvite(null);
    setCopied(false);
    const target = email.trim();
    const { data, error: inviteError } = await supabase.functions.invoke<{ inviteLink?: string }>("invite-user", {
      body: { email: target },
    });
    setSending(false);
    if (inviteError || !data?.inviteLink) {
      let message = "Der Einladungslink konnte nicht erstellt werden.";
      if (inviteError instanceof FunctionsHttpError) {
        const body = await inviteError.context.json().catch(() => null);
        if (typeof body?.error === "string") message = body.error;
      }
      setError(message);
      return;
    }
    setInvite({ email: target, link: data.inviteLink });
    setEmail("");
    await load();
  }

  async function copyLink() {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite.link);
      setCopied(true);
    } catch {
      linkInput.current?.select();
      setError("Kopieren nicht möglich. Bitte den markierten Link manuell kopieren.");
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Benutzer</h1>

      <form onSubmit={createInvite} className="card space-y-3">
        <div>
          <h2 className="font-semibold">Benutzer einladen</h2>
          <p className="mt-1 text-sm text-slate-500">Es wird keine E-Mail versendet. Du erhältst einen Link, den du selbst weitergibst.</p>
        </div>
        {error && <p role="alert" className="alert-error">{error}</p>}
        <div className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="invite-email" className="sr-only">E-Mail-Adresse</label>
          <input id="invite-email" type="email" required placeholder="name@beispiel.at" className="input"
            value={email} onChange={(e) => setEmail(e.target.value)} />
          <button type="submit" className="btn-primary shrink-0" disabled={sending}>
            {sending ? "Wird erstellt …" : "Link erstellen"}
          </button>
        </div>
        {invite && (
          <div role="status" className="space-y-2 rounded-lg bg-teal-50 p-3">
            <p className="break-words text-sm font-medium text-teal-900">Einladungslink für {invite.email}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label htmlFor="invite-link" className="sr-only">Einladungslink</label>
              <input id="invite-link" ref={linkInput} readOnly className="input text-sm" value={invite.link}
                onFocus={(e) => e.target.select()} />
              <button type="button" className="btn-secondary shrink-0" onClick={() => void copyLink()}>
                {copied ? "Kopiert" : "Link kopieren"}
              </button>
            </div>
            <p className="text-xs text-teal-900">Der Link gilt nur einmal und nur für begrenzte Zeit. Gib ihn nur an die eingeladene Person weiter.</p>
          </div>
        )}
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
