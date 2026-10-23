import * as Crypto from 'expo-crypto';
import { getDatabase, nowISO } from '../db';
import { startOfWeek, todayKey } from '../../utils/date';

function parseSchedule(value) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function listPlans(userId) {
  const db = await getDatabase();
  const plans = await db.getAllAsync(
    `SELECT p.*, (SELECT COUNT(*) FROM workout_plan_exercises e WHERE e.plan_id = p.id) AS exercise_count
       FROM workout_plans p
      WHERE p.user_id IS NULL OR p.user_id = ?
      ORDER BY p.is_template DESC, p.name COLLATE NOCASE ASC`,
    [userId]
  );
  return plans.map((plan) => ({ ...plan, schedule: parseSchedule(plan.schedule) }));
}

export async function getPlan(userId, planId) {
  const db = await getDatabase();
  const plan = await db.getFirstAsync(
    'SELECT * FROM workout_plans WHERE id = ? AND (user_id IS NULL OR user_id = ?)',
    [planId, userId]
  );
  if (!plan) return null;
  const exercises = await db.getAllAsync(
    'SELECT * FROM workout_plan_exercises WHERE plan_id = ? ORDER BY order_index ASC, id ASC',
    [planId]
  );
  return { ...plan, schedule: parseSchedule(plan.schedule), exercises };
}

export async function createPlan(userId, data) {
  const db = await getDatabase();
  const id = `plan_${Crypto.randomUUID()}`;
  const now = nowISO();
  await db.runAsync(
    `INSERT INTO workout_plans (id, user_id, name, level, schedule, notes, is_template, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    [id, userId, data.name, data.level || 'principiante', JSON.stringify(data.schedule || []), data.notes || null, now, now]
  );
  for (const [index, exercise] of (data.exercises || []).entries()) {
    await db.runAsync(
      'INSERT INTO workout_plan_exercises (plan_id, name, target_sets, target_reps, order_index) VALUES (?, ?, ?, ?, ?)',
      [id, exercise.name, Number(exercise.target_sets) || 3, exercise.target_reps || '8-12', index]
    );
  }
  return getPlan(userId, id);
}

export async function updatePlan(userId, planId, data) {
  const db = await getDatabase();
  const plan = await db.getFirstAsync('SELECT * FROM workout_plans WHERE id = ? AND user_id = ?', [planId, userId]);
  if (!plan) throw new Error('Solo puedes editar tus propias rutinas.');
  await db.runAsync(
    'UPDATE workout_plans SET name = ?, level = ?, schedule = ?, notes = ?, updated_at = ? WHERE id = ?',
    [data.name, data.level || plan.level, JSON.stringify(data.schedule || []), data.notes || null, nowISO(), planId]
  );
}

export async function deletePlan(userId, planId) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM workout_plans WHERE id = ? AND user_id = ?', [planId, userId]);
}

export async function addPlanExercise(userId, planId, exercise) {
  const db = await getDatabase();
  const plan = await db.getFirstAsync('SELECT * FROM workout_plans WHERE id = ? AND user_id = ?', [planId, userId]);
  if (!plan) throw new Error('Solo puedes modificar tus propias rutinas.');
  const max = await db.getFirstAsync('SELECT COALESCE(MAX(order_index), 0) AS max_index FROM workout_plan_exercises WHERE plan_id = ?', [planId]);
  await db.runAsync(
    'INSERT INTO workout_plan_exercises (plan_id, name, target_sets, target_reps, order_index) VALUES (?, ?, ?, ?, ?)',
    [planId, exercise.name, Number(exercise.target_sets) || 3, exercise.target_reps || '8-12', Number(max?.max_index || 0) + 1]
  );
}

export async function deletePlanExercise(userId, exerciseId) {
  const db = await getDatabase();
  await db.runAsync(
    `DELETE FROM workout_plan_exercises
      WHERE id = ? AND plan_id IN (SELECT id FROM workout_plans WHERE user_id = ?)`,
    [exerciseId, userId]
  );
}

export async function clonePlan(userId, planId) {
  const plan = await getPlan(userId, planId);
  if (!plan) throw new Error('Rutina no encontrada.');
  return createPlan(userId, {
    name: `${plan.name} (copia)`,
    level: plan.level,
    schedule: plan.schedule,
    notes: plan.notes,
    exercises: plan.exercises.map((exercise) => ({
      name: exercise.name,
      target_sets: exercise.target_sets,
      target_reps: exercise.target_reps,
    })),
  });
}

export async function listSessions(userId, limit = 50) {
  const db = await getDatabase();
  return db.getAllAsync(
    `SELECT s.*, p.name AS plan_name,
            (SELECT COUNT(*) FROM workout_exercises e WHERE e.session_id = s.id) AS exercise_count
       FROM workout_sessions s LEFT JOIN workout_plans p ON p.id = s.plan_id
      WHERE s.user_id = ?
      ORDER BY s.date DESC, s.id DESC LIMIT ?`,
    [userId, limit]
  );
}

export async function getSession(userId, sessionId) {
  const db = await getDatabase();
  const session = await db.getFirstAsync(
    `SELECT s.*, p.name AS plan_name FROM workout_sessions s
     LEFT JOIN workout_plans p ON p.id = s.plan_id WHERE s.id = ? AND s.user_id = ?`,
    [sessionId, userId]
  );
  if (!session) return null;
  const exercises = await db.getAllAsync('SELECT * FROM workout_exercises WHERE session_id = ? ORDER BY order_index ASC, id ASC', [sessionId]);
  const sets = await db.getAllAsync(
    `SELECT es.* FROM exercise_sets es JOIN workout_exercises we ON we.id = es.workout_exercise_id
      WHERE we.session_id = ? ORDER BY es.set_number ASC, es.id ASC`,
    [sessionId]
  );
  return {
    ...session,
    exercises: exercises.map((exercise) => ({
      ...exercise,
      sets: sets.filter((set) => set.workout_exercise_id === exercise.id),
    })),
  };
}

export async function startSession(userId, planId, date = todayKey()) {
  const db = await getDatabase();
  const active = await db.getFirstAsync(
    "SELECT * FROM workout_sessions WHERE user_id = ? AND date = ? AND status = 'en_progreso' ORDER BY id DESC LIMIT 1",
    [userId, date]
  );
  if (active) return { ...(await getSession(userId, active.id)), existing: true };
  const plan = planId ? await getPlan(userId, planId) : null;
  const now = nowISO();
  await db.runAsync(
    'INSERT INTO workout_sessions (user_id, plan_id, date, duration_min, status, notes, created_at) VALUES (?, ?, ?, NULL, ?, NULL, ?)',
    [userId, planId || null, date, 'en_progreso', now]
  );
  const session = await db.getFirstAsync(
    "SELECT * FROM workout_sessions WHERE user_id = ? AND date = ? AND status = 'en_progreso' ORDER BY id DESC LIMIT 1",
    [userId, date]
  );
  if (plan) {
    for (const [index, exercise] of plan.exercises.entries()) {
      await db.runAsync(
        'INSERT INTO workout_exercises (session_id, name, order_index, notes) VALUES (?, ?, ?, ?)',
        [session.id, exercise.name, index, `Objetivo: ${exercise.target_sets} × ${exercise.target_reps}`]
      );
    }
  }
  return { ...(await getSession(userId, session.id)), existing: false };
}

export async function quickAttendance(userId, planId, date = todayKey()) {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT INTO workout_sessions (user_id, plan_id, date, duration_min, status, notes, created_at) VALUES (?, ?, ?, NULL, ?, ?, ?)',
    [userId, planId || null, date, 'completado', 'Asistencia registrada', nowISO()]
  );
}

export async function addSessionExercise(userId, sessionId, name) {
  const db = await getDatabase();
  const session = await db.getFirstAsync('SELECT * FROM workout_sessions WHERE id = ? AND user_id = ?', [sessionId, userId]);
  if (!session) throw new Error('Sesión no encontrada.');
  const max = await db.getFirstAsync('SELECT COALESCE(MAX(order_index), 0) AS max_index FROM workout_exercises WHERE session_id = ?', [sessionId]);
  await db.runAsync('INSERT INTO workout_exercises (session_id, name, order_index) VALUES (?, ?, ?)', [
    sessionId,
    name,
    Number(max?.max_index || 0) + 1,
  ]);
}

export async function deleteSessionExercise(userId, exerciseId) {
  const db = await getDatabase();
  await db.runAsync(
    `DELETE FROM workout_exercises WHERE id = ? AND session_id IN (SELECT id FROM workout_sessions WHERE user_id = ?)`,
    [exerciseId, userId],
  );
}

export async function addSet(userId, { exerciseId, reps, weightKg, restSec, notes }) {
  const db = await getDatabase();
  const exercise = await db.getFirstAsync(
    `SELECT we.* FROM workout_exercises we JOIN workout_sessions s ON s.id = we.session_id
      WHERE we.id = ? AND s.user_id = ?`,
    [exerciseId, userId]
  );
  if (!exercise) throw new Error('Ejercicio no encontrado.');
  const previous = await db.getFirstAsync('SELECT COALESCE(MAX(set_number), 0) AS max_number FROM exercise_sets WHERE workout_exercise_id = ?', [exerciseId]);
  await db.runAsync(
    'INSERT INTO exercise_sets (workout_exercise_id, set_number, reps, weight_kg, rest_sec, notes) VALUES (?, ?, ?, ?, ?, ?)',
    [exerciseId, Number(previous?.max_number || 0) + 1, Number(reps) || 0, Number(weightKg) || 0, restSec ? Number(restSec) : null, notes || null]
  );
}

export async function deleteSet(userId, setId) {
  const db = await getDatabase();
  await db.runAsync(
    `DELETE FROM exercise_sets
      WHERE id = ? AND workout_exercise_id IN (
        SELECT we.id FROM workout_exercises we JOIN workout_sessions s ON s.id = we.session_id WHERE s.user_id = ?
      )`,
    [setId, userId],
  );
}

export async function completeSession(userId, sessionId, { durationMin, notes }) {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE workout_sessions SET status = 'completado', duration_min = ?, notes = ? WHERE id = ? AND user_id = ?",
    [Number(durationMin) || null, notes || null, sessionId, userId]
  );
}

export async function deleteSession(userId, sessionId) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM workout_sessions WHERE id = ? AND user_id = ?', [sessionId, userId]);
}

export async function workoutStats(userId) {
  const db = await getDatabase();
  const today = todayKey();
  const weekStart = startOfWeek(today);
  const todaySession = await db.getFirstAsync(
    "SELECT * FROM workout_sessions WHERE user_id = ? AND date = ? AND status = 'completado' ORDER BY id DESC LIMIT 1",
    [userId, today]
  );
  const week = await db.getFirstAsync(
    `SELECT COUNT(*) AS total, COALESCE(SUM(duration_min), 0) AS minutes FROM workout_sessions
      WHERE user_id = ? AND date >= ? AND date <= ? AND status = 'completado'`,
    [userId, weekStart, today]
  );
  const month = await db.getFirstAsync(
    `SELECT COUNT(*) AS total FROM workout_sessions
      WHERE user_id = ? AND substr(date, 1, 7) = substr(?, 1, 7) AND status = 'completado'`,
    [userId, today]
  );
  return {
    completedToday: Boolean(todaySession),
    todaySession,
    weekCount: Number(week?.total || 0),
    weekMinutes: Number(week?.minutes || 0),
    monthCount: Number(month?.total || 0),
  };
}

export async function workoutsByDate(userId, dates) {
  const db = await getDatabase();
  if (!dates?.length) return [];
  const rows = await db.getAllAsync(
    `SELECT date, COUNT(*) AS total FROM workout_sessions
      WHERE user_id = ? AND date >= ? AND date <= ? AND status = 'completado'
      GROUP BY date`,
    [userId, dates[0], dates[dates.length - 1]]
  );
  const map = new Map(rows.map((row) => [row.date, Number(row.total)]));
  return dates.map((date) => ({ date, count: map.get(date) || 0 }));
}

export async function exerciseProgress(userId, exerciseName, limit = 12) {
  const db = await getDatabase();
  return db.getAllAsync(
    `SELECT s.date, MAX(es.weight_kg) AS max_weight, MAX(es.reps) AS max_reps
       FROM exercise_sets es
       JOIN workout_exercises we ON we.id = es.workout_exercise_id
       JOIN workout_sessions s ON s.id = we.session_id
      WHERE s.user_id = ? AND we.name = ? AND s.status = 'completado'
      GROUP BY s.id ORDER BY s.date DESC LIMIT ?`,
    [userId, exerciseName, limit]
  );
}

export async function todayScheduledPlan(userId) {
  const plans = await listPlans(userId);
  const weekday = new Date().getDay();
  return plans.find((plan) => parseSchedule(plan.schedule).includes(weekday)) || null;
}
