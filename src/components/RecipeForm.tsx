"use client";

import { useState } from "react";
import { createRecipeWithIngredients } from "../app/actions/recipes";

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

export default function RecipeForm({ categories }: { categories: Category[] }) {
  const [title, setTitle] = useState("");
  const [urlSource, setUrlSource] = useState("");
  const [instructions, setInstructions] = useState("");
  const [ingredients, setIngredients] = useState<IngredientLine[]>([]);

  const [ingName, setIngName] = useState("");
  const [ingQty, setIngQty] = useState("");
  const [ingCategoryId, setIngCategoryId] = useState(categories[0]?.id ?? "");

  const handleAddIngredient = () => {
    if (!ingName.trim() || !ingCategoryId) return;
    setIngredients([...ingredients, { name: ingName.trim(), categoryId: ingCategoryId, quantity: ingQty }]);
    setIngName("");
    setIngQty("");
  };

  const handleRemove = (i: number) => {
    const arr = [...ingredients];
    arr.splice(i, 1);
    setIngredients(arr);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); handleAddIngredient(); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await createRecipeWithIngredients({ title, urlSource, instructions, ingredients });
    setTitle(""); setUrlSource(""); setInstructions(""); setIngredients([]);
  };

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name ?? "";
  const getCategoryEmoji = (id: string) => CATEGORY_EMOJIS[getCategoryName(id)] ?? "🍽️";

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div className="input-group" style={{ marginBottom: 0 }}>
        <label className="input-label" htmlFor="rf-title">Titre *</label>
        <input id="rf-title" className="input-field" required value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Pâtes Carbonara" />
      </div>

      <div className="input-group" style={{ marginBottom: 0 }}>
        <label className="input-label" htmlFor="rf-url">Lien source (optionnel)</label>
        <input id="rf-url" className="input-field" type="url" value={urlSource} onChange={e => setUrlSource(e.target.value)} placeholder="https://..." />
      </div>

      <div className="input-group" style={{ marginBottom: 0 }}>
        <label className="input-label" htmlFor="rf-instructions">Instructions</label>
        <textarea id="rf-instructions" className="input-field" rows={3} value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Étapes de préparation..." />
      </div>

      {/* Section ingrédients */}
      <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
        <div style={{ background: "var(--surface-hover)", padding: "0.75rem 1rem", fontWeight: 600, fontSize: "0.875rem" }}>
          🛒 Ingrédients
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

          {/* Ligne d'ajout rapide */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 90px", gap: "0.5rem" }}>
            <input
              className="input-field"
              value={ingName}
              onChange={e => setIngName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nom de l'ingrédient (Ex: Tomate)"
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
            <button type="button" onClick={handleAddIngredient} className="btn btn-primary" style={{ padding: "0.75rem 1.25rem", whiteSpace: "nowrap" }}>
              + Ajouter
            </button>
          </div>

          <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: 0 }}>
            💡 Appuyez sur Entrée pour ajouter rapidement l'ingrédient.
          </p>
        </div>
      </div>

      <button type="submit" className="btn btn-primary" style={{ marginTop: "0.25rem", padding: "0.875rem" }}>
        💾 Enregistrer la recette
      </button>
    </form>
  );
}
