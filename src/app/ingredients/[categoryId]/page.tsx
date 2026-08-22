import prisma from "@/lib/prisma";
import Link from "next/link";
import { revalidatePath } from "next/cache";

export default async function CategoryDetailPage({ params }: { params: { categoryId: string } }) {
  const { categoryId } = params;

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: {
      ingredients: {
        orderBy: { name: "asc" },
        include: {
          recipes: {
            include: {
              recipe: true
            }
          }
        }
      }
    }
  });

  if (!category) {
    return <div>Catégorie introuvable</div>;
  }

  // Server action to add ingredient
  async function addIngredientAction(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    if (name) {
      await prisma.ingredient.create({
        data: { name, categoryId }
      });
      revalidatePath(`/ingredients/${categoryId}`);
      revalidatePath("/recipes"); // For the recipe form
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <Link href="/ingredients" style={{ color: "var(--primary)", textDecoration: "none", marginBottom: "0.5rem", display: "inline-block" }}>
            ← Retour aux catégories
          </Link>
          <h1>🥑 {category.name}</h1>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "2rem" }}>
        
        {/* Ajouter un ingrédient */}
        <div className="card glass-panel" style={{ height: "fit-content" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>➕ Nouvel Ingrédient</h2>
          <form action={addIngredientAction} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="input-group">
              <label className="input-label" htmlFor="name">Nom de l'ingrédient</label>
              <input type="text" id="name" name="name" className="input-field" required placeholder="Ex: Brocoli" />
            </div>
            <button type="submit" className="btn btn-primary">
              Ajouter
            </button>
          </form>
        </div>

        {/* Liste des ingrédients et recettes */}
        <div>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>Ingrédients dans cette catégorie</h2>
          
          {category.ingredients.length === 0 ? (
            <div className="card glass-panel" style={{ textAlign: "center", padding: "3rem" }}>
              <p style={{ color: "var(--text-secondary)" }}>Aucun ingrédient pour le moment.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {category.ingredients.map(ing => (
                <div key={ing.id} className="card glass-panel">
                  <h3 style={{ color: "var(--primary)", marginBottom: "0.5rem" }}>{ing.name}</h3>
                  
                  {ing.recipes.length > 0 ? (
                    <div>
                      <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)", fontWeight: 500 }}>Recettes avec cet ingrédient :</span>
                      <ul style={{ marginTop: "0.5rem", paddingLeft: "1.5rem" }}>
                        {ing.recipes.map(ri => (
                          <li key={ri.recipe.id} style={{ fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                            {ri.recipe.title} {ri.quantity && <span style={{ color: "var(--text-secondary)" }}>({ri.quantity})</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Aucune recette n'utilise cet ingrédient.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
