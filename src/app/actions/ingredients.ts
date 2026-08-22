"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getCategories() {
  return await prisma.category.findMany({ orderBy: { name: "asc" } });
}

export async function getIngredients() {
  return await prisma.ingredient.findMany({
    include: { category: true },
    orderBy: { name: "asc" }
  });
}

/**
 * Trouve ou crée un ingrédient par son nom dans la catégorie donnée.
 * Si l'ingrédient existe déjà (même nom, même catégorie), le réutilise.
 */
export async function findOrCreateIngredient(name: string, categoryId: string): Promise<string> {
  const trimmed = name.trim();
  const ingredientsInCategory = await prisma.ingredient.findMany({
    where: { categoryId }
  });
  
  const existing = ingredientsInCategory.find(
    i => i.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (existing) return existing.id;

  const created = await prisma.ingredient.create({
    data: { name: trimmed, categoryId }
  });
  revalidatePath("/ingredients");
  return created.id;
}

export async function createIngredient(name: string, categoryId: string) {
  const ingredient = await prisma.ingredient.create({
    data: { name, categoryId }
  });
  revalidatePath("/ingredients");
  revalidatePath("/recipes");
  return ingredient;
}
