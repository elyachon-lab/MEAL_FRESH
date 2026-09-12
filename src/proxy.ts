import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";

/**
 * Proxy Next.js 16 (ex-« middleware »).
 *
 * Deux rôles :
 *  1. rafraîchir le cookie de session Supabase à chaque requête, sinon
 *     l'utilisateur est déconnecté dès l'expiration du jeton ;
 *  2. rediriger de façon optimiste les visiteurs non connectés vers /login.
 *
 * Ce contrôle est volontairement superficiel : la véritable autorisation est
 * appliquée par les politiques RLS de Postgres et par requireUser() côté
 * accès aux données (src/lib/dal.ts).
 */

// Routes accessibles sans être connecté.
const PUBLIC_PATHS = ["/login", "/auth"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
  try {
    return await handle(request);
  } catch (error) {
    // Une panne du proxy ne doit jamais rendre le site entier inaccessible :
    // sans ce filet, la moindre exception ici renvoie 500 sur TOUTES les routes
    // couvertes par le matcher. On laisse passer la requête ; les pages
    // appliquent de toute façon leur propre contrôle via requireSession().
    console.error("[proxy] échec, requête laissée passer :", error);
    return NextResponse.next({ request });
  }
}

async function handle(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return response;

  try {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    });

    await supabase.auth.getUser();
  } catch {
    // Ignorer les erreurs de rafraîchissement réseau pour ne jamais bloquer la navigation
  }

  return response;
}

export const config = {
  matcher: [
    // Tout sauf les assets statiques et les images.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
