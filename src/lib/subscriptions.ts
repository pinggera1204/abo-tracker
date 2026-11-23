export type BillingInterval = "monthly" | "quarterly" | "yearly";

export interface Subscription {
  id: string;
  user_id: string;
  name: string;
  category: string;
  amount: number;
  billing_interval: BillingInterval;
  next_payment: string | null;
  active: boolean;
  notes: string | null;
}

export const INTERVAL_LABELS: Record<BillingInterval, string> = {
  monthly: "monatlich",
  quarterly: "vierteljährlich",
  yearly: "jährlich",
};

const MONTHS_PER_INTERVAL: Record<BillingInterval, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

const currency = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const dateFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" });

export function monthlyCost(subscription: Pick<Subscription, "amount" | "billing_interval">): number {
  return Number(subscription.amount) / MONTHS_PER_INTERVAL[subscription.billing_interval];
}

export function totalMonthly(subscriptions: Subscription[]): number {
  return subscriptions.filter((s) => s.active).reduce((sum, s) => sum + monthlyCost(s), 0);
}

export function formatEuro(value: number): string {
  return currency.format(value);
}

export function formatDate(isoDate: string | null): string {
  if (!isoDate) return "–";
  const [year, month, day] = isoDate.split("-").map(Number);
  return dateFormat.format(new Date(year, month - 1, day));
}

export function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function parseAmount(input: string): number | null {
  const normalized = input.trim().replace(/\s|€/g, "").replace(",", ".");
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(normalized)) return null;
  return Number(normalized);
}
