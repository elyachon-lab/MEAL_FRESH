import { getCategories } from "../actions/ingredients";
import { getRecipes } from "../actions/recipes";
import CategoriesOverview from "@/components/CategoriesOverview";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function IngredientsPage() {
  const [categories, recipes] = await Promise.all([getCategories(), getRecipes()]);

  return <CategoriesOverview initialCategories={categories} serverRecipes={recipes} />;
}
