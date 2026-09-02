"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { addDays } from "date-fns";

// Récupérer le planning de la semaine courante
export async function getWeeklyPlanning(startDate: Date) {
  const end = addDays(startDate, 6);
  
  const plannings = await prisma.planning.findMany({
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

  return plannings.map(p => ({
    ...p,
    date: p.date.toISOString(),
  }));
}

// Ajouter ou déplacer un repas
export async function assignMeal(
  recipeId: string, 
  dateInput: string | Date, 
  mealTime: "Matin" | "Midi" | "Goûter" | "Soir", 
  existingPlanningId?: string
) {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;

  if (existingPlanningId) {
    await prisma.planning.update({
      where: { id: existingPlanningId },
      data: { date, mealTime },
    });
  } else {
    await prisma.planning.create({
      data: {
        recipeId,
        date,
        mealTime,
      },
    });
  }
  
  revalidatePath("/");
  revalidatePath("/planning");
  return { success: true };
}

export async function removeMeal(planningId: string) {
  await prisma.planning.delete({
    where: { id: planningId }
  });
  revalidatePath("/");
  revalidatePath("/planning");
  return { success: true };
}
