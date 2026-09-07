-- Meal Fresh — passage au végétarien des recettes à viande.
--
-- Deux lots :
--  1. les 13 recettes carnées (volaille, bœuf, porc, jambon, lardons) dont la
--     viande est remplacée par un substitut végétal ; le titre suit, sinon il
--     annoncerait un ingrédient absent. Les poissons et fruits de mer sont
--     volontairement conservés en l'état ;
--  2. les 4 recettes du matin basculées vers une base végétale, l'équivalent
--     classique restant cité dans l'instruction.
--
-- Le référentiel starter_* ne suffit pas : chaque compte possède déjà SA copie
-- des recettes (seed_user les insère à l'inscription et ne revient jamais
-- dessus). On répercute donc chaque conversion sur public.recipes,
-- public.ingredients et public.recipe_ingredients de tous les utilisateurs.

do $$
declare
  c record;
begin
  for c in
    select * from (values
      -- ancien titre, nouveau titre, ingrédient retiré, ingrédient ajouté, catégorie, quantité, instructions
      ('Salade César poulet', 'Salade César pois chiches', 'Blanc de poulet', 'Pois chiches', 'Protéines', '300 g',
       'Rôtir les pois chiches épicés 20 minutes au four jusqu''à ce qu''ils croustillent. Mélanger la salade, les croûtons et le parmesan, puis napper de sauce césar.'),
      ('Wrap poulet crudités', 'Wrap tofu crudités', 'Blanc de poulet', 'Tofu', 'Protéines', '200 g',
       'Tartiner la tortilla de fromage frais, garnir de tofu grillé, salade et carotte râpée, puis rouler serré.'),
      ('Riz cantonais', 'Riz cantonais végétarien', 'Jambon', 'Tofu fumé', 'Protéines', '150 g',
       'Sauter le riz froid à feu vif avec les petits pois, le tofu fumé en dés et l''omelette coupée en lanières. Déglacer à la sauce soja.'),
      ('Nouilles sautées au bœuf', 'Nouilles sautées au tofu', 'Bœuf', 'Tofu', 'Protéines', '300 g',
       'Saisir les dés de tofu à feu vif jusqu''à ce qu''ils dorent, réserver. Sauter poivron et oignon, remettre le tofu avec les nouilles et la sauce soja.'),
      ('Poulet tikka masala', 'Tikka masala de pois chiches', 'Blanc de poulet', 'Pois chiches', 'Protéines', '500 g',
       'Faire revenir les pois chiches avec les épices, puis les mijoter 20 minutes dans la sauce tomate crémée au yaourt.'),
      ('Tacos de bœuf haché', 'Tacos de haché végétal', 'Bœuf', 'Haché végétal', 'Protéines', '400 g',
       'Rissoler le haché végétal avec les épices. Garnir les tortillas de haché, salade, tomate et fromage râpé.'),
      ('Poulet rôti au citron', 'Chou-fleur rôti au citron', 'Poulet', 'Chou-fleur', 'Légumes', '1',
       'Détailler le chou-fleur en gros bouquets, l''arroser d''huile d''olive, de citron et d''ail. Enfourner 40 minutes à 200 °C avec les pommes de terre.'),
      ('Blanquette de volaille', 'Blanquette de tofu', 'Blanc de poulet', 'Tofu', 'Protéines', '600 g',
       'Dorer les dés de tofu et les réserver. Cuire carotte et champignons, lier le bouillon au roux et à la crème, puis remettre le tofu.'),
      ('Poulet basquaise', 'Basquaise de pois chiches', 'Poulet', 'Pois chiches', 'Protéines', '500 g',
       'Faire revenir poivrons et oignons, ajouter les pois chiches, la pulpe de tomate et le paprika. Mijoter 30 minutes.'),
      ('Boulettes de bœuf sauce tomate', 'Boulettes végétales sauce tomate', 'Bœuf', 'Haché végétal', 'Protéines', '500 g',
       'Façonner les boulettes de haché végétal avec l''œuf et la chapelure, les dorer puis les mijoter 20 minutes dans la sauce tomate.'),
      ('Sauté de porc au caramel', 'Sauté de tofu au caramel', 'Porc', 'Tofu', 'Protéines', '600 g',
       'Colorer les dés de tofu, ajouter sucre et sauce soja et laisser caraméliser 20 minutes à feu doux.'),
      ('Bagel jambon', 'Bagel tofu fumé', 'Jambon', 'Tofu fumé', 'Protéines', '100 g',
       'Garnir le bagel avec le tofu fumé, le fromage et des rondelles de concombre frais.'),
      ('Crêpes fromage jambon', 'Crêpes fromage épinards', 'Jambon', 'Épinards', 'Légumes', '200 g',
       'Préparer la pâte avec farine, lait, œufs, huile et pincée de sucre. Garnir d''épinards fondus à la poêle et de fromage.'),
      ('Pâtes carbo', 'Pâtes carbo végé', 'Lardons', 'Tofu fumé', 'Protéines', '150 g',
       'Faire dorer les dés de tofu fumé, cuire les pâtes al dente et lier le tout avec la crème de soja chaude.'),

      -- Matin : base végétale, l'équivalent classique reste cité.
      ('Porridge banane cannelle', 'Porridge banane cannelle', 'Lait', 'Lait de soja', 'Produits Laitiers', '25 cl',
       'Faire gonfler les flocons d''avoine 5 minutes dans le lait de soja chaud — ou du lait de vache. Ajouter la banane écrasée, la cannelle et un filet de miel.'),
      ('Pain perdu', 'Pain perdu', 'Lait', 'Lait de soja', 'Produits Laitiers', '20 cl',
       'Battre les œufs avec le lait de soja — ou du lait de vache — et le sucre. Y tremper les tranches de pain rassis puis les dorer au beurre à la poêle.'),
      ('Smoothie bowl fruits rouges', 'Smoothie bowl fruits rouges', 'Yaourt nature', 'Yaourt végétal', 'Produits Laitiers', '1',
       'Mixer les fruits rouges surgelés avec le yaourt végétal — ou un yaourt nature — et la banane. Verser en bol et garnir de flocons d''avoine.'),
      ('Granola maison', 'Granola maison', 'Miel', 'Sirop d''érable', 'Sucré', '80 g',
       'Mélanger flocons, amandes, sirop d''érable — ou du miel — et huile. Étaler sur une plaque et enfourner 20 minutes à 160 °C en remuant à mi-cuisson.')
    ) as t(old_title, new_title, old_ing, new_ing, new_cat, new_qty, instr)
  loop
    -- ── Référentiel partagé ──────────────────────────────────────
    update public.starter_recipes
       set title = c.new_title, instructions = c.instr
     where title = c.old_title;

    update public.starter_recipe_ingredients
       set name = c.new_ing, category_name = c.new_cat, quantity = c.new_qty
     where starter_recipe_id = (select id from public.starter_recipes where title = c.new_title)
       and name = c.old_ing;

    -- ── Copies déjà présentes dans les comptes ───────────────────
    update public.recipes
       set title = c.new_title, instructions = c.instr
     where title = c.old_title;

    -- Le substitut doit exister dans le garde-manger de chaque compte avant
    -- de pouvoir être rattaché à une recette.
    insert into public.ingredients (user_id, name, category_id)
    select u.id, c.new_ing,
           coalesce((select id from public.categories where name = c.new_cat),
                    (select id from public.categories where name = 'Glucides'))
    from auth.users u
    on conflict do nothing;

    delete from public.recipe_ingredients ri
     using public.recipes r, public.ingredients i
     where ri.recipe_id = r.id
       and r.title = c.new_title
       and ri.ingredient_id = i.id
       and lower(i.name) = lower(c.old_ing);

    insert into public.recipe_ingredients (recipe_id, ingredient_id, quantity)
    select r.id, i.id, c.new_qty
    from public.recipes r
    join public.ingredients i
      on i.user_id = r.user_id and lower(i.name) = lower(c.new_ing)
    where r.title = c.new_title
    on conflict do nothing;
  end loop;
end;
$$;

-- Les viandes devenues inutiles disparaissent du garde-manger — mais seulement
-- si plus aucune recette ne s'en sert, pour ne pas casser une recette que
-- l'utilisateur aurait créée lui-même.
delete from public.ingredients i
 where lower(i.name) in ('blanc de poulet', 'poulet', 'bœuf', 'porc', 'jambon', 'lardons')
   and not exists (
     select 1 from public.recipe_ingredients ri where ri.ingredient_id = i.id
   );
