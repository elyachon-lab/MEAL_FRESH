"use server";

import prisma, { ensureDatabaseSchema } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { inferCategoryName } from "@/lib/emojis";

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
    let categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { ingredients: true }
        }
      }
    });

    // Si aucune catégorie n'existe encore, on peuple automatiquement les catégories par défaut
    if (categories.length === 0) {
      for (const name of DEFAULT_CATEGORIES) {
        await prisma.category.upsert({
          where: { name },
          update: {},
          create: { name },
        });
      }
      categories = await prisma.category.findMany({
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: { ingredients: true }
          }
        }
      });
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
export async function findOrCreateIngredient(name: string, categoryIdOrName?: string): Promise<string> {
  await ensureDatabaseSchema();
  const trimmed = name.trim();
  const validCats = await getCategories();
  
  // 1. Chercher si l'ingrédient existe déjà par son nom (insensible à la casse)
  const allIngredients = await prisma.ingredient.findMany();
  const existing = allIngredients.find(
    i => i.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (existing) return existing.id;

  // 2. Chercher la catégorie appropriée (par ID direct ou par Nom de catégorie)
  let targetCatId: string | undefined;

  if (categoryIdOrName) {
    const foundById = validCats.find((c: any) => c.id === categoryIdOrName);
    if (foundById) {
      targetCatId = foundById.id;
    } else {
      const foundByName = validCats.find((c: any) => c.name.toLowerCase() === categoryIdOrName.toLowerCase());
      if (foundByName) {
        targetCatId = foundByName.id;
      }
    }
  }

  // 3. Si la catégorie n'est pas encore trouvée, inférer automatiquement à partir du nom de l'ingrédient (ex: Riz -> Glucides)
  if (!targetCatId) {
    const inferredName = inferCategoryName(trimmed);
    const foundInferred = validCats.find((c: any) => c.name.toLowerCase() === inferredName.toLowerCase());
    if (foundInferred) {
      targetCatId = foundInferred.id;
    } else {
      targetCatId = validCats[0]?.id;
    }
  }

  // 4. Si toujours pas de catégorie disponible, secours sur "Autre"
  if (!targetCatId) {
    const fallbackCat = await prisma.category.upsert({
      where: { name: "Autre" },
      update: {},
      create: { name: "Autre" },
    });
    targetCatId = fallbackCat.id;
  }

  // 5. Créer l'ingrédient avec sa vraie catégorie associée
  const created = await prisma.ingredient.create({
    data: { name: trimmed, categoryId: targetCatId }
  });

  revalidatePath("/ingredients", "layout");
  revalidatePath("/recipes");
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
    revalidatePath("/ingredients", "layout");
    revalidatePath("/recipes");
    return { success: true, ingredient: toPlainObject(ingredient) };
  } catch (err: any) {
    console.error("Error in createIngredient:", err);
    return { success: false, error: err?.message || "Erreur lors de la création de l'ingrédient." };
  }
}
