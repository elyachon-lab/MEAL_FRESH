-- Meal Fresh — licence de la photo.
--
-- Les photos ne viennent plus d'Unsplash (dont l'API réclame une clé, donc un
-- compte développeur avant toute illustration) mais d'Openverse et de
-- Wikimedia Commons, interrogeables sans clé. Ces banques agrègent des médias
-- sous licences Creative Commons variées : contrairement à la licence unique
-- d'Unsplash, le nom de la licence doit être stocké et affiché photo par photo
-- (CC BY impose de la citer).

alter table public.starter_recipes
  add column if not exists image_license text;

alter table public.recipes
  add column if not exists image_license text;

-- L'amorçage transporte la licence avec la photo.
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
    insert into public.recipes (user_id, title, instructions, image_url, image_credit_name, image_credit_url, image_license)
    select uid, sr.title, sr.instructions, sr.image_url, sr.image_credit_name, sr.image_credit_url, sr.image_license
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
