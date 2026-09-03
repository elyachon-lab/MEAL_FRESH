"use server";

import prisma, { ensureDatabaseSchema } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const DEFAULT_CATEGORIES = [
  "Protéines",
  "Glucides",
  "Légumes",
  "Fruits",
  "Produits Laitiers",
  "Matières Grasses",
  "Épices & Condiments"
];

function toPlainObject<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

export async function getCategories() {
  try {
    await ensureDatabaseSchema();
    let categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

    // Si aucune catégorie n'existe encore, on peuple automatiquement les catégories par défaut
    if (categories.length === 0) {
      for (const name of DEFAULT_CATEGORIES) {
        await prisma.category.upsert({
          where: { name },
          update: {},
          create: { name },
        });
      }
      categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
    }

    return toPlainObject(categories);
  } catch (err) {
    console.error("Error in getCategories:", err);
    return [];
  }
}

export async function getIngredients() {
  try {
    await ensureDatabaseSchema();
    const ingredients = await prisma.ingredient.findMany({
      include: { category: true },
      orderBy: { name: "asc" }
    });
    return toPlainObject(ingredients);
  } catch (err) {
    console.error("Error in getIngredients:", err);
    return [];
  }
}

/**
 * Trouve ou crée un ingrédient par son nom dans la catégorie donnée.
 */
export async function findOrCreateIngredient(name: string, categoryId: string): Promise<string> {
  await ensureDatabaseSchema();
  const trimmed = name.trim();
  
  let catId = categoryId;
  if (!catId) {
    const cats = await getCategories();
    catId = cats[0]?.id;
  }

  const ingredientsInCategory = await prisma.ingredient.findMany({
    where: { categoryId: catId }
  });
  
  const existing = ingredientsInCategory.find(
    i => i.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (existing) return existing.id;

  const created = await prisma.ingredient.create({
    data: { name: trimmed, categoryId: catId }
  });
  revalidatePath("/ingredients");
  return created.id;
}

export async function createIngredient(name: string, categoryId: string) {
  try {
    await ensureDatabaseSchema();
    const ingredient = await prisma.ingredient.create({
      data: { name, categoryId }
    });
    revalidatePath("/ingredients");
    revalidatePath("/recipes");
    return { success: true, ingredient: toPlainObject(ingredient) };
  } catch (err: any) {
    console.error("Error in createIngredient:", err);
    return { success: false, error: err?.message || "Erreur lors de la création de l'ingrédient." };
  }
}
