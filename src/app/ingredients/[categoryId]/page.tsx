import Link from "next/link";

import { addIngredientToCategory, getCategoryDetail } from "@/app/actions/ingredients";
import { getRecipes } from "@/app/actions/recipes";
import CategoryDetailView from "@/components/CategoryDetailView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const { categoryId } = await params;

  const [category, recipes] = await Promise.all([getCategoryDetail(categoryId), getRecipes()]);

  if (!category) {
    return (
      <div style={{ padding: "3rem 0", textAlign: "center" }}>
        <h2>Catégorie introuvable</h2>
        <Link href="/ingredients" className="btn btn-outline" style={{ marginTop: "1rem" }}>
          ← Retour aux catégories
        </Link>
      </div>
    );
  }

  async function addIngredientAction(formData: FormData) {
    "use server";
    await addIngredientToCategory(category!.id, formData);
  }

  return (
    <CategoryDetailView
      initialCategory={category}
      serverRecipes={recipes}
      addIngredientAction={addIngredientAction}
    />
  );
}
