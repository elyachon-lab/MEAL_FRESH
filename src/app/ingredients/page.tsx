import { getCategories } from "../actions/ingredients";
import CategoriesOverview from "@/components/CategoriesOverview";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function IngredientsPage() {
  const categories = await getCategories();

  return <CategoriesOverview initialCategories={JSON.parse(JSON.stringify(categories))} />;
}
