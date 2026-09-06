import type { SupabaseClient } from "@supabase/supabase-js";

import { inferCategoryName } from "./emojis";

export type CategoryRef = { id: string; name: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string) {
  return UUID_RE.test(value);
}

/** Neutralise les jokers SQL pour qu'un ILIKE se comporte en égalité insensible à la casse. */
function likeExact(value: string) {
  return value.replace(/([\\%_])/g, "\\$1");
}

export async function listCategories(supabase: SupabaseClient): Promise<CategoryRef[]> {
  const { data, error } = await supabase.from("categories").select("id, name").order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as CategoryRef[];
}

/**
 * Résout la catégorie d'un ingrédient : par identifiant, par nom, puis par
 * déduction à partir du nom de l'ingrédient (Riz → Glucides, Chocolat → Sucré).
 */
export function resolveCategoryId(
  categories: CategoryRef[],
  ingredientName: string,
  categoryIdOrName?: string | null,
): string | undefined {
  if (categoryIdOrName) {
    const byId = categories.find((c) => c.id === categoryIdOrName);
    if (byId) return byId.id;
    const byName = categories.find(
      (c) => c.name.toLowerCase() === categoryIdOrName.toLowerCase(),
    );
    if (byName) return byName.id;
  }

  const inferred = inferCategoryName(ingredientName).toLowerCase();
  const byInference = categories.find((c) => c.name.toLowerCase() === inferred);
  if (byInference) return byInference.id;

  return categories[0]?.id;
}

/**
 * Renvoie l'identifiant d'un ingrédient du compte, en le créant si besoin.
 * L'unicité est garantie par l'index (user_id, lower(name)) : en cas de
 * création concurrente, on relit la ligne gagnante.
 */
export async function findOrCreateIngredient(
  supabase: SupabaseClient,
  userId: string,
  rawName: string,
  categoryIdOrName: string | null | undefined,
  categories: CategoryRef[],
): Promise<string | null> {
  const name = rawName.trim();
  if (!name) return null;

  const existing = await supabase
    .from("ingredients")
    .select("id")
    .eq("user_id", userId)
    .ilike("name", likeExact(name))
    .limit(1)
    .maybeSingle();

  if (existing.data?.id) return existing.data.id;

  const categoryId = resolveCategoryId(categories, name, categoryIdOrName);
  if (!categoryId) return null;

  const inserted = await supabase
    .from("ingredients")
    .insert({ user_id: userId, name, category_id: categoryId })
    .select("id")
    .single();

  if (inserted.data?.id) return inserted.data.id;

  // 23505 = violation d'unicité : un autre appel vient de créer l'ingrédient.
  if (inserted.error?.code === "23505") {
    const retry = await supabase
      .from("ingredients")
      .select("id")
      .eq("user_id", userId)
      .ilike("name", likeExact(name))
      .limit(1)
      .maybeSingle();
    return retry.data?.id ?? null;
  }

  throw new Error(inserted.error?.message ?? "Création de l'ingrédient impossible.");
}
