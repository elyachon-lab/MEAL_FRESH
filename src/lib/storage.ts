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

const RECIPES_KEY = "mealfresh_local_recipes_v2";

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
}): LocalRecipe {
  const current = getLocalRecipes();
  const id = data.id || "rec_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
  
  const formattedIngredients = (data.ingredients || []).map(ing => {
    if (ing.ingredient) return ing;
    return {
      quantity: ing.quantity || null,
      ingredient: {
        id: "ing_" + Math.random().toString(36).substring(2, 6),
        name: ing.name || "Ingrédient",
        category: { id: ing.categoryId || "cat_default", name: "Général" }
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
  } catch (e) {}

  return newRecipe;
}

export function deleteLocalRecipe(id: string) {
  const current = getLocalRecipes();
  const updated = current.filter(r => r.id !== id);
  try {
    localStorage.setItem(RECIPES_KEY, JSON.stringify(updated));
  } catch (e) {}
}

export function mergeRecipes(serverRecipes: any[] = []): any[] {
  const local = getLocalRecipes();
  const serverMap = new Map(serverRecipes.map(r => [r.id, r]));
  
  // Ajouter les recettes locales qui ne sont pas sur le serveur
  local.forEach(r => {
    if (!serverMap.has(r.id)) {
      serverMap.set(r.id, r);
    }
  });

  return Array.from(serverMap.values());
}
