import { useCallback, useEffect, useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";
import {
  formatDate,
  formatEuro,
  INTERVAL_LABELS,
  monthlyCost,
  parseAmount,
  type BillingInterval,
  type Subscription,
} from "../lib/subscriptions";

interface FormState {
  id: string | null;
  name: string;
  category: string;
  amount: string;
  billing_interval: BillingInterval;
  next_payment: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  id: null,
  name: "",
  category: "",
  amount: "",
  billing_interval: "monthly",
  next_payment: "",
  notes: "",
};

const CATEGORY_SUGGESTIONS = ["Streaming", "Musik", "Software", "Cloud", "Sport", "Medien", "Mobilität", "Sonstiges"];

export default function Subscriptions() {
  const [items, setItems] = useState<Subscription[] | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from("subscriptions")
      .select("*")
      .order("name", { ascending: true });
    if (loadError) setError("Die Abos konnten nicht geladen werden.");
    else setItems((data ?? []) as Subscription[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function edit(item: Subscription) {
    setError(null);
    setForm({
      id: item.id,
      name: item.name,
      category: item.category,
      amount: Number(item.amount).toFixed(2).replace(".", ","),
      billing_interval: item.billing_interval,
      next_payment: item.next_payment ?? "",
      notes: item.notes ?? "",
    });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    const amount = parseAmount(form.amount);
    if (amount === null) {
      setError("Bitte einen gültigen Betrag eingeben, zum Beispiel 9,99.");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name.trim(),
      category: form.category.trim() || "Sonstiges",
      amount,
      billing_interval: form.billing_interval,
      next_payment: form.next_payment || null,
      notes: form.notes.trim() || null,
    };
    const { error: saveError } = form.id
      ? await supabase.from("subscriptions").update(payload).eq("id", form.id)
      : await supabase.from("subscriptions").insert(payload);
    setSaving(false);
    if (saveError) {
      setError("Das Abo konnte nicht gespeichert werden.");
      return;
    }
    setForm(null);
    await load();
  }

  async function toggleActive(item: Subscription) {
    setError(null);
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({ active: !item.active })
      .eq("id", item.id);
    if (updateError) setError("Der Status konnte nicht geändert werden.");
    await load();
  }

  async function remove(id: string) {
    setError(null);
    const { error: deleteError } = await supabase.from("subscriptions").delete().eq("id", id);
    if (deleteError) setError("Das Abo konnte nicht gelöscht werden.");
    setConfirmDeleteId(null);
    await load();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Abos</h1>
        {!form && (
          <button type="button" className="btn-primary" onClick={() => { setError(null); setForm(EMPTY_FORM); }}>
            Abo hinzufügen
          </button>
        )}
      </div>

      {error && <p role="alert" className="alert-error">{error}</p>}

      {form && (
        <form onSubmit={save} className="card grid gap-4 sm:grid-cols-2">
          <h2 className="font-semibold sm:col-span-2">{form.id ? "Abo bearbeiten" : "Neues Abo"}</h2>
          <div>
            <label htmlFor="name" className="label">Name</label>
            <input id="name" required maxLength={100} className="input" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label htmlFor="category" className="label">Kategorie</label>
            <input id="category" list="categories" maxLength={50} className="input" value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <datalist id="categories">
              {CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div>
            <label htmlFor="amount" className="label">Betrag in Euro</label>
            <input id="amount" required inputMode="decimal" placeholder="9,99" className="input" value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div>
            <label htmlFor="interval" className="label">Abrechnung</label>
            <select id="interval" className="input" value={form.billing_interval}
              onChange={(e) => setForm({ ...form, billing_interval: e.target.value as BillingInterval })}>
              {Object.entries(INTERVAL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="next-payment" className="label">Nächste Zahlung</label>
            <input id="next-payment" type="date" className="input" value={form.next_payment}
              onChange={(e) => setForm({ ...form, next_payment: e.target.value })} />
          </div>
          <div>
            <label htmlFor="notes" className="label">Notiz</label>
            <input id="notes" maxLength={500} className="input" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Wird gespeichert …" : "Speichern"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => { setForm(null); setError(null); }}>
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {items === null && !error && <p className="text-slate-500">Wird geladen …</p>}
      {items?.length === 0 && !form && (
        <p className="card text-center text-sm text-slate-600">Noch keine Abos eingetragen.</p>
      )}

      <ul className="space-y-3">
        {items?.map((item) => (
          <li key={item.id} className={`card ${item.active ? "" : "opacity-70"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words font-semibold">
                  {item.name}
                  {!item.active && (
                    <span className="ml-2 rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">pausiert</span>
                  )}
                </p>
                <p className="text-sm text-slate-500">
                  {item.category} · nächste Zahlung {formatDate(item.next_payment)}
                </p>
                {item.notes && <p className="mt-1 break-words text-sm text-slate-600">{item.notes}</p>}
              </div>
              <div className="text-right">
                <p className="font-semibold tabular-nums">
                  {formatEuro(Number(item.amount))} <span className="text-sm font-normal text-slate-500">{INTERVAL_LABELS[item.billing_interval]}</span>
                </p>
                {item.billing_interval !== "monthly" && (
                  <p className="text-xs text-slate-500">entspricht {formatEuro(monthlyCost(item))} pro Monat</p>
                )}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn-secondary" onClick={() => edit(item)}
                aria-label={`${item.name} bearbeiten`}>Bearbeiten</button>
              <button type="button" className="btn-secondary" onClick={() => void toggleActive(item)}
                aria-label={`${item.name} ${item.active ? "pausieren" : "fortsetzen"}`}>
                {item.active ? "Pausieren" : "Fortsetzen"}
              </button>
              {confirmDeleteId === item.id ? (
                <>
                  <button type="button" className="btn-danger" onClick={() => void remove(item.id)}>Wirklich löschen</button>
                  <button type="button" className="btn-secondary" onClick={() => setConfirmDeleteId(null)}>Abbrechen</button>
                </>
              ) : (
                <button type="button" className="btn-secondary" onClick={() => setConfirmDeleteId(item.id)}
                  aria-label={`${item.name} löschen`}>Löschen</button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
