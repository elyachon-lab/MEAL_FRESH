/**
 * Infère le nom de la catégorie à partir du nom d'un ingrédient
 */
export function inferCategoryName(ingredientName: string): string {
  const n = ingredientName.toLowerCase().trim();
  
  if (n.includes("chocolat") || n.includes("sucre") || n.includes("miel") || n.includes("bonbon") || n.includes("gâteau") || n.includes("biscuit") || n.includes("caramel") || n.includes("vanille")) {
    return "Sucré";
  }
  if (n.includes("poulet") || n.includes("boeuf") || n.includes("bœuf") || n.includes("viande") || n.includes("steak") || n.includes("saumon") || n.includes("poisson") || n.includes("lardon") || n.includes("jambon") || n.includes("bacon") || n.includes("crevette") || n.includes("oeuf") || n.includes("œuf") || n.includes("dinde") || n.includes("thon") || n.includes("saucisse") || n.includes("cabillaud") || n.includes("haché") || n.includes("protéine de soja")) {
    return "Protéines";
  }
  if (n.includes("riz") || n.includes("pâte") || n.includes("gnocchi") || n.includes("spaghetti") || n.includes("penne") || n.includes("coquillette") || n.includes("pain") || n.includes("bagel") || n.includes("baguette") || n.includes("pomme de terre") || n.includes("patate") || n.includes("frite") || n.includes("maïs") || n.includes("blé") || n.includes("quinoa") || n.includes("farine") || n.includes("semoule") || n.includes("lentille") || n.includes("fécule") || n.includes("haricot rouge")) {
    return "Glucides";
  }
  if (n.includes("brocoli") || n.includes("tomate") || n.includes("pulpe tomate") || n.includes("carotte") || n.includes("avocat") || n.includes("poivron") || n.includes("concombre") || n.includes("courgette") || n.includes("salade") || n.includes("épinard") || n.includes("oignon") || n.includes("ail") || n.includes("champignon") || n.includes("aubergine") || n.includes("chou")) {
    return "Légumes";
  }
  if (n.includes("pomme") || n.includes("banane") || n.includes("citron") || n.includes("fraise") || n.includes("framboise") || n.includes("orange") || n.includes("pêche") || n.includes("abricot") || n.includes("ananas") || n.includes("kiwi")) {
    return "Fruits";
  }
  if (n.includes("fromage") || n.includes("cheddar") || n.includes("mozzarella") || n.includes("emmental") || n.includes("parmesan") || n.includes("lait") || n.includes("crème") || n.includes("yaourt") || n.includes("beurre")) {
    return "Produits Laitiers";
  }
  if (n.includes("huile") || n.includes("olive")) {
    return "Matières Grasses";
  }
  if (n.includes("sel") || n.includes("poivre") || n.includes("épice") || n.includes("curry") || n.includes("paprika") || n.includes("bouillon") || n.includes("sauce") || n.includes("basilic") || n.includes("persil") || n.includes("herbe")) {
    return "Épices & Condiments";
  }

  return "Glucides";
}

/**
 * Dictionnaire intelligent d'emojis pour les ingrédients
 */
export function getIngredientEmoji(name: string = "", categoryName: string = ""): string {
  const n = name.toLowerCase().trim();

  // Sucré & Desserts
  if (n.includes("chocolat")) return "🍫";
  if (n.includes("sucre") || n.includes("miel")) return "🍯";

  // Céréales, Glucides & Féculents
  if (n.includes("riz")) return "🍚";
  if (n.includes("pâte") || n.includes("gnocchi") || n.includes("spaghetti") || n.includes("penne") || n.includes("coquillette") || n.includes("nouille")) return "🍝";
  if (n.includes("pain") || n.includes("bagel") || n.includes("baguette") || n.includes("toast")) return "🥖";
  if (n.includes("pomme de terre") || n.includes("patate")) return "🥔";
  if (n.includes("lentille") || n.includes("haricot rouge")) return "🫘";
  if (n.includes("maïs")) return "🌽";
  if (n.includes("farine") || n.includes("blé") || n.includes("fécule")) return "🌾";

  // Protéines & Viandes
  if (n.includes("poulet") || n.includes("dinde") || n.includes("volaille")) return "🍗";
  if (n.includes("boeuf") || n.includes("bœuf") || n.includes("viande") || n.includes("steak") || n.includes("haché")) return "🥩";
  if (n.includes("saumon") || n.includes("cabillaud") || n.includes("poisson") || n.includes("thon")) return "🐟";
  if (n.includes("crevette") || n.includes("gamba")) return "🦐";
  if (n.includes("lardon") || n.includes("bacon") || n.includes("jambon") || n.includes("porc")) return "🥓";
  if (n.includes("oeuf") || n.includes("œuf")) return "🥚";

  // Légumes
  if (n.includes("brocoli") || n.includes("chou")) return "🥦";
  if (n.includes("tomate") || n.includes("pulpe tomate")) return "🍅";
  if (n.includes("carotte")) return "🥕";
  if (n.includes("avocat")) return "🥑";
  if (n.includes("poivron")) return "🫑";
  if (n.includes("concombre") || n.includes("courgette")) return "🥒";
  if (n.includes("salade") || n.includes("épinard")) return "🥬";
  if (n.includes("oignon")) return "🧅";
  if (n.includes("ail")) return "🧄";
  if (n.includes("champignon")) return "🍄";

  // Produits laitiers & Alternatives Végétales
  if (n.includes("fromage") || n.includes("cheddar") || n.includes("mozzarella") || n.includes("emmental")) return "🧀";
  if (n.includes("lait") || n.includes("crème") || n.includes("yaourt")) return "🥛";
  if (n.includes("beurre")) return "🧈";

  // Huiles, Condiments & Épices
  if (n.includes("olive") || n.includes("huile")) return "🫒";
  if (n.includes("paprika") || n.includes("curry") || n.includes("épice") || n.includes("sauce") || n.includes("bouillon")) return "🌿";

  // Fruits & Sucré
  if (n.includes("pomme") && !n.includes("terre")) return "🍎";
  if (n.includes("banane")) return "🍌";
  if (n.includes("citron")) return "🍋";
  if (n.includes("fraise")) return "🍓";

  // Fallbacks basés sur le nom de la catégorie
  const cat = categoryName.toLowerCase();
  if (cat.includes("sucré") || cat.includes("sucre")) return "🍬";
  if (cat.includes("protéines")) return "🥩";
  if (cat.includes("légumes")) return "🥦";
  if (cat.includes("fruits")) return "🍎";
  if (cat.includes("glucides")) return "🍚";
  if (cat.includes("laitier")) return "🧀";
  if (cat.includes("grasses")) return "🧈";
  if (cat.includes("épices")) return "🌿";

  return "🍽️";
}
