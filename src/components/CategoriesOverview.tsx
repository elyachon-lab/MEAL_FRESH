"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getLocalRecipes } from "../lib/storage";
import { getIngredientEmoji } from "../lib/emojis";

const categoryEmojis: Record<string, string> = {
  "Protéines":           "🥩",
  "Glucides":            "🍚",
  "Légumes":             "🥦",
  "Fruits":              "🍎",
  "Produits Laitiers":   "🧀",
  "Sucré":               "🍬",
  "Matières Grasses":    "🫒",
  "Épices & Condiments": "🌿",
};

function getCategoryEmoji(name: string): string {
  return categoryEmojis[name] ?? "🍽️";
}

type IngredientItem = {
  name: string;
  categoryName: string;
  emoji: string;
  recipes: any[];
};

export default function CategoriesOverview({ initialCategories }: { initialCategories: any[] }) {
  const [categories, setCategories] = useState(initialCategories);
  const [ingredientList, setIngredientList] = useState<IngredientItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIngName, setSelectedIngName] = useState<string | null>(null);

  const refreshData = useCallback(() => {
    const localRecipes = getLocalRecipes();
    
    // 1. Décompte par catégorie
    const catMap = new Map<string, Set<string>>();
    initialCategories.forEach(cat => {
      catMap.set(cat.id, new Set());
    });

    // 2. Map d'ingrédients globale (Nom -> Recipes)
    const ingMap = new Map<string, IngredientItem>();

    localRecipes.forEach(rec => {
      (rec.ingredients || []).forEach(ingLine => {
        const ingName = ingLine.ingredient?.name || ingLine.name;
        if (!ingName) return;

        const catId = ingLine.ingredient?.category?.id || ingLine.categoryId;
        const catName = ingLine.ingredient?.category?.name || ingLine.categoryName || "Glucides";

        initialCategories.forEach(cat => {
          const isMatch =
            (catId && catId === cat.id) ||
            (catName && catName.toLowerCase() === cat.name.toLowerCase()) ||
            (catId && catId.toLowerCase() === cat.name.toLowerCase());

          if (isMatch) {
            catMap.get(cat.id)?.add(ingName.toLowerCase().trim());
          }
        });

        // Ajouter à ingMap
        const key = ingName.toLowerCase().trim();
        const existing: IngredientItem = ingMap.get(key) || {
          name: ingName,
          categoryName: catName,
          emoji: getIngredientEmoji(ingName, catName),
          recipes: [],
        };

        const hasRecipe = existing.recipes.some((r: any) => r.id === rec.id || r.title.toLowerCase() === rec.title.toLowerCase());
        if (!hasRecipe) {
          existing.recipes.push(rec);
        }

        ingMap.set(key, existing);
      });
    });

    const updatedCategories = initialCategories.map(cat => {
      const serverCount = cat._count?.ingredients ?? 0;
      const localCount = catMap.get(cat.id)?.size ?? 0;
      return {
        ...cat,
        totalCount: Math.max(serverCount, localCount),
      };
    });

    setCategories(updatedCategories);
    setIngredientList(Array.from(ingMap.values()).sort((a, b) => b.recipes.length - a.recipes.length));
  }, [initialCategories]);

  useEffect(() => {
    refreshData();

    const handleUpdate = () => refreshData();
    window.addEventListener("mealfresh_recipes_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("mealfresh_recipes_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [refreshData]);

  // Filtrer les bulles d'ingrédients selon la recherche textuelle
  const filteredIngredients = ingredientList.filter(ing =>
    ing.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ing.categoryName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Ingrédient sélectionné
  const activeIngredient = selectedIngName
    ? ingredientList.find(i => i.name.toLowerCase() === selectedIngName.toLowerCase())
    : null;

  // Liste des recettes correspondantes à afficher
  const matchingRecipes = activeIngredient
    ? activeIngredient.recipes
    : searchQuery.trim()
    ? ingredientList
        .filter(ing => ing.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .flatMap(ing => ing.recipes)
        .filter((rec, idx, self) => self.findIndex(r => r.id === rec.id) === idx)
    : [];

  return (
    <div>
      <div className="page-header">
        <div className="badge badge-accent mb-1">🥑 Répertoire Culinaire & Catégories</div>
        <h1>Ingrédients & Recettes</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: ".25rem" }}>
          Cliquez sur un ingrédient ou sélectionnez une catégorie pour accéder directement à vos recettes.
        </p>
      </div>

      {/* ── BARRE DE RECHERCHE D'INGRÉDIENTS RAPIDE ── */}
      <div className="card panel" style={{ marginBottom: "2rem", padding: "1.25rem" }}>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="input-label" style={{ fontSize: "0.9rem" }}>🔍 Rechercher un Ingrédient ou une Recette</label>
          <input
            className="input-field"
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSelectedIngName(null); }}
            placeholder="Ex: Riz, Poulet, Saumon, Chocolat, Brocoli..."
            style={{ fontSize: "1rem" }}
          />
        </div>
      </div>

      {/* ── EXPLORATEUR D'INGRÉDIENTS PAR BULLES (STYLE JOW) ── */}
      <div style={{ marginBottom: "2.5rem", background: "var(--surface)", padding: "1.25rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.1rem", margin: 0 }}>
            🎯 Cliquez sur un ingrédient pour voir ses recettes ({filteredIngredients.length})
          </h2>
          {selectedIngName && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setSelectedIngName(null)}
              style={{ fontSize: "0.8rem", color: "var(--primary)" }}
            >
              ✕ Effacer la sélection
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: "1rem", overflowX: "auto", paddingBottom: "0.5rem", scrollbarWidth: "thin" }}>
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
              }}
            >
              🌟
            </div>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: selectedIngName === null ? "var(--primary)" : "var(--text-secondary)" }}>
              Tous
            </span>
          </button>

          {filteredIngredients.map((ing, i) => {
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
                  {ing.recipes.length} recette{ing.recipes.length > 1 ? "s" : ""}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── SECTION RECETTES TROUVÉES PAR INGRÉDIENT ── */}
      {(selectedIngName || searchQuery.trim()) && (
        <div style={{ marginBottom: "3rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.25rem", margin: 0 }}>
              📖 Recettes avec {activeIngredient ? `"${activeIngredient.name}"` : `la recherche "${searchQuery}"`}
            </h2>
            <span className="badge badge-accent">{matchingRecipes.length} recette{matchingRecipes.length > 1 ? "s" : ""}</span>
          </div>

          {matchingRecipes.length === 0 ? (
            <div className="card panel" style={{ textAlign: "center", padding: "2.5rem" }}>
              <p style={{ color: "var(--text-secondary)" }}>Aucune recette trouvée avec cet ingrédient.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
              {matchingRecipes.map((recipe: any) => (
                <div key={recipe.id} className="card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
                      <span style={{ fontSize: "1.2rem" }}>🍲</span>
                      <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{recipe.title}</h3>
                    </div>

                    {recipe.ingredients?.length > 0 && (
                      <div style={{ marginBottom: "0.75rem", display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                        {recipe.ingredients.map((ri: any, idx: number) => {
                          const name = ri.ingredient?.name || ri.name;
                          const qty = ri.quantity ? `${ri.quantity} ` : "";
                          const isHighlighted = activeIngredient && name.toLowerCase().includes(activeIngredient.name.toLowerCase());
                          return (
                            <span
                              key={idx}
                              className={`badge ${isHighlighted ? 'badge-accent' : 'badge-neutral'}`}
                              style={{ fontSize: "0.78rem" }}
                            >
                              {name} {qty && `(${qty.trim()})`}
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
                      📅 Glisser au semainier
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CARTES DE CATÉGORIES D'INGRÉDIENTS ── */}
      <h2 style={{ fontSize: "1.3rem", marginBottom: "1rem" }}>📂 Parcourir par Catégories Culinaires</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1.25rem" }}>
        {categories.map((category: any) => {
          const ingCount = category.totalCount ?? (category._count?.ingredients ?? 0);
          return (
            <Link key={category.id} href={`/ingredients/${category.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <article className="card" style={{ height: "100%", overflow: "hidden", transition: "transform 0.2s, box-shadow 0.2s" }}>
                <div style={{ background: "var(--primary-light)", padding: "2rem 1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: "3.25rem", lineHeight: 1 }}>{getCategoryEmoji(category.name)}</span>
                </div>
                <div className="card-body" style={{ padding: "1.25rem" }}>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-primary)" }}>{category.name}</h3>
                  <p style={{ margin: ".35rem 0 .75rem", fontSize: ".85rem", color: "var(--text-secondary)" }}>
                    {ingCount} ingrédient{ingCount !== 1 ? "s" : ""} référencé{ingCount !== 1 ? "s" : ""}
                  </p>
                  <span style={{ fontSize: ".85rem", color: "var(--primary)", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    Voir les recettes &rarr;
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
