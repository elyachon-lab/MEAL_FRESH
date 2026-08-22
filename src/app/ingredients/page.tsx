import { getCategories } from "../actions/ingredients";
import Link from "next/link";

// Mapping des emojis Apple par catégorie
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
        <h1>Parcourir par catégorie</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: ".25rem" }}>
          Sélectionnez une catégorie pour consulter vos ingrédients et trouver des recettes associées.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1.25rem" }}>
        {categories.map((category: { id: string; name: string }) => (
          <Link key={category.id} href={`/ingredients/${category.id}`} style={{ textDecoration: "none", color: "inherit" }}>
            <article className="card" style={{ height: "100%", overflow: "hidden" }}>
              <div style={{ background: "var(--primary-light)", padding: "2rem 1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "3rem", lineHeight: 1 }}>{getCategoryEmoji(category.name)}</span>
              </div>
              <div className="card-body">
                <h3 style={{ margin: 0, fontSize: "1rem", color: "var(--text-primary)" }}>{category.name}</h3>
                <p style={{ margin: ".25rem 0 0", fontSize: ".8125rem", color: "var(--primary)", fontWeight: 600 }}>
                  Voir les recettes →
                </p>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </div>
  );
}
