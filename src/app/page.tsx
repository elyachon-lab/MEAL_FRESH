import Link from "next/link";

const features = [
  {
    href: "/planning",
    emoji: "📅",
    title: "Planning Semainier",
    desc:  "Glissez vos recettes sur vos créneaux Matin, Midi, Goûter & Soir. Tout est organisé en un clin d'œil.",
    cta:   "Voir le planning",
    badge: "Organisé",
  },
  {
    href: "/recipes",
    emoji: "📖",
    title: "Carnet de Recettes",
    desc:  "Sauvegardez vos idées repas avec ingrédients et instructions. Votre banque de recettes toujours sous la main.",
    cta:   "Mes recettes",
    badge: "Malin",
  },
  {
    href: "/budget",
    emoji: "💰",
    title: "Suivi du Budget",
    desc:  "Suivez vos dépenses de courses semaine par semaine et visualisez votre reste à dépenser en temps réel.",
    cta:   "Gérer mon budget",
    badge: "Économe",
  },
];

export default function Home() {
  return (
    <>
      {/* ── HERO CONFORME CHARTE ── */}
      <section
        style={{
          position: "relative",
          borderRadius: "var(--radius-xl)",
          overflow: "hidden",
          padding: "3.5rem 2rem",
          marginBottom: "3.5rem",
          background: "linear-gradient(135deg, #FFF2EA 0%, #D9F4E8 100%)",
          border: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "2rem",
        }}
      >
        <div style={{ maxWidth: "100%", zIndex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "#FFFFFF", padding: "0.4rem 1rem", borderRadius: "999px", boxShadow: "var(--shadow-xs)", marginBottom: "1.25rem" }}>
            <span style={{ fontSize: "1.1rem" }}>🍊</span>
            <span style={{ fontFamily: "Fredoka, sans-serif", fontWeight: 700, color: "var(--primary)", fontSize: "0.95rem" }}>
              Menu de la semaine, sans pépin
            </span>
          </div>

          <h1 style={{ marginBottom: "1.25rem", color: "var(--text-primary)" }}>
            Repas frais &amp; budget maîtrisé,<br />
            <span style={{ color: "var(--primary)" }}>en toute simplicité.</span>
          </h1>

          <p style={{ fontSize: "1.1rem", color: "var(--text-secondary)", marginBottom: "2rem", lineHeight: 1.6 }}>
            Planifiez vos repas de la semaine, sauvegardez vos recettes favorites et conservez le contrôle sur vos dépenses de courses !
          </p>

          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <Link href="/planning" className="btn btn-primary btn-lg">
              📅 Mon Planning
            </Link>
            <Link href="/budget" className="btn btn-outline btn-lg">
              💰 Mon Budget
            </Link>
          </div>
        </div>
      </section>

      {/* ── FONCTIONNALITÉS CLÉS ── */}
      <section style={{ marginBottom: "4rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <span className="badge badge-accent" style={{ marginBottom: "0.5rem" }}>✨ Fonctionnalités</span>
          <h2>Tout pour simplifier vos repas</h2>
          <p style={{ color: "var(--text-secondary)", maxWidth: "540px", margin: "0 auto" }}>
            Trois outils simples et intuitifs conçus pour vous faire gagner du temps et maîtriser votre budget.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: "1.5rem" }}>
          {features.map((f) => (
            <Link key={f.href} href={f.href} style={{ textDecoration: "none", color: "inherit" }}>
              <article className="card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                <div style={{ background: "var(--primary-light)", padding: "2.25rem 1.5rem", textAlign: "center" }}>
                  <span style={{ fontSize: "3.5rem", lineHeight: 1 }}>{f.emoji}</span>
                </div>
                <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: ".75rem", flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ margin: 0 }}>{f.title}</h3>
                    <span className="badge badge-accent" style={{ fontSize: "0.75rem" }}>{f.badge}</span>
                  </div>
                  <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: ".9375rem" }}>{f.desc}</p>
                  <span style={{ color: "var(--primary)", fontWeight: 700, marginTop: "auto", display: "inline-block", paddingTop: ".5rem" }}>
                    {f.cta} →
                  </span>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </section>

      {/* ── BANNIÈRE PARCOURIR PAR CATÉGORIE ── */}
      <section style={{ background: "var(--accent-light)", borderRadius: "var(--radius-xl)", padding: "3rem 2rem", textAlign: "center", border: "1px solid var(--border)" }}>
        <h2 style={{ marginBottom: ".75rem" }}>🥑 Cuisiner selon vos ingrédients</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "2rem", maxWidth: "600px", margin: "0 auto 2rem" }}>
          Explorez vos ingrédients par catégorie pour trouver des idées de recettes avec ce que vous avez déjà dans votre frigo.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.85rem", justifyContent: "center" }}>
          {[
            ["🍎","Fruits"],["🥦","Légumes"],["🥩","Protéines"],
            ["🌾","Glucides"],["🧀","Produits Laitiers"],["🫒","Matières Grasses"],["🌶️","Épices"],
          ].map(([emoji, label]) => (
            <Link key={label} href="/ingredients">
              <span className="badge" style={{ padding: ".65rem 1.25rem", fontSize: "0.95rem", cursor: "pointer", background: "white", border: "1px solid var(--border)", boxShadow: "var(--shadow-xs)" }}>
                {emoji} {label}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
