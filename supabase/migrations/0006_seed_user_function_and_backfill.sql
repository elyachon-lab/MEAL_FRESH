-- Meal Fresh — banque de recettes étendue (3/3 : amorçage réutilisable + rattrapage).
--
-- La logique de copie vivait dans le déclencheur, donc elle ne servait que les
-- comptes créés APRÈS l'ajout d'une recette. On l'extrait ici pour pouvoir
-- aussi rattraper les comptes existants, et on la rend idempotente : seules
-- les recettes que l'utilisateur n'a pas déjà sont insérées, ce qui permet de
-- rejouer l'amorçage à chaque enrichissement du référentiel sans créer de
-- doublons ni écraser les modifications de l'utilisateur.

create or replace function public.seed_user(uid uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Ingrédients du référentiel de démarrage.
  insert into public.ingredients (user_id, name, category_id)
  select distinct on (lower(sri.name))
         uid,
         sri.name,
         coalesce(c.id, (select id from public.categories where name = 'Glucides'))
  from public.starter_recipe_ingredients sri
  left join public.categories c on c.name = sri.category_name
  order by lower(sri.name)
  on conflict do nothing;

  -- Recettes absentes du compte, puis rattachement de leurs ingrédients.
  -- Les ingrédients ne sont rattachés qu'aux recettes créées à l'instant :
  -- une recette que l'utilisateur a déjà retouchée n'est jamais réécrite.
  with created as (
    insert into public.recipes (user_id, title, instructions)
    select uid, sr.title, sr.instructions
    from public.starter_recipes sr
    where not exists (
      select 1 from public.recipes r
      where r.user_id = uid and r.title = sr.title
    )
    returning id, title
  )
  insert into public.recipe_ingredients (recipe_id, ingredient_id, quantity)
  select created.id, ing.id, sri.quantity
  from created
  join public.starter_recipes sr on sr.title = created.title
  join public.starter_recipe_ingredients sri on sri.starter_recipe_id = sr.id
  join public.ingredients ing
    on ing.user_id = uid
   and lower(ing.name) = lower(sri.name)
  on conflict do nothing;
end;
$$;

-- Le déclencheur ne fait plus que déléguer.
create or replace function public.seed_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.seed_user(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.seed_new_user();

-- Ces fonctions ne sont appelées que par le déclencheur et par les migrations.
-- PostgREST expose par défaut les fonctions du schéma public via
-- /rest/v1/rpc/... : on retire ce droit (cf. migration 0003).
revoke execute on function public.seed_user(uuid) from public;
revoke execute on function public.seed_user(uuid) from anon;
revoke execute on function public.seed_user(uuid) from authenticated;
revoke execute on function public.seed_new_user() from public;
revoke execute on function public.seed_new_user() from anon;
revoke execute on function public.seed_new_user() from authenticated;

-- ─────────────────────────────────────────────────────────────
-- Rattrapage des comptes existants
-- ─────────────────────────────────────────────────────────────
-- Sans cette ligne, les nouvelles recettes n'apparaîtraient que pour les
-- comptes créés après cette migration.

select public.seed_user(id) from auth.users;
