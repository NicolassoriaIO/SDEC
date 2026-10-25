import { getDatabase, nowISO } from '../db';
import { MEAL_TYPES } from '../../constants';
import { macroFromAmount, sumMacros } from '../../features/nutrition/macros';
import { addDays, todayKey } from '../../utils/date';

async function dbHandle() {
  return getDatabase();
}

export async function getOrCreateMealLog(userId, date, mealType) {
  const db = await dbHandle();
  const existing = await db.getFirstAsync(
    'SELECT * FROM meal_logs WHERE user_id = ? AND date = ? AND meal_type = ?',
    [userId, date, mealType]
  );
  if (existing) return existing;
  await db.runAsync('INSERT OR IGNORE INTO meal_logs (user_id, date, meal_type, created_at) VALUES (?, ?, ?, ?)', [
    userId,
    date,
    mealType,
    nowISO(),
  ]);
  return db.getFirstAsync('SELECT * FROM meal_logs WHERE user_id = ? AND date = ? AND meal_type = ?', [
    userId,
    date,
    mealType,
  ]);
}

export async function addMealItem(userId, { date, mealType, food, quantityG, displayQuantity, unit = 'g', servingGrams = null, notes }) {
  const db = await dbHandle();
  const macro = macroFromAmount(food, quantityG);
  const log = await getOrCreateMealLog(userId, date, mealType);
  await db.runAsync(
    `INSERT INTO meal_log_items
      (meal_log_id, food_id, food_name, quantity_g, display_quantity, unit, serving_grams, calories, protein, carbs, fat, fiber, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      log.id,
      food.id,
      food.name,
      quantityG,
      displayQuantity ?? quantityG,
      unit,
      servingGrams,
      macro.calories,
      macro.protein,
      macro.carbs,
      macro.fat,
      macro.fiber,
      notes || null,
      nowISO(),
    ]
  );
  return log;
}

export async function updateMealItemQuantity(userId, itemId, quantityG, { displayQuantity = null, unit = null } = {}) {
  const db = await dbHandle();
  const item = await db.getFirstAsync(
    `SELECT li.*, ml.user_id FROM meal_log_items li JOIN meal_logs ml ON ml.id = li.meal_log_id WHERE li.id = ?`,
    [itemId]
  );
  if (!item || item.user_id !== userId) throw new Error('Registro no encontrado.');
  const food = item.food_id
    ? await db.getFirstAsync('SELECT * FROM food_items WHERE id = ?', [item.food_id])
    : null;
  let macro;
  if (food) {
    macro = macroFromAmount(food, quantityG);
  } else {
    const factor = item.quantity_g > 0 ? quantityG / item.quantity_g : 0;
    macro = {
      calories: item.calories * factor,
      protein: item.protein * factor,
      carbs: item.carbs * factor,
      fat: item.fat * factor,
      fiber: item.fiber * factor,
    };
  }
  await db.runAsync(
    `UPDATE meal_log_items
        SET quantity_g = ?, display_quantity = ?, unit = ?, calories = ?, protein = ?, carbs = ?, fat = ?, fiber = ?
      WHERE id = ?`,
    [
      quantityG,
      displayQuantity ?? quantityG,
      unit ?? item.unit,
      macro.calories,
      macro.protein,
      macro.carbs,
      macro.fat,
      macro.fiber,
      itemId,
    ]
  );
}

export async function deleteMealItem(userId, itemId) {
  const db = await dbHandle();
  await db.runAsync(
    `DELETE FROM meal_log_items WHERE id IN (
       SELECT li.id FROM meal_log_items li JOIN meal_logs ml ON ml.id = li.meal_log_id WHERE li.id = ? AND ml.user_id = ?
     )`,
    [itemId, userId]
  );
}

export async function deleteMealLog(userId, logId) {
  const db = await dbHandle();
  await db.runAsync('DELETE FROM meal_logs WHERE id = ? AND user_id = ?', [logId, userId]);
}

export async function getDayMeals(userId, date) {
  const db = await dbHandle();
  const logs = await db.getAllAsync(
    `SELECT * FROM meal_logs WHERE user_id = ? AND date = ? ORDER BY CASE meal_type
       WHEN 'desayuno' THEN 1 WHEN 'media_manana' THEN 2 WHEN 'almuerzo' THEN 3
       WHEN 'merienda' THEN 4 WHEN 'cena' THEN 5 ELSE 6 END`,
    [userId, date]
  );
  const items = await db.getAllAsync(
    `SELECT li.*, ml.meal_type, ml.date FROM meal_log_items li
       JOIN meal_logs ml ON ml.id = li.meal_log_id
      WHERE ml.user_id = ? AND ml.date = ?
      ORDER BY li.id ASC`,
    [userId, date]
  );
  const grouped = MEAL_TYPES.map((type) => {
    const log = logs.find((entry) => entry.meal_type === type.key);
    const mealItems = items.filter((item) => item.meal_type === type.key);
    return {
      ...type,
      logId: log?.id || null,
      notes: log?.notes || '',
      items: mealItems,
      totals: sumMacros(mealItems),
    };
  });
  return { date, logs, items, groups: grouped, totals: sumMacros(items) };
}

export async function getDayTotals(userId, date) {
  const db = await dbHandle();
  const row = await db.getFirstAsync(
    `SELECT COALESCE(SUM(li.calories), 0) AS calories,
            COALESCE(SUM(li.protein), 0) AS protein,
            COALESCE(SUM(li.carbs), 0) AS carbs,
            COALESCE(SUM(li.fat), 0) AS fat,
            COALESCE(SUM(li.fiber), 0) AS fiber
       FROM meal_log_items li JOIN meal_logs ml ON ml.id = li.meal_log_id
      WHERE ml.user_id = ? AND ml.date = ?`,
    [userId, date]
  );
  return {
    calories: Number(row?.calories || 0),
    protein: Number(row?.protein || 0),
    carbs: Number(row?.carbs || 0),
    fat: Number(row?.fat || 0),
    fiber: Number(row?.fiber || 0),
  };
}

export async function copyMeal(userId, { fromDate, toDate, mealType }) {
  const db = await dbHandle();
  const source = await db.getFirstAsync(
    'SELECT * FROM meal_logs WHERE user_id = ? AND date = ? AND meal_type = ?',
    [userId, fromDate, mealType]
  );
  if (!source) return { copied: 0 };
  const items = await db.getAllAsync('SELECT * FROM meal_log_items WHERE meal_log_id = ?', [source.id]);
  if (!items.length) return { copied: 0 };
  const target = await getOrCreateMealLog(userId, toDate, mealType);
  const now = nowISO();
  for (const item of items) {
    await db.runAsync(
      `INSERT INTO meal_log_items
        (meal_log_id, food_id, food_name, quantity_g, display_quantity, unit, serving_grams, calories, protein, carbs, fat, fiber, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        target.id,
        item.food_id,
        item.food_name,
        item.quantity_g,
        item.display_quantity,
        item.unit,
        item.serving_grams,
        item.calories,
        item.protein,
        item.carbs,
        item.fat,
        item.fiber,
        item.notes,
        now,
      ]
    );
  }
  return { copied: items.length };
}

export async function dailyNutritionSeries(userId, days = 7) {
  const db = await dbHandle();
  const start = addDays(todayKey(), -(days - 1));
  const rows = await db.getAllAsync(
    `SELECT ml.date, SUM(li.calories) AS calories, SUM(li.protein) AS protein,
            SUM(li.carbs) AS carbs, SUM(li.fat) AS fat
       FROM meal_logs ml JOIN meal_log_items li ON li.meal_log_id = ml.id
      WHERE ml.user_id = ? AND ml.date >= ? AND ml.date <= ?
      GROUP BY ml.date ORDER BY ml.date ASC`,
    [userId, start, todayKey()]
  );
  const map = new Map(rows.map((row) => [row.date, row]));
  return Array.from({ length: days }, (_, index) => {
    const date = addDays(start, index);
    const found = map.get(date);
    return {
      date,
      calories: Number(found?.calories || 0),
      protein: Number(found?.protein || 0),
      carbs: Number(found?.carbs || 0),
      fat: Number(found?.fat || 0),
    };
  });
}

export async function mealsHistory(userId, limit = 14) {
  const db = await dbHandle();
  return db.getAllAsync(
    `SELECT ml.date, ml.meal_type, COUNT(li.id) AS items,
            COALESCE(SUM(li.calories), 0) AS calories
       FROM meal_logs ml LEFT JOIN meal_log_items li ON li.meal_log_id = ml.id
      WHERE ml.user_id = ?
      GROUP BY ml.id
      ORDER BY ml.date DESC, ml.id DESC
      LIMIT ?`,
    [userId, limit]
  );
}
