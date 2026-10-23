export const USDA = 'USDA FoodData Central (valor genérico de referencia)';

function food(id, name, category, state, calories, protein, carbs, fat, fiber, baseUnit = 'g', notes = '', portions = []) {
  return {
    id,
    name,
    category,
    state,
    calories,
    protein,
    carbs,
    fat,
    fiber,
    baseUnit,
    notes,
    portions,
  };
}

function p(label, unit, grams, isVisual = 0, notes = '') {
  return { label, unit, grams, isVisual, notes };
}

export const SEED_FOODS = [
  food('arroz_blanco_crudo', 'Arroz blanco crudo', 'Cereales y tubérculos', 'crudo', 365, 7.1, 79.9, 0.7, 1.3, 'g', 'No equivale a 100 g de arroz cocido: al cocer absorbe agua.', [
    p('1 porción (80 g)', 'porcion', 80),
    p('1 taza (185 g)', 'taza', 185),
  ]),
  food('arroz_blanco_cocido', 'Arroz blanco cocido', 'Cereales y tubérculos', 'cocido', 130, 2.7, 28.2, 0.3, 0.4, 'g', 'Peso cocido, sin sal añadida.', [
    p('1 taza (158 g)', 'taza', 158),
    p('1 puño (150 g)', 'puno', 150, 1, 'Estimación visual; depende del tamaño de la mano.'),
    p('1 porción (150 g)', 'porcion', 150),
  ]),
  food('arroz_integral_crudo', 'Arroz integral crudo', 'Cereales y tubérculos', 'crudo', 370, 7.9, 77.2, 2.9, 3.5, 'g', 'Cocer antes de consumir.', [p('1 porción (80 g)', 'porcion', 80)]),
  food('huevo_entero', 'Huevo entero crudo', 'Proteínas animales', 'crudo', 143, 12.6, 0.7, 9.5, 0, 'g', 'Valor por 100 g sin cáscara. Un huevo mediano pesa unos 50 g.', [
    p('1 unidad mediana (50 g)', 'unidad', 50),
    p('1 unidad grande (60 g)', 'porcion', 60),
  ]),
  food('clara_huevo', 'Clara de huevo', 'Proteínas animales', 'crudo', 52, 10.9, 0.7, 0.2, 0, 'g', 'Sin yema.', [p('1 unidad (33 g)', 'unidad', 33)]),
  food('pollo_pechuga_cruda', 'Pechuga de pollo cruda, sin piel', 'Proteínas animales', 'crudo', 120, 22.5, 0, 2.6, 0, 'g', 'Peso crudo. Al cocinar pierde agua y el peso disminuye.', [
    p('1 palma (100 g)', 'palma', 100, 1, 'Estimación visual; depende del tamaño de la mano y el grosor.'),
    p('1 porción (150 g)', 'porcion', 150),
  ]),
  food('pollo_muslo_cocido', 'Muslo de pollo cocido, sin piel', 'Proteínas animales', 'cocido', 209, 26, 0, 10.9, 0, 'g', 'Peso cocido, sin piel.', [p('1 unidad pequeña (90 g)', 'unidad', 90)]),
  food('carne_molida_90_cruda', 'Carne molida 90 % magra, cruda', 'Proteínas animales', 'crudo', 176, 20, 0, 10, 0, 'g', 'Peso crudo. Escurre la grasa si corresponde.', [
    p('1 palma (100 g)', 'palma', 100, 1, 'Estimación visual; depende del tamaño de la mano.'),
    p('1 porción (120 g)', 'porcion', 120),
  ]),
  food('carne_res_magra_cocida', 'Carne de res magra cocida', 'Proteínas animales', 'cocido', 250, 26, 0, 15, 0, 'g', 'Corte magro cocido.', [p('1 porción (120 g)', 'porcion', 120)]),
  food('sardinas_aceite_escurridas', 'Sardinas en aceite escurridas', 'Proteínas animales', 'escurrido', 208, 24.6, 0, 11.5, 0, 'g', 'Escurrir el aceite de la lata; parte del aceite puede permanecer.', [p('1 lata escurrida (92 g)', 'porcion', 92)]),
  food('atun_agua_escurrido', 'Atún en agua escurrido', 'Proteínas animales', 'escurrido', 116, 25.5, 0, 0.8, 0, 'g', 'Escurrido. Revisa la etiqueta de tu marca.', [p('1 lata escurrida (120 g)', 'porcion', 120)]),
  food('pescado_blanco_cocido', 'Pescado blanco cocido', 'Proteínas animales', 'cocido', 96, 20.1, 0, 1.2, 0, 'g', 'Valor genérico para pescado blanco cocido.', [p('1 porción (130 g)', 'porcion', 130)]),
  food('avena_cruda', 'Avena en hojuelas cruda', 'Cereales y tubérculos', 'crudo', 389, 16.9, 66.3, 6.9, 10.6, 'g', 'Peso seco. Se recomienda cocinar o remojar.', [
    p('1 taza (81 g)', 'taza', 81),
    p('1 cucharada (6 g)', 'cucharada', 6),
    p('1 mano ahuecada (30 g)', 'mano_ahuecada', 30, 1, 'Estimación visual; puede variar.'),
    p('1 porción (50 g)', 'porcion', 50),
  ]),
  food('papa_cruda', 'Papa cruda', 'Cereales y tubérculos', 'crudo', 77, 2.1, 17.5, 0.1, 2.1, 'g', 'Peso crudo, sin piel.', [
    p('1 unidad mediana (173 g)', 'unidad', 173),
    p('1 puño (150 g)', 'puno', 150, 1, 'Estimación visual; depende del tamaño de la mano.'),
  ]),
  food('papa_cocida', 'Papa cocida', 'Cereales y tubérculos', 'cocido', 87, 1.9, 20.1, 0.1, 1.8, 'g', 'Cocida sin piel y sin sal.', [
    p('1 taza (156 g)', 'taza', 156),
    p('1 puño (150 g)', 'puno', 150, 1, 'Estimación visual; depende del tamaño de la mano.'),
    p('1 unidad mediana (156 g)', 'unidad', 156),
  ]),
  food('camote_crudo', 'Camote crudo', 'Cereales y tubérculos', 'crudo', 86, 1.6, 20.1, 0.1, 3.0, 'g', 'Peso crudo, sin piel.', [p('1 unidad mediana (130 g)', 'unidad', 130)]),
  food('fideos_secos', 'Fideos secos', 'Cereales y tubérculos', 'crudo', 371, 13.0, 74.7, 1.5, 3.2, 'g', 'Peso seco. No equivale al peso cocido.', [p('1 porción (80 g)', 'porcion', 80)]),
  food('fideos_cocidos', 'Fideos cocidos', 'Cereales y tubérculos', 'cocido', 158, 5.8, 30.9, 0.9, 1.8, 'g', 'Peso cocido, sin salsa ni aceite.', [
    p('1 taza (140 g)', 'taza', 140),
    p('1 puño (140 g)', 'puno', 140, 1, 'Estimación visual; depende del tamaño de la mano.'),
  ]),
  food('pan_blanco', 'Pan blanco', 'Panadería', 'listo para consumir', 265, 9.0, 49.0, 3.2, 2.7, 'g', 'El peso de cada rebanada varía según el pan.', [
    p('1 rebanada (28 g)', 'rebanada', 28),
    p('1 unidad (60 g)', 'unidad', 60),
  ]),
  food('pan_integral', 'Pan integral', 'Panadería', 'listo para consumir', 247, 13.0, 41.0, 3.4, 7.0, 'g', 'Revisa que el primer ingrediente sea harina integral.', [p('1 rebanada (32 g)', 'rebanada', 32)]),
  food('lentejas_secas', 'Lentejas secas', 'Legumbres', 'crudo', 352, 24.6, 63.4, 1.1, 10.7, 'g', 'Peso seco. Deben remojarse y cocerse.', [p('1 porción (80 g)', 'porcion', 80)]),
  food('lentejas_cocidas', 'Lentejas cocidas', 'Legumbres', 'cocido', 116, 9.0, 20.1, 0.4, 7.9, 'g', 'Peso cocido, sin sal.', [
    p('1 taza (198 g)', 'taza', 198),
    p('1 puño (150 g)', 'puno', 150, 1, 'Estimación visual; depende del tamaño de la mano.'),
  ]),
  food('frijoles_negros_secos', 'Frijoles negros secos', 'Legumbres', 'crudo', 341, 21.6, 62.4, 1.4, 15.5, 'g', 'Peso seco. Remojar y cocer.', [p('1 porción (80 g)', 'porcion', 80)]),
  food('frijoles_negros_cocidos', 'Frijoles negros cocidos', 'Legumbres', 'cocido', 132, 8.9, 23.7, 0.5, 8.7, 'g', 'Peso cocido, escurrido.', [
    p('1 taza (172 g)', 'taza', 172),
    p('1 puño (150 g)', 'puno', 150, 1, 'Estimación visual; depende del tamaño de la mano.'),
  ]),
  food('garbanzos_cocidos', 'Garbanzos cocidos', 'Legumbres', 'cocido', 164, 8.9, 27.4, 2.6, 7.6, 'g', 'Peso cocido, escurrido.', [p('1 taza (164 g)', 'taza', 164)]),
  food('arvejas_cocidas', 'Arvejas cocidas', 'Legumbres', 'cocido', 84, 5.4, 15.6, 0.4, 5.5, 'g', 'Peso cocido, escurrido.', [p('1 taza (160 g)', 'taza', 160)]),
  food('leche_entera', 'Leche entera', 'Lácteos', 'envasado', 61, 3.2, 4.8, 3.3, 0, 'ml', 'Valor por 100 ml. Aproximadamente 1 ml ≈ 1 g para calcular costos.', [p('1 vaso (240 ml)', 'vaso', 240), p('1 taza (244 ml)', 'taza', 244)]),
  food('leche_semidesnatada', 'Leche semidesnatada', 'Lácteos', 'envasado', 50, 3.3, 4.8, 2.0, 0, 'ml', 'Valor por 100 ml. Revisa la etiqueta de tu producto.', [p('1 vaso (240 ml)', 'vaso', 240)]),
  food('yogur_natural', 'Yogur natural entero', 'Lácteos', 'envasado', 61, 3.5, 4.7, 3.3, 0, 'g', 'Sin azúcar añadido. Comprueba la etiqueta.', [p('1 unidad (125 g)', 'unidad', 125), p('1 taza (245 g)', 'taza', 245)]),
  food('tomate', 'Tomate', 'Verduras', 'crudo', 18, 0.9, 3.9, 0.2, 1.2, 'g', 'Peso crudo.', [p('1 unidad mediana (123 g)', 'unidad', 123), p('1 porción (100 g)', 'porcion', 100)]),
  food('cebolla', 'Cebolla', 'Verduras', 'crudo', 40, 1.1, 9.3, 0.1, 1.7, 'g', 'Peso crudo, sin piel.', [p('1 unidad mediana (110 g)', 'unidad', 110)]),
  food('zanahoria', 'Zanahoria', 'Verduras', 'crudo', 41, 0.9, 9.6, 0.2, 2.8, 'g', 'Peso crudo.', [p('1 unidad mediana (61 g)', 'unidad', 61)]),
  food('brocoli', 'Brócoli', 'Verduras', 'crudo', 34, 2.8, 6.6, 0.4, 2.6, 'g', 'Peso crudo. También puede cocerse al vapor.', [p('1 taza (91 g)', 'taza', 91)]),
  food('lechuga', 'Lechuga', 'Verduras', 'crudo', 15, 1.4, 2.9, 0.2, 1.3, 'g', 'Peso crudo, lavada.', [p('1 taza (36 g)', 'taza', 36)]),
  food('pepino', 'Pepino', 'Verduras', 'crudo', 15, 0.7, 3.6, 0.1, 0.5, 'g', 'Peso crudo, con piel.', [p('1 taza (104 g)', 'taza', 104)]),
  food('platano', 'Plátano', 'Frutas', 'crudo', 89, 1.1, 22.8, 0.3, 2.6, 'g', 'Peso sin piel.', [p('1 unidad mediana (118 g)', 'unidad', 118), p('1 puño (100 g)', 'puno', 100, 1, 'Estimación visual; depende del tamaño de la fruta.')]),
  food('manzana', 'Manzana', 'Frutas', 'crudo', 52, 0.3, 13.8, 0.2, 2.4, 'g', 'Peso con piel y sin corazón.', [p('1 unidad mediana (182 g)', 'unidad', 182)]),
  food('naranja', 'Naranja', 'Frutas', 'crudo', 47, 0.9, 11.8, 0.1, 2.4, 'g', 'Peso sin piel.', [p('1 unidad mediana (131 g)', 'unidad', 131)]),
  food('pera', 'Pera', 'Frutas', 'crudo', 57, 0.4, 15.2, 0.1, 3.1, 'g', 'Peso con piel.', [p('1 unidad mediana (178 g)', 'unidad', 178)]),
  food('sandia', 'Sandía', 'Frutas', 'crudo', 30, 0.6, 7.6, 0.2, 0.4, 'g', 'Peso de la pulpa.', [p('1 taza (152 g)', 'taza', 152)]),
  food('aceite_girasol', 'Aceite de girasol', 'Grasas y aceites', 'envasado', 884, 0, 0, 100, 0, 'ml', 'Muy denso en calorías: 1 cucharada aporta unas 120 kcal.', [
    p('1 cucharadita (4.5 ml)', 'cucharadita', 4.5),
    p('1 cucharada (13.5 ml)', 'cucharada', 13.5),
    p('1 pulgar (14 ml)', 'pulgar', 14, 1, 'Estimación visual; mide con cuchara cuando puedas.'),
  ]),
  food('aceite_oliva', 'Aceite de oliva', 'Grasas y aceites', 'envasado', 884, 0, 0, 100, 0, 'ml', 'Muy denso en calorías: 1 cucharada aporta unas 120 kcal.', [
    p('1 cucharadita (4.5 ml)', 'cucharadita', 4.5),
    p('1 cucharada (13.5 ml)', 'cucharada', 13.5),
  ]),
  food('mantequilla', 'Mantequilla', 'Grasas y aceites', 'envasado', 717, 0.9, 0.1, 81.1, 0, 'g', 'Usar con moderación por su densidad calórica.', [p('1 cucharada (14 g)', 'cucharada', 14)]),
  food('harina_trigo', 'Harina de trigo', 'Cereales y tubérculos', 'crudo', 364, 10.3, 76.3, 1.0, 2.7, 'g', 'Peso seco.', [p('1 taza (125 g)', 'taza', 125)]),
  food('azucar', 'Azúcar blanca', 'Otros', 'envasado', 387, 0, 100, 0, 0, 'g', 'Aporta calorías sin proteína, fibra ni micronutrientes relevantes.', [p('1 cucharadita (4 g)', 'cucharadita', 4), p('1 cucharada (12.5 g)', 'cucharada', 12.5)]),
];

export const SEED_RECIPES = [
  {
    id: 'recipe_arroz_con_pollo',
    name: 'Arroz con pollo',
    description: 'Comida tradicional, económica y fácil de adaptar con verduras de temporada.',
    servings: 2,
    prep_minutes: 35,
    tags: 'económico,almuerzo,pollo',
    instructions:
      '1. Lava el arroz y pica la cebolla y la zanahoria.\n2. Cocina el pollo en trozos con un poco de aceite hasta que esté hecho.\n3. Añade cebolla y zanahoria y sofríe 3 minutos.\n4. Incorpora el arroz, agua (aproximadamente el doble del volumen de arroz) y sal.\n5. Cocina tapado a fuego medio-bajo hasta que el arroz esté tierno.\n6. Reposa 5 minutos y sirve.',
    ingredients: [
      ['arroz_blanco_crudo', 150],
      ['pollo_pechuga_cruda', 300],
      ['cebolla', 50],
      ['zanahoria', 50],
      ['aceite_girasol', 10],
    ],
  },
  {
    id: 'recipe_huevos_con_papa',
    name: 'Huevos con papa',
    description: 'Desayuno o cena sencilla con ingredientes habituales.',
    servings: 2,
    prep_minutes: 25,
    tags: 'económico,desayuno,huevo',
    instructions:
      '1. Pela y corta la papa en cubos pequeños.\n2. Cocina la papa en agua o al vapor hasta que esté tierna.\n3. Sofríe la cebolla con el aceite.\n4. Añade la papa y los huevos batidos.\n5. Cocina removiendo hasta que el huevo cuaje. Ajusta la sal.',
    ingredients: [
      ['huevo_entero', 150],
      ['papa_cruda', 300],
      ['cebolla', 30],
      ['aceite_girasol', 10],
    ],
  },
  {
    id: 'recipe_avena_con_leche',
    name: 'Avena con leche y plátano',
    description: 'Desayuno rápido, económico y con buena cantidad de fibra.',
    servings: 1,
    prep_minutes: 10,
    tags: 'económico,desayuno,avena',
    instructions:
      '1. Calienta la leche sin llegar a hervir.\n2. Añade la avena y cocina 4–5 minutos removiendo.\n3. Corta el plátano en rodajas y añádelo al final.\n4. Si quieres, añade canela. Evita añadir azúcar si puedes.',
    ingredients: [
      ['avena_cruda', 60],
      ['leche_entera', 250],
      ['platano', 100],
    ],
  },
  {
    id: 'recipe_lentejas_arroz',
    name: 'Lentejas con arroz',
    description: 'Plato de legumbre completo, barato y apto para preparar en cantidad.',
    servings: 3,
    prep_minutes: 50,
    tags: 'económico,legumbres,almuerzo',
    instructions:
      '1. Remoja las lentejas si tu paquete lo indica.\n2. Pica cebolla, tomate y zanahoria.\n3. Sofríe con aceite y añade las lentejas y agua suficiente.\n4. Cocina hasta que las lentejas estén tiernas.\n5. Cuece el arroz aparte y sirve la legumbre sobre el arroz.\n6. Ajusta sal y especias al final.',
    ingredients: [
      ['lentejas_secas', 160],
      ['arroz_blanco_crudo', 120],
      ['cebolla', 60],
      ['tomate', 100],
      ['aceite_girasol', 10],
    ],
  },
  {
    id: 'recipe_pollo_arroz_verduras',
    name: 'Pollo con arroz y verduras',
    description: 'Plato equilibrado para preparar la comida del día siguiente.',
    servings: 2,
    prep_minutes: 35,
    tags: 'económico,almuerzo,pollo,verduras',
    instructions:
      '1. Cocina el arroz según las instrucciones del paquete.\n2. Corta el pollo y dóralo con aceite.\n3. Añade el brócoli y la zanahoria y saltea 5–7 minutos.\n4. Mezcla con el arroz y sazona con ajo, pimienta y sal.\n5. Sirve caliente o guarda en recipientes para llevar.',
    ingredients: [
      ['pollo_pechuga_cruda', 300],
      ['arroz_blanco_crudo', 140],
      ['brocoli', 200],
      ['zanahoria', 100],
      ['aceite_girasol', 10],
    ],
  },
  {
    id: 'recipe_fideos_carne',
    name: 'Fideos con carne molida',
    description: 'Receta de olla rápida con fideos y tomate.',
    servings: 2,
    prep_minutes: 30,
    tags: 'económico,almuerzo,carne',
    instructions:
      '1. Cocina los fideos y escúrrelos.\n2. Sofríe cebolla y tomate con aceite.\n3. Añade la carne molida y cocina hasta que pierda el color rosado.\n4. Incorpora los fideos y un poco de agua o caldo.\n5. Cocina 5 minutos más y ajusta la sazón.',
    ingredients: [
      ['fideos_secos', 150],
      ['carne_molida_90_cruda', 250],
      ['tomate', 150],
      ['cebolla', 50],
      ['aceite_girasol', 10],
    ],
  },
  {
    id: 'recipe_tortilla_papa',
    name: 'Tortilla de huevo y papa',
    description: 'Cena sencilla y saciante con huevo y papa.',
    servings: 2,
    prep_minutes: 30,
    tags: 'económico,cena,huevo',
    instructions:
      '1. Cocina la papa en rodajas finas hasta que esté tierna.\n2. Bate los huevos con una pizca de sal.\n3. Mezcla la papa con el huevo.\n4. Cuaja la mezcla en una sartén con aceite, primero por un lado y luego por el otro.\n5. Sirve con una ensalada de verduras si tienes.',
    ingredients: [
      ['huevo_entero', 200],
      ['papa_cruda', 300],
      ['cebolla', 40],
      ['aceite_girasol', 12],
    ],
  },
  {
    id: 'recipe_frijoles_arroz',
    name: 'Frijoles con arroz',
    description: 'Combinación tradicional de legumbre y cereal con proteína vegetal.',
    servings: 2,
    prep_minutes: 45,
    tags: 'económico,legumbres,almuerzo',
    instructions:
      '1. Remoja los frijoles la noche anterior si usas frijoles secos.\n2. Cuece los frijoles hasta que estén tiernos.\n3. Prepara un sofrito de cebolla y ajo con aceite.\n4. Añade los frijoles con un poco de su caldo y cocina 10 minutos.\n5. Cuece el arroz aparte y sirve juntos.',
    ingredients: [
      ['frijoles_negros_secos', 150],
      ['arroz_blanco_crudo', 120],
      ['cebolla', 50],
      ['aceite_girasol', 10],
    ],
  },
  {
    id: 'recipe_sopa_pollo',
    name: 'Sopa casera de pollo y verduras',
    description: 'Sopa reconfortante, económica y fácil de hacer en cantidad.',
    servings: 3,
    prep_minutes: 45,
    tags: 'económico,cena,sopa,pollo',
    instructions:
      '1. Pica la cebolla, la zanahoria y la papa.\n2. Dora ligeramente el pollo en una olla con aceite.\n3. Añade las verduras y agua suficiente para cubrir.\n4. Cocina 25–30 minutos hasta que todo esté tierno.\n5. Añade los fideos y cocina 5 minutos más.\n6. Ajusta la sal y sirve caliente.',
    ingredients: [
      ['pollo_pechuga_cruda', 250],
      ['papa_cruda', 200],
      ['zanahoria', 100],
      ['cebolla', 50],
      ['fideos_secos', 50],
      ['aceite_girasol', 10],
    ],
  },
  {
    id: 'recipe_atun_arroz',
    name: 'Arroz con atún y tomate',
    description: 'Comida rápida con despensa: arroz, atún y tomate.',
    servings: 1,
    prep_minutes: 15,
    tags: 'económico,rapido,atun',
    instructions:
      '1. Cocina el arroz o usa arroz ya cocido.\n2. Escurre el atún.\n3. Mezcla el arroz con el atún y el tomate picado.\n4. Aliña con un poco de aceite, limón y pimienta.\n5. Sirve templado.',
    ingredients: [
      ['arroz_blanco_cocido', 150],
      ['atun_agua_escurrido', 120],
      ['tomate', 100],
      ['aceite_oliva', 5],
    ],
  },
  {
    id: 'recipe_ensalada_lentejas',
    name: 'Ensalada de lentejas',
    description: 'Opción fría para llevar, con legumbre y verduras.',
    servings: 2,
    prep_minutes: 15,
    tags: 'económico,ensalada,legumbres',
    instructions:
      '1. Escurre las lentejas cocidas.\n2. Corta el tomate y el pepino en cubos.\n3. Mezcla todo con aceite de oliva, limón, sal y pimienta.\n4. Deja reposar 10 minutos antes de servir.',
    ingredients: [
      ['lentejas_cocidas', 300],
      ['tomate', 150],
      ['pepino', 100],
      ['aceite_oliva', 10],
    ],
  },
  {
    id: 'recipe_pan_huevo',
    name: 'Tostadas con huevo',
    description: 'Desayuno rápido y económico.',
    servings: 1,
    prep_minutes: 10,
    tags: 'económico,desayuno,huevo',
    instructions:
      '1. Tuesta el pan.\n2. Cocina los huevos al gusto con una pequeña cantidad de aceite.\n3. Coloca los huevos sobre el pan.\n4. Añade tomate en rodajas y pimienta.',
    ingredients: [
      ['pan_integral', 64],
      ['huevo_entero', 100],
      ['tomate', 60],
      ['aceite_oliva', 5],
    ],
  },
];

export const SEED_PLANS = [
  {
    id: 'plan_principiante',
    name: 'Cuerpo completo · Principiante',
    level: 'principiante',
    schedule: [1, 3, 5],
    notes: 'Tres días no consecutivos. Empieza con cargas cómodas y prioriza la técnica. Descansa 1–2 minutos entre series.',
    exercises: [
      ['Sentadilla', 3, '8-12'],
      ['Press de banca', 3, '8-12'],
      ['Remo con mancuerna o barra', 3, '8-12'],
      ['Press militar', 2, '8-12'],
      ['Plancha', 3, '20-40 s'],
      ['Elevaciones de piernas', 3, '10-15'],
    ],
  },
  {
    id: 'plan_intermedio',
    name: 'Torso / pierna · Intermedio',
    level: 'intermedio',
    schedule: [1, 2, 4, 5],
    notes: 'Cuatro días. Alterna torso y pierna. Ajusta las cargas para terminar cada serie con 1–3 repeticiones en reserva.',
    exercises: [
      ['Sentadilla', 4, '6-10'],
      ['Peso muerto rumano', 3, '8-10'],
      ['Press de banca', 4, '6-10'],
      ['Remo con barra', 4, '8-12'],
      ['Jalón al pecho', 3, '10-12'],
      ['Curl de bíceps', 3, '10-15'],
      ['Extensión de tríceps', 3, '10-15'],
      ['Elevaciones laterales', 3, '12-15'],
      ['Plancha', 3, '30-45 s'],
    ],
  },
  {
    id: 'plan_avanzado',
    name: 'Empuje / tirón / pierna · Avanzado',
    level: 'avanzado',
    schedule: [1, 2, 3, 5, 6],
    notes: 'Cinco días con mayor volumen. No es obligatorio entrenar todos los días: adapta la frecuencia a tu recuperación.',
    exercises: [
      ['Press de banca', 4, '5-8'],
      ['Press militar', 4, '6-10'],
      ['Elevaciones laterales', 4, '12-15'],
      ['Extensión de tríceps', 3, '10-15'],
      ['Peso muerto', 4, '5-8'],
      ['Remo con barra', 4, '6-10'],
      ['Jalón al pecho', 4, '8-12'],
      ['Curl de bíceps', 4, '10-12'],
      ['Sentadilla', 4, '5-8'],
      ['Prensa de piernas', 3, '10-15'],
      ['Elevaciones de piernas', 4, '12-15'],
      ['Plancha', 3, '45-60 s'],
    ],
  },
];
