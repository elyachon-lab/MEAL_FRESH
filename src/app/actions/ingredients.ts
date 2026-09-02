"use server";

import prisma from "@/lib/prisma";
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

export async function getCategories() {
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

  return categories;
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
  
  // Si la catégorie n'est pas fournie, récupérer la 1ère disponible
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
  const ingredient = await prisma.ingredient.create({
    data: { name, categoryId }
  });
  revalidatePath("/ingredients");
  revalidatePath("/recipes");
  return ingredient;
}
