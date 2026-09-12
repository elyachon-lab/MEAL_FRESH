"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { fillMissingRecipeImages } from "../app/actions/recipes";
import { mergeRecipes } from "../lib/storage";
import RecipeCard from "./RecipeCard";

const BATCH_SIZE = 10;

export default function RecipeBankList({ initialRecipes, categories }: { initialRecipes: any[]; categories: any[] }) {
  const [recipes, setRecipes] = useState(() => mergeRecipes(initialRecipes));
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    setRecipes(mergeRecipes(initialRecipes));

    const handleUpdate = () => {
      setRecipes(mergeRecipes(initialRecipes));
    };

    window.addEventListener("mealfresh_recipes_updated", handleUpdate);
    return () => {
      window.removeEventListener("mealfresh_recipes_updated", handleUpdate);
    };
  }, [initialRecipes]);

  const missing = recipes.filter((r: any) => !r.imageUrl).length;

  /**
   * Illustre les recettes lot par lot.
   *
   * Une application Unsplash en mode « demo » est plafonnée à 50 requêtes par
   * heure : on enchaîne les lots tant qu'il en reste, mais on s'arrête dès
   * qu'un passage ne progresse plus, sinon la boucle tournerait indéfiniment
   * sur des recettes qu'Unsplash ne sait pas illustrer.
   */
  async function handleIllustrate() {
    setRunning(true);
    setStatus({ tone: "info", text: "Recherche des photos…" });

    let done = 0;
    let skipped = 0;

    try {
      for (;;) {
        const result = await fillMissingRecipeImages(BATCH_SIZE);

        if (!result.success) {
          setStatus({ tone: "error", text: result.error ?? "Erreur inconnue." });
          return;
        }

        done += result.illustrated;
        skipped += result.notFound;

        if (result.illustrated === 0 || result.remaining === 0) {
          const parts = [`${done} recette${done !== 1 ? "s" : ""} illustrée${done !== 1 ? "s" : ""}`];
          if (skipped > 0) parts.push(`${skipped} sans photo trouvée`);
          if (result.remaining > 0) parts.push(`${result.remaining} restante${result.remaining !== 1 ? "s" : ""}`);
          setStatus({ tone: "info", text: parts.join(" · ") });
          break;
        }

        setStatus({ tone: "info", text: `${done} illustrée${done !== 1 ? "s" : ""}, ${result.remaining} restante${result.remaining !== 1 ? "s" : ""}…` });
      }

      router.refresh();
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--text-secondary)", margin: 0 }}>
          {recipes.length} recette{recipes.length !== 1 ? "s" : ""} enregistrée{recipes.length !== 1 ? "s" : ""}
        </h2>

        {missing > 0 && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handleIllustrate}
            disabled={running}
            title="Cherche une photo libre de droits sur Unsplash pour chaque recette qui n'en a pas"
          >
            {running ? "⏳ Recherche…" : `🖼️ Illustrer ${missing} recette${missing !== 1 ? "s" : ""}`}
          </button>
        )}
      </div>

      {status && (
        <p
          role="status"
          style={{
            margin: "0 0 1rem",
            padding: "0.6rem 0.9rem",
            borderRadius: "var(--radius-md)",
            fontSize: "0.85rem",
            background: status.tone === "error" ? "#fee2e2" : "var(--accent-light)",
            color: status.tone === "error" ? "#b91c1c" : "var(--text-primary)",
          }}
        >
          {status.text}
        </p>
      )}

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
