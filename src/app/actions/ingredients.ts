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
 * Trouve ou crée un ingrédient par son nom en garantissant une catégorie valide en BDD.
 */
export async function findOrCreateIngredient(name: string, categoryId?: string): Promise<string> {
  await ensureDatabaseSchema();
  const trimmed = name.trim();
  
  // 1. Chercher si l'ingrédient existe déjà par son nom (insensible à la casse)
  const allIngredients = await prisma.ingredient.findMany();
  const existing = allIngredients.find(
    i => i.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (existing) return existing.id;

  // 2. Vérifier si la catégorie spécifiée existe réellement en BDD
  let catId = categoryId;
  let categoryExists = false;

  if (catId) {
    const foundCat = await prisma.category.findUnique({ where: { id: catId } });
    if (foundCat) {
      categoryExists = true;
    }
  }

  // 3. Si la catégorie n'existe pas en BDD, utiliser la 1ère catégorie disponible
  if (!categoryExists) {
    const validCats = await getCategories();
    catId = validCats[0]?.id;
  }

  // 4. Si aucune catégorie n'est disponible, créer une catégorie de secours
  if (!catId) {
    const fallbackCat = await prisma.category.upsert({
      where: { name: "Autre" },
      update: {},
      create: { name: "Autre" },
    });
    catId = fallbackCat.id;
  }

  // 5. Créer l'ingrédient en toute sécurité avec la catégorie garantie
  const created = await prisma.ingredient.create({
    data: { name: trimmed, categoryId: catId }
  });

  revalidatePath("/ingredients");
  return created.id;
}

export async function createIngredient(name: string, categoryId: string) {
  try {
    await ensureDatabaseSchema();
    const ingId = await findOrCreateIngredient(name, categoryId);
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: ingId },
      include: { category: true }
    });
    revalidatePath("/ingredients");
    revalidatePath("/recipes");
    return { success: true, ingredient: toPlainObject(ingredient) };
  } catch (err: any) {
    console.error("Error in createIngredient:", err);
    return { success: false, error: err?.message || "Erreur lors de la création de l'ingrédient." };
  }
}
