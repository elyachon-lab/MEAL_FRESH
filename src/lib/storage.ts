"use client";

import { inferCategoryName } from "./emojis";

export type LocalIngredient = {
  name: string;
  categoryId: string;
  quantity?: string | null;
  ingredient?: {
    id: string;
    name: string;
    category: { id: string; name: string };
  };
};

export type LocalRecipe = {
  id: string;
  title: string;
  urlSource?: string | null;
  instructions?: string | null;
  ingredients: any[];
  createdAt: string;
};

export type LocalPlanning = {
  id: string;
  recipe: any;
  date: string;
  mealTime: string;
};

export type LocalExpense = {
  id: string;
  date: string;
  amount: number;
  category: string;
  description?: string | null;
  monthStr: string;
};

const RECIPES_KEY = "mealfresh_local_recipes_v2";
const PLANNINGS_KEY = "mealfresh_local_plannings_v2";
const EXPENSES_KEY = "mealfresh_local_expenses_v2";
const BUDGET_AMOUNT_KEY = "mealfresh_local_budget_amounts_v2";

function notifyRecipeUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("mealfresh_recipes_updated"));
  }
}

export function getLocalRecipes(): LocalRecipe[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(RECIPES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

export function saveLocalRecipe(data: {
  id?: string;
  title: string;
  urlSource?: string | null;
  instructions?: string | null;
  ingredients?: any[];
  categories?: { id: string; name: string }[];
}): LocalRecipe {
  const current = getLocalRecipes();
  const id = data.id || "rec_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
  
  const categoriesList = data.categories || [];
  const getCatName = (catId: string, ingName: string, fallbackName?: string) => {
    if (fallbackName && fallbackName !== "Général") return fallbackName;
    const found = categoriesList.find(c => c.id === catId || c.name.toLowerCase() === catId.toLowerCase());
    if (found) return found.name;
    return inferCategoryName(ingName);
  };

  const formattedIngredients = (data.ingredients || []).map(ing => {
    const rawIngName = ing.ingredient?.name || ing.name || "Ingrédient";
    const catId = ing.ingredient?.category?.id || ing.categoryId || "cat_default";
    const catName = getCatName(catId, rawIngName, ing.ingredient?.category?.name || ing.categoryName);

    return {
      quantity: ing.quantity || null,
      name: rawIngName,
      categoryId: catId,
      categoryName: catName,
      ingredient: {
        id: ing.ingredient?.id || "ing_" + Math.random().toString(36).substring(2, 6),
        name: rawIngName,
        category: { id: catId, name: catName }
      }
    };
  });

  const newRecipe: LocalRecipe = {
    id,
    title: data.title,
    urlSource: data.urlSource || null,
    instructions: data.instructions || null,
    ingredients: formattedIngredients,
    createdAt: new Date().toISOString(),
  };

  const updated = [newRecipe, ...current.filter(r => r.id !== id)];
  try {
    localStorage.setItem(RECIPES_KEY, JSON.stringify(updated));
    notifyRecipeUpdate();
  } catch (e) {}

  return newRecipe;
}

export function deleteLocalRecipe(id: string) {
  const current = getLocalRecipes();
  const updated = current.filter(r => r.id !== id);
  try {
    localStorage.setItem(RECIPES_KEY, JSON.stringify(updated));
    notifyRecipeUpdate();
  } catch (e) {}
}

export function mergeRecipes(serverRecipes: any[] = []): any[] {
  const local = getLocalRecipes();
  const serverMap = new Map(serverRecipes.map(r => [r.id, r]));
  
  local.forEach(r => {
    if (!serverMap.has(r.id)) {
      serverMap.set(r.id, r);
    }
  });

  return Array.from(serverMap.values());
}

export function getLocalPlannings(): LocalPlanning[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(PLANNINGS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

export function saveLocalPlanning(item: { id?: string; recipe: any; date: Date | string; mealTime: string }): LocalPlanning {
  const current = getLocalPlannings();
  const id = item.id || "plan_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
  const dateStr = typeof item.date === "string" ? item.date : item.date.toISOString();

  const newPlanning: LocalPlanning = {
    id,
    recipe: item.recipe,
    date: dateStr,
    mealTime: item.mealTime,
  };

  const updated = [...current.filter(p => p.id !== id), newPlanning];
  try {
    localStorage.setItem(PLANNINGS_KEY, JSON.stringify(updated));
  } catch (e) {}

  return newPlanning;
}

export function removeLocalPlanning(id: string) {
  const current = getLocalPlannings();
  const updated = current.filter(p => p.id !== id);
  try {
    localStorage.setItem(PLANNINGS_KEY, JSON.stringify(updated));
  } catch (e) {}
}

function isSameDaySimple(d1: Date | string, d2: Date | string): boolean {
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return (
    date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth() &&
    date1.getUTCDate() === date2.getUTCDate()
  );
}

export function mergePlannings(serverPlannings: any[] = []): any[] {
  const local = getLocalPlannings();
  const map = new Map<string, any>();

  serverPlannings.forEach(p => {
    map.set(p.id, p);
  });

  local.forEach(loc => {
    if (!map.has(loc.id)) {
      const isDuplicate = Array.from(map.values()).some(serv => {
        const sameDate = isSameDaySimple(serv.date, loc.date);
        const sameMeal = serv.mealTime === loc.mealTime;
        const sameRecipe = ((serv as any).recipeId || serv.recipe?.id) === ((loc as any).recipeId || loc.recipe?.id);
        return sameDate && sameMeal && sameRecipe;
      });

      if (!isDuplicate) {
        map.set(loc.id, loc);
      }
    }
  });

  return Array.from(map.values());
}

/* ── PERSISTENCE DU BUDGET ET DES DÉPENSES ── */

export function getLocalExpenses(): LocalExpense[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(EXPENSES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

export function saveLocalExpense(item: {
  id?: string;
  date: Date | string;
  amount: number;
  category: string;
  description?: string | null;
  monthStr: string;
}): LocalExpense {
  const current = getLocalExpenses();
  const id = item.id || "exp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
  const dateStr = typeof item.date === "string" ? item.date : item.date.toISOString();

  const newExpense: LocalExpense = {
    id,
    date: dateStr,
    amount: Number(item.amount),
    category: item.category,
    description: item.description || null,
    monthStr: item.monthStr,
  };

  const updated = [newExpense, ...current.filter(e => e.id !== id)];
  try {
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(updated));
  } catch (e) {}

  return newExpense;
}

export function removeLocalExpense(id: string) {
  const current = getLocalExpenses();
  const updated = current.filter(e => e.id !== id);
  try {
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(updated));
  } catch (e) {}
}

export function mergeExpenses(serverExpenses: any[] = [], monthStr: string): any[] {
  const local = getLocalExpenses().filter(e => e.monthStr === monthStr);
  const map = new Map<string, any>();

  serverExpenses.forEach(e => {
    map.set(e.id, e);
  });

  local.forEach(loc => {
    if (!map.has(loc.id)) {
      const isDuplicate = Array.from(map.values()).some(serv => 
        serv.category === loc.category &&
        Math.abs(Number(serv.amount) - Number(loc.amount)) < 0.001 &&
        (serv.description || "") === (loc.description || "")
      );

      if (!isDuplicate) {
        map.set(loc.id, loc);
      }
    }
  });

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function getLocalBudgetAmount(monthStr: string, fallbackAmount: number = 400): number {
  if (typeof window === "undefined") return fallbackAmount;
  try {
    const data = localStorage.getItem(BUDGET_AMOUNT_KEY);
    const map = data ? JSON.parse(data) : {};
    return map[monthStr] !== undefined ? Number(map[monthStr]) : fallbackAmount;
  } catch (e) {
    return fallbackAmount;
  }
}

export function saveLocalBudgetAmount(monthStr: string, amount: number) {
  if (typeof window === "undefined") return;
  try {
    const data = localStorage.getItem(BUDGET_AMOUNT_KEY);
    const map = data ? JSON.parse(data) : {};
    map[monthStr] = Number(amount);
    localStorage.setItem(BUDGET_AMOUNT_KEY, JSON.stringify(map));
  } catch (e) {}
}
