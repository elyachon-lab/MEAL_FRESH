/**
 * Recherche d'une photo de plat sur Unsplash.
 *
 * Le module est volontairement tolérant : sans clé d'API, ou si Unsplash ne
 * répond pas, il renvoie `null` et l'interface retombe sur la vignette
 * générée (voir recipe-emojis.ts). Illustrer une recette est un agrément, pas
 * une raison de casser la page.
 *
 * Clé à créer sur https://unsplash.com/oauth/applications puis à renseigner
 * dans UNSPLASH_ACCESS_KEY. Ce n'est PAS une variable NEXT_PUBLIC_ : la clé
 * reste côté serveur, jamais dans le bundle du navigateur.
 */

const ENDPOINT = "https://api.unsplash.com/search/photos";

/** Identifie l'application auprès d'Unsplash, requis par leurs conditions. */
const UTM = "?utm_source=meal_fresh&utm_medium=referral";

export type RecipePhoto = {
  url: string;
  creditName: string;
  creditUrl: string;
};

/**
 * Mots-clés français → anglais.
 *
 * La recherche Unsplash est indexée en anglais : « chou-fleur rôti » ne
 * renvoie rien, « roasted cauliflower » renvoie de bonnes photos. On ne
 * traduit que le vocabulaire culinaire utile, le reste du titre est ignoré.
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
  // Comme dans recipe-emojis : `courge` seul attraperait « courgette », et la
  // requête cumulerait alors « zucchini pumpkin ».
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
 * Construit la requête envoyée à Unsplash à partir du titre français.
 *
 * On garde au plus trois mots-clés : au-delà, Unsplash retourne surtout du
 * vide. « food » cadre le reste des résultats sur de la photographie
 * culinaire plutôt que sur l'ingrédient brut.
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

  if (words.length === 0) return `${title} food`;
  return `${words.join(" ")} food`;
}

/** Vrai si une clé d'API est présente. Permet à l'interface de distinguer
 *  « aucune photo trouvée » de « intégration pas encore configurée ». */
export function isUnsplashConfigured(): boolean {
  return Boolean(process.env.UNSPLASH_ACCESS_KEY?.trim());
}

/**
 * Cherche une photo pour une recette. `null` si pas de clé, pas de résultat,
 * ou en cas d'erreur réseau — jamais d'exception propagée à l'appelant.
 */
export async function findRecipePhoto(title: string): Promise<RecipePhoto | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY?.trim();
  if (!key) return null;

  const url = new URL(ENDPOINT);
  url.searchParams.set("query", buildQuery(title));
  url.searchParams.set("per_page", "1");
  url.searchParams.set("orientation", "landscape");
  url.searchParams.set("content_filter", "high");

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${key}`,
        "Accept-Version": "v1",
      },
      // Une recette illustrée le reste : inutile de rappeler Unsplash.
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`[unsplash] ${response.status} pour « ${title} »`);
      return null;
    }

    const body = await response.json();
    const photo = body?.results?.[0];
    if (!photo?.urls?.raw) return null;

    // Unsplash demande de signaler l'usage effectif d'une photo. L'appel est
    // accessoire : on ne bloque pas dessus et une erreur reste sans effet.
    const downloadLocation = photo?.links?.download_location;
    if (downloadLocation) {
      fetch(downloadLocation, { headers: { Authorization: `Client-ID ${key}` } }).catch(() => {});
    }

    // On fige les dimensions côté Unsplash plutôt que de redimensionner à
    // l'arrivée : le CDN sert directement le bon format.
    return {
      url: `${photo.urls.raw}&w=600&h=400&fit=crop&q=80`,
      creditName: photo?.user?.name ?? "Unsplash",
      creditUrl: photo?.user?.links?.html ? `${photo.user.links.html}${UTM}` : `https://unsplash.com${UTM}`,
    };
  } catch (error) {
    console.error(`[unsplash] échec de la recherche pour « ${title} » :`, error);
    return null;
  }
}
