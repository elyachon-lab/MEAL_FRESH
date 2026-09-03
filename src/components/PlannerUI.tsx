"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { format, startOfWeek, addDays, addWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import { assignMeal, removeMeal } from "../app/actions/planning";
import { updateRecipeWithIngredients, deleteRecipe } from "../app/actions/recipes";
import { mergeRecipes, deleteLocalRecipe, saveLocalRecipe, mergePlannings, saveLocalPlanning, removeLocalPlanning } from "../lib/storage";
import { inferCategoryName, getIngredientEmoji } from "../lib/emojis";
import RecipeForm from "./RecipeForm";

type Category = { id: string; name: string };
type IngredientLine = { name: string; categoryId: string; quantity: string };
type Recipe = {
  id: string;
  title: string;
  urlSource?: string | null;
  instructions?: string | null;
  ingredients?: {
    ingredient: { id: string; name: string; category: { id: string; name: string } };
    quantity: string | null;
  }[];
};

type PlannedMeal = { id: string; recipe: Recipe; date: Date | string; mealTime: string };

type PlannerUIProps = {
  recipes: Recipe[];
  plannings: PlannedMeal[];
  categories?: Category[];
};

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const MEALS = [
  { key: "Matin", label: "Matin", icon: "🌅" },
  { key: "Midi", label: "Midi", icon: "☀️" },
  { key: "Goûter", label: "Goûter", icon: "☕" },
  { key: "Soir", label: "Soir", icon: "🌙" },
] as const;

type MealKey = "Matin" | "Midi" | "Goûter" | "Soir";

const CATEGORY_EMOJIS: Record<string, string> = {
  "Protéines": "🥩",
  "Glucides": "🌾",
  "Légumes": "🥦",
  "Fruits": "🍎",
  "Produits Laitiers": "🧀",
  "Sucré": "🍬",
  "Matières Grasses": "🫒",
  "Épices & Condiments": "🌿",
};

function getFormattedDateKey(d: Date | string): string {
  const dateObj = typeof d === "string" ? new Date(d) : d;
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSameDay(d1: Date | string, d2: Date | string): boolean {
  return getFormattedDateKey(d1) === getFormattedDateKey(d2);
}

function getRecipePrimaryCategory(recipe: Recipe): string {
  if (!recipe.ingredients || recipe.ingredients.length === 0) return "Glucides";
  for (const ri of recipe.ingredients) {
    const catName = ri.ingredient?.category?.name || (ri as any).categoryName;
    if (catName && catName !== "Général") return catName;
    const ingName = ri.ingredient?.name || (ri as any).name;
    if (ingName) return inferCategoryName(ingName);
  }
  return "Glucides";
}

export default function PlannerUI({ recipes, plannings, categories = [] }: PlannerUIProps) {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [activeDayIndex, setActiveDayIndex] = useState<number | null>(null);
  const [mobileMode, setMobileMode] = useState<"all" | "tab">("all");
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

  // Modale de détails d'une recette (au clic)
  const [viewingRecipeModal, setViewingRecipeModal] = useState<Recipe | null>(null);

  // État des éléments cochés dans la liste de courses de la semaine
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Filtre par catégorie dans la Banque de Recettes
  const [selectedBankCategory, setSelectedBankCategory] = useState<string>("ALL");

  // Décalage semaine
  const [weekOffset, setWeekOffset] = useState(0);

  // Recettes et Plannings combinés
  const [allRecipes, setAllRecipes] = useState<Recipe[]>(recipes);
  const [localPlannings, setLocalPlannings] = useState<PlannedMeal[]>(plannings);

  // Édition rapide
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editInstructions, setEditInstructions] = useState("");
  const [editIngredients, setEditIngredients] = useState<IngredientLine[]>([]);

  const [isPending, startTransition] = useTransition();

  const baseStartDate = startOfWeek(new Date(), { weekStartsOn: 1 });
  const startDate = addWeeks(baseStartDate, weekOffset);
  const endDate = addDays(startDate, 6);

  useEffect(() => {
    setIsReady(true);
    setAllRecipes(mergeRecipes(recipes));
    setLocalPlannings(mergePlannings(plannings));
  }, [recipes, plannings]);

  // Recettes filtrées et triées par catégorie pour la banque de gauche
  const filteredRecipes = useMemo(() => {
    if (selectedBankCategory === "ALL") return allRecipes;
    return allRecipes.filter(recipe => {
      const cat = getRecipePrimaryCategory(recipe);
      return cat.toLowerCase().includes(selectedBankCategory.toLowerCase());
    });
  }, [allRecipes, selectedBankCategory]);

  // Regroupement par catégories pour les menus déroulants <optgroup>
  const recipesByCategory = useMemo(() => {
    const groups: Record<string, Recipe[]> = {};
    allRecipes.forEach(recipe => {
      const cat = getRecipePrimaryCategory(recipe);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(recipe);
    });
    return groups;
  }, [allRecipes]);

  // ── CALCUL DE LA LISTE DE COURSES AUTOMATIQUE DE LA SEMAINE ──
  const weeklyPlannedMeals = useMemo(() => {
    const startKey = getFormattedDateKey(startDate);
    const endKey = getFormattedDateKey(endDate);

    return localPlannings.filter((p) => {
      const pKey = getFormattedDateKey(p.date);
      return pKey >= startKey && pKey <= endKey;
    });
  }, [localPlannings, startDate, endDate]);

  const weeklyGroceryGrouped = useMemo(() => {
    const map = new Map<string, { name: string; quantity: string; categoryName: string; count: number }>();

    weeklyPlannedMeals.forEach((planned) => {
      const ings = planned.recipe.ingredients || [];
      ings.forEach((ri: any) => {
        const rawName = ri.ingredient?.name || ri.name || "Ingrédient";
        const catName = ri.ingredient?.category?.name || ri.categoryName || inferCategoryName(rawName);
        const qty = ri.quantity || "";

        const key = rawName.toLowerCase().trim();
        if (map.has(key)) {
          const existing = map.get(key)!;
          existing.count += 1;
          if (qty && existing.quantity && !existing.quantity.includes(qty)) {
            existing.quantity += `, ${qty}`;
          } else if (qty && !existing.quantity) {
            existing.quantity = qty;
          }
        } else {
          map.set(key, {
            name: rawName,
            quantity: qty,
            categoryName: catName,
            count: 1,
          });
        }
      });
    });

    const grouped: Record<string, { name: string; quantity: string; count: number }[]> = {};
    Array.from(map.values()).forEach((item) => {
      const cat = item.categoryName || "Autre";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });

    return grouped;
  }, [weeklyPlannedMeals]);

  const totalIngredientsCount = useMemo(() => {
    return Object.values(weeklyGroceryGrouped).reduce((sum, list) => sum + list.length, 0);
  }, [weeklyGroceryGrouped]);

  const startEditRecipe = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setEditTitle(recipe.title);
    setEditUrl(recipe.urlSource ?? "");
    setEditInstructions(recipe.instructions ?? "");
    setEditIngredients(
      recipe.ingredients?.map(ri => ({
        name: ri.ingredient?.name || (ri as any).name || "",
        categoryId: ri.ingredient?.category?.id || (ri as any).categoryId || "",
        quantity: ri.quantity ?? ""
      })) ?? []
    );
  };

  const handleSaveEditRecipe = () => {
    if (!editingRecipe || !editTitle.trim()) return;

    saveLocalRecipe({
      id: editingRecipe.id,
      title: editTitle.trim(),
      urlSource: editUrl.trim(),
      instructions: editInstructions.trim(),
      ingredients: editIngredients,
    });

    startTransition(async () => {
      await updateRecipeWithIngredients({
        id: editingRecipe.id,
        title: editTitle.trim(),
        urlSource: editUrl.trim(),
        instructions: editInstructions.trim(),
        ingredients: editIngredients,
      });
      setEditingRecipe(null);
      setAllRecipes(mergeRecipes(recipes));
      router.refresh();
    });
  };

  const handleDeleteBankRecipe = (id: string) => {
    deleteLocalRecipe(id);
    startTransition(async () => {
      await deleteRecipe(id);
      if (editingRecipe?.id === id) setEditingRecipe(null);
      setAllRecipes(mergeRecipes(recipes));
      router.refresh();
    });
  };

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const isFromBank = source.droppableId === "recipe-bank";
    const recipeId = isFromBank ? draggableId.replace("recipe_", "") : null;
    const rawPlanningId = !isFromBank ? draggableId.replace("planning_", "").split("_")[0] : null;

    if (destination.droppableId !== "recipe-bank") {
      const [dayStr, mealTime] = destination.droppableId.split("-");
      const dayOffset = parseInt(dayStr, 10);
      const targetDate = addDays(startDate, dayOffset);
      targetDate.setHours(12, 0, 0, 0); // Normaliser à 12:00:00

      const recipeToAssign = isFromBank
        ? allRecipes.find(r => r.id === recipeId)
        : localPlannings.find(p => p.id === rawPlanningId || p.id === draggableId.replace("planning_", ""))?.recipe;

      if (!recipeToAssign) return;

      const tempId = "plan_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
      const newMeal: PlannedMeal = {
        id: tempId,
        recipe: recipeToAssign,
        date: targetDate,
        mealTime,
      };

      saveLocalPlanning(newMeal);

      if (!isFromBank && rawPlanningId) {
        removeLocalPlanning(rawPlanningId);
        setLocalPlannings(prev => [...prev.filter(p => p.id !== rawPlanningId), newMeal]);
      } else {
        setLocalPlannings(prev => [...prev.filter(p => p.id !== tempId), newMeal]);
      }

      startTransition(async () => {
        if (isFromBank && recipeId) {
          await assignMeal(recipeId, targetDate.toISOString(), mealTime as MealKey, undefined, tempId);
        } else if (rawPlanningId) {
          await assignMeal(recipeToAssign.id, targetDate.toISOString(), mealTime as MealKey, rawPlanningId, tempId);
        }
        router.refresh();
      });
    } else {
      if (!isFromBank && rawPlanningId) {
        removeLocalPlanning(rawPlanningId);
        setLocalPlannings(prev => prev.filter(p => p.id !== rawPlanningId));
        
        startTransition(async () => {
          await removeMeal(rawPlanningId);
          router.refresh();
        });
      }
    }
  };

  const handleSelectMeal = (dayIndex: number, mealTime: MealKey, recipeId: string, currentPlanningId?: string) => {
    const targetDate = addDays(startDate, dayIndex);
    targetDate.setHours(12, 0, 0, 0);
    
    if (!recipeId) {
      if (currentPlanningId) {
        removeLocalPlanning(currentPlanningId);
        setLocalPlannings(prev => prev.filter(p => p.id !== currentPlanningId));
        startTransition(async () => {
          await removeMeal(currentPlanningId);
          router.refresh();
        });
      }
      return;
    }

    const recipe = allRecipes.find(r => r.id === recipeId);
    if (!recipe) return;

    const tempId = currentPlanningId || "plan_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    const newMeal: PlannedMeal = { id: tempId, recipe, date: targetDate, mealTime };

    saveLocalPlanning(newMeal);
    setLocalPlannings(prev => [...prev.filter(p => p.id !== currentPlanningId && p.id !== tempId), newMeal]);

    startTransition(async () => {
      await assignMeal(recipeId, targetDate.toISOString(), mealTime, currentPlanningId, tempId);
      router.refresh();
    });
  };

  const handleRemoveMeal = (planningId: string) => {
    removeLocalPlanning(planningId);
    setLocalPlannings(prev => prev.filter(p => p.id !== planningId));
    startTransition(async () => {
      await removeMeal(planningId);
      router.refresh();
    });
  };

  const toggleCheckIngredient = (ingName: string) => {
    setCheckedIngredients(prev => ({
      ...prev,
      [ingName]: !prev[ingName]
    }));
  };

  const copyGroceryListToClipboard = () => {
    let text = `🛒 Liste de courses MealFresh - Semaine du ${format(startDate, "dd/MM")} au ${format(endDate, "dd/MM/yyyy")}\n\n`;
    Object.entries(weeklyGroceryGrouped).forEach(([catName, list]) => {
      const emoji = CATEGORY_EMOJIS[catName] || "🛒";
      text += `${emoji} ${catName.toUpperCase()} :\n`;
      list.forEach(item => {
        const isChecked = checkedIngredients[item.name] ? "[x]" : "[ ]";
        const qtyStr = item.quantity ? ` (${item.quantity})` : "";
        const countStr = item.count > 1 ? ` x${item.count}` : "";
        text += `  ${isChecked} ${item.name}${qtyStr}${countStr}\n`;
      });
      text += "\n";
    });

    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 3000);
  };

  if (!isReady) return null;

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="planner-container" style={{ opacity: isPending ? 0.85 : 1 }}>
        
        {/* Banque de Recettes (Source) */}
        <div className="card recipe-bank-card">
          <div className="recipe-bank-header">
            <div>
              <h2>📖 Banque de Recettes</h2>
              <span className="badge">{allRecipes.length} disponible{allRecipes.length > 1 ? "s" : ""}</span>
            </div>
            
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => { setShowFormModal(!showFormModal); setEditingRecipe(null); }}
              style={{ marginTop: "0.4rem" }}
            >
              {showFormModal ? "✕ Fermer" : "➕ Créer une recette"}
            </button>
          </div>

          {/* ── MENU DÉROULANT DE TRI PAR CATÉGORIE EN HAUT DE LA BANQUE ── */}
          <div className="input-group" style={{ marginBottom: "1rem" }}>
            <label className="input-label" style={{ fontSize: "0.825rem", fontWeight: 700 }}>
              🏷️ Trier la banque par catégorie :
            </label>
            <select
              className="input-field input-sm"
              style={{ width: "100%", fontSize: "0.875rem", fontWeight: 600 }}
              value={selectedBankCategory}
              onChange={(e) => setSelectedBankCategory(e.target.value)}
            >
              <option value="ALL">🌟 Toutes les catégories ({allRecipes.length})</option>
              <option value="Protéines">🥩 Protéines ({recipesByCategory["Protéines"]?.length || 0})</option>
              <option value="Glucides">🌾 Glucides ({recipesByCategory["Glucides"]?.length || 0})</option>
              <option value="Légumes">🥦 Légumes ({recipesByCategory["Légumes"]?.length || 0})</option>
              <option value="Sucré">🍬 Sucré ({recipesByCategory["Sucré"]?.length || 0})</option>
              <option value="Produits Laitiers">🧀 Produits Laitiers ({recipesByCategory["Produits Laitiers"]?.length || 0})</option>
              <option value="Fruits">🍎 Fruits ({recipesByCategory["Fruits"]?.length || 0})</option>
              <option value="Matières Grasses">🫒 Matières Grasses ({recipesByCategory["Matières Grasses"]?.length || 0})</option>
              <option value="Épices & Condiments">🌿 Épices ({recipesByCategory["Épices & Condiments"]?.length || 0})</option>
            </select>
          </div>

          {/* Formulaire de création rapide */}
          {showFormModal && (
            <div style={{ background: "var(--bg)", padding: "1rem", borderRadius: "var(--radius-md)", marginBottom: "1rem", border: "1.5px solid var(--primary)" }}>
              <h3 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>➕ Nouvelle Recette</h3>
              <RecipeForm categories={categories} onSuccess={() => { setShowFormModal(false); setAllRecipes(mergeRecipes(recipes)); router.refresh(); }} />
            </div>
          )}

          {/* Formulaire d'édition rapide */}
          {editingRecipe && (
            <div style={{ background: "var(--surface-alt)", padding: "1rem", borderRadius: "var(--radius-md)", marginBottom: "1rem", border: "2px solid var(--accent)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <h3 style={{ fontSize: "0.95rem", margin: 0 }}>✏️ Modifier : {editingRecipe.title}</h3>
                <button type="button" onClick={() => setEditingRecipe(null)} className="btn btn-ghost btn-sm" style={{ padding: "0.2rem 0.5rem" }}>✕</button>
              </div>

              <div className="input-group" style={{ marginBottom: "0.75rem" }}>
                <label className="input-label" style={{ fontSize: "0.8rem" }}>Titre *</label>
                <input className="input-field input-sm" style={{ width: "100%" }} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              </div>

              <div className="input-group" style={{ marginBottom: "0.75rem" }}>
                <label className="input-label" style={{ fontSize: "0.8rem" }}>Instructions</label>
                <textarea className="input-field" rows={2} style={{ fontSize: "0.85rem" }} value={editInstructions} onChange={(e) => setEditInstructions(e.target.value)} />
              </div>

              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                <button type="button" onClick={handleSaveEditRecipe} className="btn btn-primary btn-sm" disabled={isPending}>💾 Enregistrer</button>
                <button type="button" onClick={() => handleDeleteBankRecipe(editingRecipe.id)} className="btn btn-danger btn-sm" disabled={isPending}>🗑️ Supprimer</button>
              </div>
            </div>
          )}

          <p className="text-sm text-secondary" style={{ marginBottom: "1rem" }}>
            Glissez vos recettes triées sur les créneaux du semainier. Cliquez sur une recette pour voir ses ingrédients.
          </p>

          <Droppable droppableId="recipe-bank">
            {(provided, snapshot) => (
              <div 
                ref={provided.innerRef} 
                {...provided.droppableProps}
                className={`recipe-bank-list ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
              >
                {filteredRecipes.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                    <p className="text-muted text-sm" style={{ marginBottom: "0.75rem" }}>
                      Aucune recette dans cette catégorie.
                    </p>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setSelectedBankCategory("ALL")}
                    >
                      Voir toutes les recettes
                    </button>
                  </div>
                ) : (
                  filteredRecipes.map((recipe, index) => {
                    const primaryCat = getRecipePrimaryCategory(recipe);
                    const catEmoji = CATEGORY_EMOJIS[primaryCat] || "🍲";

                    return (
                      <Draggable key={`recipe_${recipe.id}`} draggableId={`recipe_${recipe.id}`} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`recipe-item ${snapshot.isDragging ? 'is-dragging' : ''}`}
                            onClick={() => setViewingRecipeModal(recipe)}
                            style={{
                              ...provided.draggableProps.style,
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              cursor: "pointer"
                            }}
                          >
                            <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, gap: "0.15rem" }}>
                              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", overflow: "hidden", textOverflow: "ellipsis" }}>
                                <span>🍲</span>
                                <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{recipe.title}</strong>
                              </span>
                              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                                {catEmoji} {primaryCat} • {recipe.ingredients?.length || 0} ingr.
                              </span>
                            </div>

                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              style={{ padding: "0.2rem 0.4rem", fontSize: "0.85rem" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditRecipe(recipe);
                              }}
                              title="Modifier la recette"
                            >
                              ✏️
                            </button>
                          </div>
                        )}
                      </Draggable>
                    );
                  })
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>

        {/* Semainier (Destinations) */}
        <div className="card planner-grid-card">
          <div className="planner-header">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h2>📅 Semainier de Repas</h2>
                <p className="text-sm text-secondary">
                  Semaine du {format(startDate, "dd MMMM", { locale: fr })} au {format(endDate, "dd MMMM yyyy", { locale: fr })}
                </p>
              </div>

              {/* ── BARRE DE NAVIGATION PAR SEMAINE (◀ ▶) ── */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--surface-hover)", padding: "0.4rem 0.75rem", borderRadius: "999px", border: "1px solid var(--border)" }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ padding: "0.2rem 0.6rem", fontWeight: 700, fontSize: "0.9rem" }}
                  onClick={() => setWeekOffset(prev => prev - 1)}
                  title="Semaine précédente"
                >
                  ◀
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ padding: "0.25rem 0.75rem", fontSize: "0.8rem", background: "white" }}
                  onClick={() => setWeekOffset(0)}
                  title="Revenir à aujourd'hui"
                >
                  {weekOffset === 0 ? "Aujourd'hui" : `Semaine (${weekOffset > 0 ? `+${weekOffset}` : weekOffset})`}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ padding: "0.2rem 0.6rem", fontWeight: 700, fontSize: "0.9rem" }}
                  onClick={() => setWeekOffset(prev => prev + 1)}
                  title="Semaine suivante"
                >
                  ▶
                </button>
              </div>

              {/* Mode de vue Smartphone */}
              <div className="mobile-view-toggle">
                <button
                  type="button"
                  className={`view-toggle-btn ${mobileMode === "all" ? "active" : ""}`}
                  onClick={() => { setMobileMode("all"); setActiveDayIndex(null); }}
                >
                  Vue Semaine
                </button>
                <button
                  type="button"
                  className={`view-toggle-btn ${mobileMode === "tab" ? "active" : ""}`}
                  onClick={() => { setMobileMode("tab"); if (activeDayIndex === null) setActiveDayIndex(0); }}
                >
                  Par Jour
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Onglets (Mobile) */}
          {mobileMode === "tab" && (
            <div className="mobile-day-tabs">
              {DAYS.map((dayName, index) => {
                const date = addDays(startDate, index);
                return (
                  <button
                    key={index}
                    type="button"
                    className={`mobile-day-tab ${activeDayIndex === index ? 'active' : ''}`}
                    onClick={() => setActiveDayIndex(index)}
                  >
                    <span className="day-name">{dayName.slice(0, 3)}</span>
                    <span className="day-date">{format(date, "dd/MM")}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Vue Grille Bureau */}
          <div className="desktop-planner-table">
            <div className="planner-table-header">
              <div>Jour</div>
              {MEALS.map((m) => (
                <div key={m.key} className="text-center">
                  <span>{m.icon}</span> {m.label}
                </div>
              ))}
            </div>

            {DAYS.map((dayName, dayIndex) => {
              const currentDate = addDays(startDate, dayIndex);
              return (
                <div key={dayIndex} className="planner-table-row">
                  <div className="day-label-cell">
                    <strong>{dayName}</strong>
                    <span className="text-xs text-muted">{format(currentDate, "dd/MM", { locale: fr })}</span>
                  </div>

                  {MEALS.map((m) => {
                    const plannedMeals = localPlannings.filter(
                      p => isSameDay(p.date, currentDate) && p.mealTime === m.key
                    );

                    return (
                      <Droppable key={`${dayIndex}-${m.key}`} droppableId={`${dayIndex}-${m.key}`}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`meal-slot ${snapshot.isDraggingOver ? 'slot-hover' : ''}`}
                            style={{
                              background: snapshot.isDraggingOver ? "var(--primary-light)" : "var(--surface-hover)",
                              borderRadius: "var(--radius-md)",
                              minHeight: "56px",
                              padding: "0.35rem",
                              transition: "background 0.2s ease, border-color 0.2s ease"
                            }}
                          >
                            {plannedMeals.length > 0 ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                                {plannedMeals.map((planned, pIdx) => (
                                  <Draggable key={`planning_${planned.id}_${pIdx}`} draggableId={`planning_${planned.id}_${pIdx}`} index={pIdx}>
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className={`planned-item ${snapshot.isDragging ? 'is-dragging' : ''}`}
                                        onClick={() => setViewingRecipeModal(planned.recipe)}
                                        style={{ ...provided.draggableProps.style, cursor: "pointer" }}
                                        title="Cliquer pour voir la liste des ingrédients"
                                      >
                                        <div className="planned-title" style={{ fontWeight: 600 }}>
                                          🍲 {planned.recipe.title}
                                        </div>
                                        <button
                                          type="button"
                                          className="remove-btn"
                                          title="Retirer du planning"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveMeal(planned.id);
                                          }}
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                              </div>
                            ) : null}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Vue Planning Mobile avec menus déroulants groupés par <optgroup> */}
          <div className="mobile-planner-cards">
            {DAYS.map((dayName, dayIndex) => {
              const currentDate = addDays(startDate, dayIndex);
              const isVisible = mobileMode === "all" || activeDayIndex === dayIndex;

              if (!isVisible) return null;

              return (
                <div key={dayIndex} className="mobile-day-card">
                  <div className="mobile-day-card-header">
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <h3>{dayName}</h3>
                      <span className="badge badge-neutral">{format(currentDate, "dd/MM", { locale: fr })}</span>
                    </div>
                  </div>

                  <div className="mobile-meals-grid">
                    {MEALS.map((m) => {
                      const plannedMeals = localPlannings.filter(
                        p => isSameDay(p.date, currentDate) && p.mealTime === m.key
                      );
                      const primaryPlanned = plannedMeals[0];

                      return (
                        <div key={m.key} className="mobile-meal-slot-box" style={{ background: "var(--surface-hover)", borderRadius: "var(--radius-md)", padding: "0.75rem" }}>
                          <div className="mobile-meal-slot-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <span>{m.icon}</span> <strong>{m.label}</strong>
                            </div>
                            {primaryPlanned && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                style={{ padding: "0.15rem 0.4rem", fontSize: "0.75rem" }}
                                onClick={() => setViewingRecipeModal(primaryPlanned.recipe)}
                              >
                                👁️ Voir ingrédients
                              </button>
                            )}
                          </div>

                          <div className="mobile-meal-slot-select-wrapper">
                            <select
                              className="input-field mobile-meal-select"
                              value={primaryPlanned ? primaryPlanned.recipe.id : ""}
                              onChange={(e) => handleSelectMeal(dayIndex, m.key, e.target.value, primaryPlanned?.id)}
                            >
                              <option value="">-- Choisir une recette --</option>
                              {Object.entries(recipesByCategory).map(([catName, recList]) => {
                                const emoji = CATEGORY_EMOJIS[catName] || "🍲";
                                return (
                                  <optgroup key={catName} label={`${emoji} ${catName}`}>
                                    {recList.map(r => (
                                      <option key={r.id} value={r.id}>
                                        {r.title}
                                      </option>
                                    ))}
                                  </optgroup>
                                );
                              })}
                            </select>
                            
                            {primaryPlanned && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm remove-meal-btn"
                                onClick={() => handleRemoveMeal(primaryPlanned.id)}
                                title="Supprimer"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── LISTE DE COURSES AUTOMATIQUE PAR SEMAINE (EN DESSOUS DU SEMAINIER) ── */}
          <div className="card panel" style={{ marginTop: "2rem", padding: "1.5rem", border: "2px solid var(--primary-light)", background: "var(--surface)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem" }}>
              <div>
                <div className="badge badge-primary mb-1">🛒 Généré automatiquement</div>
                <h2 style={{ fontSize: "1.3rem", margin: ".25rem 0" }}>
                  Liste des Ingrédients NÉCESSAIRES — Semaine du {format(startDate, "dd/MM")} au {format(endDate, "dd/MM")}
                </h2>
                <p className="text-xs text-muted" style={{ margin: 0 }}>
                  Calculé à partir de toutes les recettes déposées dans votre semainier pour cette semaine ({weeklyPlannedMeals.length} repas planifié{weeklyPlannedMeals.length > 1 ? "s" : ""}).
                </p>
              </div>

              {totalIngredientsCount > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={copyGroceryListToClipboard}
                  >
                    {copiedNotification ? "✅ Liste copiée !" : "📋 Copier la liste de courses"}
                  </button>
                </div>
              )}
            </div>

            {totalIngredientsCount === 0 ? (
              <div style={{ textAlign: "center", padding: "2.5rem 0", background: "var(--bg)", borderRadius: "var(--radius-md)", border: "1px dashed var(--border)" }}>
                <span style={{ fontSize: "2.5rem", display: "block", marginBottom: "0.5rem" }}>🧺</span>
                <p className="text-secondary fw-500">Aucun ingrédient pour cette semaine !</p>
                <p className="text-xs text-muted">
                  Glissez des recettes dans le semainier ci-dessus pour générer votre liste de courses automatique.
                </p>
              </div>
            ) : (
              <div className="grocery-categories-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem" }}>
                {Object.entries(weeklyGroceryGrouped).map(([catName, list]) => {
                  const emoji = CATEGORY_EMOJIS[catName] || "🛒";
                  return (
                    <div
                      key={catName}
                      style={{
                        background: "var(--bg)",
                        padding: "1rem",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border)"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.75rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
                        <span style={{ fontSize: "1.1rem" }}>{emoji}</span>
                        <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>{catName}</h4>
                        <span className="badge badge-accent" style={{ marginLeft: "auto", fontSize: "0.7rem" }}>{list.length}</span>
                      </div>

                      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {list.map((item, idx) => {
                          const isChecked = !!checkedIngredients[item.name];
                          const ingEmoji = getIngredientEmoji(item.name);

                          return (
                            <li
                              key={idx}
                              onClick={() => toggleCheckIngredient(item.name)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                fontSize: "0.875rem",
                                cursor: "pointer",
                                opacity: isChecked ? 0.5 : 1,
                                textDecoration: isChecked ? "line-through" : "none",
                                userSelect: "none"
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}} // Géré par onClick sur <li>
                                style={{ accentColor: "var(--primary)", cursor: "pointer" }}
                              />
                              <span>{ingEmoji}</span>
                              <span className="fw-500" style={{ flex: 1 }}>{item.name}</span>
                              {item.quantity && (
                                <span className="badge badge-neutral" style={{ fontSize: "0.7rem", padding: "0.15rem 0.4rem" }}>
                                  {item.quantity}
                                </span>
                              )}
                              {item.count > 1 && (
                                <span className="badge badge-primary" style={{ fontSize: "0.7rem", padding: "0.15rem 0.4rem" }}>
                                  x{item.count}
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── MODALE POPUP DU DÉTAIL DES INGRÉDIENTS D'UNE RECETTE ── */}
      {viewingRecipeModal && (
        <div
          className="modal-backdrop"
          onClick={() => setViewingRecipeModal(null)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem"
          }}
        >
          <div
            className="modal-content card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "520px",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "1.5rem",
              borderRadius: "var(--radius-lg)",
              background: "white",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
              <div>
                <span className="chip" style={{ fontSize: "0.75rem", background: "var(--primary-light)", color: "var(--primary-dark)", padding: "0.2rem 0.6rem", borderRadius: "999px", fontWeight: 700 }}>
                  {CATEGORY_EMOJIS[getRecipePrimaryCategory(viewingRecipeModal)] || "🍲"} {getRecipePrimaryCategory(viewingRecipeModal)}
                </span>
                <h2 style={{ fontSize: "1.4rem", marginTop: "0.4rem", marginBottom: 0 }}>🍲 {viewingRecipeModal.title}</h2>
              </div>

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setViewingRecipeModal(null)}
                style={{ fontSize: "1.1rem", padding: "0.2rem 0.5rem" }}
              >
                ✕
              </button>
            </div>

            {/* Liste des Ingrédients */}
            <div style={{ marginBottom: "1.25rem" }}>
              <h3 style={{ fontSize: "1rem", marginBottom: "0.75rem", color: "var(--text-main)" }}>
                🛒 Ingrédients de la recette ({viewingRecipeModal.ingredients?.length || 0})
              </h3>

              {!viewingRecipeModal.ingredients || viewingRecipeModal.ingredients.length === 0 ? (
                <p className="text-muted text-xs">Aucun ingrédient renseigné pour cette recette.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {viewingRecipeModal.ingredients.map((ri, idx) => {
                    const ingName = ri.ingredient?.name || (ri as any).name || "Ingrédient";
                    const catName = ri.ingredient?.category?.name || (ri as any).categoryName || inferCategoryName(ingName);
                    const ingEmoji = getIngredientEmoji(ingName);

                    return (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "0.6rem 0.85rem",
                          background: "var(--surface-hover)",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--border)"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ fontSize: "1.1rem" }}>{ingEmoji}</span>
                          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{ingName}</span>
                          <span className="text-xs text-muted" style={{ fontStyle: "italic" }}>({catName})</span>
                        </div>

                        {ri.quantity && (
                          <span className="badge badge-accent" style={{ fontSize: "0.75rem" }}>
                            {ri.quantity}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Instructions */}
            {viewingRecipeModal.instructions && (
              <div style={{ marginBottom: "1.25rem", background: "var(--bg)", padding: "0.85rem", borderRadius: "var(--radius-md)" }}>
                <h4 style={{ fontSize: "0.9rem", marginBottom: "0.35rem" }}>📝 Instructions / Préparation :</h4>
                <p className="text-sm" style={{ whiteSpace: "pre-wrap", margin: 0, color: "var(--text-secondary)" }}>
                  {viewingRecipeModal.instructions}
                </p>
              </div>
            )}

            {/* Actions Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1.5rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  const r = viewingRecipeModal;
                  setViewingRecipeModal(null);
                  startEditRecipe(r);
                }}
              >
                ✏️ Modifier la recette
              </button>
              
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setViewingRecipeModal(null)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </DragDropContext>
  );
}
