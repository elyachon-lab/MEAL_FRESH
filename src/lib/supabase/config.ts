/**
 * Configuration Supabase partagée.
 *
 * La clé « publishable » (anciennement « anon ») est conçue pour être exposée
 * au navigateur : l'isolation des données repose sur les politiques RLS
 * définies dans supabase/migrations, pas sur le secret de cette clé.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

export function assertSupabaseConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Configuration Supabase manquante. Renseignez NEXT_PUBLIC_SUPABASE_URL et " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY dans .env.local (voir .env.example).",
    );
  }
}
