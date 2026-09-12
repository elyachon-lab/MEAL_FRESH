import Link from "next/link";

import { addIngredientToCategory, getCategoryDetail } from "@/app/actions/ingredients";
import { getRecipes } from "@/app/actions/recipes";
import { getUser } from "@/lib/dal";
import CategoryDetailView from "@/components/CategoryDetailView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const { categoryId } = await params;

  const [category, recipes, user] = await Promise.all([
    getCategoryDetail(categoryId),
    getRecipes(),
    getUser(),
  ]);

  if (!category) {
    // Le référentiel de catégories n'est lisible qu'avec une session : sans
    // elle, toutes les catégories répondaient « introuvable », ce qui se lit
    // comme un lien cassé alors qu'il manque simplement une connexion.
    const notSignedIn = !user;

    return (
      <div style={{ padding: "3rem 0", textAlign: "center" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>{notSignedIn ? "🔐" : "🔍"}</div>
        <h2>{notSignedIn ? "Connectez-vous pour explorer vos ingrédients" : "Catégorie introuvable"}</h2>
        <p style={{ color: "var(--text-secondary)", maxWidth: "460px", margin: "0.5rem auto 0" }}>
          {notSignedIn
            ? "Vos catégories et les ingrédients qui s'y rattachent sont liés à votre compte."
            : `Aucune catégorie ne correspond à « ${categoryId} ».`}
        </p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginTop: "1.5rem", flexWrap: "wrap" }}>
          {notSignedIn && (
            <Link href="/login" className="btn btn-primary">
              🔐 Se connecter
            </Link>
          )}
          <Link href="/ingredients" className="btn btn-outline">
            ← Retour aux catégories
          </Link>
        </div>
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
