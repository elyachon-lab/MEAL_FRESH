import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "MealFresh — Mon Planificateur de Repas & Budget",
  description: "Planifiez vos repas, gérez vos recettes, trouvez l'inspiration et suivez votre budget mensuel.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        {/* ── Top Navbar ── */}
        <header className="top-navbar">
          <Link href="/" className="navbar-brand">
            🍊 MealFresh
          </Link>

          <nav className="navbar-nav">
            <Link href="/planning"    className="nav-link">📅 Planning</Link>
            <Link href="/recipes"     className="nav-link">📖 Recettes</Link>
            <Link href="/ingredients" className="nav-link">🥑 Ingrédients</Link>
            <Link href="/budget"      className="nav-link">💰 Budget</Link>
          </nav>

          <Link href="/recipes" className="btn btn-primary btn-sm btn-header-action">
            + Nouvelle recette
          </Link>
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
      </body>
    </html>
  );
}
