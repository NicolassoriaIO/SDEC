import { getDatabase, nowISO } from '../db';
import { monthStartKey, startOfWeek, todayKey } from '../../utils/date';
import { proportionalCost } from '../../utils/cost';

export async function listBudgetItems(userId, limit = 100) {
  const db = await getDatabase();
  return db.getAllAsync('SELECT * FROM budget_items WHERE user_id = ? ORDER BY date DESC, id DESC LIMIT ?', [userId, limit]);
}

export async function addBudgetItem(userId, item) {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT INTO budget_items (user_id, name, category, amount, date, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [userId, item.name, item.category || 'alimentacion', Number(item.amount) || 0, item.date || todayKey(), item.notes || null, nowISO()]
  );
}

export async function deleteBudgetItem(userId, id) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM budget_items WHERE id = ? AND user_id = ?', [id, userId]);
}

export async function spendingSummary(userId) {
  const db = await getDatabase();
  const weekStart = startOfWeek(todayKey());
  const monthStart = monthStartKey();
  const week = await db.getFirstAsync(
    'SELECT COALESCE(SUM(amount), 0) AS total FROM budget_items WHERE user_id = ? AND date >= ?',
    [userId, weekStart]
  );
  const month = await db.getFirstAsync(
    'SELECT COALESCE(SUM(amount), 0) AS total FROM budget_items WHERE user_id = ? AND date >= ?',
    [userId, monthStart]
  );
  const byCategory = await db.getAllAsync(
    'SELECT category, SUM(amount) AS total FROM budget_items WHERE user_id = ? AND date >= ? GROUP BY category',
    [userId, monthStart]
  );
  return {
    week: Number(week?.total || 0),
    month: Number(month?.total || 0),
    byCategory,
    weekStart,
    monthStart,
  };
}

export async function listIngredientPrices(userId) {
  const db = await getDatabase();
  return db.getAllAsync(
    `SELECT ip.*, f.name AS food_name, f.base_unit
       FROM ingredient_prices ip JOIN food_items f ON f.id = ip.food_id
      WHERE ip.user_id = ? ORDER BY f.name COLLATE NOCASE ASC`,
    [userId]
  );
}

export async function upsertIngredientPrice(userId, { foodId, name, packageGrams, price, unit = 'g', store }) {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO ingredient_prices (user_id, food_id, name, package_grams, price, unit, store, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, food_id) DO UPDATE SET
       name = excluded.name,
       package_grams = excluded.package_grams,
       price = excluded.price,
       unit = excluded.unit,
       store = excluded.store,
       updated_at = excluded.updated_at`,
    [userId, foodId, name, packageGrams, price, unit, store || null, nowISO()]
  );
}

export async function deleteIngredientPrice(userId, id) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM ingredient_prices WHERE id = ? AND user_id = ?', [id, userId]);
}

export async function getPriceForFood(userId, foodId) {
  const db = await getDatabase();
  return db.getFirstAsync('SELECT * FROM ingredient_prices WHERE user_id = ? AND food_id = ?', [userId, foodId]);
}

export async function getActiveShoppingList(userId) {
  const db = await getDatabase();
  let list = await db.getFirstAsync(
    'SELECT * FROM shopping_lists WHERE user_id = ? AND completed = 0 ORDER BY id DESC LIMIT 1',
    [userId]
  );
  if (!list) {
    await db.runAsync('INSERT INTO shopping_lists (user_id, name, week_start, created_at) VALUES (?, ?, ?, ?)', [
      userId,
      'Lista de compras',
      startOfWeek(todayKey()),
      nowISO(),
    ]);
    list = await db.getFirstAsync(
      'SELECT * FROM shopping_lists WHERE user_id = ? AND completed = 0 ORDER BY id DESC LIMIT 1',
      [userId]
    );
  }
  const items = await db.getAllAsync('SELECT * FROM shopping_list_items WHERE list_id = ? ORDER BY checked ASC, id ASC', [list.id]);
  return { ...list, items };
}

export async function addShoppingItem(userId, { name, quantityG, unit = 'g', estimatedCost = null, foodId = null }) {
  const db = await getDatabase();
  const list = await getActiveShoppingList(userId);
  await db.runAsync(
    'INSERT INTO shopping_list_items (list_id, food_id, name, quantity_g, unit, estimated_cost, checked) VALUES (?, ?, ?, ?, ?, ?, 0)',
    [list.id, foodId, name, quantityG ?? null, unit, estimatedCost ?? null]
  );
  return list.id;
}

export async function addShoppingItems(userId, items, name = 'Lista de compras') {
  const db = await getDatabase();
  const now = nowISO();
  let list = await db.getFirstAsync(
    'SELECT * FROM shopping_lists WHERE user_id = ? AND completed = 0 AND name = ? ORDER BY id DESC LIMIT 1',
    [userId, name]
  );
  if (!list) {
    await db.runAsync('INSERT INTO shopping_lists (user_id, name, week_start, created_at) VALUES (?, ?, ?, ?)', [
      userId,
      name,
      startOfWeek(todayKey()),
      now,
    ]);
    list = await db.getFirstAsync('SELECT * FROM shopping_lists WHERE user_id = ? ORDER BY id DESC LIMIT 1', [userId]);
  }
  for (const item of items) {
    await db.runAsync(
      'INSERT INTO shopping_list_items (list_id, food_id, name, quantity_g, unit, estimated_cost, checked) VALUES (?, ?, ?, ?, ?, ?, 0)',
      [list.id, item.food_id || null, item.name, item.quantity_g ?? null, item.unit || 'g', item.estimated_cost ?? null]
    );
  }
  return list.id;
}

export async function toggleShoppingItem(userId, itemId, checked) {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE shopping_list_items SET checked = ?
      WHERE id = ? AND list_id IN (SELECT id FROM shopping_lists WHERE user_id = ?)`,
    [checked ? 1 : 0, itemId, userId]
  );
}

export async function deleteShoppingItem(userId, itemId) {
  const db = await getDatabase();
  await db.runAsync(
    `DELETE FROM shopping_list_items
      WHERE id = ? AND list_id IN (SELECT id FROM shopping_lists WHERE user_id = ?)`,
    [itemId, userId]
  );
}

export async function completeShoppingList(userId) {
  const db = await getDatabase();
  await db.runAsync('UPDATE shopping_lists SET completed = 1 WHERE user_id = ? AND completed = 0', [userId]);
}

export async function shoppingCostEstimate(userId, items) {
  const db = await getDatabase();
  const prices = await db.getAllAsync('SELECT * FROM ingredient_prices WHERE user_id = ?', [userId]);
  const map = new Map(prices.map((price) => [price.food_id, price]));
  let total = 0;
  let missing = 0;
  const enriched = items.map((item) => {
    const price = map.get(item.food_id);
    const cost = price && item.quantity_g
      ? proportionalCost({ price: price.price, packageGrams: price.package_grams, grams: item.quantity_g })
      : null;
    if (cost === null) missing += 1;
    else total += cost;
    return { ...item, estimated_cost: cost };
  });
  return { items: enriched, total, missing };
}
