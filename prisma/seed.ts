import prisma, { ensureDatabaseSchema } from "../src/lib/prisma";

const DEFAULT_CATEGORIES = [
  "Protéines",
  "Glucides",
  "Légumes",
  "Fruits",
  "Produits Laitiers",
  "Sucré",
  "Matières Grasses",
  "Épices & Condiments"
];

function inferCatName(name: string): string {
  const n = name.toLowerCase().trim();
  if (n.includes("chocolat") || n.includes("sucre") || n.includes("miel")) return "Sucré";
  if (n.includes("poulet") || n.includes("boeuf") || n.includes("viande") || n.includes("steak") || n.includes("saumon") || n.includes("poisson") || n.includes("lardon") || n.includes("jambon") || n.includes("crevette") || n.includes("oeuf") || n.includes("œuf") || n.includes("cabillaud") || n.includes("haché") || n.includes("protéine de soja")) return "Protéines";
  if (n.includes("riz") || n.includes("pâte") || n.includes("gnocchi") || n.includes("pain") || n.includes("bagel") || n.includes("pomme de terre") || n.includes("patate") || n.includes("maïs") || n.includes("farine") || n.includes("lentille") || n.includes("fécule") || n.includes("haricot rouge")) return "Glucides";
  if (n.includes("brocoli") || n.includes("tomate") || n.includes("pulpe tomate") || n.includes("carotte") || n.includes("poivron") || n.includes("concombre") || n.includes("courgette") || n.includes("oignon")) return "Légumes";
  if (n.includes("fromage") || n.includes("cheddar") || n.includes("lait") || n.includes("crème") || n.includes("beurre")) return "Produits Laitiers";
  if (n.includes("huile")) return "Matières Grasses";
  if (n.includes("curry") || n.includes("paprika") || n.includes("bouillon") || n.includes("sauce")) return "Épices & Condiments";
  return "Glucides";
}

const RECIPES_DATA = [
  {
    title: "Crème choco",
    instructions: "Mélanger le chocolat noir fondu avec le lait de soja, le sucre et la fécule de maïs. Faire épaissir à feu doux.",
    ingredients: [
      { name: "Chocolat noir", cat: "Sucré" },
      { name: "Lait de soja", cat: "Produits Laitiers" },
      { name: "Sucre", cat: "Sucré" },
      { name: "Fécule de maïs", cat: "Glucides" }
    ]
  },
  {
    title: "Dahl lentilles",
    instructions: "Faire revenir l'oignon avec le curry, ajouter les lentilles corail, le lait de coco et servir chaud avec du riz.",
    ingredients: [
      { name: "Riz", cat: "Glucides" },
      { name: "Oignon", cat: "Légumes" },
      { name: "Lentilles corail", cat: "Glucides" },
      { name: "Curry", cat: "Épices & Condiments" },
      { name: "Lait de coco", cat: "Produits Laitiers" }
    ]
  },
  {
    title: "Pâtes courgette curry coco",
    instructions: "Cuire les pâtes. Faire poêler les courgettes avec le curry et déglacer au lait de coco.",
    ingredients: [
      { name: "Pâtes", cat: "Glucides" },
      { name: "Courgette", cat: "Légumes" },
      { name: "Curry", cat: "Épices & Condiments" },
      { name: "Lait de coco", cat: "Produits Laitiers" }
    ]
  },
  {
    title: "Gnocchis saumon",
    instructions: "Poêler les gnocchis, faire saisir le saumon frais et lier le tout à la crème de soja.",
    ingredients: [
      { name: "Gnocchis", cat: "Glucides" },
      { name: "Crème soja", cat: "Produits Laitiers" },
      { name: "Saumon frais", cat: "Protéines" }
    ]
  },
  {
    title: "Pâtes bolognaises végé",
    instructions: "Faire rissoler l'oignon et les carottes, ajouter le haché végétal et la pulpe de tomate. Servir sur les pâtes.",
    ingredients: [
      { name: "Haché végétal", cat: "Protéines" },
      { name: "Pâtes", cat: "Glucides" },
      { name: "Pulpe de tomate", cat: "Légumes" },
      { name: "Carotte", cat: "Légumes" },
      { name: "Oignon", cat: "Légumes" }
    ]
  },
  {
    title: "Burgers végé",
    instructions: "Griller le haché végétal et le pain burger. Assembler avec rondelles de tomate et fromage fondu.",
    ingredients: [
      { name: "Pain burger", cat: "Glucides" },
      { name: "Haché végétal", cat: "Protéines" },
      { name: "Tomate", cat: "Légumes" },
      { name: "Fromage", cat: "Produits Laitiers" }
    ]
  },
  {
    title: "Cabillaud lait de coco",
    instructions: "Pocher le filet de cabillaud dans le lait de coco parfumé au curry. Servir accompagné de riz.",
    ingredients: [
      { name: "Cabillaud", cat: "Protéines" },
      { name: "Lait de coco", cat: "Produits Laitiers" },
      { name: "Curry", cat: "Épices & Condiments" },
      { name: "Riz", cat: "Glucides" }
    ]
  },
  {
    title: "One pot chili PST",
    instructions: "Mijoter les protéines de soja avec le riz, haricots rouges, maïs, pulpe de tomate, oignon rouge et paprika.",
    ingredients: [
      { name: "Protéines de soja", cat: "Protéines" },
      { name: "Riz", cat: "Glucides" },
      { name: "Paprika", cat: "Épices & Condiments" },
      { name: "Haricots rouges", cat: "Glucides" },
      { name: "Pulpe de tomate", cat: "Légumes" },
      { name: "Maïs", cat: "Glucides" },
      { name: "Oignon rouge", cat: "Légumes" }
    ]
  },
  {
    title: "Bagel jambon",
    instructions: "Garnir le bagel avec le jambon, le fromage et des rondelles de concombre frais.",
    ingredients: [
      { name: "Pain bagel", cat: "Glucides" },
      { name: "Jambon", cat: "Protéines" },
      { name: "Fromage", cat: "Produits Laitiers" },
      { name: "Concombre", cat: "Légumes" }
    ]
  },
  {
    title: "Crêpes fromage jambon",
    instructions: "Préparer la pâte avec farine, lait, œufs, huile et pincée de sucre. Garnir de jambon et fromage.",
    ingredients: [
      { name: "Farine", cat: "Glucides" },
      { name: "Lait", cat: "Produits Laitiers" },
      { name: "Œufs", cat: "Protéines" },
      { name: "Huile", cat: "Matières Grasses" },
      { name: "Sucre", cat: "Sucré" }
    ]
  },
  {
    title: "Chakchouka",
    instructions: "Faire revenir les pommes de terre et oignons au beurre, ajouter les épices et pocher les œufs par-dessus.",
    ingredients: [
      { name: "Pomme de terre", cat: "Glucides" },
      { name: "Oignons", cat: "Légumes" },
      { name: "Œufs", cat: "Protéines" },
      { name: "Paprika", cat: "Épices & Condiments" },
      { name: "Bouillon cube", cat: "Épices & Condiments" },
      { name: "Miel", cat: "Sucré" },
      { name: "Beurre", cat: "Produits Laitiers" }
    ]
  },
  {
    title: "Pâtes carbo",
    instructions: "Faire dorér les lardons, cuire les pâtes al dente et lier le tout avec la crème de soja chaud.",
    ingredients: [
      { name: "Lardons", cat: "Protéines" },
      { name: "Crème soja", cat: "Produits Laitiers" },
      { name: "Pâtes", cat: "Glucides" }
    ]
  },
  {
    title: "PDT et Patate douce sautées steak lentilles",
    instructions: "Sauter les pommes de terre et patates douces en dés. Servir avec le steak de lentilles rissolé.",
    ingredients: [
      { name: "Pomme de terre", cat: "Glucides" },
      { name: "Patate douce", cat: "Glucides" },
      { name: "Steak de lentilles", cat: "Protéines" },
      { name: "Lentilles", cat: "Glucides" }
    ]
  },
  {
    title: "Pâtes cheddar pulpe tomate",
    instructions: "Napper les pâtes chaudes avec la sauce pulpe de tomate et faire fondre généreusement le cheddar.",
    ingredients: [
      { name: "Pâtes", cat: "Glucides" },
      { name: "Cheddar", cat: "Produits Laitiers" },
      { name: "Pulpe de tomate", cat: "Légumes" }
    ]
  },
  {
    title: "Riz soja légumes œuf",
    instructions: "Sauter le riz avec poivrons, carottes, oignons, sauce soja et incorporer l'œuf brouillé.",
    ingredients: [
      { name: "Riz", cat: "Glucides" },
      { name: "Poivron", cat: "Légumes" },
      { name: "Oignon", cat: "Légumes" },
      { name: "Carotte", cat: "Légumes" },
      { name: "Sauce soja", cat: "Épices & Condiments" },
      { name: "Œuf", cat: "Protéines" }
    ]
  },
  {
    title: "Salade de riz",
    instructions: "Mélanger le riz froid avec dés de tomate, concombre, œufs durs et de petits dés de fromage.",
    ingredients: [
      { name: "Tomate", cat: "Légumes" },
      { name: "Concombre", cat: "Légumes" },
      { name: "Riz", cat: "Glucides" },
      { name: "Œuf", cat: "Protéines" },
      { name: "Fromage", cat: "Produits Laitiers" }
    ]
  }
];

export async function seedAllRecipes() {
  await ensureDatabaseSchema();
  console.log("Seeding categories...");
  const catMap = new Map<string, string>();

  for (const catName of DEFAULT_CATEGORIES) {
    const c = await prisma.category.upsert({
      where: { name: catName },
      update: {},
      create: { name: catName }
    });
    catMap.set(catName, c.id);
  }

  console.log("Seeding 16 recipes with ingredients...");
  for (const rData of RECIPES_DATA) {
    const existing = await prisma.recipe.findFirst({ where: { title: rData.title } });
    if (existing) {
      await prisma.recipe.delete({ where: { id: existing.id } });
    }

    const createdRecipe = await prisma.recipe.create({
      data: {
        title: rData.title,
        instructions: rData.instructions,
      }
    });

    for (const ing of rData.ingredients) {
      const catName = ing.cat || inferCatName(ing.name);
      const catId = catMap.get(catName) || catMap.get("Glucides")!;

      let ingredient = await prisma.ingredient.findFirst({
        where: { name: { equals: ing.name.trim() } }
      });

      if (!ingredient) {
        ingredient = await prisma.ingredient.create({
          data: {
            name: ing.name.trim(),
            categoryId: catId
          }
        });
      }

      await prisma.recipeIngredient.create({
        data: {
          recipeId: createdRecipe.id,
          ingredientId: ingredient.id,
        }
      });
    }
  }

  console.log("Seeding completed successfully!");
}

if (require.main === module) {
  seedAllRecipes()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
