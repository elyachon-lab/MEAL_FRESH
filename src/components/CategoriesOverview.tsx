"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getLocalRecipes } from "../lib/storage";

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
        <div className="badge badge-accent mb-1">🥑 Répertoire Culinaire & Catégories</div>
        <h1>Ingrédients par Catégories</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: ".25rem" }}>
          Explorez vos ingrédients classés par catégorie et découvrez les recettes associées façon Jow.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1.25rem" }}>
        {categories.map((category: any) => {
          const ingCount = category.totalCount ?? (category._count?.ingredients ?? 0);
          return (
            <Link key={category.id} href={`/ingredients/${category.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <article className="card" style={{ height: "100%", overflow: "hidden", transition: "transform 0.2s, box-shadow 0.2s" }}>
                <div style={{ background: "var(--primary-light)", padding: "2.25rem 1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: "3.25rem", lineHeight: 1 }}>{getCategoryEmoji(category.name)}</span>
                </div>
                <div className="card-body" style={{ padding: "1.25rem" }}>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-primary)" }}>{category.name}</h3>
                  <p style={{ margin: ".35rem 0 .75rem", fontSize: ".85rem", color: "var(--text-secondary)" }}>
                    {ingCount} ingrédient{ingCount !== 1 ? "s" : ""} référencé{ingCount !== 1 ? "s" : ""}
                  </p>
                  <span style={{ fontSize: ".85rem", color: "var(--primary)", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    Parcourir les recettes &rarr;
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
