"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startOfWeek, addDays } from "date-fns";
import { deleteRecipe, updateRecipeWithIngredients } from "../app/actions/recipes";
import { assignMeal } from "../app/actions/planning";
import { deleteLocalRecipe, saveLocalRecipe } from "../lib/storage";

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

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const MEALS = [
  { key: "Matin", label: "Matin", icon: "🌅" },
  { key: "Midi", label: "Midi", icon: "☀️" },
  { key: "Goûter", label: "Goûter", icon: "☕" },
  { key: "Soir", label: "Soir", icon: "🌙" },
] as const;

export default function RecipeCard({ recipe, categories }: { recipe: Recipe; categories: Category[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showPlanMenu, setShowPlanMenu] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedMeal, setSelectedMeal] = useState<"Matin" | "Midi" | "Goûter" | "Soir">("Midi");
  const [planSuccessMsg, setPlanSuccessMsg] = useState("");

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
    saveLocalRecipe({
      id: recipe.id,
      title,
      urlSource,
      instructions,
      ingredients,
      categories,
    });

    startTransition(async () => {
      await updateRecipeWithIngredients({ id: recipe.id, title, urlSource, instructions, ingredients });
      setEditing(false);
      router.refresh();
    });
  };

  const handleDelete = () => {
    deleteLocalRecipe(recipe.id);
    startTransition(async () => {
      await deleteRecipe(recipe.id);
      router.refresh();
    });
  };

  const handleAddToPlanning = () => {
    const startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
    const targetDate = addDays(startDate, selectedDay);

    startTransition(async () => {
      await assignMeal(recipe.id, targetDate.toISOString(), selectedMeal);
      setPlanSuccessMsg(`✅ Ajouté à ${DAYS[selectedDay]} (${selectedMeal}) !`);
      setTimeout(() => {
        setShowPlanMenu(false);
        setPlanSuccessMsg("");
      }, 1800);
      router.refresh();
    });
  };

  if (editing) {
    return (
      <div className="card" style={{ border: "2px solid var(--primary)", opacity: isPending ? 0.6 : 1, padding: "1.25rem", maxWidth: "100%", overflow: "hidden" }}>
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
    <div className="card" style={{ padding: "1.25rem", opacity: isPending ? 0.6 : 1, display: "flex", flexDirection: "column", justifyContent: "space-between", maxWidth: "100%", overflow: "hidden" }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem", wordBreak: "break-word" }}>{recipe.title}</h3>
          <div style={{ display: "flex", gap: "0.35rem", flexShrink: 0 }}>
            <button onClick={() => setEditing(true)} title="Modifier" style={{ background: "var(--surface-hover)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "0.35rem 0.55rem", cursor: "pointer", fontSize: "0.85rem" }}>✏️</button>
            {confirmDelete ? (
              <>
                <button onClick={handleDelete} disabled={isPending} style={{ background: "#ef4444", color: "white", border: "none", borderRadius: "var(--radius-md)", padding: "0.35rem 0.65rem", cursor: "pointer", fontWeight: 600, fontSize: "0.8rem" }}>Oui</button>
                <button onClick={() => setConfirmDelete(false)} disabled={isPending} style={{ background: "var(--border)", border: "none", borderRadius: "var(--radius-md)", padding: "0.35rem 0.55rem", cursor: "pointer", fontSize: "0.8rem" }}>✕</button>
              </>
            ) : (
              <button onClick={() => setConfirmDelete(true)} title="Supprimer" style={{ background: "var(--surface-hover)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "0.35rem 0.55rem", cursor: "pointer", fontSize: "0.85rem" }}>🗑️</button>
            )}
          </div>
        </div>

        {recipe.urlSource && (
          <a href={recipe.urlSource} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", fontSize: "0.85rem", textDecoration: "none", display: "inline-block", marginBottom: "0.5rem" }}>
            🔗 Lien de la recette
          </a>
        )}

        {recipe.ingredients.length > 0 && (
          <div style={{ marginTop: "0.5rem", display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
            {recipe.ingredients.map(ri => (
              <span key={ri.ingredient.id} style={{ background: "var(--primary-light)", border: "1px solid var(--primary-mid)", borderRadius: "999px", padding: "0.2rem 0.65rem", fontSize: "0.78rem", color: "var(--text-primary)" }}>
                {CATEGORY_EMOJIS[ri.ingredient.category.name] ?? "🍽️"} {ri.quantity ? `${ri.quantity} ` : ""}{ri.ingredient.name}
              </span>
            ))}
          </div>
        )}

        {recipe.instructions && (
          <p style={{ marginTop: "0.75rem", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            {recipe.instructions.length > 120 ? recipe.instructions.substring(0, 120) + "…" : recipe.instructions}
          </p>
        )}
      </div>

      {/* Bouton rapide d'ajout au Planning */}
      <div style={{ marginTop: "1.25rem", paddingTop: "0.75rem", borderTop: "1px dashed var(--border)" }}>
        {showPlanMenu ? (
          <div style={{ background: "var(--bg)", padding: "0.75rem", borderRadius: "var(--radius-md)", border: "1px solid var(--primary)", maxWidth: "100%", overflow: "hidden" }}>
            {planSuccessMsg ? (
              <div style={{ fontSize: "0.85rem", color: "var(--accent)", fontWeight: 600, textAlign: "center" }}>
                {planSuccessMsg}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: 700 }}>📅 Placer au planning :</span>
                  <button type="button" onClick={() => setShowPlanMenu(false)} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: "0.9rem" }}>✕</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
                  <select className="input-field input-sm" style={{ marginBottom: 0, maxWidth: "100%" }} value={selectedDay} onChange={e => setSelectedDay(parseInt(e.target.value, 10))}>
                    {DAYS.map((d, i) => (
                      <option key={i} value={i}>{d}</option>
                    ))}
                  </select>
                  <select className="input-field input-sm" style={{ marginBottom: 0, maxWidth: "100%" }} value={selectedMeal} onChange={e => setSelectedMeal(e.target.value as any)}>
                    {MEALS.map(m => (
                      <option key={m.key} value={m.key}>{m.icon} {m.label}</option>
                    ))}
                  </select>
                </div>
                <button type="button" onClick={handleAddToPlanning} className="btn btn-primary btn-sm" disabled={isPending} style={{ width: "100%", marginTop: "0.2rem" }}>
                  + Valider au planning
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowPlanMenu(true)}
            className="btn btn-outline btn-sm"
            style={{ width: "100%", fontSize: "0.825rem", padding: "0.45rem" }}
          >
            📅 Glisser / Ajouter au planning
          </button>
        )}
      </div>
    </div>
  );
}
