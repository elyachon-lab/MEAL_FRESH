"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getLocalRecipes } from "../lib/storage";

type Ingredient = {
  id: string;
  name: string;
  recipes: any[];
};

type Category = {
  id: string;
  name: string;
  ingredients: Ingredient[];
};

export default function CategoryDetailView({
  initialCategory,
  addIngredientAction,
}: {
  initialCategory: Category;
  addIngredientAction: (formData: FormData) => Promise<void>;
}) {
  const [category, setCategory] = useState<Category>(initialCategory);

  const refreshCategoryData = useCallback(() => {
    const localRecipes = getLocalRecipes();
    
    // Dupliquer la liste initiale des ingrédients
    const ingredientMap = new Map<string, Ingredient>();
    
    initialCategory.ingredients.forEach(ing => {
      ingredientMap.set(ing.name.toLowerCase().trim(), {
        id: ing.id,
        name: ing.name,
        recipes: [...ing.recipes],
      });
    });

    // Parcourir les recettes enregistrées dans le localStorage du navigateur
    localRecipes.forEach(rec => {
      (rec.ingredients || []).forEach(ingLine => {
        const ingName = ingLine.ingredient?.name || ingLine.name;
        if (!ingName) return;

        const catId = ingLine.ingredient?.category?.id || ingLine.categoryId;
        const catName = ingLine.ingredient?.category?.name || ingLine.categoryName;

        // Correspondance robuste : par ID direct, ou par nom de catégorie exact
        const isMatch =
          (catId && catId === initialCategory.id) ||
          (catName && catName.toLowerCase() === initialCategory.name.toLowerCase()) ||
          (catId && catId.toLowerCase() === initialCategory.name.toLowerCase());

        if (isMatch) {
          const key = ingName.toLowerCase().trim();
          const existingIng: Ingredient = ingredientMap.get(key) || {
            id: "local_ing_" + Math.random().toString(36).substring(2, 6),
            name: ingName,
            recipes: [],
          };

          // Vérifier si cette recette est déjà enregistrée sous cet ingrédient
          const hasRecipe = existingIng.recipes.some(
            (r: any) => r.recipe.id === rec.id || r.recipe.title.toLowerCase() === rec.title.toLowerCase()
          );
          
          if (!hasRecipe) {
            existingIng.recipes.push({
              recipe: { id: rec.id, title: rec.title },
              quantity: ingLine.quantity || null,
            });
          }

          ingredientMap.set(key, existingIng);
        }
      });
    });

    setCategory({
      ...initialCategory,
      ingredients: Array.from(ingredientMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
    });
  }, [initialCategory]);

  useEffect(() => {
    refreshCategoryData();

    const handleUpdate = () => refreshCategoryData();
    window.addEventListener("mealfresh_recipes_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("mealfresh_recipes_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [refreshCategoryData]);

  return (
    <div>
      <div className="page-header">
        <div>
          <Link href="/ingredients" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 600, marginBottom: "0.5rem", display: "inline-block" }}>
            ← Retour aux catégories
          </Link>
          <h1>🥑 {category.name}</h1>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "2rem", alignItems: "start" }}>
        
        {/* Formulaire d'ajout manuel d'un ingrédient */}
        <div className="card panel" style={{ height: "fit-content" }}>
          <h2 style={{ fontSize: "1.15rem", marginBottom: "1rem" }}>➕ Ajouter un Ingrédient</h2>
          <form action={addIngredientAction} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label" htmlFor="name">Nom de l'ingrédient</label>
              <input type="text" id="name" name="name" className="input-field" required placeholder="Ex: Brocoli, Saumon..." />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
              Enregistrer l'ingrédient
            </button>
          </form>
        </div>

        {/* Liste des ingrédients et leurs recettes associées */}
        <div>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>
            Ingrédients enregistrés ({category.ingredients.length})
          </h2>
          
          {category.ingredients.length === 0 ? (
            <div className="card panel" style={{ textAlign: "center", padding: "3rem" }}>
              <p style={{ color: "var(--text-secondary)" }}>Aucun ingrédient dans cette catégorie pour le moment. Enregistrez une recette avec des ingrédients !</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
              {category.ingredients.map((ing) => (
                <div key={ing.id} className="card panel" style={{ padding: "1.25rem" }}>
                  <h3 style={{ color: "var(--primary)", marginBottom: "0.5rem" }}>{ing.name}</h3>
                  
                  {ing.recipes.length > 0 ? (
                    <div>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>Présent dans :</span>
                      <ul style={{ marginTop: "0.4rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                        {ing.recipes.map((ri: any, rIdx: number) => (
                          <li key={`${ri.recipe.id}_${rIdx}`} style={{ fontSize: "0.85rem", background: "var(--primary-light)", padding: "0.35rem 0.65rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--primary-mid)" }}>
                            <strong>📖 {ri.recipe.title}</strong> {ri.quantity && <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>({ri.quantity})</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0 }}>Aucune recette n'utilise cet ingrédient.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
