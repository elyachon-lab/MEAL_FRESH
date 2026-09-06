# Meal Fresh

Planificateur de repas, banque de recettes et suivi de budget courses.
Next.js 16 (App Router) + Supabase (Postgres, Auth, RLS).

## Mise en route

### 1. Appliquer le schéma dans Supabase

Dans le dashboard du projet → **SQL Editor**, exécuter dans l'ordre :

1. `supabase/migrations/0001_init_auth_schema.sql` — tables, index, politiques RLS
   et déclencheur d'amorçage des nouveaux comptes ;
2. `supabase/migrations/0002_starter_recipes.sql` — les 16 recettes de démarrage.

Les deux fichiers sont rejouables sans effet de bord.

### 2. Renseigner les variables d'environnement

Copier `.env.example` vers `.env.local` et compléter avec les valeurs de
**Settings → API** :

```bash
cp .env.example .env.local
```

| Variable | Rôle |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clé publique (`anon` historique acceptée) |

Il n'y a **pas** de mot de passe de base de données à fournir : l'application
passe uniquement par l'API Supabase, jamais par une connexion Postgres directe.

### 3. Lancer l'application

```bash
pnpm install && pnpm dev
```

## Comptes et isolation des données

L'inscription se fait par email + mot de passe sur `/login`. À la création d'un
compte, un déclencheur Postgres copie les recettes de démarrage dans l'espace du
nouvel utilisateur.

Chaque table métier porte un `user_id` et une politique **Row Level Security** :
l'isolation est appliquée par la base, pas seulement par le code. Une requête
mal écrite — ou un appel direct à l'API avec la clé publique — ne peut pas
atteindre les données d'un autre compte.

Les catégories d'ingrédients sont un référentiel partagé, en lecture seule.

### Confirmation par email

Par défaut, Supabase exige une confirmation d'adresse. Le lien reçu arrive sur
`/auth/confirm`, qui gère les deux formats (`token_hash` et `code`).

Pour un usage personnel, la confirmation peut être désactivée dans
**Authentication → Providers → Email** ; l'application ouvre alors la session
directement après l'inscription.

## Architecture

| Chemin | Rôle |
| --- | --- |
| `src/proxy.ts` | Rafraîchit la session à chaque requête et redirige les visiteurs non connectés. Remplace l'ancienne convention `middleware`, dépréciée en Next.js 16. |
| `src/lib/dal.ts` | Couche d'accès aux données : session et client Supabase, mémorisés par rendu. |
| `src/lib/supabase/` | Création du client serveur et configuration. |
| `src/lib/mappers.ts` | Projection des lignes Postgres (`snake_case`) vers les objets de l'interface. |
| `src/app/actions/` | Server Actions : recettes, ingrédients, planning, budget, authentification. |
| `supabase/migrations/` | Schéma et données de référence. |

Les dates de planning sont stockées en type `date` (jour calendaire, sans
fuseau), ce qui supprime les décalages d'un jour observés auparavant. Une
contrainte d'unicité `(user_id, date, meal_time, recipe_id)` empêche en base la
double insertion d'une même carte.
