"use server";

import { revalidatePath } from "next/cache";
import { addDays } from "date-fns";

import { requireSession } from "@/lib/dal";
import { RECIPE_SELECT, mapPlanning, mapRecipe, toDateKey } from "@/lib/mappers";

export type MealTime = "Matin" | "Midi" | "Goûter" | "Soir";

const PLANNING_SELECT = `id, date, meal_time, recipe:recipes ( ${RECIPE_SELECT} )`;

/** Plannings des 7 jours à partir de startDate (bornes incluses). */
export async function getWeeklyPlanning(startDate: string | Date) {
  try {
    const { supabase } = await requireSession();

    const start = toDateKey(startDate);
    const end = toDateKey(addDays(new Date(`${start}T12:00:00`), 6));

    const { data, error } = await supabase
      .from("plannings")
      .select(PLANNING_SELECT)
      .gte("date", start)
      .lte("date", end)
      .order("date");

    if (error) throw new Error(error.message);

    // Les lignes sans recette (cas théorique) sont écartées avant projection,
    // ce qui garantit un `recipe` non nul aux composants.
    return (data ?? [])
      .filter((row: any) => row.recipe)
      .map((row: any) => ({
        id: row.id,
        date: row.date,
        mealTime: row.meal_time,
        recipe: mapRecipe(row.recipe),
      }));
  } catch (err: any) {
    console.error("getWeeklyPlanning:", err?.message ?? err);
    return [];
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function assignMeal(
  recipeId: string,
  dateInput: string | Date,
  mealTime: MealTime,
  existingPlanningId?: string,
) {
  try {
    const { supabase, user } = await requireSession();
    const date = toDateKey(dateInput);

    const isRealUUID = existingPlanningId && UUID_REGEX.test(existingPlanningId);

    if (isRealUUID) {
      const { data, error } = await supabase
        .from("plannings")
        .update({ date, meal_time: mealTime, recipe_id: recipeId })
        .eq("id", existingPlanningId)
        .select(PLANNING_SELECT)
        .maybeSingle();

      if (!error && data) {
        revalidatePath("/");
        revalidatePath("/planning");
        return { success: true as const, planning: mapPlanning(data) };
      }
    }

    const { data: existingSlot } = await supabase
      .from("plannings")
      .select("id")
      .eq("user_id", user.id)
      .eq("date", date)
      .eq("meal_time", mealTime)
      .maybeSingle();

    if (existingSlot?.id) {
      const { data, error } = await supabase
        .from("plannings")
        .update({ recipe_id: recipeId })
        .eq("id", existingSlot.id)
        .select(PLANNING_SELECT)
        .maybeSingle();

      if (error) throw new Error(error.message);

      revalidatePath("/");
      revalidatePath("/planning");
      return { success: true as const, planning: data ? mapPlanning(data) : null };
    }

    const { data, error } = await supabase
      .from("plannings")
      .insert({ user_id: user.id, date, meal_time: mealTime, recipe_id: recipeId })
      .select(PLANNING_SELECT)
      .maybeSingle();

    if (error && error.code !== "23505") throw new Error(error.message);

    revalidatePath("/");
    revalidatePath("/planning");
    return { success: true as const, planning: data ? mapPlanning(data) : null };
  } catch (err: any) {
    console.error("assignMeal:", err?.message ?? err);
    return { success: false as const, error: err?.message || "Erreur lors de l'assignation du repas." };
  }
}

export async function removeMeal(planningId: string) {
  try {
    const { supabase } = await requireSession();
    const isRealUUID = UUID_REGEX.test(planningId);

    if (isRealUUID) {
      const { error } = await supabase.from("plannings").delete().eq("id", planningId);
      if (error) throw new Error(error.message);
    }

    revalidatePath("/");
    revalidatePath("/planning");
    return { success: true as const };
  } catch (err: any) {
    console.error("removeMeal:", err?.message ?? err);
    return { success: false as const, error: err?.message || "Erreur lors de la suppression." };
  }
}
