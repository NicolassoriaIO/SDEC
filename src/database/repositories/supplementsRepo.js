import * as Crypto from 'expo-crypto';
import { getDatabase, nowISO } from '../db';
import { todayKey, nowTime } from '../../utils/date';

export async function listSupplements(userId) {
  const db = await getDatabase();
  return db.getAllAsync('SELECT * FROM supplements WHERE user_id = ? ORDER BY name COLLATE NOCASE ASC', [userId]);
}

export async function getSupplement(userId, id) {
  const db = await getDatabase();
  return db.getFirstAsync('SELECT * FROM supplements WHERE id = ? AND user_id = ?', [id, userId]);
}

export async function createSupplement(userId, data) {
  const db = await getDatabase();
  const id = `supp_${Crypto.randomUUID()}`;
  const now = nowISO();
  await db.runAsync(
    `INSERT INTO supplements
      (id, user_id, name, type, brand, presentation, container_size, container_unit, price, purchase_date,
       opened_date, remaining, serving_size, serving_unit, calories, protein, carbs, fat, ingredients, warnings,
       expiry_date, source, notes, servings_per_day, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      userId,
      data.name,
      data.type || 'otro',
      data.brand || null,
      data.presentation || null,
      data.container_size ?? null,
      data.container_unit || 'g',
      data.price ?? null,
      data.purchase_date || null,
      data.opened_date || null,
      data.remaining ?? data.container_size ?? null,
      data.serving_size ?? null,
      data.serving_unit || 'g',
      Number(data.calories) || 0,
      Number(data.protein) || 0,
      Number(data.carbs) || 0,
      Number(data.fat) || 0,
      data.ingredients || null,
      data.warnings || null,
      data.expiry_date || null,
      data.source || null,
      data.notes || null,
      Number(data.servings_per_day) || 1,
      now,
      now,
    ]
  );
  return getSupplement(userId, id);
}

const UPDATE_FIELDS = [
  'name', 'type', 'brand', 'presentation', 'container_size', 'container_unit', 'price', 'purchase_date',
  'opened_date', 'remaining', 'serving_size', 'serving_unit', 'calories', 'protein', 'carbs', 'fat',
  'ingredients', 'warnings', 'expiry_date', 'source', 'notes', 'servings_per_day',
];

export async function updateSupplement(userId, id, changes) {
  const db = await getDatabase();
  const fields = UPDATE_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(changes, field));
  if (!fields.length) return getSupplement(userId, id);
  await db.runAsync(
    `UPDATE supplements SET ${fields.map((field) => `${field} = ?`).join(', ')}, updated_at = ? WHERE id = ? AND user_id = ?`,
    [...fields.map((field) => changes[field]), nowISO(), id, userId]
  );
  return getSupplement(userId, id);
}

export async function deleteSupplement(userId, id) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM supplements WHERE id = ? AND user_id = ?', [id, userId]);
}

export async function logSupplement(userId, supplement, { servings = 1, date = todayKey(), time = nowTime(), notes }) {
  const db = await getDatabase();
  const amount = Number(servings) || 1;
  const calories = Number(supplement.calories || 0) * amount;
  const protein = Number(supplement.protein || 0) * amount;
  const carbs = Number(supplement.carbs || 0) * amount;
  const fat = Number(supplement.fat || 0) * amount;
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO supplement_logs
        (user_id, supplement_id, supplement_name, date, time, servings, calories, protein, carbs, fat, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, supplement.id, supplement.name, date, time || null, amount, calories, protein, carbs, fat, notes || null, nowISO()]
    );
    if (supplement.remaining !== null && supplement.remaining !== undefined && supplement.serving_size) {
      const newRemaining = Math.max(0, Number(supplement.remaining) - Number(supplement.serving_size) * amount);
      await db.runAsync('UPDATE supplements SET remaining = ?, updated_at = ? WHERE id = ?', [newRemaining, nowISO(), supplement.id]);
    }
  });
}

export async function deleteSupplementLog(userId, logId) {
  const db = await getDatabase();
  const log = await db.getFirstAsync('SELECT * FROM supplement_logs WHERE id = ? AND user_id = ?', [logId, userId]);
  if (!log) return;
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM supplement_logs WHERE id = ?', [logId]);
    if (log.supplement_id) {
      const supplement = await db.getFirstAsync('SELECT * FROM supplements WHERE id = ? AND user_id = ?', [log.supplement_id, userId]);
      if (supplement && supplement.remaining !== null && supplement.serving_size) {
        await db.runAsync('UPDATE supplements SET remaining = ?, updated_at = ? WHERE id = ?', [
          Number(supplement.remaining) + Number(supplement.serving_size) * Number(log.servings),
          nowISO(),
          supplement.id,
        ]);
      }
    }
  });
}

export async function getDaySupplementTotals(userId, date = todayKey()) {
  const db = await getDatabase();
  const totals = await db.getFirstAsync(
    `SELECT COALESCE(SUM(calories), 0) AS calories, COALESCE(SUM(protein), 0) AS protein,
            COALESCE(SUM(carbs), 0) AS carbs, COALESCE(SUM(fat), 0) AS fat
       FROM supplement_logs WHERE user_id = ? AND date = ?`,
    [userId, date]
  );
  const logs = await db.getAllAsync(
    'SELECT * FROM supplement_logs WHERE user_id = ? AND date = ? ORDER BY time ASC, id ASC',
    [userId, date]
  );
  return {
    calories: Number(totals?.calories || 0),
    protein: Number(totals?.protein || 0),
    carbs: Number(totals?.carbs || 0),
    fat: Number(totals?.fat || 0),
    logs,
  };
}

export async function supplementHistory(userId, limit = 60) {
  const db = await getDatabase();
  return db.getAllAsync(
    'SELECT * FROM supplement_logs WHERE user_id = ? ORDER BY date DESC, id DESC LIMIT ?',
    [userId, limit]
  );
}

export async function addPurchase(userId, { supplementId, date, price, quantity, notes }) {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'INSERT INTO supplement_purchases (user_id, supplement_id, date, price, quantity, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, supplementId || null, date || todayKey(), Number(price) || 0, quantity ?? null, notes || null]
    );
    if (supplementId && quantity) {
      const supplement = await db.getFirstAsync('SELECT * FROM supplements WHERE id = ? AND user_id = ?', [supplementId, userId]);
      if (supplement) {
        const current = supplement.remaining === null ? 0 : Number(supplement.remaining);
        await db.runAsync('UPDATE supplements SET remaining = ?, price = ?, purchase_date = ?, updated_at = ? WHERE id = ?', [
          current + Number(quantity),
          Number(price) || supplement.price,
          date || todayKey(),
          nowISO(),
          supplementId,
        ]);
      }
    }
  });
}

export async function supplementSpending(userId) {
  const db = await getDatabase();
  const month = await db.getFirstAsync(
    `SELECT COALESCE(SUM(price), 0) AS total FROM supplement_purchases
      WHERE user_id = ? AND substr(date, 1, 7) = substr(?, 1, 7)`,
    [userId, todayKey()]
  );
  const all = await db.getFirstAsync('SELECT COALESCE(SUM(price), 0) AS total FROM supplement_purchases WHERE user_id = ?', [userId]);
  const logs = await db.getFirstAsync(
    'SELECT COUNT(*) AS total FROM supplement_logs WHERE user_id = ? AND date = ?',
    [userId, todayKey()]
  );
  return {
    month: Number(month?.total || 0),
    total: Number(all?.total || 0),
    logsToday: Number(logs?.total || 0),
  };
}

export async function purchases(userId, limit = 30) {
  const db = await getDatabase();
  return db.getAllAsync(
    `SELECT sp.*, s.name AS supplement_name FROM supplement_purchases sp
     LEFT JOIN supplements s ON s.id = sp.supplement_id
     WHERE sp.user_id = ? ORDER BY sp.date DESC, sp.id DESC LIMIT ?`,
    [userId, limit]
  );
}
