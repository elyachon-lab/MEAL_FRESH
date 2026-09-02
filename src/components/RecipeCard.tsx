"use client";

import { useState, useTransition } from "react";
import { deleteRecipe, updateRecipeWithIngredients } from "../app/actions/recipes";

type Category = { id: string; name: string };
type RecipeIngredient = {
  ingredient: { id: string; name: string; category: { id: string; name: string } };
  quantity: string | null;
};
type Recipe = {
  id: string;
  title: string;
  urlSource: string | null;
  instructions: string | null;
  ingredients: RecipeIngredient[];
};

type IngredientLine = { name: string; categoryId: string; quantity: string };

const CATEGORY_EMOJIS: Record<string, string> = {
  "Fruits": "🍎",
  "Légumes": "🥦",
  "Protéines": "🥩",
  "Glucides": "🌾",
  "Produits Laitiers": "🧀",
  "Matières Grasses": "🫒",
  "Épices & Condiments": "🌶️",
};

export default function RecipeCard({ recipe, categories }: { recipe: Recipe; categories: Category[] }) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(recipe.title);
  const [urlSource, setUrlSource] = useState(recipe.urlSource ?? "");
  const [instructions, setInstructions] = useState(recipe.instructions ?? "");
  const [ingredients, setIngredients] = useState<IngredientLine[]>(
    recipe.ingredients.map(ri => ({
      name: ri.ingredient.name,
      categoryId: ri.ingredient.category.id,
      quantity: ri.quantity ?? "",
    }))
  );

  const [ingName, setIngName] = useState("");
  const [ingQty, setIngQty] = useState("");
  const [ingCategoryId, setIngCategoryId] = useState(categories[0]?.id ?? "");

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name ?? "";
  const getCategoryEmoji = (id: string) => CATEGORY_EMOJIS[getCategoryName(id)] ?? "🍽️";

  const handleAddIngredient = () => {
    if (!ingName.trim()) return;
    setIngredients([...ingredients, { name: ingName.trim(), categoryId: ingCategoryId || categories[0]?.id || "", quantity: ingQty }]);
    setIngName(""); setIngQty("");
  };

  const handleRemoveIngredient = (i: number) => {
    const arr = [...ingredients]; arr.splice(i, 1); setIngredients(arr);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); handleAddIngredient(); }
  };

  const handleSave = () => {
    startTransition(async () => {
      await updateRecipeWithIngredients({ id: recipe.id, title, urlSource, instructions, ingredients });
      setEditing(false);
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await deleteRecipe(recipe.id);
    });
  };

  if (editing) {
    return (
      <div className="card" style={{ border: "2px solid var(--primary)", opacity: isPending ? 0.6 : 1 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Titre *</label>
            <input className="input-field" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Lien source</label>
            <input className="input-field" type="url" value={urlSource} onChange={e => setUrlSource(e.target.value)} placeholder="https://..." />
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Instructions</label>
            <textarea className="input-field" rows={3} value={instructions} onChange={e => setInstructions(e.target.value)} />
          </div>

          <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
            <div style={{ background: "var(--surface-hover)", padding: "0.75rem 1rem", fontWeight: 600, fontSize: "0.875rem" }}>🛒 Ingrédients</div>
            <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {ingredients.length > 0 && (
                <ul style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {ingredients.map((ing, i) => (
                    <li key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface-hover)", padding: "0.4rem 0.75rem", borderRadius: "var(--radius-md)", fontSize: "0.875rem" }}>
                      <span>{getCategoryEmoji(ing.categoryId)} {ing.quantity && <b>{ing.quantity} </b>}{ing.name}</span>
                      <button type="button" onClick={() => handleRemoveIngredient(i)} style={{ color: "#ef4444", border: "none", background: "transparent", cursor: "pointer" }}>✕</button>
                    </li>
                  ))}
                </ul>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 90px", gap: "0.5rem" }}>
                <input className="input-field" value={ingName} onChange={e => setIngName(e.target.value)} onKeyDown={handleKeyDown} placeholder="Nom de l'ingrédient" style={{ marginBottom: 0 }} />
                <input className="input-field" value={ingQty} onChange={e => setIngQty(e.target.value)} onKeyDown={handleKeyDown} placeholder="Qté" style={{ marginBottom: 0 }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0.5rem" }}>
                <select className="input-field" value={ingCategoryId} onChange={e => setIngCategoryId(e.target.value)} style={{ marginBottom: 0 }}>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{CATEGORY_EMOJIS[cat.name] ?? "🍽️"} {cat.name}</option>
                  ))}
                </select>
                <button type="button" onClick={handleAddIngredient} className="btn btn-primary" style={{ padding: "0.5rem 0.75rem" }}>+ Ajouter</button>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={isPending}>💾 Enregistrer</button>
            <button className="btn" onClick={() => setEditing(false)} disabled={isPending} style={{ background: "var(--border)", color: "var(--text-primary)" }}>Annuler</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ position: "relative", opacity: isPending ? 0.6 : 1 }}>
      <div style={{ position: "absolute", top: "1rem", right: "1rem", display: "flex", gap: "0.5rem" }}>
        <button onClick={() => setEditing(true)} title="Modifier" style={{ background: "var(--surface-hover)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "0.4rem 0.6rem", cursor: "pointer" }}>✏️</button>
        {confirmDelete ? (
          <>
            <button onClick={handleDelete} disabled={isPending} style={{ background: "#ef4444", color: "white", border: "none", borderRadius: "var(--radius-md)", padding: "0.4rem 0.75rem", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem" }}>Confirmer</button>
            <button onClick={() => setConfirmDelete(false)} disabled={isPending} style={{ background: "var(--border)", border: "none", borderRadius: "var(--radius-md)", padding: "0.4rem 0.6rem", cursor: "pointer" }}>✕</button>
          </>
        ) : (
          <button onClick={() => setConfirmDelete(true)} title="Supprimer" style={{ background: "var(--surface-hover)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "0.4rem 0.6rem", cursor: "pointer" }}>🗑️</button>
        )}
      </div>

      <h3 style={{ marginBottom: "0.5rem", paddingRight: "5.5rem" }}>{recipe.title}</h3>

      {recipe.urlSource && (
        <a href={recipe.urlSource} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", fontSize: "0.875rem" }}>
          🔗 Voir la source
        </a>
      )}

      {recipe.ingredients.length > 0 && (
        <div style={{ marginTop: "0.75rem", display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {recipe.ingredients.map(ri => (
            <span key={ri.ingredient.id} style={{ background: "var(--surface-hover)", border: "1px solid var(--border)", borderRadius: "999px", padding: "0.2rem 0.75rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              {CATEGORY_EMOJIS[ri.ingredient.category.name] ?? "🍽️"} {ri.quantity ? `${ri.quantity} ` : ""}{ri.ingredient.name}
            </span>
          ))}
        </div>
      )}

      {recipe.instructions && (
        <p style={{ marginTop: "0.75rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
          {recipe.instructions.length > 120 ? recipe.instructions.substring(0, 120) + "…" : recipe.instructions}
        </p>
      )}
    </div>
  );
}
