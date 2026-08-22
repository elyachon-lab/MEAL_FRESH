"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { findOrCreateIngredient } from "./ingredients";

export async function getRecipes() {
  return await prisma.recipe.findMany({
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
}

export async function createRecipe(data: FormData) {
  const title = data.get("title") as string;
  const urlSource = data.get("urlSource") as string;
  const instructions = data.get("instructions") as string;

  if (!title) throw new Error("Le titre est requis.");

  await prisma.recipe.create({
    data: {
      title,
      urlSource: urlSource || null,
      instructions: instructions || null,
    },
  });

  revalidatePath("/recipes");
  revalidatePath("/planning");
}

export async function createRecipeWithIngredients(data: {
  title: string;
  urlSource: string;
  instructions: string;
  // Each ingredient is typed by the user with a chosen category
  ingredients: { name: string; categoryId: string; quantity: string }[];
}) {
  // Resolve or create each ingredient
  const resolvedIngredients = await Promise.all(
    data.ingredients.map(async (ing) => ({
      id: await findOrCreateIngredient(ing.name, ing.categoryId),
      quantity: ing.quantity,
    }))
  );

  await prisma.recipe.create({
    data: {
      title: data.title,
      urlSource: data.urlSource || null,
      instructions: data.instructions || null,
      ingredients: {
        create: resolvedIngredients.map(ing => ({
          ingredientId: ing.id,
          quantity: ing.quantity || null
        }))
      }
    }
  });

  revalidatePath("/recipes");
  revalidatePath("/planning");
  revalidatePath("/ingredients");
}

export async function deleteRecipe(id: string) {
  await prisma.recipe.delete({ where: { id } });
  revalidatePath("/recipes");
  revalidatePath("/planning");
}

export async function updateRecipeWithIngredients(data: {
  id: string;
  title: string;
  urlSource: string;
  instructions: string;
  ingredients: { name: string; categoryId: string; quantity: string }[];
}) {
  const resolvedIngredients = await Promise.all(
    data.ingredients.map(async (ing) => ({
      id: await findOrCreateIngredient(ing.name, ing.categoryId),
      quantity: ing.quantity,
    }))
  );

  await prisma.recipeIngredient.deleteMany({ where: { recipeId: data.id } });

  await prisma.recipe.update({
    where: { id: data.id },
    data: {
      title: data.title,
      urlSource: data.urlSource || null,
      instructions: data.instructions || null,
      ingredients: {
        create: resolvedIngredients.map(ing => ({
          ingredientId: ing.id,
          quantity: ing.quantity || null
        }))
      }
    }
  });

  revalidatePath("/recipes");
  revalidatePath("/planning");
  revalidatePath("/ingredients");
}
