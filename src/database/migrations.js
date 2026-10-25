export const migrations = [
  {
    version: 1,
    name: 'esquema_inicial',
    sql: `
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY NOT NULL,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        display_name TEXT NOT NULL,
        password_hash TEXT,
        password_salt TEXT,
        recovery_hash TEXT,
        recovery_salt TEXT,
        auth_provider TEXT NOT NULL DEFAULT 'local',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id TEXT PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        birth_date TEXT,
        sex TEXT NOT NULL DEFAULT 'no_especificado',
        height_cm REAL,
        activity_level TEXT NOT NULL DEFAULT 'ligero',
        experience_level TEXT NOT NULL DEFAULT 'principiante',
        training_days INTEGER NOT NULL DEFAULT 3,
        goal TEXT NOT NULL DEFAULT 'perder_grasa',
        weekly_budget REAL,
        currency TEXT NOT NULL DEFAULT 'USD',
        region TEXT,
        dietary_preferences TEXT,
        allergies TEXT,
        available_foods TEXT,
        meals_per_day INTEGER NOT NULL DEFAULT 4,
        step_goal INTEGER NOT NULL DEFAULT 8000,
        water_goal_ml INTEGER NOT NULL DEFAULT 2000,
        deficit_percent REAL NOT NULL DEFAULT 15,
        protein_per_kg REAL NOT NULL DEFAULT 1.8,
        target_weight_kg REAL,
        supplements_enabled INTEGER NOT NULL DEFAULT 0,
        theme TEXT NOT NULL DEFAULT 'dark',
        units TEXT NOT NULL DEFAULT 'metrico',
        health_notes TEXT DEFAULT '',
        onboarded INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS food_items (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        calories_per_100 REAL NOT NULL DEFAULT 0,
        protein_per_100 REAL NOT NULL DEFAULT 0,
        carbs_per_100 REAL NOT NULL DEFAULT 0,
        fat_per_100 REAL NOT NULL DEFAULT 0,
        fiber_per_100 REAL NOT NULL DEFAULT 0,
        base_unit TEXT NOT NULL DEFAULT 'g',
        state TEXT NOT NULL DEFAULT 'crudo',
        source TEXT,
        notes TEXT,
        is_custom INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS food_portions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        food_id TEXT NOT NULL REFERENCES food_items(id) ON DELETE CASCADE,
        label TEXT NOT NULL,
        unit TEXT NOT NULL,
        grams REAL NOT NULL,
        is_visual INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        UNIQUE(food_id, unit, label)
      );

      CREATE TABLE IF NOT EXISTS food_favorites (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        food_id TEXT NOT NULL REFERENCES food_items(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL,
        PRIMARY KEY(user_id, food_id)
      );

      CREATE TABLE IF NOT EXISTS meal_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        meal_type TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL,
        UNIQUE(user_id, date, meal_type)
      );

      CREATE TABLE IF NOT EXISTS meal_log_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        meal_log_id INTEGER NOT NULL REFERENCES meal_logs(id) ON DELETE CASCADE,
        food_id TEXT REFERENCES food_items(id) ON DELETE SET NULL,
        food_name TEXT NOT NULL,
        quantity_g REAL NOT NULL,
        display_quantity REAL,
        unit TEXT NOT NULL DEFAULT 'g',
        calories REAL NOT NULL DEFAULT 0,
        protein REAL NOT NULL DEFAULT 0,
        carbs REAL NOT NULL DEFAULT 0,
        fat REAL NOT NULL DEFAULT 0,
        fiber REAL NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS recipes (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        servings INTEGER NOT NULL DEFAULT 2,
        prep_minutes INTEGER NOT NULL DEFAULT 30,
        instructions TEXT,
        tags TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS recipe_ingredients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
        food_id TEXT NOT NULL REFERENCES food_items(id) ON DELETE CASCADE,
        quantity_g REAL NOT NULL,
        note TEXT
      );

      CREATE TABLE IF NOT EXISTS weight_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        weight_kg REAL NOT NULL,
        waist_cm REAL,
        notes TEXT,
        created_at TEXT NOT NULL,
        UNIQUE(user_id, date)
      );

      CREATE TABLE IF NOT EXISTS body_measurements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        waist_cm REAL,
        chest_cm REAL,
        hip_cm REAL,
        arm_cm REAL,
        thigh_cm REAL,
        notes TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS workout_plans (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        level TEXT NOT NULL DEFAULT 'principiante',
        schedule TEXT NOT NULL DEFAULT '[]',
        notes TEXT,
        is_template INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS workout_plan_exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_id TEXT NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        target_sets INTEGER NOT NULL DEFAULT 3,
        target_reps TEXT NOT NULL DEFAULT '8-12',
        order_index INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS workout_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan_id TEXT REFERENCES workout_plans(id) ON DELETE SET NULL,
        date TEXT NOT NULL,
        duration_min INTEGER,
        status TEXT NOT NULL DEFAULT 'en_progreso',
        notes TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS workout_exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        order_index INTEGER NOT NULL DEFAULT 0,
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS exercise_sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_exercise_id INTEGER NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
        set_number INTEGER NOT NULL DEFAULT 1,
        reps INTEGER NOT NULL DEFAULT 0,
        weight_kg REAL NOT NULL DEFAULT 0,
        rest_sec INTEGER,
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS daily_steps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        steps INTEGER NOT NULL DEFAULT 0,
        goal INTEGER NOT NULL DEFAULT 8000,
        source TEXT NOT NULL DEFAULT 'manual',
        UNIQUE(user_id, date)
      );

      CREATE TABLE IF NOT EXISTS budget_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'alimentacion',
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS ingredient_prices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        food_id TEXT NOT NULL REFERENCES food_items(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        package_grams REAL NOT NULL,
        price REAL NOT NULL,
        unit TEXT NOT NULL DEFAULT 'g',
        store TEXT,
        updated_at TEXT NOT NULL,
        UNIQUE(user_id, food_id)
      );

      CREATE TABLE IF NOT EXISTS shopping_lists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        week_start TEXT,
        created_at TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS shopping_list_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        list_id INTEGER NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
        food_id TEXT REFERENCES food_items(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        quantity_g REAL,
        unit TEXT,
        estimated_cost REAL,
        checked INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS supplements (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'otro',
        brand TEXT,
        presentation TEXT,
        container_size REAL,
        container_unit TEXT NOT NULL DEFAULT 'g',
        price REAL,
        purchase_date TEXT,
        opened_date TEXT,
        remaining REAL,
        serving_size REAL,
        serving_unit TEXT NOT NULL DEFAULT 'g',
        calories REAL DEFAULT 0,
        protein REAL DEFAULT 0,
        carbs REAL DEFAULT 0,
        fat REAL DEFAULT 0,
        ingredients TEXT,
        warnings TEXT,
        expiry_date TEXT,
        source TEXT,
        notes TEXT,
        servings_per_day REAL NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS supplement_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        supplement_id TEXT REFERENCES supplements(id) ON DELETE SET NULL,
        supplement_name TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT,
        servings REAL NOT NULL DEFAULT 1,
        calories REAL NOT NULL DEFAULT 0,
        protein REAL NOT NULL DEFAULT 0,
        carbs REAL NOT NULL DEFAULT 0,
        fat REAL NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS supplement_purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        supplement_id TEXT REFERENCES supplements(id) ON DELETE SET NULL,
        date TEXT NOT NULL,
        price REAL NOT NULL,
        quantity REAL,
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS supplement_reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        supplement_id TEXT REFERENCES supplements(id) ON DELETE CASCADE,
        time TEXT NOT NULL,
        days TEXT NOT NULL DEFAULT '[1,2,3,4,5,6,0]',
        enabled INTEGER NOT NULL DEFAULT 1,
        notification_id TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS water_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        ml REAL NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT,
        time TEXT NOT NULL,
        days TEXT NOT NULL DEFAULT '[1,2,3,4,5,6,0]',
        enabled INTEGER NOT NULL DEFAULT 1,
        notification_id TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        entity TEXT NOT NULL,
        entity_id TEXT,
        operation TEXT NOT NULL,
        payload TEXT,
        created_at TEXT NOT NULL,
        synced_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_food_items_user ON food_items(user_id);
      CREATE INDEX IF NOT EXISTS idx_food_items_name ON food_items(name);
      CREATE INDEX IF NOT EXISTS idx_food_portions_food ON food_portions(food_id);
      CREATE INDEX IF NOT EXISTS idx_meal_logs_user_date ON meal_logs(user_id, date);
      CREATE INDEX IF NOT EXISTS idx_meal_items_log ON meal_log_items(meal_log_id);
      CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
      CREATE INDEX IF NOT EXISTS idx_weight_user_date ON weight_logs(user_id, date);
      CREATE INDEX IF NOT EXISTS idx_measurements_user_date ON body_measurements(user_id, date);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_date ON workout_sessions(user_id, date);
      CREATE INDEX IF NOT EXISTS idx_workout_exercises_session ON workout_exercises(session_id);
      CREATE INDEX IF NOT EXISTS idx_sets_exercise ON exercise_sets(workout_exercise_id);
      CREATE INDEX IF NOT EXISTS idx_steps_user_date ON daily_steps(user_id, date);
      CREATE INDEX IF NOT EXISTS idx_budget_user_date ON budget_items(user_id, date);
      CREATE INDEX IF NOT EXISTS idx_supplement_logs_user_date ON supplement_logs(user_id, date);
      CREATE INDEX IF NOT EXISTS idx_water_user_date ON water_logs(user_id, date);
      CREATE INDEX IF NOT EXISTS idx_reminders_user ON reminders(user_id);
    `,
  },
  {
    version: 2,
    name: 'indices_de_estadisticas',
    sql: `
      CREATE INDEX IF NOT EXISTS idx_meal_items_food ON meal_log_items(food_id);
      CREATE INDEX IF NOT EXISTS idx_supplements_user ON supplements(user_id);
      CREATE INDEX IF NOT EXISTS idx_shopping_items_list ON shopping_list_items(list_id);
      CREATE INDEX IF NOT EXISTS idx_ingredient_prices_user ON ingredient_prices(user_id);
    `,
  },
  {
    version: 3,
    name: 'porciones_por_unidad_en_comidas',
    sql: `
      ALTER TABLE meal_log_items ADD COLUMN serving_grams REAL;

      UPDATE meal_log_items
         SET serving_grams = (
           SELECT fp.grams
             FROM food_portions fp
            WHERE fp.food_id = meal_log_items.food_id
              AND fp.label = meal_log_items.unit
            LIMIT 1
         )
       WHERE food_id IS NOT NULL
         AND unit <> 'g'
         AND EXISTS (
           SELECT 1
             FROM food_portions fp
            WHERE fp.food_id = meal_log_items.food_id
              AND fp.label = meal_log_items.unit
         );

      UPDATE meal_log_items
         SET display_quantity = ROUND(quantity_g / serving_grams, 3)
       WHERE serving_grams IS NOT NULL
         AND serving_grams > 0;
    `,
  },
];

export const LATEST_SCHEMA_VERSION = migrations[migrations.length - 1].version;
