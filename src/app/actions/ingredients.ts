"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/dal";
import { findOrCreateIngredient, isUuid, listCategories } from "@/lib/ingredients";

/** Catégories du référentiel, avec le nombre d'ingrédients du compte courant. */
export async function getCategories() {
  const { supabase } = await requireSession();

  const { data, error } = await supabase
    .from("categories")
    .select("id, name, ingredients(count)")
    .order("name");

  if (error) {
    console.error("getCategories:", error.message);
    return [];
  }

  return (data ?? []).map((category: any) => ({
    id: category.id,
    name: category.name,
    _count: { ingredients: category.ingredients?.[0]?.count ?? 0 },
  }));
}

/** Une catégorie et les ingrédients que l'utilisateur y a rangés. */
export async function getCategoryDetail(categoryIdOrName: string) {
  const { supabase } = await requireSession();

  const query = supabase.from("categories").select("id, name, ingredients ( id, name )");

  const { data, error } = isUuid(categoryIdOrName)
    ? await query.eq("id", categoryIdOrName).maybeSingle()
    : await query.ilike("name", categoryIdOrName).limit(1).maybeSingle();

  if (error) {
    console.error("getCategoryDetail:", error.message);
    return null;
  }
  if (!data) return null;

  const ingredients = [...((data as any).ingredients ?? [])].sort((a: any, b: any) =>
    a.name.localeCompare(b.name, "fr"),
  );

  return { id: (data as any).id, name: (data as any).name, ingredients };
}

/** Ajoute un ingrédient à une catégorie depuis la page de détail. */
export async function addIngredientToCategory(categoryId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const { supabase, user } = await requireSession();

  try {
    const categories = await listCategories(supabase);
    await findOrCreateIngredient(supabase, user.id, name, categoryId, categories);
  } catch (err: any) {
    console.error("addIngredientToCategory:", err?.message ?? err);
    return;
  }

  revalidatePath(`/ingredients/${categoryId}`);
  revalidatePath("/ingredients", "layout");
  revalidatePath("/recipes");
  revalidatePath("/planning");
}
