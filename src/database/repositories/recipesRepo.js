import * as Crypto from 'expo-crypto';
import { getDatabase, nowISO } from '../db';
import { addMealItem } from './mealsRepo';
import { proportionalCost } from '../../utils/cost';

async function ingredientsWithCost(userId, recipeId) {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT ri.*, f.name, f.category, f.base_unit, f.calories_per_100, f.protein_per_100,
            f.carbs_per_100, f.fat_per_100, f.fiber_per_100, f.state,
            ip.price, ip.package_grams
       FROM recipe_ingredients ri
       JOIN food_items f ON f.id = ri.food_id
       LEFT JOIN ingredient_prices ip ON ip.food_id = f.id AND ip.user_id = ?
      WHERE ri.recipe_id = ?
      ORDER BY ri.id ASC`,
    [userId, recipeId]
  );
  return rows.map((row) => {
    const factor = Number(row.quantity_g) / 100;
    const cost = row.price && row.package_grams
      ? proportionalCost({ price: row.price, packageGrams: row.package_grams, grams: row.quantity_g })
      : null;
    return {
      ...row,
      calories: Number(row.calories_per_100) * factor,
      protein: Number(row.protein_per_100) * factor,
      carbs: Number(row.carbs_per_100) * factor,
      fat: Number(row.fat_per_100) * factor,
      fiber: Number(row.fiber_per_100) * factor,
      estimated_cost: cost,
    };
  });
}

export async function listRecipes(userId) {
  const db = await getDatabase();
  const recipes = await db.getAllAsync(
    `SELECT r.*, (SELECT COUNT(*) FROM recipe_ingredients ri WHERE ri.recipe_id = r.id) AS ingredient_count
       FROM recipes r
      WHERE r.user_id IS NULL OR r.user_id = ?
      ORDER BY r.user_id IS NOT NULL DESC, r.name COLLATE NOCASE ASC`,
    [userId]
  );
  const enriched = [];
  for (const recipe of recipes) {
    const ingredients = await ingredientsWithCost(userId, recipe.id);
    const totals = ingredients.reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories,
        protein: acc.protein + item.protein,
        carbs: acc.carbs + item.carbs,
        fat: acc.fat + item.fat,
        cost: acc.cost + (item.estimated_cost || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, cost: 0 }
    );
    const completeCost = ingredients.length > 0 && ingredients.every((item) => item.estimated_cost !== null);
    enriched.push({
      ...recipe,
      totals: {
        calories: totals.calories / recipe.servings,
        protein: totals.protein / recipe.servings,
        carbs: totals.carbs / recipe.servings,
        fat: totals.fat / recipe.servings,
      },
      cost_per_serving: completeCost ? totals.cost / recipe.servings : null,
      cost_complete: completeCost,
      missing_prices: ingredients.filter((item) => item.estimated_cost === null).map((item) => item.name),
    });
  }
  return enriched;
}

export async function getRecipe(userId, recipeId) {
  const db = await getDatabase();
  const recipe = await db.getFirstAsync(
    'SELECT * FROM recipes WHERE id = ? AND (user_id IS NULL OR user_id = ?)',
    [recipeId, userId]
  );
  if (!recipe) return null;
  const ingredients = await ingredientsWithCost(userId, recipeId);
  const totals = ingredients.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
      fiber: acc.fiber + item.fiber,
      cost: acc.cost + (item.estimated_cost || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, cost: 0 }
  );
  const completeCost = ingredients.length > 0 && ingredients.every((item) => item.estimated_cost !== null);
  return {
    ...recipe,
    ingredients,
    totals,
    per_serving: {
      calories: totals.calories / recipe.servings,
      protein: totals.protein / recipe.servings,
      carbs: totals.carbs / recipe.servings,
      fat: totals.fat / recipe.servings,
      fiber: totals.fiber / recipe.servings,
      cost: completeCost ? totals.cost / recipe.servings : null,
    },
    cost_complete: completeCost,
    cost_total: completeCost ? totals.cost : null,
    missing_prices: ingredients.filter((item) => item.estimated_cost === null).map((item) => item.name),
    is_custom: Boolean(recipe.user_id),
  };
}

async function insertIngredient(recipeId, ingredient) {
  const db = await getDatabase();
  await db.runAsync('INSERT INTO recipe_ingredients (recipe_id, food_id, quantity_g, note) VALUES (?, ?, ?, ?)', [
    recipeId,
    ingredient.food_id,
    ingredient.quantity_g,
    ingredient.note || null,
  ]);
}

export async function createRecipe(userId, data) {
  const db = await getDatabase();
  const id = `recipe_${Crypto.randomUUID()}`;
  const now = nowISO();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO recipes (id, user_id, name, description, servings, prep_minutes, instructions, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        data.name,
        data.description || null,
        Number(data.servings) || 2,
        Number(data.prep_minutes) || 30,
        data.instructions || null,
        data.tags || null,
        now,
        now,
      ]
    );
    for (const ingredient of data.ingredients || []) {
      await insertIngredient(id, ingredient);
    }
  });
  return getRecipe(userId, id);
}

export async function updateRecipe(userId, recipeId, data) {
  const db = await getDatabase();
  const recipe = await db.getFirstAsync('SELECT * FROM recipes WHERE id = ? AND user_id = ?', [recipeId, userId]);
  if (!recipe) throw new Error('Solo puedes editar tus propias recetas.');
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE recipes SET name = ?, description = ?, servings = ?, prep_minutes = ?, instructions = ?, tags = ?, updated_at = ? WHERE id = ?`,
      [
        data.name,
        data.description || null,
        Number(data.servings) || recipe.servings,
        Number(data.prep_minutes) || recipe.prep_minutes,
        data.instructions || null,
        data.tags || null,
        nowISO(),
        recipeId,
      ]
    );
    if (data.ingredients) {
      await db.runAsync('DELETE FROM recipe_ingredients WHERE recipe_id = ?', [recipeId]);
      for (const ingredient of data.ingredients) {
        await insertIngredient(recipeId, ingredient);
      }
    }
  });
  return getRecipe(userId, recipeId);
}

export async function deleteRecipe(userId, recipeId) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM recipes WHERE id = ? AND user_id = ?', [recipeId, userId]);
}

export async function addRecipeToMeal(userId, { recipeId, date, mealType, servingsEaten = 1 }) {
  const recipe = await getRecipe(userId, recipeId);
  if (!recipe) throw new Error('Receta no encontrada.');
  const factor = Number(servingsEaten) / recipe.servings;
  for (const ingredient of recipe.ingredients) {
    const food = {
      id: ingredient.food_id,
      name: ingredient.name,
      calories_per_100: ingredient.calories_per_100,
      protein_per_100: ingredient.protein_per_100,
      carbs_per_100: ingredient.carbs_per_100,
      fat_per_100: ingredient.fat_per_100,
      fiber_per_100: ingredient.fiber_per_100,
    };
    const grams = Number(ingredient.quantity_g) * factor;
    await addMealItem(userId, {
      date,
      mealType,
      food,
      quantityG: grams,
      displayQuantity: grams,
      unit: 'g',
      notes: `Receta: ${recipe.name}`,
    });
  }
  return factor * recipe.servings;
}
