import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

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
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "";

  // Sans configuration, on laisse passer : les pages afficheront un message
  // d'erreur explicite plutôt qu'une boucle de redirection vers /login.
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // Empêche un CDN de mettre en cache une réponse porteuse de Set-Cookie,
        // ce qui servirait la session d'un utilisateur à un autre.
        for (const [header, headerValue] of Object.entries(headers ?? {})) {
          response.headers.set(header, headerValue);
        }
      },
    },
  });

  // Doit être appelé avant de produire la réponse pour que le rafraîchissement
  // éventuel du jeton soit bien réécrit dans les cookies.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublic(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    if (pathname !== "/") redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && pathname === "/login") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    // Tout sauf les assets statiques et les images.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
