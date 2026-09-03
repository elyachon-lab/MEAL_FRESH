"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getLocalRecipes } from "../lib/storage";

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

export default function CategoriesOverview({ initialCategories }: { initialCategories: any[] }) {
  const [categories, setCategories] = useState(initialCategories);

  const refreshCounts = useCallback(() => {
    const localRecipes = getLocalRecipes();
    const map = new Map<string, Set<string>>();

    initialCategories.forEach(cat => {
      map.set(cat.id, new Set());
    });

    localRecipes.forEach(rec => {
      (rec.ingredients || []).forEach(ingLine => {
        const ingName = ingLine.ingredient?.name || ingLine.name;
        if (!ingName) return;

        const catId = ingLine.ingredient?.category?.id || ingLine.categoryId;
        const catName = ingLine.ingredient?.category?.name || ingLine.categoryName;

        initialCategories.forEach(cat => {
          const isMatch =
            (catId && catId === cat.id) ||
            (catName && catName.toLowerCase() === cat.name.toLowerCase()) ||
            (catId && catId.toLowerCase() === cat.name.toLowerCase());

          if (isMatch) {
            map.get(cat.id)?.add(ingName.toLowerCase().trim());
          }
        });
      });
    });

    const updated = initialCategories.map(cat => {
      const serverCount = cat._count?.ingredients ?? 0;
      const localCount = map.get(cat.id)?.size ?? 0;
      return {
        ...cat,
        totalCount: Math.max(serverCount, localCount),
      };
    });

    setCategories(updated);
  }, [initialCategories]);

  useEffect(() => {
    refreshCounts();

    const handleUpdate = () => refreshCounts();
    window.addEventListener("mealfresh_recipes_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("mealfresh_recipes_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [refreshCounts]);

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
          const ingCount = category.totalCount ?? (category._count?.ingredients ?? 0);
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
