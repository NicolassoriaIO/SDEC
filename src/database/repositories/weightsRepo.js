import { getDatabase, nowISO } from '../db';
import { todayKey } from '../../utils/date';

export async function getLatestWeight(userId) {
  const db = await getDatabase();
  return db.getFirstAsync(
    'SELECT * FROM weight_logs WHERE user_id = ? ORDER BY date DESC, id DESC LIMIT 1',
    [userId]
  );
}

export async function upsertWeight(userId, { date, weightKg, waistCm, notes }) {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO weight_logs (user_id, date, weight_kg, waist_cm, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, date) DO UPDATE SET
       weight_kg = excluded.weight_kg,
       waist_cm = COALESCE(excluded.waist_cm, weight_logs.waist_cm),
       notes = COALESCE(excluded.notes, weight_logs.notes)`,
    [userId, date || todayKey(), weightKg, waistCm ?? null, notes || null, nowISO()]
  );
  return getLatestWeight(userId);
}

export async function listWeights(userId, limit = 180) {
  const db = await getDatabase();
  return db.getAllAsync(
    'SELECT * FROM weight_logs WHERE user_id = ? ORDER BY date DESC LIMIT ?',
    [userId, limit]
  );
}

export async function weightsSeries(userId, days = 90) {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    'SELECT * FROM weight_logs WHERE user_id = ? ORDER BY date ASC',
    [userId]
  );
  if (!days) return rows;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffKey = cutoff.toISOString().slice(0, 10);
  return rows.filter((row) => row.date >= cutoffKey);
}

export async function deleteWeight(userId, id) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM weight_logs WHERE id = ? AND user_id = ?', [id, userId]);
}

export async function saveMeasurement(userId, measurement) {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO body_measurements (user_id, date, waist_cm, chest_cm, hip_cm, arm_cm, thigh_cm, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      measurement.date || todayKey(),
      measurement.waist_cm ?? null,
      measurement.chest_cm ?? null,
      measurement.hip_cm ?? null,
      measurement.arm_cm ?? null,
      measurement.thigh_cm ?? null,
      measurement.notes || null,
      nowISO(),
    ]
  );
}

export async function listMeasurements(userId, limit = 60) {
  const db = await getDatabase();
  return db.getAllAsync(
    'SELECT * FROM body_measurements WHERE user_id = ? ORDER BY date DESC, id DESC LIMIT ?',
    [userId, limit]
  );
}

export async function deleteMeasurement(userId, id) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM body_measurements WHERE id = ? AND user_id = ?', [id, userId]);
}
