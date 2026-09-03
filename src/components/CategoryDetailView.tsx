"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getLocalRecipes } from "../lib/storage";
import { getIngredientEmoji } from "../lib/emojis";

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
  const [selectedIngId, setSelectedIngId] = useState<string | null>(null);

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

          const hasRecipe = existingIng.recipes.some(
            (r: any) => r.recipe.id === rec.id || r.recipe.title.toLowerCase() === rec.title.toLowerCase()
          );
          
          if (!hasRecipe) {
            existingIng.recipes.push({
              recipe: { id: rec.id, title: rec.title, ingredients: rec.ingredients, instructions: rec.instructions },
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

  // Ingrédient actuellement sélectionné (ou null pour "Tous")
  const selectedIngredient = category.ingredients.find(i => i.id === selectedIngId);

  // Map unique des recettes à afficher
  const displayedRecipesMap = new Map<string, any>();
  const ingredientsToProcess = selectedIngredient ? [selectedIngredient] : category.ingredients;

  ingredientsToProcess.forEach(ing => {
    ing.recipes.forEach((ri: any) => {
      const recId = ri.recipe.id || ri.recipe.title;
      if (!displayedRecipesMap.has(recId)) {
        displayedRecipesMap.set(recId, ri.recipe);
      }
    });
  });

  const displayedRecipesList = Array.from(displayedRecipesMap.values());

  return (
    <div>
      <div className="page-header">
        <div>
          <Link href="/ingredients" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 600, marginBottom: "0.5rem", display: "inline-block" }}>
            ← Retour aux catégories
          </Link>
          <h1>🥑 {category.name}</h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>
            Sélectionnez un ingrédient ci-dessous pour afficher ses recettes associées.
          </p>
        </div>
      </div>

      {/* ── BARRE DE SÉLECTION D'INGRÉDIENTS À LA JOW (BULLES CIRCULAIRES) ── */}
      <div style={{ marginBottom: "2rem", background: "var(--surface)", padding: "1.25rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.1rem", margin: 0 }}>
            🛒 Ingrédients de la catégorie ({category.ingredients.length})
          </h2>
          {selectedIngId && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setSelectedIngId(null)}
              style={{ fontSize: "0.8rem", color: "var(--primary)" }}
            >
              ✕ Voir toutes les recettes de la catégorie
            </button>
          )}
        </div>

        {category.ingredients.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Aucun ingrédient dans cette catégorie pour le moment.
          </p>
        ) : (
          <div style={{ display: "flex", gap: "1rem", overflowX: "auto", paddingBottom: "0.5rem", scrollbarWidth: "thin" }}>
            {/* Bulle "Tous" */}
            <button
              type="button"
              onClick={() => setSelectedIngId(null)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                gap: "0.4rem",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  background: selectedIngId === null ? "var(--primary-light)" : "var(--bg)",
                  border: `2px solid ${selectedIngId === null ? "var(--primary)" : "var(--border)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.6rem",
                  boxShadow: selectedIngId === null ? "var(--shadow-sm)" : "none",
                  transition: "all 0.2s ease",
                  transform: selectedIngId === null ? "scale(1.05)" : "scale(1)",
                }}
              >
                🌟
              </div>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: selectedIngId === null ? "var(--primary)" : "var(--text-secondary)" }}>
                Tous
              </span>
            </button>

            {/* Bulles d'ingrédients circulaires avec Emojis Précis (Style Jow) */}
            {category.ingredients.map((ing) => {
              const isSelected = selectedIngId === ing.id;
              const emoji = getIngredientEmoji(ing.name, category.name);
              return (
                <button
                  key={ing.id}
                  type="button"
                  onClick={() => setSelectedIngId(isSelected ? null : ing.id)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    gap: "0.4rem",
                    flexShrink: 0,
                    maxWidth: "85px",
                  }}
                >
                  <div
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "50%",
                      background: isSelected ? "var(--accent-light)" : "var(--surface)",
                      border: `2.5px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.75rem",
                      boxShadow: isSelected ? "0 4px 14px rgba(121, 216, 128, 0.35)" : "var(--shadow-xs)",
                      transition: "all 0.2s ease",
                      position: "relative",
                      transform: isSelected ? "translateY(-3px) scale(1.05)" : "scale(1)",
                    }}
                  >
                    {emoji}
                    {isSelected && (
                      <span
                        style={{
                          position: "absolute",
                          top: "-2px",
                          right: "-2px",
                          background: "var(--accent)",
                          color: "#fff",
                          borderRadius: "50%",
                          width: "20px",
                          height: "20px",
                          fontSize: "0.7rem",
                          fontWeight: "bold",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? "var(--text-primary)" : "var(--text-secondary)",
                      textAlign: "center",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      width: "100%",
                    }}
                  >
                    {ing.name}
                  </span>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "-0.2rem" }}>
                    {ing.recipes.length} recette{ing.recipes.length > 1 ? "s" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── SECTION RECETTES LINKÉES A LA CATÉGORIE ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "1.75rem", alignItems: "start" }}>
        
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: "1.25rem", margin: 0 }}>
              📖 Recettes de la catégorie {selectedIngredient ? `"${selectedIngredient.name}"` : `"${category.name}"`}
            </h2>
            <span className="badge badge-accent">{displayedRecipesList.length} recette{displayedRecipesList.length > 1 ? "s" : ""}</span>
          </div>

          {displayedRecipesList.length === 0 ? (
            <div className="card panel" style={{ textAlign: "center", padding: "3rem" }}>
              <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>
                Aucune recette liée à {selectedIngredient ? `"${selectedIngredient.name}"` : "cette catégorie"} pour le moment.
              </p>
              <Link href="/recipes" className="btn btn-primary btn-sm">
                ➕ Créer une recette
              </Link>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
              {displayedRecipesList.map((recipe, idx) => (
                <div key={`${recipe.id}_${idx}`} className="card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.56rem" }}>
                      <span style={{ fontSize: "1.2rem" }}>🍲</span>
                      <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-primary)" }}>{recipe.title}</h3>
                    </div>

                    {/* Affichage complet des badges ingrédients de la recette */}
                    {recipe.ingredients && recipe.ingredients.length > 0 && (
                      <div style={{ marginBottom: "0.75rem", display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                        {recipe.ingredients.map((ri: any, qIdx: number) => {
                          const ingName = ri.ingredient?.name || ri.name;
                          const catName = ri.ingredient?.category?.name || ri.categoryName || category.name;
                          const qty = ri.quantity ? `${ri.quantity} ` : "";
                          const emoji = getIngredientEmoji(ingName, catName);
                          const isMatch = selectedIngredient
                            ? ingName.toLowerCase().includes(selectedIngredient.name.toLowerCase())
                            : true;

                          return (
                            <span
                              key={qIdx}
                              className={`badge ${isMatch ? 'badge-accent' : 'badge-neutral'}`}
                              style={{ fontSize: "0.78rem" }}
                            >
                              {emoji} {qty}{ingName}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {recipe.instructions && (
                      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "0.75rem" }}>
                        {recipe.instructions.length > 100 ? recipe.instructions.substring(0, 100) + "…" : recipe.instructions}
                      </p>
                    )}
                  </div>

                  <div style={{ paddingTop: "0.75rem", borderTop: "1px dashed var(--border)" }}>
                    <Link href="/planning" className="btn btn-outline btn-sm" style={{ width: "100%", textAlign: "center" }}>
                      📅 Planifier dans le semainier
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panneau latéral : Formulaire d'ajout rapide d'ingrédient */}
        <div className="card panel" style={{ height: "fit-content" }}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>➕ Ingrédient Manquant ?</h2>
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

      </div>
    </div>
  );
}
