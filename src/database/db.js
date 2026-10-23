import * as SQLite from 'expo-sqlite';
import { migrations, LATEST_SCHEMA_VERSION } from './migrations';
import { SEED_FOODS, SEED_PLANS, SEED_RECIPES, USDA } from './seedData';

const DB_NAME = 'sdec.db';
let databasePromise = null;
let initialized = false;

export function nowISO() {
  return new Date().toISOString();
}

export async function getDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DB_NAME);
  }
  return databasePromise;
}

async function applyMigrations(db) {
  const row = await db.getFirstAsync('PRAGMA user_version');
  const current = Number(row?.user_version || 0);
  for (const migration of migrations) {
    if (migration.version <= current) continue;
    await db.withTransactionAsync(async () => {
      await db.execAsync(migration.sql);
    });
    await db.execAsync(`PRAGMA user_version = ${migration.version}`);
  }
  return Math.max(current, LATEST_SCHEMA_VERSION);
}

async function seedFoods(db) {
  const now = nowISO();
  for (const item of SEED_FOODS) {
    await db.runAsync(
      `INSERT OR IGNORE INTO food_items
        (id, user_id, name, category, calories_per_100, protein_per_100, carbs_per_100, fat_per_100, fiber_per_100, base_unit, state, source, notes, is_custom, created_at, updated_at)
       VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        item.id,
        item.name,
        item.category,
        item.calories,
        item.protein,
        item.carbs,
        item.fat,
        item.fiber,
        item.baseUnit,
        item.state,
        USDA,
        item.notes || null,
        now,
        now,
      ]
    );
    for (const portion of item.portions || []) {
      await db.runAsync(
        `INSERT OR IGNORE INTO food_portions (food_id, label, unit, grams, is_visual, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [item.id, portion.label, portion.unit, portion.grams, portion.isVisual ? 1 : 0, portion.notes || null]
      );
    }
  }
}

async function seedRecipes(db) {
  const now = nowISO();
  for (const recipe of SEED_RECIPES) {
    const existing = await db.getFirstAsync('SELECT id FROM recipes WHERE id = ?', [recipe.id]);
    if (existing) continue;
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO recipes (id, user_id, name, description, servings, prep_minutes, instructions, tags, created_at, updated_at)
         VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          recipe.id,
          recipe.name,
          recipe.description,
          recipe.servings,
          recipe.prep_minutes,
          recipe.instructions,
          recipe.tags,
          now,
          now,
        ]
      );
      for (const [foodId, quantity] of recipe.ingredients) {
        await db.runAsync(
          'INSERT INTO recipe_ingredients (recipe_id, food_id, quantity_g) VALUES (?, ?, ?)',
          [recipe.id, foodId, quantity]
        );
      }
    });
  }
}

async function seedPlans(db) {
  const now = nowISO();
  for (const plan of SEED_PLANS) {
    await db.runAsync(
      `INSERT OR IGNORE INTO workout_plans (id, user_id, name, level, schedule, notes, is_template, created_at, updated_at)
       VALUES (?, NULL, ?, ?, ?, ?, 1, ?, ?)`,
      [plan.id, plan.name, plan.level, JSON.stringify(plan.schedule), plan.notes, now, now]
    );
    const count = await db.getFirstAsync('SELECT COUNT(*) AS total FROM workout_plan_exercises WHERE plan_id = ?', [plan.id]);
    if (Number(count?.total || 0) === 0) {
      let index = 0;
      for (const [name, sets, reps] of plan.exercises) {
        await db.runAsync(
          'INSERT INTO workout_plan_exercises (plan_id, name, target_sets, target_reps, order_index) VALUES (?, ?, ?, ?, ?)',
          [plan.id, name, sets, reps, index]
        );
        index += 1;
      }
    }
  }
}

async function seedDatabase(db) {
  await seedFoods(db);
  await seedRecipes(db);
  await seedPlans(db);
}

export async function initDatabase() {
  if (initialized) return getDatabase();
  const db = await getDatabase();
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  await applyMigrations(db);
  await seedDatabase(db);
  initialized = true;
  return db;
}

export async function runInTransaction(work) {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await work(db);
  });
}

export async function wipeLocalDatabase() {
  const db = await getDatabase();
  const tables = [
    'water_logs',
    'reminders',
    'supplement_reminders',
    'supplement_purchases',
    'supplement_logs',
    'supplements',
    'shopping_list_items',
    'shopping_lists',
    'ingredient_prices',
    'budget_items',
    'daily_steps',
    'exercise_sets',
    'workout_exercises',
    'workout_sessions',
    'workout_plan_exercises',
    'workout_plans',
    'body_measurements',
    'weight_logs',
    'recipe_ingredients',
    'recipes',
    'meal_log_items',
    'meal_logs',
    'food_favorites',
    'food_portions',
    'food_items',
    'user_preferences',
    'users',
  ];
  await db.withTransactionAsync(async () => {
    for (const table of tables) {
      await db.execAsync(`DELETE FROM ${table};`);
    }
  });
}
