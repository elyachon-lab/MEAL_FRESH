"use server";

import prisma, { ensureDatabaseSchema } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { addDays } from "date-fns";

function toPlainObject<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

export async function getWeeklyPlanning(startDate: Date) {
  try {
    await ensureDatabaseSchema();
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

    return toPlainObject(plannings);
  } catch (err: any) {
    console.error("Error in getWeeklyPlanning:", err);
    return [];
  }
}

export async function assignMeal(
  recipeId: string, 
  dateInput: string | Date, 
  mealTime: "Matin" | "Midi" | "Goûter" | "Soir", 
  existingPlanningId?: string
) {
  try {
    await ensureDatabaseSchema();
    const rawDate = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    // Normaliser la date à 12:00:00 pour éviter les décalages de jour en fuseau horaire UTC/Local
    const date = new Date(Date.UTC(rawDate.getFullYear(), rawDate.getMonth(), rawDate.getDate(), 12, 0, 0));

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
  } catch (err: any) {
    console.error("Error in assignMeal:", err);
    return { success: false, error: err?.message || "Erreur lors de l'assignation du repas." };
  }
}

export async function removeMeal(planningId: string) {
  try {
    await ensureDatabaseSchema();
    await prisma.planning.delete({
      where: { id: planningId }
    });
    revalidatePath("/");
    revalidatePath("/planning");
    return { success: true };
  } catch (err: any) {
    console.error("Error in removeMeal:", err);
    return { success: false, error: err?.message || "Erreur lors de la suppression." };
  }
}
