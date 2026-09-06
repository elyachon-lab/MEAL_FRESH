import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

/**
 * Point d'entrée des liens de confirmation envoyés par email.
 *
 * Gère les deux formats produits par Supabase selon la configuration du projet :
 *  - `token_hash` + `type` (gabarits d'email personnalisés) ;
 *  - `code` (flux PKCE par défaut).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(target, origin));
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(target, origin));
  }

  const failure = new URL("/login", origin);
  failure.searchParams.set("error", "Lien de confirmation invalide ou expiré.");
  return NextResponse.redirect(failure);
}
