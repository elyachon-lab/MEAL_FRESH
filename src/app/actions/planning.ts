"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { startOfWeek, addDays, format } from "date-fns";

// Récupérer le planning de la semaine courante
export async function getWeeklyPlanning(startDate: Date) {
  const end = addDays(startDate, 6);
  
  return await prisma.planning.findMany({
    where: {
      date: {
        gte: startDate,
        lte: end,
      },
    },
    include: {
      recipe: true,
    }
  });
}

// Ajouter ou déplacer un repas
export async function assignMeal(recipeId: string, date: Date, mealTime: "Midi" | "Soir", existingPlanningId?: string) {
  if (existingPlanningId) {
    // Déplacement d'un repas existant
    await prisma.planning.update({
      where: { id: existingPlanningId },
      data: { date, mealTime },
    });
  } else {
    // Assignation d'une nouvelle recette
    await prisma.planning.create({
      data: {
        recipeId,
        date,
        mealTime,
      },
    });
  }
  
  revalidatePath("/planning");
}

export async function removeMeal(planningId: string) {
  await prisma.planning.delete({
    where: { id: planningId }
  });
  revalidatePath("/planning");
}
