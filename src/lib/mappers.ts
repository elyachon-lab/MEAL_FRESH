/**
 * Conversion des lignes Postgres (snake_case) vers les objets attendus par
 * l'interface (camelCase), héritée du schéma Prisma d'origine.
 */

/** Sélection PostgREST d'une recette et de ses ingrédients. */
export const RECIPE_SELECT = `
  id,
  title,
  url_source,
  instructions,
  created_at,
  ingredients:recipe_ingredients (
    quantity,
    ingredient:ingredients (
      id,
      name,
      category:categories ( id, name )
    )
  )
`;

export type RecipeRow = Record<string, any>;

export function mapRecipe(row: RecipeRow) {
  return {
    id: row.id,
    title: row.title,
    urlSource: row.url_source ?? null,
    instructions: row.instructions ?? null,
    createdAt: row.created_at,
    ingredients: (row.ingredients ?? [])
      .filter((line: any) => line?.ingredient)
      .map((line: any) => ({
        quantity: line.quantity ?? null,
        ingredient: {
          id: line.ingredient.id,
          name: line.ingredient.name,
          category: line.ingredient.category ?? { id: "", name: "Glucides" },
        },
      })),
  };
}

export function mapPlanning(row: RecipeRow) {
  return {
    id: row.id,
    date: row.date,
    mealTime: row.meal_time,
    recipe: row.recipe ? mapRecipe(row.recipe) : null,
  };
}

export function mapExpense(row: RecipeRow) {
  return {
    id: row.id,
    date: row.date,
    amount: Number(row.amount),
    category: row.category,
    description: row.description ?? null,
  };
}

/** Un créneau de planning est un jour calendaire : pas d'heure, pas de fuseau. */
export function toDateKey(input: string | Date): string {
  if (typeof input === "string") {
    const match = input.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  const d = input instanceof Date ? input : new Date(input);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
