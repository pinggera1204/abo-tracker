import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  formatDate,
  formatEuro,
  monthlyCost,
  todayIso,
  totalMonthly,
  type Subscription,
} from "../lib/subscriptions";

export default function Dashboard() {
  const [subscriptions, setSubscriptions] = useState<Subscription[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.from("subscriptions").select("*").then(({ data, error: loadError }) => {
      if (cancelled) return;
      if (loadError) setError("Die Abos konnten nicht geladen werden.");
      else setSubscriptions((data ?? []) as Subscription[]);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const all = subscriptions ?? [];
    const active = all.filter((s) => s.active);
    const monthly = totalMonthly(all);
    const byCategory = new Map<string, number>();
    for (const s of active) {
      byCategory.set(s.category, (byCategory.get(s.category) ?? 0) + monthlyCost(s));
    }
    const today = todayIso();
    return {
      activeCount: active.length,
      pausedCount: all.length - active.length,
      monthly,
      yearly: monthly * 12,
      categories: [...byCategory.entries()].sort((a, b) => b[1] - a[1]),
      upcoming: active
        .filter((s) => s.next_payment && s.next_payment >= today)
        .sort((a, b) => a.next_payment!.localeCompare(b.next_payment!))
        .slice(0, 5),
    };
  }, [subscriptions]);

  if (error) return <p role="alert" className="alert-error">{error}</p>;
  if (!subscriptions) return <p className="text-slate-500">Wird geladen …</p>;

  if (subscriptions.length === 0) {
    return (
      <div className="card text-center">
        <h1 className="text-xl font-bold">Noch keine Abos</h1>
        <p className="mt-1 text-sm text-slate-600">Lege dein erstes Abo an, um deine Ausgaben zu sehen.</p>
        <Link to="/abos" className="btn-primary mt-4">Abo anlegen</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Übersicht</h1>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm text-slate-500">Pro Monat</p>
          <p data-testid="monthly-total" className="mt-1 text-3xl font-bold text-teal-800">{formatEuro(stats.monthly)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Hochgerechnet pro Jahr</p>
          <p data-testid="yearly-total" className="mt-1 text-3xl font-bold">{formatEuro(stats.yearly)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Aktive Abos</p>
          <p className="mt-1 text-3xl font-bold">{stats.activeCount}</p>
          {stats.pausedCount > 0 && <p className="text-xs text-slate-500">{stats.pausedCount} pausiert</p>}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card">
          <h2 className="mb-4 font-semibold">Monatliche Ausgaben nach Kategorie</h2>
          <ul className="space-y-3">
            {stats.categories.map(([category, value]) => (
              <li key={category}>
                <div className="mb-1 flex justify-between gap-2 text-sm">
                  <span>{category}</span>
                  <span className="font-medium tabular-nums">{formatEuro(value)}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-teal-600"
                    style={{ width: `${stats.monthly > 0 ? (value / stats.monthly) * 100 : 0}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2 className="mb-4 font-semibold">Nächste Zahlungen</h2>
          {stats.upcoming.length === 0 ? (
            <p className="text-sm text-slate-500">Keine anstehenden Zahlungen eingetragen.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {stats.upcoming.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{s.name}</p>
                    <p className="text-xs text-slate-500">{formatDate(s.next_payment)}</p>
                  </div>
                  <span className="font-medium tabular-nums">{formatEuro(Number(s.amount))}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
