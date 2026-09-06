/**
 * Configuration Supabase partagée.
 *
 * La clé « publishable » (anciennement « anon ») est conçue pour être exposée
 * au navigateur : l'isolation des données repose sur les politiques RLS
 * définies dans supabase/migrations, pas sur le secret de cette clé. C'est
 * pourquoi les valeurs du projet Meal Fresh peuvent vivre dans le dépôt : sans
 * elles, un déploiement dont l'environnement n'est pas renseigné ne sert que
 * des erreurs, sans même pouvoir afficher l'écran de connexion.
 *
 * Ne JAMAIS mettre ici la clé « service role » / « secret » : elle contourne le
 * RLS et rendrait publiques les données de tous les utilisateurs.
 *
 * Les variables d'environnement restent prioritaires : c'est par elles qu'on
 * pointe vers un autre projet Supabase ou qu'on prend en compte une rotation
 * de clé sans toucher au code.
 */

const DEFAULT_SUPABASE_URL = "https://dxaxfxzpttiadfekksrx.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_Tqq1moLuBmmNAInb_qpYpQ_ldhthZ8U";

/** Espaces et guillemets parasites, fréquents quand la valeur est collée
 *  dans l'interface d'un hébergeur. */
function clean(raw: string | undefined) {
  return (raw ?? "").trim().replace(/^["']|["']$/g, "").trim();
}

/**
 * Une URL invalide fait lever `createServerClient`, ce qui casse le proxy ET
 * le rendu de chaque page — donc tout le site. On préfère normaliser ce qui
 * peut l'être (schéma absent, barre oblique finale) et ignorer le reste au
 * profit de la valeur par défaut, plutôt que de servir des 500.
 */
function normalizeUrl(raw: string | undefined) {
  const value = clean(raw);
  if (!value) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    // `new URL("https://nimportequoi")` réussit : on exige en plus un nom
    // d'hôte plausible, sinon l'erreur ne surgirait qu'au premier appel réseau.
    if (!url.hostname.includes(".") && url.hostname !== "localhost") return "";
    return url.origin;
  } catch {
    return "";
  }
}

// `||` et non `??` : une variable définie mais vide — ou inexploitable — doit
// elle aussi retomber sur la valeur par défaut.
export const SUPABASE_URL = normalizeUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) || DEFAULT_SUPABASE_URL;

export const SUPABASE_ANON_KEY =
  clean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
  clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  DEFAULT_SUPABASE_ANON_KEY;

export function assertSupabaseConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Configuration Supabase manquante. Renseignez NEXT_PUBLIC_SUPABASE_URL et " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY dans .env.local (voir .env.example).",
    );
  }
}
