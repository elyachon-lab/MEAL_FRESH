"use client";

import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { format, startOfWeek, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { assignMeal, removeMeal } from "../app/actions/planning";

type Recipe = { id: string; title: string };
type PlannedMeal = { id: string; recipe: Recipe; date: Date; mealTime: string };

type PlannerUIProps = {
  recipes: Recipe[];
  plannings: PlannedMeal[];
};

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const MEALS = [
  { key: "Matin", label: "Matin", icon: "🌅" },
  { key: "Midi", label: "Midi", icon: "☀️" },
  { key: "Goûter", label: "Goûter", icon: "☕" },
  { key: "Soir", label: "Soir", icon: "🌙" },
] as const;

type MealKey = "Matin" | "Midi" | "Goûter" | "Soir";

export default function PlannerUI({ recipes, plannings }: PlannerUIProps) {
  const [isReady, setIsReady] = useState(false);
  const [activeDayIndex, setActiveDayIndex] = useState(0); // Pour la vue onglets mobile
  
  // Date de début de semaine (Lundi)
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
            <h2>📖 Banque de Recettes</h2>
            <span className="badge">{recipes.length} disponibles</span>
          </div>
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
                  <p className="text-muted text-sm" style={{ padding: "1rem", textAlign: "center" }}>
                    Aucune recette enregistrée. Ajoutez-en via l'onglet Recettes !
                  </p>
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
            <div>
              <h2>📅 Semainier de Repas</h2>
              <p className="text-sm text-secondary">
                Semaine du {format(startDate, "dd MMMM", { locale: fr })} au {format(addDays(startDate, 6), "dd MMMM yyyy", { locale: fr })}
              </p>
            </div>
          </div>

          {/* Navigation par Onglets Jours (Visible sur Smartphone) */}
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

          {/* Vue Grille Bureau (Large Screen) */}
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

          {/* Vue Cartes Mobile (Smartphone View) */}
          <div className="mobile-planner-cards">
            {DAYS.map((dayName, dayIndex) => {
              const currentDate = addDays(startDate, dayIndex);
              const isSelected = dayIndex === activeDayIndex;

              return (
                <div key={dayIndex} className={`mobile-day-card ${isSelected ? 'is-active' : 'is-hidden'}`}>
                  <div className="mobile-day-card-header">
                    <h3>{dayName}</h3>
                    <span className="badge badge-neutral">{format(currentDate, "dd MMMM yyyy", { locale: fr })}</span>
                  </div>

                  <div className="mobile-meals-list">
                    {MEALS.map((m) => {
                      const planned = plannings.find(
                        p => new Date(p.date).getDay() === currentDate.getDay() && p.mealTime === m.key
                      );

                      return (
                        <div key={m.key} className="mobile-meal-box">
                          <div className="mobile-meal-label">
                            <span>{m.icon}</span> <strong>{m.label}</strong>
                          </div>

                          <div className="mobile-meal-content">
                            <select
                              className="input-field mobile-meal-select"
                              value={planned ? planned.recipe.id : ""}
                              onChange={(e) => handleSelectMeal(dayIndex, m.key, e.target.value, planned?.id)}
                            >
                              <option value="">-- Aucun repas prévu --</option>
                              {recipes.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.title}
                                </option>
                              ))}
                            </select>
                            
                            {planned && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => removeMeal(planned.id)}
                              >
                                🗑️
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
