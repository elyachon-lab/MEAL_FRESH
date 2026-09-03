import { getRecipes } from "../actions/recipes";
import { getCategories } from "../actions/ingredients";
import RecipeForm from "@/components/RecipeForm";
import RecipeBankList from "@/components/RecipeBankList";

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
        {/* Liste des recettes en grille responsive avec persistance fusionnée */}
        <div className="recipes-main-section">
          <RecipeBankList initialRecipes={recipes} categories={categories} />
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
