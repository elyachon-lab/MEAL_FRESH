"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "../app/actions/auth";

type HeaderProps = {
  user: { email?: string | null } | null;
};

export default function Header({ user }: HeaderProps) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  return (
    <>
      {/* ── Top Navbar ── */}
      <header className="top-navbar">
        <nav className="navbar-nav">
          <Link href="/" className={`nav-link ${isActive("/") ? "active" : ""}`}>
            🏠 Accueil
          </Link>
          <Link href="/planning" className={`nav-link ${isActive("/planning") ? "active" : ""}`}>
            📅 Planning
          </Link>
          <Link href="/recipes" className={`nav-link ${isActive("/recipes") ? "active" : ""}`}>
            📖 Recettes
          </Link>
          <Link href="/ingredients" className={`nav-link ${isActive("/ingredients") ? "active" : ""}`}>
            🥑 Ingrédients
          </Link>
          <Link href="/budget" className={`nav-link ${isActive("/budget") ? "active" : ""}`}>
            💰 Budget
          </Link>
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginLeft: "auto" }}>
          {user ? (
            <>
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
            </>
          ) : (
            <Link href="/login" className="btn btn-primary btn-sm">
              🔐 Se connecter
            </Link>
          )}
        </div>
      </header>

      {/* ── Bottom Navigation Mobile ── */}
      <nav className="bottom-navbar">
        <Link href="/planning" className={`bottom-nav-item ${isActive("/planning") ? "active" : ""}`}>
          <span className="bottom-nav-icon">📅</span>
          <span className="bottom-nav-label">Planning</span>
        </Link>
        <Link href="/recipes" className={`bottom-nav-item ${isActive("/recipes") ? "active" : ""}`}>
          <span className="bottom-nav-icon">📖</span>
          <span className="bottom-nav-label">Recettes</span>
        </Link>
        <Link href="/ingredients" className={`bottom-nav-item ${isActive("/ingredients") ? "active" : ""}`}>
          <span className="bottom-nav-icon">🥑</span>
          <span className="bottom-nav-label">Ingrédients</span>
        </Link>
        <Link href="/budget" className={`bottom-nav-item ${isActive("/budget") ? "active" : ""}`}>
          <span className="bottom-nav-icon">💰</span>
          <span className="bottom-nav-label">Budget</span>
        </Link>
      </nav>
    </>
  );
}
