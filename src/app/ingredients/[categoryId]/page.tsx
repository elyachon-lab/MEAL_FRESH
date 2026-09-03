import prisma, { ensureDatabaseSchema } from "@/lib/prisma";
import Link from "next/link";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CategoryDetailPage({ params }: { params: Promise<{ categoryId: string }> }) {
  await ensureDatabaseSchema();
  const { categoryId } = await params;

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
    return (
      <div style={{ padding: "3rem 0", textAlign: "center" }}>
        <h2>Catégorie introuvable</h2>
        <Link href="/ingredients" className="btn btn-outline" style={{ marginTop: "1rem" }}>
          ← Retour aux catégories
        </Link>
      </div>
    );
  }

  // Action serveur pour ajouter un nouvel ingrédient à la catégorie
  async function addIngredientAction(formData: FormData) {
    "use server";
    await ensureDatabaseSchema();
    const name = (formData.get("name") as string)?.trim();
    if (name) {
      await prisma.ingredient.create({
        data: { name, categoryId }
      });
      revalidatePath(`/ingredients/${categoryId}`);
      revalidatePath("/ingredients");
      revalidatePath("/recipes");
      revalidatePath("/planning");
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <Link href="/ingredients" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 600, marginBottom: "0.5rem", display: "inline-block" }}>
            ← Retour aux catégories
          </Link>
          <h1>🥑 {category.name}</h1>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "2rem", alignItems: "start" }}>
        
        {/* Ajouter un ingrédient */}
        <div className="card panel" style={{ height: "fit-content" }}>
          <h2 style={{ fontSize: "1.15rem", marginBottom: "1rem" }}>➕ Ajouter un Ingrédient</h2>
          <form action={addIngredientAction} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label" htmlFor="name">Nom de l'ingrédient</label>
              <input type="text" id="name" name="name" className="input-field" required placeholder="Ex: Brocoli, Saumon..." />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
              Enregistrer l'ingrédient
            </button>
          </form>
        </div>

        {/* Liste des ingrédients et recettes */}
        <div>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>Ingrédients enregistrés ({category.ingredients.length})</h2>
          
          {category.ingredients.length === 0 ? (
            <div className="card panel" style={{ textAlign: "center", padding: "3rem" }}>
              <p style={{ color: "var(--text-secondary)" }}>Aucun ingrédient dans cette catégorie pour le moment.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
              {category.ingredients.map((ing: any) => (
                <div key={ing.id} className="card panel" style={{ padding: "1.25rem" }}>
                  <h3 style={{ color: "var(--primary)", marginBottom: "0.5rem" }}>{ing.name}</h3>
                  
                  {ing.recipes.length > 0 ? (
                    <div>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>Présent dans :</span>
                      <ul style={{ marginTop: "0.4rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                        {ing.recipes.map((ri: any) => (
                          <li key={ri.recipe.id} style={{ fontSize: "0.85rem", background: "var(--primary-light)", padding: "0.3rem 0.6rem", borderRadius: "var(--radius-sm)" }}>
                            <strong>{ri.recipe.title}</strong> {ri.quantity && <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>({ri.quantity})</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0 }}>Aucune recette n'utilise cet ingrédient.</p>
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
