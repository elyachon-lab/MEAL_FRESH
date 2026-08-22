import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "MealFresh — Mon Planificateur de Repas",
  description: "Planifiez vos repas, gérez vos recettes et trouvez l'inspiration par ingrédients.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        {/* ── Navbar ── */}
        <header className="top-navbar">
          <Link href="/" className="navbar-brand">
            🍊 MealFresh
          </Link>

          <nav className="navbar-nav">
            <Link href="/planning"    className="nav-link">📅 Planning</Link>
            <Link href="/recipes"     className="nav-link">📖 Recettes</Link>
            <Link href="/ingredients" className="nav-link">🥑 Ingrédients</Link>
          </nav>

          <Link href="/recipes" className="btn btn-primary btn-sm">
            + Nouvelle recette
          </Link>
        </header>

        {/* ── Content ── */}
        <div className="container main-content">
          {children}
        </div>
      </body>
    </html>
  );
}
