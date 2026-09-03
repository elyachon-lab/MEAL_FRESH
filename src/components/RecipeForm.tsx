"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createRecipeWithIngredients } from "../app/actions/recipes";
import { saveLocalRecipe } from "../lib/storage";

type Category = { id: string; name: string };

const CATEGORY_EMOJIS: Record<string, string> = {
  "Fruits": "🍎",
  "Légumes": "🥦",
  "Protéines": "🥩",
  "Glucides": "🌾",
  "Produits Laitiers": "🧀",
  "Matières Grasses": "🫒",
  "Épices & Condiments": "🌶️",
};

type IngredientLine = { name: string; categoryId: string; quantity: string };

export default function RecipeForm({ categories, onSuccess }: { categories: Category[]; onSuccess?: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [urlSource, setUrlSource] = useState("");
  const [instructions, setInstructions] = useState("");
  const [ingredients, setIngredients] = useState<IngredientLine[]>([]);

  const [ingName, setIngName] = useState("");
  const [ingQty, setIngQty] = useState("");
  const [ingCategoryId, setIngCategoryId] = useState(categories[0]?.id ?? "");

  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!ingCategoryId && categories.length > 0) {
      setIngCategoryId(categories[0].id);
    }
  }, [categories, ingCategoryId]);

  const handleAddIngredient = () => {
    if (!ingName.trim()) return;
    const catId = ingCategoryId || categories[0]?.id || "";
    setIngredients([...ingredients, { name: ingName.trim(), categoryId: catId, quantity: ingQty }]);
    setIngName("");
    setIngQty("");
  };

  const handleRemove = (i: number) => {
    const arr = [...ingredients];
    arr.splice(i, 1);
    setIngredients(arr);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddIngredient();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setMessage({ text: "Veuillez entrer un titre de recette.", type: "error" });
      return;
    }

    setMessage(null);

    startTransition(async () => {
      try {
        let finalIngredients = [...ingredients];
        if (ingName.trim()) {
          const catId = ingCategoryId || categories[0]?.id || "";
          finalIngredients.push({ name: ingName.trim(), categoryId: catId, quantity: ingQty });
        }

        // 1. Sauvegarder dans le localStorage du navigateur pour garantir la persistance permanente
        saveLocalRecipe({
          title,
          urlSource,
          instructions,
          ingredients: finalIngredients,
        });

        // 2. Envoyer au serveur
        const res = await createRecipeWithIngredients({
          title,
          urlSource,
          instructions,
          ingredients: finalIngredients,
        });

        if (res && res.success === false) {
          setMessage({ text: res.error || "Erreur lors de l'enregistrement.", type: "error" });
          return;
        }

        setTitle("");
        setUrlSource("");
        setInstructions("");
        setIngredients([]);
        setIngName("");
        setIngQty("");

        setMessage({ text: "✅ Recette enregistrée dans la banque avec succès !", type: "success" });

        router.refresh();

        if (onSuccess) {
          onSuccess();
        }

        setTimeout(() => setMessage(null), 4000);
      } catch (err: any) {
        setMessage({ text: err?.message || "Erreur lors de l'enregistrement.", type: "error" });
      }
    });
  };

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name ?? "Général";
  const getCategoryEmoji = (id: string) => CATEGORY_EMOJIS[getCategoryName(id)] ?? "🍽️";

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {message && (
        <div
          className={`badge ${message.type === "success" ? "badge-accent" : "badge-neutral"}`}
          style={{
            padding: "0.75rem 1rem",
            borderRadius: "var(--radius-md)",
            fontSize: "0.875rem",
            textAlign: "center",
            display: "block",
            color: message.type === "success" ? "var(--accent)" : "var(--danger)",
            background: message.type === "success" ? "var(--accent-light)" : "#fee2e2",
          }}
        >
          {message.text}
        </div>
      )}

      <div className="input-group" style={{ marginBottom: 0 }}>
        <label className="input-label" htmlFor="rf-title">Titre de la recette *</label>
        <input
          id="rf-title"
          className="input-field"
          required
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Ex: Tarte aux Pommes, Poulet Rôti..."
        />
      </div>

      <div className="input-group" style={{ marginBottom: 0 }}>
        <label className="input-label" htmlFor="rf-url">Lien web / Source (optionnel)</label>
        <input
          id="rf-url"
          className="input-field"
          type="url"
          value={urlSource}
          onChange={e => setUrlSource(e.target.value)}
          placeholder="https://..."
        />
      </div>

      <div className="input-group" style={{ marginBottom: 0 }}>
        <label className="input-label" htmlFor="rf-instructions">Instructions de préparation</label>
        <textarea
          id="rf-instructions"
          className="input-field"
          rows={3}
          value={instructions}
          onChange={e => setInstructions(e.target.value)}
          placeholder="Étapes de préparation..."
        />
      </div>

      {/* Section ingrédients */}
      <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
        <div style={{ background: "var(--surface-hover)", padding: "0.75rem 1rem", fontWeight: 600, fontSize: "0.875rem" }}>
          🛒 Ingrédients (optionnels)
        </div>

        <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {/* Liste des ingrédients ajoutés */}
          {ingredients.length > 0 && (
            <ul style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {ingredients.map((ing, i) => (
                <li key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface-hover)", padding: "0.5rem 0.75rem", borderRadius: "var(--radius-md)", fontSize: "0.875rem" }}>
                  <span>
                    <span style={{ marginRight: "0.4rem" }}>{getCategoryEmoji(ing.categoryId)}</span>
                    {ing.quantity && <b>{ing.quantity} </b>}
                    {ing.name}
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginLeft: "0.4rem" }}>({getCategoryName(ing.categoryId)})</span>
                  </span>
                  <button type="button" onClick={() => handleRemove(i)} style={{ color: "#ef4444", border: "none", background: "transparent", cursor: "pointer", fontSize: "1.1rem", lineHeight: 1 }}>✕</button>
                </li>
              ))}
            </ul>
          )}

          {/* Ligne d'ajout rapide d'un ingrédient */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 90px", gap: "0.5rem" }}>
            <input
              className="input-field"
              value={ingName}
              onChange={e => setIngName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nom ingrédient (ex: Tomate)"
              style={{ marginBottom: 0 }}
            />
            <input
              className="input-field"
              value={ingQty}
              onChange={e => setIngQty(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Qté"
              style={{ marginBottom: 0 }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0.5rem", alignItems: "center" }}>
            <select
              className="input-field"
              value={ingCategoryId}
              onChange={e => setIngCategoryId(e.target.value)}
              style={{ marginBottom: 0 }}
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {CATEGORY_EMOJIS[cat.name] ?? "🍽️"} {cat.name}
                </option>
              ))}
            </select>
            <button type="button" onClick={handleAddIngredient} className="btn btn-outline btn-sm" style={{ padding: "0.6rem 1rem", whiteSpace: "nowrap" }}>
              + Ingrédient
            </button>
          </div>
        </div>
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        disabled={isPending}
        style={{ marginTop: "0.25rem", padding: "0.875rem", width: "100%" }}
      >
        {isPending ? "Enregistrement en cours..." : "💾 Enregistrer la recette"}
      </button>
    </form>
  );
}
