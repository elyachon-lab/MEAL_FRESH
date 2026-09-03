"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getLocalRecipes, mergeRecipes } from "../lib/storage";
import { getIngredientEmoji, inferCategoryName } from "../lib/emojis";

type Category = {
  id: string;
  name: string;
  ingredients?: any[];
};

function normalizeStr(str?: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/s$/, "") // Ignorer le s du pluriel si besoin (ex: protides / proteines)
    .trim();
}

export default function CategoryDetailView({
  initialCategory,
  serverRecipes = [],
  addIngredientAction,
}: {
  initialCategory: Category;
  serverRecipes?: any[];
  addIngredientAction: (formData: FormData) => Promise<void>;
}) {
  const [allCategoryRecipes, setAllCategoryRecipes] = useState<any[]>([]);
  const [categoryIngredients, setCategoryIngredients] = useState<{ name: string; emoji: string; count: number }[]>([]);
  const [selectedIngName, setSelectedIngName] = useState<string | null>(null);

  const refreshCategoryData = useCallback(() => {
    // 1. Récupérer toutes les recettes (BDD + local)
    const recipes = mergeRecipes(serverRecipes);
    const targetCatNorm = normalizeStr(initialCategory.name);
    const targetCatId = initialCategory.id;

    // Set de tous les noms d'ingrédients rattachés à cette catégorie côté serveur
    const categoryIngNamesSet = new Set<string>();
    (initialCategory.ingredients || []).forEach((ing: any) => {
      if (ing.name) categoryIngNamesSet.add(normalizeStr(ing.name));
    });

    const matchingRecipesList: any[] = [];
    const ingCountMap = new Map<string, number>();

    recipes.forEach(rec => {
      let recipeBelongsToCategory = false;

      (rec.ingredients || []).forEach((ri: any) => {
        const rawIngName = ri.ingredient?.name || ri.name || "";
        if (!rawIngName) return;

        const ingNameNorm = normalizeStr(rawIngName);
        const catId = ri.ingredient?.category?.id || ri.categoryId;
        const catName = ri.ingredient?.category?.name || ri.categoryName || inferCategoryName(rawIngName);
        const catNameNorm = normalizeStr(catName);

        // Correspondance 4 niveaux :
        // 1. ID de catégorie exact
        // 2. Nom de catégorie normalisé
        // 3. Catégorie inférée à partir du nom d'ingrédient
        // 4. Ingrédient présent dans la liste des ingrédients de cette catégorie
        const isMatch =
          (catId && catId === targetCatId) ||
          (catNameNorm && catNameNorm.includes(targetCatNorm)) ||
          (targetCatNorm && catNameNorm.includes(targetCatNorm)) ||
          categoryIngNamesSet.has(ingNameNorm) ||
          (normalizeStr(inferCategoryName(rawIngName)).includes(targetCatNorm));

        if (isMatch) {
          recipeBelongsToCategory = true;

          const key = rawIngName.trim();
          ingCountMap.set(key, (ingCountMap.get(key) || 0) + 1);
        }
      });

      // Également vérifier si des recettes proviennent de initialCategory.ingredients
      if (!recipeBelongsToCategory && initialCategory.ingredients) {
        initialCategory.ingredients.forEach((ing: any) => {
          (ing.recipes || []).forEach((rRecord: any) => {
            if (rRecord.recipe?.id === rec.id || rRecord.recipe?.title === rec.title) {
              recipeBelongsToCategory = true;
            }
          });
        });
      }

      if (recipeBelongsToCategory) {
        matchingRecipesList.push(rec);
      }
    });

    // Également répertorier tous les ingrédients de initialCategory.ingredients
    (initialCategory.ingredients || []).forEach((ing: any) => {
      const key = ing.name.trim();
      if (!ingCountMap.has(key)) {
        const count = ing.recipes?.length || 0;
        ingCountMap.set(key, count);
      }
    });

    // Formater la liste des bulles d'ingrédients
    const ingBubbles = Array.from(ingCountMap.entries()).map(([name, count]) => ({
      name,
      emoji: getIngredientEmoji(name, initialCategory.name),
      count,
    })).sort((a, b) => b.count - a.count);

    setAllCategoryRecipes(matchingRecipesList);
    setCategoryIngredients(ingBubbles);
  }, [initialCategory, serverRecipes]);

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

  // Filtrer les recettes si une bulle d'ingrédient spécifique est sélectionnée
  const displayedRecipes = selectedIngName
    ? allCategoryRecipes.filter(rec =>
        (rec.ingredients || []).some((ri: any) => {
          const ingName = ri.ingredient?.name || ri.name || "";
          return normalizeStr(ingName) === normalizeStr(selectedIngName);
        })
      )
    : allCategoryRecipes;

  return (
    <div>
      <div className="page-header">
        <div>
          <Link href="/ingredients" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 600, marginBottom: "0.5rem", display: "inline-block" }}>
            ← Retour aux catégories
          </Link>
          <h1>🥑 Catégorie : {initialCategory.name}</h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>
            {allCategoryRecipes.length} recette{allCategoryRecipes.length > 1 ? "s" : ""} liée{allCategoryRecipes.length > 1 ? "s" : ""} aux ingrédients de cette catégorie.
          </p>
        </div>
      </div>

      {/* ── BARRE DE SÉLECTION D'INGRÉDIENTS À LA JOW (BULLES CIRCULAIRES) ── */}
      <div style={{ marginBottom: "2rem", background: "var(--surface)", padding: "1.25rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.1rem", margin: 0 }}>
            🛒 Ingrédients de la catégorie ({categoryIngredients.length})
          </h2>
          {selectedIngName && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setSelectedIngName(null)}
              style={{ fontSize: "0.8rem", color: "var(--primary)" }}
            >
              ✕ Réinitialiser le filtre (Voir toutes les {allCategoryRecipes.length} recettes)
            </button>
          )}
        </div>

        {categoryIngredients.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Aucun ingrédient répertorié dans cette catégorie pour le moment.
          </p>
        ) : (
          <div style={{ display: "flex", gap: "1rem", overflowX: "auto", paddingBottom: "0.5rem", scrollbarWidth: "thin" }}>
            {/* Bulle "Tous" */}
            <button
              type="button"
              onClick={() => setSelectedIngName(null)}
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
                  background: selectedIngName === null ? "var(--primary-light)" : "var(--bg)",
                  border: `2px solid ${selectedIngName === null ? "var(--primary)" : "var(--border)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.6rem",
                  boxShadow: selectedIngName === null ? "var(--shadow-sm)" : "none",
                  transition: "all 0.2s ease",
                  transform: selectedIngName === null ? "scale(1.05)" : "scale(1)",
                }}
              >
                🌟
              </div>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: selectedIngName === null ? "var(--primary)" : "var(--text-secondary)" }}>
                Tous ({allCategoryRecipes.length})
              </span>
            </button>

            {/* Bulles d'ingrédients circulaires (Style Jow) */}
            {categoryIngredients.map((ing, i) => {
              const isSelected = selectedIngName?.toLowerCase() === ing.name.toLowerCase();
              return (
                <button
                  key={`${ing.name}_${i}`}
                  type="button"
                  onClick={() => setSelectedIngName(isSelected ? null : ing.name)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    gap: "0.4rem",
                    flexShrink: 0,
                    maxWidth: "90px",
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
                    {ing.emoji}
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
                    {ing.count} recette{ing.count > 1 ? "s" : ""}
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
              📖 Recettes {selectedIngName ? `avec "${selectedIngName}"` : `de la catégorie ${initialCategory.name}`}
            </h2>
            <span className="badge badge-accent">{displayedRecipes.length} recette{displayedRecipes.length > 1 ? "s" : ""}</span>
          </div>

          {displayedRecipes.length === 0 ? (
            <div className="card panel" style={{ textAlign: "center", padding: "3rem" }}>
              <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>
                Aucune recette liée à {selectedIngName ? `"${selectedIngName}"` : "cette catégorie"} pour le moment.
              </p>
              <Link href="/recipes" className="btn btn-primary btn-sm">
                ➕ Créer une recette
              </Link>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
              {displayedRecipes.map((recipe, idx) => (
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
                          const ingName = ri.ingredient?.name || ri.name || "";
                          const catName = ri.ingredient?.category?.name || ri.categoryName || initialCategory.name;
                          const qty = ri.quantity ? `${ri.quantity} ` : "";
                          const emoji = getIngredientEmoji(ingName, catName);
                          const isMatch = selectedIngName
                            ? normalizeStr(ingName) === normalizeStr(selectedIngName)
                            : (normalizeStr(catName).includes(normalizeStr(initialCategory.name)) || normalizeStr(inferCategoryName(ingName)).includes(normalizeStr(initialCategory.name)));

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
