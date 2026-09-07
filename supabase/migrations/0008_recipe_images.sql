-- Meal Fresh — illustration des recettes par une photo.
--
-- La photo est stockée sous forme d'URL distante (Unsplash) et non de fichier :
-- rien à héberger, et l'image reste servie par un CDN.
--
-- Les trois colonnes vont ensemble : la licence Unsplash impose de créditer le
-- photographe et de renvoyer vers son profil. Stocker l'URL sans le crédit
-- rendrait l'affichage non conforme, d'où leur ajout conjoint.
--
-- Les colonnes existent sur starter_recipes ET sur recipes : la photo trouvée
-- une fois pour un modèle est recopiée dans chaque compte à l'inscription,
-- ce qui évite à chaque nouvel utilisateur de re-consommer le quota d'API.

alter table public.starter_recipes
  add column if not exists image_url         text,
  add column if not exists image_credit_name text,
  add column if not exists image_credit_url  text;

alter table public.recipes
  add column if not exists image_url         text,
  add column if not exists image_credit_name text,
  add column if not exists image_credit_url  text;

-- L'amorçage doit désormais transporter la photo du modèle.
create or replace function public.seed_user(uid uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.ingredients (user_id, name, category_id)
  select distinct on (lower(sri.name))
         uid,
         sri.name,
         coalesce(c.id, (select id from public.categories where name = 'Glucides'))
  from public.starter_recipe_ingredients sri
  left join public.categories c on c.name = sri.category_name
  order by lower(sri.name)
  on conflict do nothing;

  with created as (
    insert into public.recipes (user_id, title, instructions, image_url, image_credit_name, image_credit_url)
    select uid, sr.title, sr.instructions, sr.image_url, sr.image_credit_name, sr.image_credit_url
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

revoke execute on function public.seed_user(uuid) from public;
revoke execute on function public.seed_user(uuid) from anon;
revoke execute on function public.seed_user(uuid) from authenticated;

-- Une photo déjà trouvée pour un modèle profite aux comptes existants.
update public.recipes r
   set image_url         = sr.image_url,
       image_credit_name = sr.image_credit_name,
       image_credit_url  = sr.image_credit_url
  from public.starter_recipes sr
 where sr.title = r.title
   and r.image_url is null
   and sr.image_url is not null;
