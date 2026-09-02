"use client";

import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { format, startOfWeek, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { assignMeal, removeMeal } from "../app/actions/planning";
import RecipeForm from "./RecipeForm";

type Category = { id: string; name: string };
type Recipe = { id: string; title: string };
type PlannedMeal = { id: string; recipe: Recipe; date: Date; mealTime: string };

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

export default function PlannerUI({ recipes, plannings, categories = [] }: PlannerUIProps) {
  const [isReady, setIsReady] = useState(false);
  const [activeDayIndex, setActiveDayIndex] = useState<number | null>(null);
  const [mobileMode, setMobileMode] = useState<"all" | "tab">("all");
  const [showFormModal, setShowFormModal] = useState(false);

  const startDate = startOfWeek(new Date(), { weekStartsOn: 1 });

  useEffect(() => {
    setIsReady(true);
  }, []);

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const isFromBank = source.droppableId === "recipe-bank";
    const recipeId = isFromBank ? draggableId.replace("recipe_", "") : null;
    
    if (destination.droppableId !== "recipe-bank") {
      const [dayStr, mealTime] = destination.droppableId.split("-");
      const dayOffset = parseInt(dayStr, 10);
      const targetDate = addDays(startDate, dayOffset);
      
      if (isFromBank && recipeId) {
        await assignMeal(recipeId, targetDate, mealTime as MealKey);
      } else {
        const planningId = draggableId.replace("planning_", "");
        await assignMeal("", targetDate, mealTime as MealKey, planningId);
      }
    } else {
      if (!isFromBank) {
        const planningId = draggableId.replace("planning_", "");
        await removeMeal(planningId);
      }
    }
  };

  const handleSelectMeal = async (dayIndex: number, mealTime: MealKey, recipeId: string, currentPlanningId?: string) => {
    const targetDate = addDays(startDate, dayIndex);
    if (!recipeId) {
      if (currentPlanningId) {
        await removeMeal(currentPlanningId);
      }
    } else {
      await assignMeal(recipeId, targetDate, mealTime, currentPlanningId);
    }
  };

  if (!isReady) return null;

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="planner-container">
        
        {/* Banque de Recettes (Source) */}
        <div className="card recipe-bank-card">
          <div className="recipe-bank-header">
            <div>
              <h2>📖 Banque de Recettes</h2>
              <span className="badge">{recipes.length} enregistrée{recipes.length > 1 ? "s" : ""}</span>
            </div>
            
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setShowFormModal(!showFormModal)}
              style={{ marginTop: "0.4rem" }}
            >
              {showFormModal ? "✕ Fermer" : "➕ Créer une recette"}
            </button>
          </div>

          {/* Formulaire rapide de création intégré dans la Banque */}
          {showFormModal && (
            <div style={{ background: "var(--bg)", padding: "1rem", borderRadius: "var(--radius-md)", marginBottom: "1rem", border: "1.5px solid var(--primary)" }}>
              <h3 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>➕ Nouvelle Recette dans la Banque</h3>
              <RecipeForm categories={categories} onSuccess={() => setShowFormModal(false)} />
            </div>
          )}

          <p className="text-sm text-secondary" style={{ marginBottom: "1rem" }}>
            Glissez une recette vers un créneau ou sélectionnez-la dans les menus déroulants.
          </p>

          <Droppable droppableId="recipe-bank">
            {(provided, snapshot) => (
              <div 
                ref={provided.innerRef} 
                {...provided.droppableProps}
                className={`recipe-bank-list ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
              >
                {recipes.length === 0 ? (
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
                  recipes.map((recipe, index) => (
                    <Draggable key={`recipe_${recipe.id}`} draggableId={`recipe_${recipe.id}`} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`recipe-item ${snapshot.isDragging ? 'is-dragging' : ''}`}
                        >
                          <span style={{ marginRight: "0.4rem" }}>🍲</span>
                          {recipe.title}
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
                    const planned = plannings.find(
                      p => new Date(p.date).getDay() === currentDate.getDay() && p.mealTime === m.key
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
                                      onClick={() => removeMeal(planned.id)}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                )}
                              </Draggable>
                            ) : (
                              <div className="empty-slot">
                                <span className="empty-text">+ Glisser</span>
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
                      const planned = plannings.find(
                        p => new Date(p.date).getDay() === currentDate.getDay() && p.mealTime === m.key
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
                              {recipes.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.title}
                                </option>
                              ))}
                            </select>
                            
                            {planned && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm remove-meal-btn"
                                onClick={() => removeMeal(planned.id)}
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
