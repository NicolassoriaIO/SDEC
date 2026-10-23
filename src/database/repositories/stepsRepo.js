import { getDatabase } from '../db';
import { todayKey, lastNDates } from '../../utils/date';

export async function getStepsForDate(userId, date = todayKey()) {
  const db = await getDatabase();
  return db.getFirstAsync('SELECT * FROM daily_steps WHERE user_id = ? AND date = ?', [userId, date]);
}

export async function upsertSteps(userId, { date, steps, goal, source = 'manual' }) {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO daily_steps (user_id, date, steps, goal, source)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id, date) DO UPDATE SET
       steps = excluded.steps,
       goal = excluded.goal,
       source = excluded.source`,
    [userId, date || todayKey(), Math.max(0, Math.round(steps || 0)), Math.max(0, Math.round(goal || 0)), source]
  );
  return getStepsForDate(userId, date || todayKey());
}

export async function stepsSeries(userId, days = 30) {
  const db = await getDatabase();
  const dates = lastNDates(days);
  const rows = await db.getAllAsync(
    `SELECT * FROM daily_steps WHERE user_id = ? AND date >= ? ORDER BY date ASC`,
    [userId, dates[0]]
  );
  const map = new Map(rows.map((row) => [row.date, row]));
  return dates.map((date) => map.get(date) || { date, steps: 0, goal: 0, source: null });
}

export async function stepsSummary(userId, days = 7) {
  const rows = await stepsSeries(userId, days);
  const withData = rows.filter((row) => row.source);
  const total = withData.reduce((sum, row) => sum + Number(row.steps || 0), 0);
  return {
    rows,
    total,
    average: withData.length ? Math.round(total / withData.length) : 0,
    daysWithData: withData.length,
    goalMet: withData.filter((row) => row.steps >= row.goal && row.goal > 0).length,
  };
}
