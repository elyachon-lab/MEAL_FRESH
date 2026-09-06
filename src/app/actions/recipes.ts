"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/dal";
import { findOrCreateIngredient, listCategories } from "@/lib/ingredients";
import { RECIPE_SELECT, mapRecipe } from "@/lib/mappers";

type IngredientInput = { name: string; categoryId?: string; quantity?: string };

function refreshRecipeViews() {
  revalidatePath("/");
  revalidatePath("/recipes");
  revalidatePath("/planning");
  revalidatePath("/ingredients", "layout");
}

/**
 * Résout la liste d'ingrédients saisie en identifiants, en créant au passage
 * ceux qui n'existent pas encore dans le compte. Les doublons sont fusionnés
 * (la clé primaire de recipe_ingredients est (recipe_id, ingredient_id)).
 */
async function resolveIngredientLines(
  supabase: any,
  userId: string,
  lines: IngredientInput[],
) {
  if (lines.length === 0) return [];

  const categories = await listCategories(supabase);
  const byIngredientId = new Map<string, { ingredient_id: string; quantity: string | null }>();

  for (const line of lines) {
    const name = line.name?.trim();
    if (!name) continue;

    const ingredientId = await findOrCreateIngredient(
      supabase,
      userId,
      name,
      line.categoryId ?? null,
      categories,
    );
    if (!ingredientId) continue;

    byIngredientId.set(ingredientId, {
      ingredient_id: ingredientId,
      quantity: line.quantity?.trim() || null,
    });
  }

  return [...byIngredientId.values()];
}

export async function getRecipes() {
  const { supabase } = await requireSession();

  const { data, error } = await supabase
    .from("recipes")
    .select(RECIPE_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getRecipes:", error.message);
    return [];
  }

  return (data ?? []).map(mapRecipe);
}

export async function createRecipeWithIngredients(data: {
  title: string;
  urlSource?: string;
  instructions?: string;
  ingredients?: IngredientInput[];
}) {
  const title = data.title?.trim();
  if (!title) return { success: false as const, error: "Le titre de la recette est obligatoire." };

  try {
    const { supabase, user } = await requireSession();

    const created = await supabase
      .from("recipes")
      .insert({
        user_id: user.id,
        title,
        url_source: data.urlSource?.trim() || null,
        instructions: data.instructions?.trim() || null,
      })
      .select("id")
      .single();

    if (created.error) throw new Error(created.error.message);

    const lines = await resolveIngredientLines(supabase, user.id, data.ingredients ?? []);

    if (lines.length > 0) {
      const linked = await supabase
        .from("recipe_ingredients")
        .insert(lines.map((line) => ({ ...line, recipe_id: created.data.id })));
      if (linked.error) throw new Error(linked.error.message);
    }

    refreshRecipeViews();
    return { success: true as const, id: created.data.id };
  } catch (err: any) {
    console.error("createRecipeWithIngredients:", err?.message ?? err);
    return { success: false as const, error: err?.message || "Erreur lors de la sauvegarde de la recette." };
  }
}

export async function updateRecipeWithIngredients(data: {
  id: string;
  title: string;
  urlSource?: string;
  instructions?: string;
  ingredients?: IngredientInput[];
}) {
  const title = data.title?.trim();
  if (!title) return { success: false as const, error: "Le titre est requis." };

  try {
    const { supabase, user } = await requireSession();

    // RLS restreint la mise à jour aux recettes du compte courant.
    const updated = await supabase
      .from("recipes")
      .update({
        title,
        url_source: data.urlSource?.trim() || null,
        instructions: data.instructions?.trim() || null,
      })
      .eq("id", data.id)
      .select("id")
      .maybeSingle();

    if (updated.error) throw new Error(updated.error.message);
    if (!updated.data) return { success: false as const, error: "Recette introuvable." };

    const lines = await resolveIngredientLines(supabase, user.id, data.ingredients ?? []);

    const cleared = await supabase.from("recipe_ingredients").delete().eq("recipe_id", data.id);
    if (cleared.error) throw new Error(cleared.error.message);

    if (lines.length > 0) {
      const linked = await supabase
        .from("recipe_ingredients")
        .insert(lines.map((line) => ({ ...line, recipe_id: data.id })));
      if (linked.error) throw new Error(linked.error.message);
    }

    refreshRecipeViews();
    return { success: true as const };
  } catch (err: any) {
    console.error("updateRecipeWithIngredients:", err?.message ?? err);
    return { success: false as const, error: err?.message || "Erreur lors de la mise à jour." };
  }
}

export async function deleteRecipe(id: string) {
  try {
    const { supabase } = await requireSession();
    const { error } = await supabase.from("recipes").delete().eq("id", id);
    if (error) throw new Error(error.message);

    refreshRecipeViews();
    return { success: true as const };
  } catch (err: any) {
    console.error("deleteRecipe:", err?.message ?? err);
    return { success: false as const, error: err?.message || "Erreur lors de la suppression." };
  }
}
