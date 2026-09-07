/**
 * Recherche d'une photo de plat libre de droits.
 *
 * Deux banques interrogées dans l'ordre, **sans clé d'API** — c'est le point
 * décisif : l'illustration marche pour tout le monde immédiatement, sans
 * compte développeur à créer ni quota à surveiller.
 *
 *  1. Wikimedia Commons : ses fichiers sont nommés d'après le plat
 *     (« Potato gratin on stove.jpg »), donc très précis ;
 *  2. Openverse (agrégateur Creative Commons) en rattrapage : bien plus
 *     fourni, mais bruité — d'où les filtres de isAcceptable().
 *
 * Aucune exception n'est propagée : sans résultat, l'appelant reçoit `null` et
 * l'interface garde sa vignette générée (voir recipe-emojis.ts).
 */

const OPENVERSE = "https://api.openverse.org/v1/images/";
const COMMONS = "https://commons.wikimedia.org/w/api.php";

/** Les conditions des deux services demandent un agent identifiable. */
const USER_AGENT = "MealFresh/1.0 (illustration de recettes)";

/**
 * Licences retenues. On écarte volontairement NC (non commercial) et ND (pas
 * de modification) : elles compliqueraient tout usage ultérieur de l'app pour
 * un gain nul ici, les banques étant assez fournies sans elles.
 */
const OPENVERSE_LICENSES = "cc0,pdm,by,by-sa";
const COMMONS_LICENSE_OK = /(CC0|Public domain|No restrictions|CC BY(-SA)? [0-9.]+)/i;

export type RecipePhoto = {
  url: string;
  creditName: string;
  creditUrl: string;
  license: string;
};

/**
 * Mots-clés français → anglais.
 *
 * Les deux banques sont indexées en anglais : « chou-fleur rôti » ne renvoie
 * rien, « roasted cauliflower » renvoie de bonnes photos. Seul le vocabulaire
 * culinaire est traduit, le reste du titre est ignoré.
 */
const LEXICON: readonly (readonly [RegExp, string])[] = [
  // Plats nommés d'abord : « salade de fruits » doit gagner sur « salade »,
  // sinon la requête ramène de la salade verte.
  [/salade de fruits/, "fruit salad"],
  [/salade grecque|grecque/, "greek salad"],
  [/riz au lait/, "rice pudding"],
  [/soupe [àa] l.oignon/, "onion soup"],
  [/pad tha/, "pad thai"],
  [/bo bun/, "vietnamese noodle salad"],
  [/cr[èe]me choco|mousse au chocolat/, "chocolate pudding"],
  [/compote/, "apple sauce"],

  [/chou-fleur/, "cauliflower"],
  [/courgette/, "zucchini"],
  [/aubergine/, "eggplant"],
  // `courge` seul attraperait « courgette », et la requête cumulerait alors
  // « zucchini pumpkin ».
  [/potiron|courge(?!tte)/, "pumpkin"],
  [/champignon/, "mushroom"],
  [/[ée]pinard/, "spinach"],
  [/pois chiches/, "chickpea"],
  [/lentille/, "lentil"],
  [/haricot/, "beans"],
  [/patate douce/, "sweet potato"],
  [/pomme de terre|dauphinois|\bpdt\b/, "potato"],
  [/poivron/, "bell pepper"],
  [/tomate/, "tomato"],
  [/avocat/, "avocado"],
  [/banane/, "banana"],
  [/pomme\b/, "apple"],
  [/citron/, "lemon"],
  [/fruits rouges/, "berries"],
  [/chocolat|choco\b/, "chocolate"],
  [/tofu/, "tofu"],
  [/saumon/, "salmon"],
  [/cabillaud|morue/, "cod"],
  [/crevette/, "shrimp"],
  [/thon/, "tuna"],
  [/fromage|ch[èe]vre|feta/, "cheese"],
  [/œuf|oeuf/, "egg"],
  [/riz/, "rice"],
  [/p[âa]tes/, "pasta"],
  [/nouilles/, "noodles"],
  [/quinoa/, "quinoa"],
  [/soupe|velout[ée]/, "soup"],
  [/salade/, "salad"],
  [/gratin/, "gratin"],
  [/curry|masala|tikka|dahl/, "curry"],
  [/cr[êe]pe/, "crepe"],
  [/g[âa]teau|moelleux/, "cake"],
  [/cookie/, "cookie"],
  [/tacos/, "tacos"],
  [/wrap/, "wrap"],
  [/burger/, "burger"],
  [/pizza/, "pizza"],
  [/risotto/, "risotto"],
  [/lasagne/, "lasagna"],
  [/couscous/, "couscous"],
  [/porridge/, "porridge"],
  [/granola/, "granola"],
  [/smoothie/, "smoothie bowl"],
  [/taboul[ée]/, "tabbouleh"],
  [/ratatouille/, "ratatouille"],
  [/moussaka/, "moussaka"],
  [/falafel/, "falafel"],
  // `\b` indispensable : sans lui, « ciboulette » devient « meatballs ».
  [/\bboulette/, "veggie meatballs"],
  [/gnocchis?/, "gnocchi"],
  [/chili/, "chili"],
  [/tortilla espagnole/, "spanish omelette"],
  [/chakchouka/, "shakshuka"],
  [/bagel/, "bagel"],
  [/pain perdu/, "french toast"],
  [/blanquette|mijot/, "stew"],
];

/**
 * Traduit le titre en requête anglaise, trois mots-clés au plus : au-delà,
 * les deux banques ne renvoient plus rien.
 */
export function buildQuery(title: string): string {
  const t = title.toLowerCase();
  const words: string[] = [];

  for (const [pattern, term] of LEXICON) {
    if (!pattern.test(t)) continue;
    // « apple » n'apporte rien après « apple sauce » : on ignore tout terme
    // qui recouvre un mot-clé déjà retenu, dans un sens ou dans l'autre.
    if (words.some((w) => w.includes(term) || term.includes(w))) continue;
    words.push(term);
    if (words.length === 3) break;
  }

  return words.length === 0 ? title : words.join(" ");
}

/**
 * Viandes. La banque de recettes est végétarienne : illustrer les lasagnes
 * végétariennes par une « Meaty Lasagna » serait faux, pas seulement laid.
 */
const MEAT =
  /\b(chicken|lamb|beef|pork|bacon|sausage|chorizo|ham|meaty|meat|meatballs?|steak|duck|turkey|veal|salami|prosciutto|carne)\b/i;

/**
 * Mention végétarienne explicite.
 *
 * Sans cette échappatoire, interdire « meatball » écarterait aussi les
 * boulettes végétales, qui se cherchent précisément sous « veggie meatballs ».
 */
const VEG_MARKER = /\b(vegan|vegetarian|veggie|plant-based|meat-?free)\b/i;

/** Poissons : acceptés uniquement sur les recettes qui en contiennent. */
const FISH = /\b(salmon|cod|tuna|shrimp|prawn|fish|seafood)\b/i;

/**
 * Contextes qui ne sont pas une assiette. Les deux banques indexent aussi des
 * photos de marchés, de festivals ou d'enseignes : « rice » a déjà ramené le
 * portrait d'une certaine Deborah Rice, « salmon food » de l'aliment pour
 * poissons d'élevage, et « soup dish » une porcelaine du Metropolitan Museum.
 */
const NOT_A_DISH =
  /(\b(food bank|foodbank|review|crowd|festival|market|street|road|truck|display|store|shop|club|menu|farmed|feed|worker|people|portrait|conference|award|museum|antique|porcelain|ceramic|empty|bone broth|broth base)\b|\bMET\s+DP)/i;

/**
 * Nettoie le crédit renvoyé par les banques.
 *
 * Commons duplique parfois la valeur (« Unknown authorUnknown author ») et
 * Openverse renvoie à l'occasion une URL en guise de nom d'auteur : afficher
 * ça tel quel sur la vignette serait illisible.
 */
function cleanCredit(raw: string, fallback: string): string {
  const value = String(raw ?? "").trim();
  if (!value || /^https?:\/\//i.test(value)) return fallback;
  // « XY » répété deux fois d'affilée est réduit à une occurrence.
  const half = value.slice(0, Math.floor(value.length / 2));
  if (half.length > 3 && value === half + half) return half.trim();
  return value.slice(0, 80);
}

/**
 * Un résultat n'est retenu que s'il cite le mot-clé le PLUS spécifique de la
 * requête — se contenter de « au moins un mot-clé » laissait passer n'importe
 * quelle photo contenant « food ».
 */
function isAcceptable(resultTitle: string, keywords: string[], allowFish: boolean): boolean {
  const t = (resultTitle || "").toLowerCase();
  if (!t.includes(keywords[0])) return false;
  if (MEAT.test(t) && !VEG_MARKER.test(t)) return false;
  if (!allowFish && FISH.test(t)) return false;
  if (NOT_A_DISH.test(t)) return false;
  return true;
}

function keywordsOf(query: string): string[] {
  const words = query.split(/\s+/).filter((w) => w.length > 3);
  return words.length > 0 ? words : [query.toLowerCase()];
}

async function searchOpenverse(query: string, keywords: string[], allowFish: boolean): Promise<RecipePhoto | null> {
  const url = new URL(OPENVERSE);
  url.searchParams.set("q", `${query} food`);
  url.searchParams.set("page_size", "20");
  url.searchParams.set("license", OPENVERSE_LICENSES);
  url.searchParams.set("mature", "false");

  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT }, cache: "no-store" });
  if (!response.ok) return null;

  const body = await response.json();
  for (const hit of body?.results ?? []) {
    if (!isAcceptable(hit?.title, keywords, allowFish)) continue;
    const image = hit?.thumbnail || hit?.url;
    if (!image) continue;
    return {
      url: image,
      creditName: cleanCredit(hit?.creator, "Openverse"),
      creditUrl: hit?.foreign_landing_url || image,
      license: `${String(hit?.license ?? "").toUpperCase()} ${hit?.license_version ?? ""}`.trim(),
    };
  }
  return null;
}

async function searchCommons(query: string, keywords: string[], allowFish: boolean): Promise<RecipePhoto | null> {
  const url = new URL(COMMONS);
  url.search = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: `filetype:bitmap ${query} dish`,
    gsrlimit: "20",
    gsrnamespace: "6",
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: "600",
  }).toString();

  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT }, cache: "no-store" });
  if (!response.ok) return null;

  const body = await response.json();
  const pages: any[] = Object.values(body?.query?.pages ?? {});
  pages.sort((a, b) => (a?.index ?? 0) - (b?.index ?? 0));

  for (const page of pages) {
    const name = String(page?.title ?? "")
      .replace(/^File:/, "")
      .replace(/\.(jpg|jpeg|png|webp)$/i, "")
      .replace(/_/g, " ");
    if (!isAcceptable(name, keywords, allowFish)) continue;

    const info = page?.imageinfo?.[0];
    const meta = info?.extmetadata ?? {};
    const license = meta?.LicenseShortName?.value ?? "";
    if (!COMMONS_LICENSE_OK.test(license) || !info?.thumburl) continue;

    // Le champ Artist est du HTML : on ne garde que le texte.
    const artist = String(meta?.Artist?.value ?? "").replace(/<[^>]+>/g, "").trim();
    return {
      url: info.thumburl,
      creditName: cleanCredit(artist, "Wikimedia Commons"),
      creditUrl: info.descriptionurl || "https://commons.wikimedia.org",
      license,
    };
  }
  return null;
}

/**
 * Photo pour une recette, ou `null` si aucune banque ne propose de résultat
 * pertinent. Ne lève jamais : illustrer est un agrément, pas une raison de
 * casser la page.
 */
export async function findRecipePhoto(title: string): Promise<RecipePhoto | null> {
  const query = buildQuery(title);
  const keywords = keywordsOf(query);
  const allowFish = FISH.test(query) || /saumon|cabillaud|thon|crevette|morue|poisson/i.test(title);

  // Commons d'abord : ses fichiers sont nommés d'après le plat, donc bien plus
  // précis. Openverse ne sert que de rattrapage sur les plats qu'il ignore.
  for (const search of [searchCommons, searchOpenverse]) {
    try {
      const photo = await search(query, keywords, allowFish);
      if (photo) return photo;
    } catch (error) {
      console.error(`[photos] ${search.name} a échoué pour « ${title} » :`, error);
    }
  }
  return null;
}
