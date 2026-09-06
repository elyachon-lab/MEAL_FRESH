-- Meal Fresh — schéma initial (auth + persistance multi-utilisateurs)
--
-- Remplace la base SQLite éphémère par Postgres.
-- Chaque table métier porte un user_id et est protégée par RLS : l'isolation
-- entre comptes est garantie par la base, pas seulement par le code applicatif.

-- ─────────────────────────────────────────────────────────────
-- 1. Données de référence partagées
-- ─────────────────────────────────────────────────────────────

create table if not exists public.categories (
  id   uuid primary key default gen_random_uuid(),
  name text not null unique
);

insert into public.categories (name) values
  ('Protéines'),
  ('Glucides'),
  ('Légumes'),
  ('Fruits'),
  ('Produits Laitiers'),
  ('Sucré'),
  ('Matières Grasses'),
  ('Épices & Condiments')
on conflict (name) do nothing;

-- ─────────────────────────────────────────────────────────────
-- 2. Données propres à chaque utilisateur
-- ─────────────────────────────────────────────────────────────

create table if not exists public.ingredients (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  category_id uuid not null references public.categories (id),
  created_at  timestamptz not null default now()
);

-- Un même ingrédient ne peut exister qu'une fois par utilisateur (insensible à la casse).
create unique index if not exists ingredients_user_name_key
  on public.ingredients (user_id, lower(name));

create table if not exists public.recipes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  title        text not null,
  url_source   text,
  instructions text,
  created_at   timestamptz not null default now()
);

create index if not exists recipes_user_created_idx
  on public.recipes (user_id, created_at desc);

create table if not exists public.recipe_ingredients (
  recipe_id     uuid not null references public.recipes (id) on delete cascade,
  ingredient_id uuid not null references public.ingredients (id) on delete cascade,
  quantity      text,
  primary key (recipe_id, ingredient_id)
);

create index if not exists recipe_ingredients_ingredient_idx
  on public.recipe_ingredients (ingredient_id);

-- `date` (et non timestamptz) : un créneau de planning est un jour calendaire.
-- Cela supprime définitivement les décalages de fuseau horaire qui faisaient
-- basculer un repas du jeudi au mercredi.
create table if not exists public.plannings (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  date       date not null,
  meal_time  text not null check (meal_time in ('Matin', 'Midi', 'Goûter', 'Soir')),
  recipe_id  uuid not null references public.recipes (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- Empêche au niveau de la base la double insertion d'une même carte.
  unique (user_id, date, meal_time, recipe_id)
);

create index if not exists plannings_user_date_idx
  on public.plannings (user_id, date);

create table if not exists public.monthly_budgets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  month      text not null check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  amount     numeric(10, 2) not null default 400 check (amount >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, month)
);

create table if not exists public.expenses (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  monthly_budget_id uuid not null references public.monthly_budgets (id) on delete cascade,
  date              date not null,
  amount            numeric(10, 2) not null check (amount > 0),
  category          text not null,
  description       text,
  created_at        timestamptz not null default now()
);

create index if not exists expenses_budget_date_idx
  on public.expenses (monthly_budget_id, date desc);

create index if not exists expenses_user_idx
  on public.expenses (user_id);

-- ─────────────────────────────────────────────────────────────
-- 3. Modèles de recettes copiés dans chaque nouveau compte
-- ─────────────────────────────────────────────────────────────

create table if not exists public.starter_recipes (
  id           uuid primary key default gen_random_uuid(),
  title        text not null unique,
  instructions text
);

create table if not exists public.starter_recipe_ingredients (
  starter_recipe_id uuid not null references public.starter_recipes (id) on delete cascade,
  name              text not null,
  category_name     text not null,
  quantity          text,
  primary key (starter_recipe_id, name)
);

-- ─────────────────────────────────────────────────────────────
-- 4. Row Level Security
-- ─────────────────────────────────────────────────────────────

alter table public.categories                 enable row level security;
alter table public.starter_recipes            enable row level security;
alter table public.starter_recipe_ingredients enable row level security;
alter table public.ingredients                enable row level security;
alter table public.recipes                    enable row level security;
alter table public.recipe_ingredients         enable row level security;
alter table public.plannings                  enable row level security;
alter table public.monthly_budgets            enable row level security;
alter table public.expenses                   enable row level security;

-- Les politiques ne supportent pas « if not exists » : on les recrée à chaque
-- exécution pour que la migration reste rejouable.
drop policy if exists "categories_read"                on public.categories;
drop policy if exists "starter_recipes_read"           on public.starter_recipes;
drop policy if exists "starter_recipe_ingredients_read" on public.starter_recipe_ingredients;
drop policy if exists "ingredients_own"                on public.ingredients;
drop policy if exists "recipes_own"                    on public.recipes;
drop policy if exists "recipe_ingredients_own"         on public.recipe_ingredients;
drop policy if exists "plannings_own"                  on public.plannings;
drop policy if exists "monthly_budgets_own"            on public.monthly_budgets;
drop policy if exists "expenses_own"                   on public.expenses;

-- Référentiel partagé : lecture seule pour les comptes connectés.
create policy "categories_read" on public.categories
  for select to authenticated using (true);

create policy "starter_recipes_read" on public.starter_recipes
  for select to authenticated using (true);

create policy "starter_recipe_ingredients_read" on public.starter_recipe_ingredients
  for select to authenticated using (true);

-- Données personnelles : chaque compte ne voit et ne modifie que ses lignes.
create policy "ingredients_own" on public.ingredients
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "recipes_own" on public.recipes
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Les clés étrangères pointant vers des lignes d'autrui sont refusées à
-- l'écriture : sans cela, un appel direct à l'API pourrait rattacher une
-- dépense au budget d'un autre compte, ou planifier la recette d'un tiers.
create policy "plannings_own" on public.plannings
  for all to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.recipes r
      where r.id = plannings.recipe_id and r.user_id = auth.uid()
    )
  );

create policy "monthly_budgets_own" on public.monthly_budgets
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "expenses_own" on public.expenses
  for all to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.monthly_budgets b
      where b.id = expenses.monthly_budget_id and b.user_id = auth.uid()
    )
  );

-- Table de liaison : l'appartenance se déduit des deux parents.
create policy "recipe_ingredients_own" on public.recipe_ingredients
  for all to authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id and r.user_id = auth.uid()
    )
    and exists (
      select 1 from public.ingredients i
      where i.id = recipe_ingredients.ingredient_id and i.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 5. Amorçage automatique d'un nouveau compte
-- ─────────────────────────────────────────────────────────────

create or replace function public.seed_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Copie des ingrédients du référentiel de démarrage vers le compte.
  insert into public.ingredients (user_id, name, category_id)
  select distinct on (lower(sri.name))
         new.id,
         sri.name,
         coalesce(c.id, (select id from public.categories where name = 'Glucides'))
  from public.starter_recipe_ingredients sri
  left join public.categories c on c.name = sri.category_name
  order by lower(sri.name)
  on conflict do nothing;

  -- Copie des recettes, puis rattachement de leurs ingrédients.
  with created as (
    insert into public.recipes (user_id, title, instructions)
    select new.id, sr.title, sr.instructions
    from public.starter_recipes sr
    returning id, title
  )
  insert into public.recipe_ingredients (recipe_id, ingredient_id, quantity)
  select created.id, ing.id, sri.quantity
  from created
  join public.starter_recipes sr on sr.title = created.title
  join public.starter_recipe_ingredients sri on sri.starter_recipe_id = sr.id
  join public.ingredients ing
    on ing.user_id = new.id
   and lower(ing.name) = lower(sri.name)
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.seed_new_user();
