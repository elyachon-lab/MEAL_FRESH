import prisma, { ensureDatabaseSchema } from "@/lib/prisma";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { getRecipes } from "@/app/actions/recipes";
import CategoryDetailView from "@/components/CategoryDetailView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CategoryDetailPage({ params }: { params: Promise<{ categoryId: string }> }) {
  await ensureDatabaseSchema();
  const { categoryId } = await params;

  const recipes = await getRecipes();

  let category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: {
      ingredients: {
        orderBy: { name: "asc" }
      }
    }
  });

  if (!category) {
    const allCats = await prisma.category.findMany({
      include: {
        ingredients: {
          orderBy: { name: "asc" }
        }
      }
    });

    category = allCats.find(
      c => c.id === categoryId || c.name.toLowerCase() === categoryId.toLowerCase()
    ) || null;
  }

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

  const activeCategory = category;

  // Action serveur pour ajouter un nouvel ingrédient à la catégorie
  async function addIngredientAction(formData: FormData) {
    "use server";
    await ensureDatabaseSchema();
    const name = (formData.get("name") as string)?.trim();
    if (name && activeCategory) {
      await prisma.ingredient.create({
        data: { name, categoryId: activeCategory.id }
      });
      revalidatePath(`/ingredients/${activeCategory.id}`);
      revalidatePath("/ingredients", "layout");
      revalidatePath("/recipes");
      revalidatePath("/planning");
    }
  }

  return (
    <CategoryDetailView
      initialCategory={JSON.parse(JSON.stringify(activeCategory))}
      serverRecipes={recipes}
      addIngredientAction={addIngredientAction}
    />
  );
}
