"use client";

export type Recipe = {
  id: string;
  title: string;
  urlSource?: string | null;
  instructions?: string | null;
  ingredients?: {
    ingredient: { id: string; name: string; category: { id: string; name: string } };
    quantity: string | null;
  }[];
};

export type PlannedMeal = { id: string; recipe: Recipe; date: Date | string; mealTime: string };

const RECIPES_STORAGE_KEY = "mealfresh_local_recipes_v1";
const PLANNINGS_STORAGE_KEY = "mealfresh_local_plannings_v1";

export function getLocalRecipes(): Recipe[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECIPES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalRecipes(recipes: Recipe[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(recipes));
  } catch (err) {
    console.error("Failed to save local recipes", err);
  }
}

export function mergeRecipes(serverRecipes: Recipe[]): Recipe[] {
  const local = getLocalRecipes();
  const serverIds = new Set(serverRecipes.map((r) => r.id));
  const uniqueLocal = local.filter((r) => !serverIds.has(r.id));
  return [...serverRecipes, ...uniqueLocal];
}

export type SaveLocalRecipeInput = {
  id?: string;
  title: string;
  urlSource?: string | null;
  instructions?: string | null;
  ingredients?: Array<{
    name: string;
    categoryId?: string;
    categoryName?: string;
    quantity?: string | null;
  }>;
  categories?: Array<{ id: string; name: string }>;
};

export function saveLocalRecipe(input: SaveLocalRecipeInput): Recipe {
  const localRecipes = getLocalRecipes();
  const id = input.id || `local_rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const formattedIngredients = (input.ingredients || []).map((ing, idx) => {
    const catId = ing.categoryId || "cat_autre";
    const catName = ing.categoryName || "Autre";
    return {
      ingredient: {
        id: `ing_${idx}_${Date.now()}`,
        name: ing.name,
        category: {
          id: catId,
          name: catName,
        },
      },
      quantity: ing.quantity || null,
    };
  });

  const recipe: Recipe = {
    id,
    title: input.title,
    urlSource: input.urlSource || null,
    instructions: input.instructions || null,
    ingredients: formattedIngredients,
  };

  const existingIdx = localRecipes.findIndex((r) => r.id === id);
  if (existingIdx >= 0) {
    localRecipes[existingIdx] = recipe;
  } else {
    localRecipes.unshift(recipe);
  }

  saveLocalRecipes(localRecipes);
  return recipe;
}

export function deleteLocalRecipe(id: string): void {
  const local = getLocalRecipes().filter((r) => r.id !== id);
  saveLocalRecipes(local);
}

export function getLocalPlannings(): PlannedMeal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PLANNINGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalPlannings(plannings: PlannedMeal[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PLANNINGS_STORAGE_KEY, JSON.stringify(plannings));
  } catch (err) {
    console.error("Failed to save local plannings", err);
  }
}

export function mergePlannings(serverPlannings: PlannedMeal[]): PlannedMeal[] {
  const local = getLocalPlannings();
  const serverIds = new Set(serverPlannings.map((p) => p.id));
  const uniqueLocal = local.filter((p) => !serverIds.has(p.id));
  return [...serverPlannings, ...uniqueLocal];
}

export function saveLocalPlanning(meal: PlannedMeal): void {
  const local = getLocalPlannings();
  const existingIdx = local.findIndex((p) => p.id === meal.id);
  if (existingIdx >= 0) {
    local[existingIdx] = meal;
  } else {
    local.push(meal);
  }
  saveLocalPlannings(local);
}

export function removeLocalPlanning(id: string): void {
  const local = getLocalPlannings().filter((p) => p.id !== id);
  saveLocalPlannings(local);
}
