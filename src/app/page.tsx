import Link from "next/link";
import Image from "next/image";

const features = [
  {
    href: "/planning",
    emoji: "📅",
    title: "Planifiez votre semaine",
    desc:  "Glissez-déposez vos recettes sur chaque créneau Midi / Soir. En quelques secondes, votre menu est bouclé.",
    cta:   "Voir le planning",
  },
  {
    href: "/recipes",
    emoji: "📖",
    title: "Collectionnez vos recettes",
    desc:  "Ajoutez titre, lien source, instructions et ingrédients. Votre carnet culinaire toujours à portée de main.",
    cta:   "Mes recettes",
  },
  {
    href: "/ingredients",
    emoji: "🥑",
    title: "Cuisinez par ingrédients",
    desc:  "Naviguez par catégorie — Légumes, Protéines, Fruits… — pour trouver l'inspiration avec ce que vous avez.",
    cta:   "Explorer",
  },
];

export default function Home() {
  return (
    <>
      {/* ── HERO ── */}
      <section className="hero-section">
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <Image
            src="/hero.png"
            alt="Ingrédients frais disposés sur une table"
            fill
            style={{ objectFit: "cover", opacity: .15 }}
            priority
          />
        </div>

        <div style={{ position: "relative", zIndex: 1, maxWidth: 640, padding: "2rem" }}>
          <span className="badge" style={{ marginBottom: "1.25rem", fontSize: ".9rem" }}>
            🍊 Votre assistant cuisine personnel
          </span>
          <h1 style={{ marginBottom: "1.25rem", color: "var(--text-primary)" }}>
            Des repas frais,<br />
            <span style={{ color: "var(--primary)" }}>planifiés en un clin d'œil.</span>
          </h1>
          <p style={{ fontSize: "1.125rem", color: "var(--text-secondary)", marginBottom: "2rem" }}>
            Organisez votre semaine, sauvegardez vos recettes favorites et trouvez l'inspiration selon vos ingrédients du moment.
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/planning" className="btn btn-primary btn-lg">📅 Mon Planning</Link>
            <Link href="/recipes"  className="btn btn-outline btn-lg" style={{ background: "white" }}>📖 Mes Recettes</Link>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ marginBottom: "4rem" }}>
        <h2 style={{ textAlign: "center", marginBottom: ".75rem" }}>Comment ça marche&nbsp;?</h2>
        <p style={{ textAlign: "center", color: "var(--text-secondary)", marginBottom: "2.5rem" }}>
          Trois étapes, c'est tout.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
          {features.map((f, i) => (
            <Link key={f.href} href={f.href} style={{ textDecoration: "none", color: "inherit" }}>
              <article className="card" style={{ height: "100%" }}>
                <div style={{ background: "var(--primary-light)", padding: "2rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: "3.5rem", lineHeight: 1 }}>{f.emoji}</span>
                </div>
                <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                    <span className="badge" style={{ fontFamily: "Nunito, sans-serif", fontSize: ".75rem" }}>{i + 1}</span>
                    <h3 style={{ margin: 0 }}>{f.title}</h3>
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

      {/* ── CATEGORIES TEASER ── */}
      <section style={{ background: "var(--bg-alt)", borderRadius: "var(--radius-xl)", padding: "3rem 2rem", textAlign: "center" }}>
        <h2 style={{ marginBottom: ".75rem" }}>Parcourir par catégorie</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
          Cliquez sur une catégorie pour découvrir toutes les recettes qui utilisent ces ingrédients.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", justifyContent: "center" }}>
          {[
            ["🍎","Fruits"],["🥦","Légumes"],["🥩","Protéines"],
            ["🌾","Glucides"],["🧀","Produits Laitiers"],["🫒","Matières Grasses"],["🌶️","Épices"],
          ].map(([emoji, label]) => (
            <Link key={label} href="/ingredients">
              <span className="badge" style={{ padding: ".6rem 1.2rem", fontSize: "1rem", cursor: "pointer", transition: "background .15s" }}>
                {emoji} {label}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
