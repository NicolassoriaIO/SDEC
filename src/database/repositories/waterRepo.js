import { getDatabase, nowISO } from '../db';
import { todayKey } from '../../utils/date';

export async function addWater(userId, ml, date = todayKey()) {
  const db = await getDatabase();
  await db.runAsync('INSERT INTO water_logs (user_id, date, ml, created_at) VALUES (?, ?, ?, ?)', [
    userId,
    date,
    ml,
    nowISO(),
  ]);
}

export async function getWaterForDate(userId, date = todayKey()) {
  const db = await getDatabase();
  const row = await db.getFirstAsync(
    'SELECT COALESCE(SUM(ml), 0) AS total FROM water_logs WHERE user_id = ? AND date = ?',
    [userId, date]
  );
  return Number(row?.total || 0);
}

export async function waterSeries(userId, dates) {
  const db = await getDatabase();
  if (!dates?.length) return [];
  const rows = await db.getAllAsync(
    `SELECT date, SUM(ml) AS total FROM water_logs
      WHERE user_id = ? AND date >= ? AND date <= ?
      GROUP BY date ORDER BY date ASC`,
    [userId, dates[0], dates[dates.length - 1]]
  );
  const map = new Map(rows.map((row) => [row.date, Number(row.total)]));
  return dates.map((date) => ({ date, ml: map.get(date) || 0 }));
}
