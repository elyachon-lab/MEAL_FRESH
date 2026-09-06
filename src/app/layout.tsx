import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

import { signOut } from "./actions/auth";
import { getUser } from "@/lib/dal";

export const metadata: Metadata = {
  title: "Meal Fresh — Mon Planificateur de Repas & Budget",
  description: "Planifiez vos repas, sauvegardez vos recettes et gérez votre budget.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();

  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Poppins:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {!user ? (
          children
        ) : (
        <>
        {/* ── Top Navbar (sans logo) ── */}
        <header className="top-navbar">
          <nav className="navbar-nav">
            <Link href="/" className="nav-link">🏠 Accueil</Link>
            <Link href="/planning" className="nav-link">📅 Planning</Link>
            <Link href="/recipes" className="nav-link">📖 Recettes</Link>
            <Link href="/ingredients" className="nav-link">🥑 Ingrédients</Link>
            <Link href="/budget" className="nav-link">💰 Budget</Link>
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span
              className="navbar-user-email"
              title={user.email ?? undefined}
              style={{
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                maxWidth: "180px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user.email}
            </span>

            <Link href="/recipes" className="btn btn-primary btn-sm btn-header-action">
              + Nouvelle recette
            </Link>

            <form action={signOut}>
              <button type="submit" className="btn btn-outline btn-sm" title="Se déconnecter">
                Déconnexion
              </button>
            </form>
          </div>
        </header>

        {/* ── Content ── */}
        <div className="container main-content">
          {children}
        </div>

        {/* ── Bottom Navigation Mobile ── */}
        <nav className="bottom-navbar">
          <Link href="/planning" className="bottom-nav-item">
            <span className="bottom-nav-icon">📅</span>
            <span className="bottom-nav-label">Planning</span>
          </Link>
          <Link href="/recipes" className="bottom-nav-item">
            <span className="bottom-nav-icon">📖</span>
            <span className="bottom-nav-label">Recettes</span>
          </Link>
          <Link href="/ingredients" className="bottom-nav-item">
            <span className="bottom-nav-icon">🥑</span>
            <span className="bottom-nav-label">Ingrédients</span>
          </Link>
          <Link href="/budget" className="bottom-nav-item">
            <span className="bottom-nav-icon">💰</span>
            <span className="bottom-nav-label">Budget</span>
          </Link>
        </nav>
        </>
        )}
      </body>
    </html>
  );
}
