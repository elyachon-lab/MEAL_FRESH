import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "./supabase/server";

/**
 * Couche d'accès aux données : centralise session et client Supabase.
 *
 * cache() mémorise le résultat pour la durée d'un rendu (ou d'une Server
 * Action), ce qui évite de recréer un client et de revalider le jeton à
 * chaque requête d'une même page.
 */
export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
});

export async function getUser() {
  const { user } = await getSession();
  return user;
}

export function isRedirectError(err: any): boolean {
  if (!err) return false;
  if (typeof err === "object" && "digest" in err && typeof err.digest === "string") {
    return err.digest.startsWith("NEXT_REDIRECT");
  }
  return err?.message === "NEXT_REDIRECT" || err?.name === "NextRedirect";
}

/**
 * Session garantie : redirige vers /login si personne n'est connecté.
 * À appeler dans toute action ou page qui touche aux données.
 */
export async function requireSession() {
  const { supabase, user } = await getSession();
  if (!user) redirect("/login");
  return { supabase, user };
}
