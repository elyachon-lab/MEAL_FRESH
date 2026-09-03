import { getCategories } from "../actions/ingredients";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const categoryEmojis: Record<string, string> = {
  "Fruits":              "🍎",
  "Légumes":             "🥦",
  "Protéines":           "🥩",
  "Glucides":            "🌾",
  "Produits Laitiers":   "🧀",
  "Matières Grasses":    "🫒",
  "Épices & Condiments": "🌶️",
};

function getCategoryEmoji(name: string): string {
  return categoryEmojis[name] ?? "🍽️";
}

export default async function IngredientsPage() {
  const categories = await getCategories();

  return (
    <div>
      <div className="page-header">
        <div className="badge badge-accent mb-1">🥑 Répertoire Culinaire</div>
        <h1>Parcourir par catégorie</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: ".25rem" }}>
          Consultez tous vos ingrédients classés par catégorie et découvrez les recettes associées.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1.25rem" }}>
        {categories.map((category: any) => {
          const ingCount = category._count?.ingredients ?? 0;
          return (
            <Link key={category.id} href={`/ingredients/${category.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <article className="card" style={{ height: "100%", overflow: "hidden" }}>
                <div style={{ background: "var(--primary-light)", padding: "2rem 1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: "3rem", lineHeight: 1 }}>{getCategoryEmoji(category.name)}</span>
                </div>
                <div className="card-body">
                  <h3 style={{ margin: 0, fontSize: "1.05rem", color: "var(--text-primary)" }}>{category.name}</h3>
                  <p style={{ margin: ".25rem 0 .5rem", fontSize: ".8125rem", color: "var(--text-secondary)" }}>
                    {ingCount} ingrédient{ingCount !== 1 ? "s" : ""} enregistré{ingCount !== 1 ? "s" : ""}
                  </p>
                  <span style={{ fontSize: ".85rem", color: "var(--primary)", fontWeight: 700 }}>
                    Voir les détails &rarr;
                  </span>
                </div>
              </article>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
