import * as Crypto from 'expo-crypto';
import { getDatabase, nowISO } from '../db';

export async function listFoods(userId, { query = '', category = '', favoritesOnly = false, limit = 200 } = {}) {
  const db = await getDatabase();
  const params = [userId, userId];
  let where = '(f.user_id IS NULL OR f.user_id = ?)';
  if (favoritesOnly) {
    where += ' AND fav.food_id IS NOT NULL';
  }
  if (category) {
    where += ' AND f.category = ?';
    params.push(category);
  }
  if (query.trim()) {
    where += ' AND (f.name LIKE ? OR f.category LIKE ?)';
    params.push(`%${query.trim()}%`, `%${query.trim()}%`);
  }
  params.push(limit);
  return db.getAllAsync(
    `SELECT f.*, CASE WHEN fav.food_id IS NULL THEN 0 ELSE 1 END AS is_favorite
       FROM food_items f
       LEFT JOIN food_favorites fav ON fav.food_id = f.id AND fav.user_id = ?
      WHERE ${where}
      ORDER BY is_favorite DESC, f.user_id IS NOT NULL DESC, f.name COLLATE NOCASE ASC
      LIMIT ?`,
    params
  );
}

export async function getFood(userId, foodId) {
  const db = await getDatabase();
  const food = await db.getFirstAsync(
    `SELECT f.*, CASE WHEN fav.food_id IS NULL THEN 0 ELSE 1 END AS is_favorite
       FROM food_items f
       LEFT JOIN food_favorites fav ON fav.food_id = f.id AND fav.user_id = ?
      WHERE f.id = ? AND (f.user_id IS NULL OR f.user_id = ?)`,
    [userId, foodId, userId]
  );
  if (!food) return null;
  const portions = await db.getAllAsync('SELECT * FROM food_portions WHERE food_id = ? ORDER BY is_visual ASC, grams ASC', [foodId]);
  return { ...food, portions };
}

export async function createFood(userId, data) {
  const db = await getDatabase();
  const id = `food_${Crypto.randomUUID()}`;
  const now = nowISO();
  await db.runAsync(
    `INSERT INTO food_items
      (id, user_id, name, category, calories_per_100, protein_per_100, carbs_per_100, fat_per_100, fiber_per_100,
       base_unit, state, source, notes, is_custom, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      id,
      userId,
      data.name,
      data.category || 'Otros',
      Number(data.calories_per_100) || 0,
      Number(data.protein_per_100) || 0,
      Number(data.carbs_per_100) || 0,
      Number(data.fat_per_100) || 0,
      Number(data.fiber_per_100) || 0,
      data.base_unit || 'g',
      data.state || 'crudo',
      data.source || 'Datos introducidos por el usuario',
      data.notes || null,
      now,
      now,
    ]
  );
  if (data.portion_grams && Number(data.portion_grams) > 0) {
    await db.runAsync(
      'INSERT OR IGNORE INTO food_portions (food_id, label, unit, grams, is_visual, notes) VALUES (?, ?, ?, ?, 0, ?)',
      [id, data.portion_label || `1 porción (${Math.round(Number(data.portion_grams))} g)`, 'porcion', Number(data.portion_grams), null]
    );
  }
  return getFood(userId, id);
}

export async function updateFood(userId, foodId, data) {
  const db = await getDatabase();
  const existing = await db.getFirstAsync('SELECT * FROM food_items WHERE id = ? AND user_id = ?', [foodId, userId]);
  if (!existing) throw new Error('Solo puedes editar alimentos creados por ti.');
  await db.runAsync(
    `UPDATE food_items SET name = ?, category = ?, calories_per_100 = ?, protein_per_100 = ?, carbs_per_100 = ?,
       fat_per_100 = ?, fiber_per_100 = ?, base_unit = ?, state = ?, source = ?, notes = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`,
    [
      data.name,
      data.category || 'Otros',
      Number(data.calories_per_100) || 0,
      Number(data.protein_per_100) || 0,
      Number(data.carbs_per_100) || 0,
      Number(data.fat_per_100) || 0,
      Number(data.fiber_per_100) || 0,
      data.base_unit || existing.base_unit,
      data.state || existing.state,
      data.source || existing.source,
      data.notes || null,
      nowISO(),
      foodId,
      userId,
    ]
  );
  return getFood(userId, foodId);
}

export async function deleteFood(userId, foodId) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM food_items WHERE id = ? AND user_id = ?', [foodId, userId]);
}

export async function toggleFavorite(userId, foodId, favorite) {
  const db = await getDatabase();
  if (favorite) {
    await db.runAsync('INSERT OR IGNORE INTO food_favorites (user_id, food_id, created_at) VALUES (?, ?, ?)', [
      userId,
      foodId,
      nowISO(),
    ]);
  } else {
    await db.runAsync('DELETE FROM food_favorites WHERE user_id = ? AND food_id = ?', [userId, foodId]);
  }
}

export async function addFoodPortion(foodId, portion) {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR IGNORE INTO food_portions (food_id, label, unit, grams, is_visual, notes) VALUES (?, ?, ?, ?, ?, ?)',
    [foodId, portion.label, portion.unit, portion.grams, portion.is_visual ? 1 : 0, portion.notes || null]
  );
}

export async function frequentFoods(userId, limit = 6) {
  const db = await getDatabase();
  return db.getAllAsync(
    `SELECT li.food_id, li.food_name AS name, COUNT(*) AS uses, MAX(li.created_at) AS last_used
       FROM meal_log_items li
       JOIN meal_logs ml ON ml.id = li.meal_log_id
      WHERE ml.user_id = ? AND li.food_id IS NOT NULL AND ml.date >= date('now', '-30 day')
      GROUP BY li.food_id
      ORDER BY uses DESC, last_used DESC
      LIMIT ?`,
    [userId, limit]
  );
}
