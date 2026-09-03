"use client";

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

const RECIPES_KEY = "mealfresh_local_recipes_v2";
const PLANNINGS_KEY = "mealfresh_local_plannings_v2";

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
  const getCatName = (catId: string, fallbackName?: string) => {
    if (fallbackName && fallbackName !== "Général") return fallbackName;
    const found = categoriesList.find(c => c.id === catId || c.name.toLowerCase() === catId.toLowerCase());
    if (found) return found.name;
    return fallbackName || "Général";
  };

  const formattedIngredients = (data.ingredients || []).map(ing => {
    const rawIngName = ing.ingredient?.name || ing.name || "Ingrédient";
    const catId = ing.ingredient?.category?.id || ing.categoryId || "cat_default";
    const catName = getCatName(catId, ing.ingredient?.category?.name || ing.categoryName);

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

export function mergePlannings(serverPlannings: any[] = []): any[] {
  const local = getLocalPlannings();
  const serverMap = new Map(serverPlannings.map(p => [p.id, p]));
  
  local.forEach(p => {
    if (!serverMap.has(p.id)) {
      serverMap.set(p.id, p);
    }
  });

  return Array.from(serverMap.values());
}
