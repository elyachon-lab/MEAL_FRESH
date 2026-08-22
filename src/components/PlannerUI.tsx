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
const MEALS = ["Midi", "Soir"];

export default function PlannerUI({ recipes, plannings }: PlannerUIProps) {
  const [isReady, setIsReady] = useState(false);
  
  // Date de début de semaine (Lundi)
  const startDate = startOfWeek(new Date(), { weekStartsOn: 1 });

  useEffect(() => {
    setIsReady(true);
  }, []);

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;

    // Si on a droppé au même endroit
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // Récupérer l'ID de la recette (draggableId = 'recipe_123' ou 'planning_456')
    const isFromBank = source.droppableId === "recipe-bank";
    const recipeId = isFromBank ? draggableId.replace("recipe_", "") : null;
    
    // Format de destination : "dayIndex-mealTime" ex: "0-Midi"
    if (destination.droppableId !== "recipe-bank") {
      const [dayStr, mealTime] = destination.droppableId.split("-");
      const dayOffset = parseInt(dayStr, 10);
      const targetDate = addDays(startDate, dayOffset);
      
      if (isFromBank && recipeId) {
        // Ajouter une nouvelle recette au planning (copie depuis la banque)
        await assignMeal(recipeId, targetDate, mealTime as "Midi" | "Soir");
      } else {
        // Déplacer un repas existant
        const planningId = draggableId.replace("planning_", "");
        await assignMeal("", targetDate, mealTime as "Midi" | "Soir", planningId);
      }
    } else {
      // Si on dépose dans la banque de recette depuis le planning, on supprime le repas
      if (!isFromBank) {
        const planningId = draggableId.replace("planning_", "");
        await removeMeal(planningId);
      }
    }
  };

  if (!isReady) return null;

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "2rem" }}>
        
        {/* Banque de Recettes (Source) */}
        <div className="card">
          <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>📖 Banque de Recettes</h2>
          <Droppable droppableId="recipe-bank" isDropDisabled={false}>
            {(provided, snapshot) => (
              <div 
                ref={provided.innerRef} 
                {...provided.droppableProps}
                style={{
                  minHeight: "200px",
                  padding: "0.5rem",
                  background: snapshot.isDraggingOver ? "var(--primary-light)" : "transparent",
                  borderRadius: "var(--radius-md)"
                }}
              >
                {recipes.map((recipe, index) => (
                  <Draggable key={`recipe_${recipe.id}`} draggableId={`recipe_${recipe.id}`} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={{
                          userSelect: "none",
                          padding: "0.875rem 1rem",
                          margin: "0 0 0.5rem 0",
                          backgroundColor: "white",
                          color: "var(--text-primary)",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--border)",
                          fontWeight: 600,
                          boxShadow: snapshot.isDragging ? "var(--shadow-lg)" : "var(--shadow-xs)",
                          cursor: "grab",
                          ...provided.draggableProps.style,
                        }}
                      >
                        {recipe.title}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>

        {/* Semainier (Destinations) */}
        <div className="card">
              <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 1fr", gap: "0.75rem", alignItems: "center" }}>
            <div style={{ fontWeight: "bold" }}>Jour</div>
            <div style={{ fontWeight: "bold", textAlign: "center" }}>Midi</div>
            <div style={{ fontWeight: "bold", textAlign: "center" }}>Soir</div>

            {DAYS.map((dayName, dayIndex) => {
              const currentDate = addDays(startDate, dayIndex);
              return (
                <React.Fragment key={dayIndex}>
                  <div style={{ display: "flex", alignItems: "center", fontWeight: 500, color: "var(--text-secondary)" }}>
                    {dayName} <br/>
                    <span style={{ fontSize: "0.75rem" }}>{format(currentDate, "dd/MM", { locale: fr })}</span>
                  </div>

                  {MEALS.map((mealTime) => {
                    // Trouver le repas planifié pour ce créneau
                    const planned = plannings.find(
                      p => new Date(p.date).getDay() === currentDate.getDay() && p.mealTime === mealTime
                    );

                    return (
                      <Droppable key={`${dayIndex}-${mealTime}`} droppableId={`${dayIndex}-${mealTime}`}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            style={{
                              background: snapshot.isDraggingOver ? "var(--primary-light)" : "var(--bg-alt)",
                              padding: "0.5rem",
                              borderRadius: "var(--radius-md)",
                              minHeight: "80px",
                              border: snapshot.isDraggingOver ? "2px dashed var(--primary)" : "2px dashed var(--border-strong)",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "center",
                              transition: "all .2s",
                            }}
                          >
                            {planned ? (
                              <Draggable key={`planning_${planned.id}`} draggableId={`planning_${planned.id}`} index={0}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    style={{
                                      padding: "0.75rem",
                                      backgroundColor: "white",
                                      borderRadius: "var(--radius-md)",
                                      border: "1.5px solid var(--primary)",
                                      boxShadow: "var(--shadow-xs)",
                                      textAlign: "center",
                                      fontWeight: 700,
                                      fontSize: "0.9rem",
                                      ...provided.draggableProps.style,
                                    }}
                                  >
                                    {planned.recipe.title}
                                  </div>
                                )}
                              </Draggable>
                            ) : (
                              <div style={{ color: "var(--text-secondary)", textAlign: "center", fontSize: "0.875rem" }}>
                                Glisser ici
                              </div>
                            )}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </DragDropContext>
  );
}
