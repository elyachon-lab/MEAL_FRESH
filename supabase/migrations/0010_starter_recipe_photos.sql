-- Meal Fresh — photos libres de droits des recettes de démarrage.
--
-- Résultats figés d'une recherche Wikimedia Commons + Openverse (voir
-- src/lib/recipe-photos.ts). Les URL sont écrites en dur plutôt que
-- retrouvées au déploiement : le classement des banques évolue, et rejouer
-- la migration doit redonner exactement les mêmes illustrations.
--
-- 69 des 76 recettes sont illustrées. Les 7 autres gardent la vignette
-- générée depuis leur titre (src/lib/recipe-emojis.ts) : aucune banque n'en
-- propose de photo pertinente, et une illustration fausse serait pire que
-- pas d'illustration.

-- Note : la chakchouka verte pointe directement le fichier Commons plutôt
-- que le proxy de vignettes d'Openverse, qui renvoyait 424 sur cette image.
update public.starter_recipes sr
   set image_url         = v.url,
       image_credit_name = v.credit_name,
       image_credit_url  = v.credit_url,
       image_license     = v.license
  from (values
  ('Bagel tofu fumé', 'https://api.openverse.org/v1/images/af9350a4-14df-40b9-90e0-fa1a9157bdf3/thumb/', 'Rockspindeln', 'https://www.flickr.com/photos/53030568@N07/18647659546', 'BY 2.0'),
  ('Basquaise de pois chiches', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/13/Fried_wax_gourd_skin_with_chickpea_and_peanut.jpg/960px-Fried_wax_gourd_skin_with_chickpea_and_peanut.jpg', 'Wrik Bhadra', 'https://commons.wikimedia.org/wiki/File:Fried_wax_gourd_skin_with_chickpea_and_peanut.jpg', 'CC BY-SA 4.0'),
  ('Bo bun végétarien', 'https://api.openverse.org/v1/images/9273d2ae-ac2b-4536-9ef4-a3d5a2924e22/thumb/', 'tomatoes and friends', 'https://www.flickr.com/photos/49845772@N03/7242352372', 'BY 2.0'),
  ('Brandade de morue rapide', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b9/Cod_dish%2C_Porto_Moniz%2C_Madeira.jpg/960px-Cod_dish%2C_Porto_Moniz%2C_Madeira.jpg', 'Gerda Arendt', 'https://commons.wikimedia.org/wiki/File:Cod_dish,_Porto_Moniz,_Madeira.jpg', 'CC BY-SA 4.0'),
  ('Buddha bowl quinoa', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/69/Quinoa_dish_-_China_Poblano.jpg/960px-Quinoa_dish_-_China_Poblano.jpg', 'Jan Mark Holzer', 'https://commons.wikimedia.org/wiki/File:Quinoa_dish_-_China_Poblano.jpg', 'CC BY 2.0'),
  ('Burgers végé', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/75/Close-up_of_a_stuffed_burger_on_a_wooden_tray_with_a_side_dish_in_a_blurry_background.jpg/960px-Close-up_of_a_stuffed_burger_on_a_wooden_tray_with_a_side_dish_in_a_blurry_background.jpg', 'Shixart1985', 'https://commons.wikimedia.org/wiki/File:Close-up_of_a_stuffed_burger_on_a_wooden_tray_with_a_side_dish_in_a_blurry_background.jpg', 'CC BY 2.0'),
  ('Cabillaud lait de coco', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ee/A_dish_of_fish_and_chips_containing_fried_cod%2C_pea_puree%2C_tartar_sauce_and_chips.jpg/960px-A_dish_of_fish_and_chips_containing_fried_cod%2C_pea_puree%2C_tartar_sauce_and_chips.jpg', 'Triv97', 'https://commons.wikimedia.org/wiki/File:A_dish_of_fish_and_chips_containing_fried_cod,_pea_puree,_tartar_sauce_and_chips.jpg', 'CC BY-SA 4.0'),
  ('Chakchouka', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/26/Shakshuka1.jpg/960px-Shakshuka1.jpg', 'Joe Mahoney', 'https://commons.wikimedia.org/wiki/File:Shakshuka1.jpg', 'CC BY 2.0'),
  ('Chakchouka verte aux épinards', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5f/Liat_Portal_for_Foodie_Disorder_-_Green_shakshuka_with_spinach_and_egg.jpg/960px-Liat_Portal_for_Foodie_Disorder_-_Green_shakshuka_with_spinach_and_egg.jpg', 'HaJunkiyada', 'https://commons.wikimedia.org/wiki/File:Liat_Portal_for_Foodie_Disorder_-_Green_shakshuka_with_spinach_and_egg.jpg', 'CC BY-SA 4.0'),
  ('Chili sin carne', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/18/Chili_pepper_as_side_dish_in_Yunnan%2C_China.jpg/960px-Chili_pepper_as_side_dish_in_Yunnan%2C_China.jpg', 'Janinga Chang', 'https://commons.wikimedia.org/wiki/File:Chili_pepper_as_side_dish_in_Yunnan,_China.jpg', 'CC BY-SA 4.0'),
  ('Chou-fleur rôti au citron', 'https://api.openverse.org/v1/images/9b7406fe-575a-48f8-adc0-5b18f7704786/thumb/', 'avlxyz', 'https://www.flickr.com/photos/10559879@N00/2491520179', 'BY-SA 2.0'),
  ('Compote pomme cannelle', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d2/Apple_plumble_%2810522692695%29.jpg/960px-Apple_plumble_%2810522692695%29.jpg', 'James Petts from London, England', 'https://commons.wikimedia.org/wiki/File:Apple_plumble_(10522692695).jpg', 'CC BY-SA 2.0'),
  ('Cookies chocolat', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/32/Chocolate_cookie_dish.jpg/960px-Chocolate_cookie_dish.jpg', 'Musthofa05', 'https://commons.wikimedia.org/wiki/File:Chocolate_cookie_dish.jpg', 'CC BY-SA 4.0'),
  ('Couscous végétarien', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bb/Couscous_de_mil_%28thi%C3%A9r%C3%A9%29.jpg/960px-Couscous_de_mil_%28thi%C3%A9r%C3%A9%29.jpg', 'Cheikh cherif', 'https://commons.wikimedia.org/wiki/File:Couscous_de_mil_(thi%C3%A9r%C3%A9).jpg', 'CC BY-SA 4.0'),
  ('Crème choco', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/83/Chocolate_Pudding_2.jpg/960px-Chocolate_Pudding_2.jpg', 'Aliva Sahoo', 'https://commons.wikimedia.org/wiki/File:Chocolate_Pudding_2.jpg', 'CC BY-SA 4.0'),
  ('Crêpes fromage épinards', 'https://api.openverse.org/v1/images/25a2abc3-bd6e-44c4-a09b-fcff9489b331/thumb/', 'oonhs', 'https://www.flickr.com/photos/51903019@N05/14998189130', 'BY 2.0'),
  ('Crêpes sucrées', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e7/Fruit_crepe_served_at_a_restaurant.jpg/960px-Fruit_crepe_served_at_a_restaurant.jpg', 'Kaartic', 'https://commons.wikimedia.org/wiki/File:Fruit_crepe_served_at_a_restaurant.jpg', 'CC BY-SA 4.0'),
  ('Curry de patate douce', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d5/Sweet_potato_kale_curry_dish_%2845352725854%29.jpg/960px-Sweet_potato_kale_curry_dish_%2845352725854%29.jpg', 'Ella Olsson from Stockholm, Sweden', 'https://commons.wikimedia.org/wiki/File:Sweet_potato_kale_curry_dish_(45352725854).jpg', 'CC BY 2.0'),
  ('Curry de pois chiches épinards', 'https://api.openverse.org/v1/images/5d970f17-0d10-4f53-9e14-52836851573f/thumb/', 'seelensturm', 'https://www.flickr.com/photos/61404197@N00/4663107477', 'BY 2.0'),
  ('Dahl lentilles', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/17/Hawai_Thongba_%28cooked_lentil_curry_dish%29_-_Traditional_Meitei_cuisine_-_Gastronomic_cultural_heritage_of_Manipur_%28Kangleipak%29_%26_domestic_and_international_Meitei_diasporas.jpg/960px-thumbnail.jpg', 'User:Ishani Nath', 'https://commons.wikimedia.org/wiki/File:Hawai_Thongba_(cooked_lentil_curry_dish)_-_Traditional_Meitei_cuisine_-_Gastronomic_cultural_heritage_of_Manipur_(Kangleipak)_%26_domestic_and_international_Meitei_diasporas.jpg', 'CC BY-SA 4.0'),
  ('Falafels au four', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c8/Falafel_1.JPG/960px-Falafel_1.JPG', 'Miansari66', 'https://commons.wikimedia.org/wiki/File:Falafel_1.JPG', 'CC0'),
  ('Galettes de lentilles', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/79/Dal_soup_%28Indian_lentil_dish%29.jpg/960px-Dal_soup_%28Indian_lentil_dish%29.jpg', 'Pelican', 'https://commons.wikimedia.org/wiki/File:Dal_soup_(Indian_lentil_dish).jpg', 'CC BY-SA 2.0'),
  ('Gnocchis saumon', 'https://api.openverse.org/v1/images/4249071c-36fb-410b-a084-9272b0782f5d/thumb/', 'sarahstierch', 'https://www.flickr.com/photos/7633518@N08/52128274479', 'BY 2.0'),
  ('Gnocchis à la crème de courge', 'https://api.openverse.org/v1/images/cff14c7c-7db4-471a-86a7-569e46fe4b80/thumb/', 'eekim', 'https://www.flickr.com/photos/63669472@N00/1812497315', 'BY 2.0'),
  ('Granola maison', 'https://api.openverse.org/v1/images/4c963152-b8bd-4de2-8dac-d529a12e80d6/thumb/', 'Brett L.', 'https://www.flickr.com/photos/51035767928@N01/345532581', 'BY-SA 2.0'),
  ('Gratin dauphinois', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8d/Potato_gratin_on_stove.jpg/960px-Potato_gratin_on_stove.jpg', 'Dreamyshade', 'https://commons.wikimedia.org/wiki/File:Potato_gratin_on_stove.jpg', 'CC BY-SA 3.0'),
  ('Gratin de courgettes au chèvre', 'https://api.openverse.org/v1/images/2ae6c8de-bc98-4caf-a7c1-4ea41b4ade43/thumb/', 'Migle Seikyte', 'https://www.flickr.com/photos/69668444@N03/8500817710', 'BY-SA 2.0'),
  ('Gâteau au yaourt', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e0/Spicy_Corn_Cake_-_Thai_Dish_2026-08-05.jpg/960px-Spicy_Corn_Cake_-_Thai_Dish_2026-08-05.jpg', 'Andy Li', 'https://commons.wikimedia.org/wiki/File:Spicy_Corn_Cake_-_Thai_Dish_2026-08-05.jpg', 'CC0'),
  ('Lasagnes végétariennes', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/34/Lasagna_4.jpg/960px-Lasagna_4.jpg', 'Maffeth.opiana', 'https://commons.wikimedia.org/wiki/File:Lasagna_4.jpg', 'CC BY-SA 4.0'),
  ('Moelleux au chocolat', 'https://upload.wikimedia.org/wikipedia/commons/8/81/Chocolate_cake_homemade.jpg', 'Hrishikes', 'https://commons.wikimedia.org/wiki/File:Chocolate_cake_homemade.jpg', 'CC BY-SA 4.0'),
  ('Moussaka', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/ba/Moussaka_8.jpg/960px-Moussaka_8.jpg', 'Key West Wedding Photography', 'https://commons.wikimedia.org/wiki/File:Moussaka_8.jpg', 'CC BY 2.0'),
  ('Nouilles sautées au tofu', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/43/Unique-texture-tofu-noodle-salad-tossed-in-a-sesame-dressing-18.jpg/960px-Unique-texture-tofu-noodle-salad-tossed-in-a-sesame-dressing-18.jpg', 'Shu-Chun Chuang', 'https://commons.wikimedia.org/wiki/File:Unique-texture-tofu-noodle-salad-tossed-in-a-sesame-dressing-18.jpg', 'CC BY-SA 4.0'),
  ('One pot chili PST', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3f/Dish_with_chilies.jpg/960px-Dish_with_chilies.jpg', 'Pauloleong2002', 'https://commons.wikimedia.org/wiki/File:Dish_with_chilies.jpg', 'CC BY-SA 4.0'),
  ('PDT et Patate douce sautées steak lentilles', 'https://api.openverse.org/v1/images/30d33711-e94b-4ded-b102-926171932e33/thumb/', 'avlxyz', 'https://www.flickr.com/photos/10559879@N00/2924363966', 'BY-SA 2.0'),
  ('Pad thaï aux crevettes', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8a/DFC_2078_A_plate_of_shrimp_pad_Thai_garnished_with_lime_bean_sprouts_scallions_and_crushed_peanuts.jpg/960px-DFC_2078_A_plate_of_shrimp_pad_Thai_garnished_with_lime_bean_sprouts_scallions_and_crushed_peanuts.jpg', 'PattayaPatrol', 'https://commons.wikimedia.org/wiki/File:DFC_2078_A_plate_of_shrimp_pad_Thai_garnished_with_lime_bean_sprouts_scallions_and_crushed_peanuts.jpg', 'CC BY-SA 4.0'),
  ('Pain perdu', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/37/Bananas_Foster_French_Toast_%2815288002250%29.jpg/960px-Bananas_Foster_French_Toast_%2815288002250%29.jpg', 'Navin75', 'https://commons.wikimedia.org/wiki/File:Bananas_Foster_French_Toast_(15288002250).jpg', 'CC BY-SA 2.0'),
  ('Papillote de cabillaud aux légumes', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5f/Cod_dish.jpg/960px-Cod_dish.jpg', 'Tiia Monto', 'https://commons.wikimedia.org/wiki/File:Cod_dish.jpg', 'CC BY-SA 3.0'),
  ('Porridge banane cannelle', 'https://api.openverse.org/v1/images/91651c5f-f89c-404a-a191-704b9f55b28e/thumb/', 'rexipe', 'https://www.flickr.com/photos/7352088@N08/798619761', 'BY 2.0'),
  ('Poêlée de crevettes à l''ail', 'https://upload.wikimedia.org/wikipedia/commons/1/1e/39._shrimp_dish_%2851297736337%29.jpg', 'Texas Sea Grant from College Station', 'https://commons.wikimedia.org/wiki/File:39._shrimp_dish_(51297736337).jpg', 'CC BY 2.0'),
  ('Pâtes bolognaises végé', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3f/%28Pasta%29_by_David_Adam_Kess_%28pic.2%29.jpg/960px-%28Pasta%29_by_David_Adam_Kess_%28pic.2%29.jpg', 'David Adam Kess', 'https://commons.wikimedia.org/wiki/File:(Pasta)_by_David_Adam_Kess_(pic.2).jpg', 'CC BY-SA 4.0'),
  ('Pâtes carbo végé', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1c/Pasta_with_Milk.jpg/960px-Pasta_with_Milk.jpg', 'Gaurav Dhwaj Khadka', 'https://commons.wikimedia.org/wiki/File:Pasta_with_Milk.jpg', 'CC BY-SA 4.0'),
  ('Pâtes cheddar pulpe tomate', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/56/Making_tomato_sauce_for_pasta_dish.jpg/960px-Making_tomato_sauce_for_pasta_dish.jpg', 'Iain Cameron from Ellon, Scotland', 'https://commons.wikimedia.org/wiki/File:Making_tomato_sauce_for_pasta_dish.jpg', 'CC BY 2.0'),
  ('Pâtes pesto tomates cerises', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/09/Ricotta_Ravioli_served_with_cherry_tomato_sauce%2C_an_Italian_dish_-_Gujarat_-_SHAILI_003.jpg/960px-Ricotta_Ravioli_served_with_cherry_tomato_sauce%2C_an_Italian_dish_-_Gujarat_-_SHAILI_003.jpg', 'Shaili Sharma', 'https://commons.wikimedia.org/wiki/File:Ricotta_Ravioli_served_with_cherry_tomato_sauce,_an_Italian_dish_-_Gujarat_-_SHAILI_003.jpg', 'CC BY-SA 4.0'),
  ('Ratatouille', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/27/Ratatouille.jpg/960px-Ratatouille.jpg', 'Marcus Guimarães', 'https://commons.wikimedia.org/wiki/File:Ratatouille.jpg', 'CC BY 2.0'),
  ('Risotto aux champignons', 'https://api.openverse.org/v1/images/f827c00a-2ab6-4ad2-9d49-31f6afb68d14/thumb/', 'avlxyz', 'https://www.flickr.com/photos/10559879@N00/2695731506', 'BY-SA 2.0'),
  ('Riz au lait vanillé', 'https://upload.wikimedia.org/wikipedia/commons/f/f5/Rice_pudding.jpg', 'Dalia fathallah', 'https://commons.wikimedia.org/wiki/File:Rice_pudding.jpg', 'CC BY-SA 4.0'),
  ('Riz cantonais végétarien', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e6/Rice_dish%2C_Rostov-on-Don%2C_Russia.jpg/960px-Rice_dish%2C_Rostov-on-Don%2C_Russia.jpg', 'Vyacheslav Argenberg', 'https://commons.wikimedia.org/wiki/File:Rice_dish,_Rostov-on-Don,_Russia.jpg', 'CC BY 4.0'),
  ('Riz soja légumes œuf', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2b/Pure_Bengali_dish_-_rice%2C_veg_curry%2C_dal%2C_egg_curry_etc.jpg/960px-Pure_Bengali_dish_-_rice%2C_veg_curry%2C_dal%2C_egg_curry_etc.jpg', 'Billjones94', 'https://commons.wikimedia.org/wiki/File:Pure_Bengali_dish_-_rice,_veg_curry,_dal,_egg_curry_etc.jpg', 'CC BY-SA 4.0'),
  ('Salade César pois chiches', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/72/Coronation_chickpeas_and_potato_salad.jpg/960px-Coronation_chickpeas_and_potato_salad.jpg', 'Rooey202', 'https://commons.wikimedia.org/wiki/File:Coronation_chickpeas_and_potato_salad.jpg', 'CC BY 2.0'),
  ('Salade de fruits frais', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b7/Plant-fruit-bowl-dish-food-salad-1200225-pxhere.jpg/960px-Plant-fruit-bowl-dish-food-salad-1200225-pxhere.jpg', 'Unknown author', 'https://commons.wikimedia.org/wiki/File:Plant-fruit-bowl-dish-food-salad-1200225-pxhere.jpg', 'CC0'),
  ('Salade de lentilles feta', 'https://api.openverse.org/v1/images/6f13d755-87fe-4d96-9da3-c1222472a156/thumb/', 'avlxyz', 'https://www.flickr.com/photos/10559879@N00/828818458', 'BY-SA 2.0'),
  ('Salade de riz', 'https://upload.wikimedia.org/wikipedia/commons/3/34/COCONUT_RICE_AND_SALAD.jpg', 'Oghenevwogaga Amos', 'https://commons.wikimedia.org/wiki/File:COCONUT_RICE_AND_SALAD.jpg', 'CC BY 4.0'),
  ('Salade grecque', 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Greek_Salad_Choriatiki.jpg', 'Wikimedia Commons', 'https://commons.wikimedia.org/wiki/File:Greek_Salad_Choriatiki.jpg', 'CC BY 2.0'),
  ('Saumon rôti au miel', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0b/Salmon_dish_2.jpg/960px-Salmon_dish_2.jpg', 'Nowforever', 'https://commons.wikimedia.org/wiki/File:Salmon_dish_2.jpg', 'CC BY-SA 4.0'),
  ('Sauté de tofu au caramel', 'https://upload.wikimedia.org/wikipedia/commons/f/f3/Agedashi_tofu%2C_fried_tofu_with_broth.jpg', 'HungryHuy', 'https://commons.wikimedia.org/wiki/File:Agedashi_tofu,_fried_tofu_with_broth.jpg', 'CC BY 2.0'),
  ('Smoothie bowl fruits rouges', 'https://api.openverse.org/v1/images/f749e648-42b6-437f-bf14-7616c5826f4e/thumb/', 'PersonalCreations.com', 'https://www.flickr.com/photos/127294011@N07/16225943125', 'BY 2.0'),
  ('Soupe de légumes d''hiver', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bb/African_dish%2C%2CEgusi_Soup_and_Eba.jpg/960px-African_dish%2C%2CEgusi_Soup_and_Eba.jpg', 'Kethsa Kingsley', 'https://commons.wikimedia.org/wiki/File:African_dish,,Egusi_Soup_and_Eba.jpg', 'CC BY-SA 4.0'),
  ('Soupe thaï coco crevettes', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3f/Spring_Pea_Soup_with_shrimp%2C_Restaurant_August.jpg/960px-Spring_Pea_Soup_with_shrimp%2C_Restaurant_August.jpg', 'kerinin', 'https://commons.wikimedia.org/wiki/File:Spring_Pea_Soup_with_shrimp,_Restaurant_August.jpg', 'CC BY-SA 2.0'),
  ('Soupe à l''oignon gratinée', 'https://api.openverse.org/v1/images/2c9da8b3-11a6-4925-afcf-65fe34896fbd/thumb/', 'bvalium', 'https://www.flickr.com/photos/36217063@N00/4021406845', 'BY-SA 2.0'),
  ('Taboulé libanais', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/ba/Flickr_-_cyclonebill_-_Tabbouleh.jpg/960px-Flickr_-_cyclonebill_-_Tabbouleh.jpg', 'cyclonebill', 'https://commons.wikimedia.org/wiki/File:Flickr_-_cyclonebill_-_Tabbouleh.jpg', 'CC BY-SA 2.0'),
  ('Tacos de haché végétal', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/df/Tacos_in_a_soft_tortilla_8.jpg/960px-Tacos_in_a_soft_tortilla_8.jpg', 'Kurt Kaiser', 'https://commons.wikimedia.org/wiki/File:Tacos_in_a_soft_tortilla_8.jpg', 'CC0'),
  ('Tartines avocat œuf poché', 'https://api.openverse.org/v1/images/5e5d089d-3ba7-4286-adbd-b66f8c260043/thumb/', 'ultrakml', 'https://www.flickr.com/photos/34948727@N00/9698220861', 'BY 2.0'),
  ('Thon à la provençale', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4b/Cabbage_tuna_dish.jpg/960px-Cabbage_tuna_dish.jpg', 'Video13', 'https://commons.wikimedia.org/wiki/File:Cabbage_tuna_dish.jpg', 'CC BY-SA 4.0'),
  ('Tikka masala de pois chiches', 'https://api.openverse.org/v1/images/03bcddb0-d98b-4617-b72b-bf179a1425b3/thumb/', '10 Corso Como', 'https://www.flickr.com/photos/87705616@N00/2407138448', 'BY 2.0'),
  ('Tofu croustillant sauce soja', 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Homemade_agedashi_tofu.jpg', 'Leila Izachi', 'https://commons.wikimedia.org/wiki/File:Homemade_agedashi_tofu.jpg', 'CC BY-SA 4.0'),
  ('Tortilla espagnole', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/12/Tortilla_Espa%C3%B1ola_%28Spanish_Potato_Omelet%29_%2827362763041%29.jpg/960px-Tortilla_Espa%C3%B1ola_%28Spanish_Potato_Omelet%29_%2827362763041%29.jpg', 'Joy', 'https://commons.wikimedia.org/wiki/File:Tortilla_Espa%C3%B1ola_(Spanish_Potato_Omelet)_(27362763041).jpg', 'CC BY 2.0'),
  ('Velouté de potiron', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8b/Pumpkin_soup_in_dish_with_spoon.jpg/960px-Pumpkin_soup_in_dish_with_spoon.jpg', 'o.tacke', 'https://commons.wikimedia.org/wiki/File:Pumpkin_soup_in_dish_with_spoon.jpg', 'CC0'),
  ('Wrap tofu crudités', 'https://api.openverse.org/v1/images/5ca93160-cf24-4163-a169-20755822e507/thumb/', 'stu_spivack', 'https://www.flickr.com/photos/35034346243@N01/15383986176', 'BY-SA 2.0'),
  ('Œufs brouillés ciboulette', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/20/Scrambed_eggs.jpg/960px-Scrambed_eggs.jpg', 'Takeaway', 'https://commons.wikimedia.org/wiki/File:Scrambed_eggs.jpg', 'CC BY-SA 3.0')
) as v(title, url, credit_name, credit_url, license)
 where sr.title = v.title;

-- Répercussion sur les copies déjà présentes dans les comptes.
update public.recipes r
   set image_url         = sr.image_url,
       image_credit_name = sr.image_credit_name,
       image_credit_url  = sr.image_credit_url,
       image_license     = sr.image_license
  from public.starter_recipes sr
 where sr.title = r.title
   and sr.image_url is not null
   and r.image_url is null;
