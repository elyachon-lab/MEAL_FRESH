"use server";

import prisma, { ensureDatabaseSchema } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { findOrCreateIngredient, getCategories } from "./ingredients";

function toPlainObject<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

export async function getRecipes() {
  try {
    await ensureDatabaseSchema();
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
  } catch (err: any) {
    console.error("Error in getRecipes:", err);
    return [];
  }
}

export async function createRecipe(data: FormData) {
  try {
    await ensureDatabaseSchema();
    const title = (data.get("title") as string)?.trim();
    const urlSource = (data.get("urlSource") as string)?.trim();
    const instructions = (data.get("instructions") as string)?.trim();

    if (!title) return { success: false, error: "Le titre de la recette est requis." };

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
    revalidatePath("/ingredients", "layout");

    return { success: true, id: created.id };
  } catch (err: any) {
    console.error("Error in createRecipe:", err);
    return { success: false, error: err?.message || "Erreur lors de la création de la recette." };
  }
}

export async function createRecipeWithIngredients(data: {
  title: string;
  urlSource?: string;
  instructions?: string;
  ingredients?: { name: string; categoryId: string; quantity: string }[];
}) {
  try {
    await ensureDatabaseSchema();
    const title = data.title?.trim();
    if (!title) return { success: false, error: "Le titre de la recette est obligatoire." };

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
    revalidatePath("/ingredients", "layout");

    return { success: true, id: createdRecipe.id };
  } catch (err: any) {
    console.error("Error in createRecipeWithIngredients:", err);
    return { success: false, error: err?.message || "Erreur lors de la sauvegarde de la recette." };
  }
}

export async function deleteRecipe(id: string) {
  try {
    await ensureDatabaseSchema();
    await prisma.recipe.delete({ where: { id } });
    revalidatePath("/");
    revalidatePath("/recipes");
    revalidatePath("/planning");
    revalidatePath("/ingredients", "layout");
    return { success: true };
  } catch (err: any) {
    console.error("Error in deleteRecipe:", err);
    return { success: false, error: err?.message || "Erreur lors de la suppression." };
  }
}

export async function updateRecipeWithIngredients(data: {
  id: string;
  title: string;
  urlSource?: string;
  instructions?: string;
  ingredients?: { name: string; categoryId: string; quantity: string }[];
}) {
  try {
    await ensureDatabaseSchema();
    const title = data.title?.trim();
    if (!title) return { success: false, error: "Le titre est requis." };

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
    revalidatePath("/ingredients", "layout");

    return { success: true };
  } catch (err: any) {
    console.error("Error in updateRecipeWithIngredients:", err);
    return { success: false, error: err?.message || "Erreur me lors de la mise à jour." };
  }
}
