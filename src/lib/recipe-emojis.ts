/**
 * Icône représentant un PLAT (et non un ingrédient : voir emojis.ts).
 *
 * Le semainier affichait le même 🍲 sur toutes les cartes, ce qui rendait une
 * journée illisible d'un coup d'œil. On choisit ici une icône par famille de
 * plat, du plus spécifique au plus générique — la première règle qui
 * correspond gagne, donc l'ordre compte.
 *
 * L'objectif est la lisibilité, pas l'unicité : deux plats de pâtes partagent
 * légitimement 🍝. Ce qui compte est qu'une case de planning se distingue de
 * sa voisine.
 */

const RULES: readonly (readonly [RegExp, string])[] = [
  // ── Sucré & goûter ────────────────────────────────────────────
  [/cookie|biscuit/, "🍪"],
  [/banana bread|g[âa]teau|moelleux|brownie|cake/, "🍰"],
  [/cr[êe]pe/, "🥞"],
  [/pain perdu/, "🍞"],
  [/riz au lait|cr[èe]me choco|flan|compote/, "🍮"],
  [/salade de fruits/, "🍓"],
  [/smoothie|milkshake/, "🥤"],
  [/granola/, "🥜"],
  [/porridge/, "🥣"],
  [/chocolat/, "🍫"],

  // ── Matin salé ────────────────────────────────────────────────
  [/tartine|toast/, "🥑"],
  [/bagel/, "🥯"],
  [/œufs? brouill|oeufs? brouill|omelette|tortilla espagnole|chakchouka/, "🍳"],

  // ── Sandwichs & street food ───────────────────────────────────
  [/burger/, "🍔"],
  [/tacos/, "🌮"],
  [/wrap|burrito/, "🌯"],
  // `\b` : « ciboulette » ne doit pas devenir une boulette.
  [/falafel|\bboulette/, "🧆"],
  [/pizza/, "🍕"],

  // ── Soupes ────────────────────────────────────────────────────
  [/soupe [àa] l.oignon/, "🧅"],
  // `courge` sans le garde-fou attraperait « courgette ».
  [/velout[ée]|potiron|courge(?!tte)/, "🎃"],
  [/soupe de l[ée]gumes/, "🥕"],
  [/soupe|minestrone|bouillon/, "🍲"],

  // ── Salades ───────────────────────────────────────────────────
  [/taboul[ée]/, "🌿"],
  [/salade grecque|grecque/, "🫒"],
  [/buddha bowl|bowl/, "🥙"],
  [/salade/, "🥗"],

  // ── Pâtes, nouilles, riz ──────────────────────────────────────
  [/lasagne/, "🧀"],
  [/gnocchis?/, "🥟"],
  [/nouilles|pad tha[ïi]|bo bun|ramen/, "🍜"],
  [/p[âa]tes|spaghetti|penne|carbo|bolognaise/, "🍝"],
  [/risotto|champignon/, "🍄"],
  [/riz/, "🍚"],
  [/couscous|semoule|tajine/, "🥘"],
  [/quinoa|boulgour/, "🌾"],

  // ── Poissons & fruits de mer ──────────────────────────────────
  [/crevette|gamba/, "🦐"],
  [/saumon|cabillaud|morue|thon|poisson|papillote|brandade/, "🐟"],

  // ── Légumineuses & plats mijotés ──────────────────────────────
  [/chili|piment/, "🌶️"],
  [/dahl|curry|tikka|masala/, "🍛"],
  [/pois chiches|lentille|haricot|f[èe]ve/, "🫘"],
  // Avant la règle « tofu » : une blanquette reste un mijoté, quel que soit
  // ce qu'on met dedans.
  [/blanquette|basquaise|ratatouille|moussaka|mijot/, "🥘"],
  [/tofu|seitan|tempeh|saut[ée]|wok/, "🥢"],

  // ── Légumes & gratins ─────────────────────────────────────────
  [/chou-fleur|brocoli|chou/, "🥦"],
  [/aubergine/, "🍆"],
  [/courgette/, "🥒"],
  [/poivron/, "🫑"],
  [/[ée]pinard/, "🥬"],
  [/patate douce|pomme de terre|gratin dauphinois|pdt/, "🥔"],
  [/gratin/, "🧀"],
  [/tarte|quiche/, "🥧"],
];

/** Icône par défaut, si aucune règle ne correspond. */
const FALLBACK = "🍽️";

/**
 * Icône du plat, déduite de son titre.
 *
 * Les accents sont conservés : les expressions ci-dessus les gèrent
 * explicitement (`[ée]`), ce qui évite une normalisation Unicode coûteuse
 * appelée une fois par carte du semainier.
 */
export function getRecipeEmoji(title: string = ""): string {
  const t = title.toLowerCase().trim();
  if (!t) return FALLBACK;

  for (const [pattern, emoji] of RULES) {
    if (pattern.test(t)) return emoji;
  }
  return FALLBACK;
}

/**
 * Dégradé de repli, utilisé tant qu'une recette n'a pas de photo.
 *
 * La teinte dérive du titre, donc elle est stable d'un rendu à l'autre et
 * deux recettes voisines dans la liste ont peu de chances de se ressembler.
 */
export function getRecipeGradient(title: string = ""): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) % 360;
  }
  const hue = hash;
  return `linear-gradient(135deg, hsl(${hue} 70% 88%) 0%, hsl(${(hue + 40) % 360} 65% 80%) 100%)`;
}
