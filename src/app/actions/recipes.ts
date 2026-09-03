"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { findOrCreateIngredient, getCategories } from "./ingredients";

function toPlainObject<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

export async function getRecipes() {
  const recipes = await prisma.recipe.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      ingredients: {
        include: {
          ingredient: {
            include: { category: true }
          }
        }
      }
    }
  });

  return toPlainObject(recipes);
}

export async function createRecipe(data: FormData) {
  const title = (data.get("title") as string)?.trim();
  const urlSource = (data.get("urlSource") as string)?.trim();
  const instructions = (data.get("instructions") as string)?.trim();

  if (!title) throw new Error("Le titre de la recette est requis.");

  const created = await prisma.recipe.create({
    data: {
      title,
      urlSource: urlSource || null,
      instructions: instructions || null,
    },
  });

  revalidatePath("/");
  revalidatePath("/recipes");
  revalidatePath("/planning");

  return { success: true, id: created.id };
}

export async function createRecipeWithIngredients(data: {
  title: string;
  urlSource?: string;
  instructions?: string;
  ingredients?: { name: string; categoryId: string; quantity: string }[];
}) {
  const title = data.title?.trim();
  if (!title) throw new Error("Le titre de la recette est obligatoire.");

  const categories = await getCategories();
  const defaultCategoryId = categories[0]?.id;
  const rawIngredients = data.ingredients || [];

  const resolvedIngredients = await Promise.all(
    rawIngredients.map(async (ing) => {
      const ingName = ing.name?.trim();
      if (!ingName) return null;
      const catId = ing.categoryId || defaultCategoryId;
      const id = await findOrCreateIngredient(ingName, catId);
      return { id, quantity: ing.quantity?.trim() || null };
    })
  );

  const validIngredients = resolvedIngredients.filter((item): item is { id: string; quantity: string | null } => item !== null);

  const createdRecipe = await prisma.recipe.create({
    data: {
      title,
      urlSource: data.urlSource?.trim() || null,
      instructions: data.instructions?.trim() || null,
      ingredients: {
        create: validIngredients.map(ing => ({
          ingredientId: ing.id,
          quantity: ing.quantity
        }))
      }
    }
  });

  revalidatePath("/");
  revalidatePath("/recipes");
  revalidatePath("/planning");
  revalidatePath("/ingredients");

  return { success: true, id: createdRecipe.id };
}

export async function deleteRecipe(id: string) {
  await prisma.recipe.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/recipes");
  revalidatePath("/planning");
  return { success: true };
}

export async function updateRecipeWithIngredients(data: {
  id: string;
  title: string;
  urlSource?: string;
  instructions?: string;
  ingredients?: { name: string; categoryId: string; quantity: string }[];
}) {
  const title = data.title?.trim();
  if (!title) throw new Error("Le titre est requis.");

  const categories = await getCategories();
  const defaultCategoryId = categories[0]?.id;
  const rawIngredients = data.ingredients || [];

  const resolvedIngredients = await Promise.all(
    rawIngredients.map(async (ing) => {
      const ingName = ing.name?.trim();
      if (!ingName) return null;
      const catId = ing.categoryId || defaultCategoryId;
      const id = await findOrCreateIngredient(ingName, catId);
      return { id, quantity: ing.quantity?.trim() || null };
    })
  );

  const validIngredients = resolvedIngredients.filter((item): item is { id: string; quantity: string | null } => item !== null);

  await prisma.recipeIngredient.deleteMany({ where: { recipeId: data.id } });

  await prisma.recipe.update({
    where: { id: data.id },
    data: {
      title,
      urlSource: data.urlSource?.trim() || null,
      instructions: data.instructions?.trim() || null,
      ingredients: {
        create: validIngredients.map(ing => ({
          ingredientId: ing.id,
          quantity: ing.quantity
        }))
      }
    }
  });

  revalidatePath("/");
  revalidatePath("/recipes");
  revalidatePath("/planning");
  revalidatePath("/ingredients");

  return { success: true };
}
