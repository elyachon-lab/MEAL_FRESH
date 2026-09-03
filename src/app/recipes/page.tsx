import { getRecipes } from "../actions/recipes";
import { getCategories } from "../actions/ingredients";
import RecipeForm from "@/components/RecipeForm";
import RecipeCard from "@/components/RecipeCard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RecipesPage() {
  const [recipes, categories] = await Promise.all([getRecipes(), getCategories()]);

  return (
    <div className="recipes-page-wrapper">
      <div className="page-header" style={{ paddingBottom: "1rem" }}>
        <h1>📖 Banque de Recettes</h1>
        <p className="text-secondary text-sm">
          Consultez vos recettes enregistrées, leurs ingrédients et ajoutez-en de nouvelles facilement.
        </p>
      </div>

      <div className="recipes-layout">
        {/* Liste des recettes en grille responsive */}
        <div className="recipes-main-section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--text-secondary)", margin: 0 }}>
              {recipes.length} recette{recipes.length !== 1 ? "s" : ""} enregistrée{recipes.length !== 1 ? "s" : ""}
            </h2>
          </div>

          {recipes.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📭</div>
              <p style={{ color: "var(--text-secondary)" }}>Aucune recette pour le moment. Commencez par en ajouter une !</p>
            </div>
          ) : (
            <div className="recipes-cards-grid">
              {recipes.map((recipe: any) => (
                <RecipeCard key={recipe.id} recipe={recipe} categories={categories} />
              ))}
            </div>
          )}
        </div>

        {/* Formulaire d'ajout en sidebar / fixe */}
        <div className="recipes-sidebar-section">
          <div className="card panel recipe-form-card">
            <h2 style={{ fontSize: "1.2rem", marginBottom: "1.25rem" }}>➕ Ajouter une Recette</h2>
            <RecipeForm categories={categories} />
          </div>
        </div>
      </div>
    </div>
  );
}
