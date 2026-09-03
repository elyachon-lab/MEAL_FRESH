/**
 * Infère le nom de la catégorie à partir du nom d'un ingrédient
 */
export function inferCategoryName(ingredientName: string): string {
  const n = ingredientName.toLowerCase().trim();
  
  if (n.includes("poulet") || n.includes("boeuf") || n.includes("bœuf") || n.includes("viande") || n.includes("steak") || n.includes("saumon") || n.includes("poisson") || n.includes("lardon") || n.includes("jambon") || n.includes("bacon") || n.includes("crevette") || n.includes("oeuf") || n.includes("œuf") || n.includes("dinde") || n.includes("thon") || n.includes("saucisse")) {
    return "Protéines";
  }
  if (n.includes("riz") || n.includes("pâte") || n.includes("spaghetti") || n.includes("penne") || n.includes("coquillette") || n.includes("pain") || n.includes("baguette") || n.includes("pomme de terre") || n.includes("patate") || n.includes("frite") || n.includes("maïs") || n.includes("blé") || n.includes("quinoa") || n.includes("farine") || n.includes("semoule")) {
    return "Glucides";
  }
  if (n.includes("brocoli") || n.includes("tomate") || n.includes("carotte") || n.includes("avocat") || n.includes("poivron") || n.includes("concombre") || n.includes("courgette") || n.includes("salade") || n.includes("épinard") || n.includes("oignon") || n.includes("ail") || n.includes("champignon") || n.includes("aubergine") || n.includes("chou")) {
    return "Légumes";
  }
  if (n.includes("pomme") || n.includes("banane") || n.includes("citron") || n.includes("fraise") || n.includes("framboise") || n.includes("orange") || n.includes("pêche") || n.includes("abricot") || n.includes("ananas") || n.includes("kiwi")) {
    return "Fruits";
  }
  if (n.includes("fromage") || n.includes("mozzarella") || n.includes("emmental") || n.includes("parmesan") || n.includes("cheddar") || n.includes("lait") || n.includes("crème") || n.includes("yaourt") || n.includes("beurre")) {
    return "Produits Laitiers";
  }
  if (n.includes("huile") || n.includes("olive")) {
    return "Matières Grasses";
  }
  if (n.includes("sel") || n.includes("poivre") || n.includes("épice") || n.includes("curry") || n.includes("basilic") || n.includes("persil") || n.includes("herbe")) {
    return "Épices & Condiments";
  }

  return "Glucides";
}

/**
 * Dictionnaire intelligent d'emojis pour les ingrédients
 */
export function getIngredientEmoji(name: string = "", categoryName: string = ""): string {
  const n = name.toLowerCase().trim();

  // Céréales, Glucides & Féculents
  if (n.includes("riz")) return "🍚";
  if (n.includes("pâte") || n.includes("spaghetti") || n.includes("penne") || n.includes("coquillette") || n.includes("nouille") || n.includes("macaroni")) return "🍝";
  if (n.includes("pain") || n.includes("baguette") || n.includes("toast") || n.includes("brioche")) return "🥖";
  if (n.includes("pomme de terre") || n.includes("patate") || n.includes("frite")) return "🥔";
  if (n.includes("maïs")) return "🌽";
  if (n.includes("farine") || n.includes("blé") || n.includes("avoine") || n.includes("quinoa") || n.includes("semoule")) return "🌾";

  // Protéines & Viandes
  if (n.includes("poulet") || n.includes("dinde") || n.includes("volaille") || n.includes("nugget")) return "🍗";
  if (n.includes("boeuf") || n.includes("bœuf") || n.includes("viande") || n.includes("steak") || n.includes("haché")) return "🥩";
  if (n.includes("saumon") || n.includes("poisson") || n.includes("thon") || n.includes("cabillaud") || n.includes("sardine") || n.includes("filet de poisson")) return "🐟";
  if (n.includes("crevette") || n.includes("gamba") || n.includes("fruit de mer")) return "🦐";
  if (n.includes("lardon") || n.includes("bacon") || n.includes("jambon") || n.includes("porc") || n.includes("saucisson")) return "🥓";
  if (n.includes("saucisse") || n.includes("merguez") || n.includes("chipolata")) return "🌭";
  if (n.includes("oeuf") || n.includes("œuf")) return "🥚";

  // Légumes
  if (n.includes("brocoli") || n.includes("chou-fleur")) return "🥦";
  if (n.includes("tomate")) return "🍅";
  if (n.includes("carotte")) return "🥕";
  if (n.includes("avocat")) return "🥑";
  if (n.includes("poivron")) return "🫑";
  if (n.includes("concombre") || n.includes("courgette")) return "🥒";
  if (n.includes("salade") || n.includes("épinard") || n.includes("laitue") || n.includes("roquette")) return "🥬";
  if (n.includes("oignon")) return "🧅";
  if (n.includes("ail")) return "🧄";
  if (n.includes("champignon")) return "🍄";
  if (n.includes("aubergine")) return "🍆";

  // Produits laitiers
  if (n.includes("fromage") || n.includes("mozzarella") || n.includes("emmental") || n.includes("parmesan") || n.includes("cheddar") || n.includes("gruyère") || n.includes("comté") || n.includes("ricotta") || n.includes("feta")) return "🧀";
  if (n.includes("lait") || n.includes("crème") || n.includes("yaourt")) return "🥛";
  if (n.includes("beurre")) return "🧈";

  // Huiles, Condiments & Épices
  if (n.includes("olive") || n.includes("huile")) return "🫒";
  if (n.includes("sel") || n.includes("poivre") || n.includes("épice") || n.includes("curry") || n.includes("basilic") || n.includes("persil") || n.includes("herbe")) return "🌿";

  // Fruits & Sucré
  if (n.includes("pomme") && !n.includes("terre")) return "🍎";
  if (n.includes("banane")) return "🍌";
  if (n.includes("citron")) return "🍋";
  if (n.includes("fraise")) return "🍓";
  if (n.includes("framboise") || n.includes("mûre") || n.includes("myrtille")) return "🫐";
  if (n.includes("orange") || n.includes("clémentine")) return "🍊";
  if (n.includes("pêche") || n.includes("abricot")) return "🍑";
  if (n.includes("ananas")) return "🍍";
  if (n.includes("kiwi")) return "🥝";
  if (n.includes("chocolat") || n.includes("cacao")) return "🍫";
  if (n.includes("miel") || n.includes("sucre")) return "🍯";

  // Fallbacks basés sur le nom de la catégorie
  const cat = categoryName.toLowerCase();
  if (cat.includes("protéines")) return "🥩";
  if (cat.includes("légumes")) return "🥦";
  if (cat.includes("fruits")) return "🍎";
  if (cat.includes("glucides")) return "🍚";
  if (cat.includes("laitier")) return "🧀";
  if (cat.includes("grasses")) return "🧈";
  if (cat.includes("épices")) return "🌿";

  return "🍽️";
}
