import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { SUPABASE_ANON_KEY, SUPABASE_URL, assertSupabaseConfig } from "./config";

/**
 * Client Supabase à créer à chaque requête serveur (Server Component, Server
 * Action ou Route Handler). Ne jamais le partager entre deux requêtes : il
 * porte la session de l'utilisateur courant.
 */
export async function createClient() {
  assertSupabaseConfig();
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Écriture impossible depuis un Server Component : c'est le proxy
          // (src/proxy.ts) qui rafraîchit les cookies de session.
        }
      },
    },
  });
}
