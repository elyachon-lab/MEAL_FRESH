"use client";

import { useState, useEffect } from "react";
import { mergeRecipes } from "../lib/storage";
import RecipeCard from "./RecipeCard";

export default function RecipeBankList({ initialRecipes, categories }: { initialRecipes: any[]; categories: any[] }) {
  const [recipes, setRecipes] = useState(initialRecipes);

  useEffect(() => {
    setRecipes(mergeRecipes(initialRecipes));
  }, [initialRecipes]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--text-secondary)", margin: 0 }}>
          {recipes.length} recette{recipes.length !== 1 ? "s" : ""} enregistrée{recipes.length !== 1 ? "s" : ""}
        </h2>
      </div>

      {recipes.length === 0 ? (
        <div className="card panel" style={{ textAlign: "center", padding: "3rem" }}>
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
  );
}
