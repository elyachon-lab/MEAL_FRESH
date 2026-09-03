"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { format, startOfWeek, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { assignMeal, removeMeal } from "../app/actions/planning";
import { updateRecipeWithIngredients, deleteRecipe } from "../app/actions/recipes";
import { mergeRecipes, deleteLocalRecipe, saveLocalRecipe } from "../lib/storage";
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

// Fonction de comparaison de dates insensible au décalage horaire UTC/Local
function isSameDay(d1: Date | string, d2: Date): boolean {
  const date1 = new Date(d1);
  return (
    (date1.getUTCFullYear() === d2.getFullYear() &&
     date1.getUTCMonth() === d2.getMonth() &&
     date1.getUTCDate() === d2.getDate()) ||
    (date1.getFullYear() === d2.getFullYear() &&
     date1.getMonth() === d2.getMonth() &&
     date1.getDate() === d2.getDate())
  );
}

export default function PlannerUI({ recipes, plannings, categories = [] }: PlannerUIProps) {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [activeDayIndex, setActiveDayIndex] = useState<number | null>(null);
  const [mobileMode, setMobileMode] = useState<"all" | "tab">("all");
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

  // Recettes combinées (serveur + persistance locale navigateur)
  const [allRecipes, setAllRecipes] = useState<Recipe[]>(recipes);
  
  // État optimiste du planning pour affichage immédiat au lâcher de la carte
  const [localPlannings, setLocalPlannings] = useState<PlannedMeal[]>(plannings);

  // État formulaire édition rapide recette
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editInstructions, setEditInstructions] = useState("");
  const [editIngredients, setEditIngredients] = useState<IngredientLine[]>([]);

  const [isPending, startTransition] = useTransition();
  const startDate = startOfWeek(new Date(), { weekStartsOn: 1 });

  useEffect(() => {
    setIsReady(true);
    setAllRecipes(mergeRecipes(recipes));
    setLocalPlannings(plannings);
  }, [recipes, plannings]);

  const startEditRecipe = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setEditTitle(recipe.title);
    setEditUrl(recipe.urlSource ?? "");
    setEditInstructions(recipe.instructions ?? "");
    setEditIngredients(
      recipe.ingredients?.map(ri => ({
        name: ri.ingredient.name,
        categoryId: ri.ingredient.category.id,
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
    
    // Dépot dans le semainier
    if (destination.droppableId !== "recipe-bank") {
      const [dayStr, mealTime] = destination.droppableId.split("-");
      const dayOffset = parseInt(dayStr, 10);
      const targetDate = addDays(startDate, dayOffset);

      const recipeToAssign = isFromBank
        ? allRecipes.find(r => r.id === recipeId)
        : localPlannings.find(p => p.id === draggableId.replace("planning_", ""))?.recipe;

      if (!recipeToAssign) return;

      // 1. MISE À JOUR OPTIMISTE IMMÉDIATE DU PLANNING AU MOMENT DU LÂCHER
      const tempId = "temp_" + Date.now();
      const updatedLocal = localPlannings.filter(p => {
        // Retirer tout ancien repas sur ce créneau et ce jour
        return !(isSameDay(p.date, targetDate) && p.mealTime === mealTime);
      });

      updatedLocal.push({
        id: tempId,
        recipe: recipeToAssign,
        date: targetDate,
        mealTime,
      });

      setLocalPlannings(updatedLocal);

      // 2. SYNCHRONISATION SERVEUR EN ARRIÈRE-PLAN
      startTransition(async () => {
        if (isFromBank && recipeId) {
          await assignMeal(recipeId, targetDate.toISOString(), mealTime as MealKey);
        } else {
          const planningId = draggableId.replace("planning_", "");
          await assignMeal(recipeToAssign.id, targetDate.toISOString(), mealTime as MealKey, planningId);
        }
        router.refresh();
      });
    } else {
      // Dépot vers la banque (retrait du planning)
      if (!isFromBank) {
        const planningId = draggableId.replace("planning_", "");
        setLocalPlannings(prev => prev.filter(p => p.id !== planningId));
        
        startTransition(async () => {
          await removeMeal(planningId);
          router.refresh();
        });
      }
    }
  };

  const handleSelectMeal = (dayIndex: number, mealTime: MealKey, recipeId: string, currentPlanningId?: string) => {
    const targetDate = addDays(startDate, dayIndex);
    
    if (!recipeId) {
      if (currentPlanningId) {
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

    // Mise à jour optimiste
    const tempId = currentPlanningId || "temp_" + Date.now();
    const updated = localPlannings.filter(p => !(isSameDay(p.date, targetDate) && p.mealTime === mealTime));
    updated.push({ id: tempId, recipe, date: targetDate, mealTime });
    setLocalPlannings(updated);

    startTransition(async () => {
      await assignMeal(recipeId, targetDate.toISOString(), mealTime, currentPlanningId);
      router.refresh();
    });
  };

  const handleRemoveMeal = (planningId: string) => {
    setLocalPlannings(prev => prev.filter(p => p.id !== planningId));
    startTransition(async () => {
      await removeMeal(planningId);
      router.refresh();
    });
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
              <span className="badge">{allRecipes.length} enregistrée{allRecipes.length > 1 ? "s" : ""}</span>
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

          {/* Formulaire de création rapide */}
          {showFormModal && (
            <div style={{ background: "var(--bg)", padding: "1rem", borderRadius: "var(--radius-md)", marginBottom: "1rem", border: "1.5px solid var(--primary)" }}>
              <h3 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>➕ Nouvelle Recette dans la Banque</h3>
              <RecipeForm categories={categories} onSuccess={() => { setShowFormModal(false); setAllRecipes(mergeRecipes(recipes)); router.refresh(); }} />
            </div>
          )}

          {/* Formulaire d'édition rapide de recette dans la banque */}
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
            Glissez une recette vers un créneau du semainier puis lâchez-la pour la déposer.
          </p>

          <Droppable droppableId="recipe-bank">
            {(provided, snapshot) => (
              <div 
                ref={provided.innerRef} 
                {...provided.droppableProps}
                className={`recipe-bank-list ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
              >
                {allRecipes.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                    <p className="text-muted text-sm" style={{ marginBottom: "0.75rem" }}>
                      Aucune recette enregistrée.
                    </p>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setShowFormModal(true)}
                    >
                      + Ajouter votre 1ère recette
                    </button>
                  </div>
                ) : (
                  allRecipes.map((recipe, index) => (
                    <Draggable key={`recipe_${recipe.id}`} draggableId={`recipe_${recipe.id}`} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`recipe-item ${snapshot.isDragging ? 'is-dragging' : ''}`}
                          style={{
                            ...provided.draggableProps.style,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            cursor: snapshot.isDragging ? "grabbing" : "grab"
                          }}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                            <span>🍲</span>
                            <strong>{recipe.title}</strong>
                          </span>

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
                  ))
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>

        {/* Semainier (Destinations) */}
        <div className="card planner-grid-card">
          <div className="planner-header">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <h2>📅 Semainier de Repas</h2>
                <p className="text-sm text-secondary">
                  Semaine du {format(startDate, "dd MMMM", { locale: fr })} au {format(addDays(startDate, 6), "dd MMMM yyyy", { locale: fr })}
                </p>
              </div>

              {/* Mode de vue sur Smartphone */}
              <div className="mobile-view-toggle">
                <button
                  type="button"
                  className={`view-toggle-btn ${mobileMode === "all" ? "active" : ""}`}
                  onClick={() => { setMobileMode("all"); setActiveDayIndex(null); }}
                >
                  Vue Semaine (Défilant)
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

          {/* Navigation par Onglets Jours (Visible sur Mobile si mode 'tab') */}
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

          {/* Vue Grille Bureau (Tableau 4 créneaux pour grand écran) */}
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
                    const planned = localPlannings.find(
                      p => isSameDay(p.date, currentDate) && p.mealTime === m.key
                    );

                    return (
                      <Droppable key={`${dayIndex}-${m.key}`} droppableId={`${dayIndex}-${m.key}`}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`meal-slot ${snapshot.isDraggingOver ? 'slot-hover' : ''}`}
                          >
                            {planned ? (
                              <Draggable key={`planning_${planned.id}`} draggableId={`planning_${planned.id}`} index={0}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`planned-item ${snapshot.isDragging ? 'is-dragging' : ''}`}
                                  >
                                    <div className="planned-title">{planned.recipe.title}</div>
                                    <button
                                      type="button"
                                      className="remove-btn"
                                      title="Retirer du planning"
                                      onClick={() => handleRemoveMeal(planned.id)}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                )}
                              </Draggable>
                            ) : (
                              <div className="empty-slot">
                                <span className="empty-text">+ Glisser ici</span>
                              </div>
                            )}
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

          {/* Vue Planning Mobile (Défilant par jour avec 4 créneaux) */}
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
                      const planned = localPlannings.find(
                        p => isSameDay(p.date, currentDate) && p.mealTime === m.key
                      );

                      return (
                        <div key={m.key} className="mobile-meal-slot-box">
                          <div className="mobile-meal-slot-header">
                            <span>{m.icon}</span> <strong>{m.label}</strong>
                          </div>

                          <div className="mobile-meal-slot-select-wrapper">
                            <select
                              className="input-field mobile-meal-select"
                              value={planned ? planned.recipe.id : ""}
                              onChange={(e) => handleSelectMeal(dayIndex, m.key, e.target.value, planned?.id)}
                            >
                              <option value="">-- Ajouter un repas --</option>
                              {allRecipes.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.title}
                                </option>
                              ))}
                            </select>
                            
                            {planned && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm remove-meal-btn"
                                onClick={() => handleRemoveMeal(planned.id)}
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

        </div>
      </div>
    </DragDropContext>
  );
}
