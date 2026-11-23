import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://pinggera1204.github.io",
]);
const APP_PATH = "/abo-tracker/passwort-setzen";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(body: unknown, status: number, origin: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin") ?? "";
  if (!ALLOWED_ORIGINS.has(origin)) {
    return new Response(JSON.stringify({ error: "Herkunft nicht erlaubt." }), {
      status: 403,
      headers: { "Content-Type": "application/json", "Vary": "Origin" },
    });
  }
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") {
    return json({ error: "Methode nicht erlaubt." }, 405, origin);
  }

  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Nicht angemeldet." }, 401, origin);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) {
    return json({ error: "Nicht angemeldet." }, 401, origin);
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (profileError) {
    console.error("profile lookup failed", profileError.message);
    return json({ error: "Interner Fehler." }, 500, origin);
  }
  if (profile?.role !== "admin") {
    return json({ error: "Nur Admins dürfen einladen." }, 403, origin);
  }

  let email = "";
  try {
    const body = await req.json();
    email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  } catch {
    return json({ error: "Ungültige Anfrage." }, 400, origin);
  }
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return json({ error: "Bitte eine gültige E-Mail-Adresse eingeben." }, 400, origin);
  }

  // Es wird bewusst keine E-Mail versendet: Der Admin gibt den Link selbst weiter.
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo: `${origin}${APP_PATH}` },
  });
  if (linkError) {
    console.error("invite link failed", linkError.code, linkError.message);
    if (linkError.code === "email_exists") {
      return json({ error: "Diese E-Mail-Adresse ist bereits registriert." }, 409, origin);
    }
    return json({ error: "Der Einladungslink konnte nicht erstellt werden." }, 502, origin);
  }

  const hashedToken = linkData.properties?.hashed_token;
  if (!hashedToken) {
    console.error("invite link failed: no hashed token");
    return json({ error: "Der Einladungslink konnte nicht erstellt werden." }, 502, origin);
  }

  const inviteLink = `${origin}${APP_PATH}?token_hash=${encodeURIComponent(hashedToken)}&type=invite`;
  return json({ ok: true, inviteLink }, 200, origin);
});
