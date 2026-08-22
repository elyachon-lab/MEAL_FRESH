import { getRecipes } from "../actions/recipes";
import { getCategories } from "../actions/ingredients";
import RecipeForm from "@/components/RecipeForm";
import RecipeCard from "@/components/RecipeCard";

export default async function RecipesPage() {
  const [recipes, categories] = await Promise.all([getRecipes(), getCategories()]);

  return (
    <div>
      <div className="page-header">
        <h1>📖 Banque de Recettes</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "2rem" }}>
        {/* Liste des recettes */}
        <div>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem", color: "var(--text-secondary)" }}>
            {recipes.length} recette{recipes.length !== 1 ? "s" : ""} enregistrée{recipes.length !== 1 ? "s" : ""}
          </h2>

          {recipes.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📭</div>
              <p style={{ color: "var(--text-secondary)" }}>Aucune recette pour le moment. Commencez par en ajouter une !</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {recipes.map(recipe => (
                <RecipeCard key={recipe.id} recipe={recipe} categories={categories} />
              ))}
            </div>
          )}
        </div>

        {/* Formulaire d'ajout fixe */}
        <div className="card" style={{ height: "fit-content", position: "sticky", top: "90px" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "1.5rem" }}>➕ Ajouter une Recette</h2>
          <RecipeForm categories={categories} />
        </div>
      </div>
    </div>
  );
}
