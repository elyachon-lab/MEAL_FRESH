"use server";

import { revalidatePath } from "next/cache";

import { requireSession, isRedirectError } from "@/lib/dal";
import { findOrCreateIngredient, listCategories } from "@/lib/ingredients";
import { RECIPE_SELECT, mapRecipe } from "@/lib/mappers";
import { findRecipePhoto } from "@/lib/recipe-photos";

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
  if (!lines || lines.length === 0) return [];

  let categories: any[] = [];
  try {
    categories = await listCategories(supabase);
  } catch (e) {
    console.error("listCategories error in resolveIngredientLines:", e);
  }

  const byIngredientId = new Map<string, { ingredient_id: string; quantity: string | null }>();

  for (const line of lines) {
    const name = line.name?.trim();
    if (!name) continue;

    try {
      const ingredientId = await findOrCreateIngredient(
        supabase,
        userId,
        name,
        line.categoryId ?? null,
        categories,
      );
      if (!ingredientId) continue;

      const qty = line.quantity?.trim() || null;
      if (byIngredientId.has(ingredientId)) {
        const existing = byIngredientId.get(ingredientId)!;
        if (qty) {
          existing.quantity = existing.quantity ? `${existing.quantity}, ${qty}` : qty;
        }
      } else {
        byIngredientId.set(ingredientId, {
          ingredient_id: ingredientId,
          quantity: qty,
        });
      }
    } catch (ingErr: any) {
      console.error(`Error resolving ingredient "${name}":`, ingErr?.message || ingErr);
    }
  }

  return [...byIngredientId.values()];
}

export async function getRecipes() {
  try {
    const { supabase, user } = await requireSession();
    if (!user || !supabase) return [];

    const { data, error } = await supabase
      .from("recipes")
      .select(RECIPE_SELECT)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("getRecipes:", error.message);
      return [];
    }

    return (data ?? []).map(mapRecipe);
  } catch (err: any) {
    if (isRedirectError(err)) throw err;
    console.error("getRecipes:", err?.message ?? err);
    return [];
  }
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
    if (!user || !supabase) return { success: false as const, error: "Non connecté." };

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
    if (isRedirectError(err)) throw err;
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
    if (!user || !supabase) return { success: false as const, error: "Non connecté." };

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
    if (isRedirectError(err)) throw err;
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
    if (isRedirectError(err)) throw err;
    console.error("deleteRecipe:", err?.message ?? err);
    return { success: false as const, error: err?.message || "Erreur lors de la suppression." };
  }
}

/**
 * Illustre les recettes qui n'ont pas encore de photo.
 *
 * Traité par petits lots et non en une passe : les banques d'images sont
 * interrogées une recette à la fois, et une centaine d'appels d'affilée
 * tiendrait la requête ouverte trop longtemps. L'appelant relance tant que
 * `remaining` n'est pas nul, et voit où il en est.
 *
 * La photo est aussi écrite sur le modèle starter_recipes quand le titre y
 * correspond : le prochain compte créé en hérite sans reconsommer le quota.
 */
export async function fillMissingRecipeImages(batchSize: number = 10) {
  try {
    const { supabase } = await requireSession();

    const { data: pending, error } = await supabase
      .from("recipes")
      .select("id, title")
      .is("image_url", null)
      .order("created_at", { ascending: true })
      .limit(Math.min(Math.max(batchSize, 1), 25));
    if (error) throw new Error(error.message);

    if (!pending || pending.length === 0) {
      return { success: true as const, illustrated: 0, remaining: 0, notFound: 0 };
    }

    let illustrated = 0;
    let notFound = 0;

    for (const recipe of pending) {
      const photo = await findRecipePhoto(recipe.title);
      if (!photo) {
        notFound += 1;
        continue;
      }

      const patch = {
        image_url: photo.url,
        image_credit_name: photo.creditName,
        image_credit_url: photo.creditUrl,
        image_license: photo.license,
      };

      const { error: updateError } = await supabase.from("recipes").update(patch).eq("id", recipe.id);
      if (updateError) throw new Error(updateError.message);

      // Le modèle partagé profite de la recherche déjà payée.
      await supabase.from("starter_recipes").update(patch).eq("title", recipe.title).is("image_url", null);

      illustrated += 1;
    }

    const { count } = await supabase
      .from("recipes")
      .select("id", { count: "exact", head: true })
      .is("image_url", null);

    if (illustrated > 0) refreshRecipeViews();

    return {
      success: true as const,
      illustrated,
      notFound,
      remaining: count ?? 0,
    };
  } catch (err: any) {
    if (isRedirectError(err)) throw err;
    console.error("fillMissingRecipeImages:", err?.message ?? err);
    return { success: false as const, error: err?.message || "Erreur lors de la recherche d'images." };
  }
}
