import { getDatabase, nowISO } from '../db';
import { DEFAULT_PROFILE } from '../../constants';

const PREF_FIELDS = [
  'birth_date',
  'sex',
  'height_cm',
  'activity_level',
  'experience_level',
  'training_days',
  'goal',
  'weekly_budget',
  'currency',
  'region',
  'dietary_preferences',
  'allergies',
  'available_foods',
  'meals_per_day',
  'step_goal',
  'water_goal_ml',
  'deficit_percent',
  'protein_per_kg',
  'target_weight_kg',
  'supplements_enabled',
  'theme',
  'units',
  'health_notes',
  'onboarded',
];

export async function createProfile(userId, { email, displayName }) {
  const db = await getDatabase();
  const now = nowISO();
  await db.runAsync(
    `INSERT OR IGNORE INTO user_preferences
      (user_id, birth_date, sex, height_cm, activity_level, experience_level, training_days, goal,
       currency, meals_per_day, step_goal, water_goal_ml, deficit_percent, protein_per_kg,
       supplements_enabled, theme, units, health_notes, onboarded, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    [
      userId,
      DEFAULT_PROFILE.birth_date || null,
      DEFAULT_PROFILE.sex,
      DEFAULT_PROFILE.height_cm,
      DEFAULT_PROFILE.activity_level,
      DEFAULT_PROFILE.experience_level,
      DEFAULT_PROFILE.training_days,
      DEFAULT_PROFILE.goal,
      DEFAULT_PROFILE.currency,
      DEFAULT_PROFILE.meals_per_day,
      DEFAULT_PROFILE.step_goal,
      DEFAULT_PROFILE.water_goal_ml,
      DEFAULT_PROFILE.deficit_percent,
      DEFAULT_PROFILE.protein_per_kg,
      DEFAULT_PROFILE.supplements_enabled,
      DEFAULT_PROFILE.theme,
      DEFAULT_PROFILE.units,
      DEFAULT_PROFILE.health_notes || '',
      now,
      now,
    ]
  );
  if (displayName) {
    await db.runAsync('UPDATE users SET display_name = ?, updated_at = ? WHERE id = ?', [displayName, now, userId]);
  }
  return getProfile(userId);
}

export async function getProfile(userId) {
  if (!userId) return null;
  const db = await getDatabase();
  const row = await db.getFirstAsync(
    `SELECT u.id AS user_id, u.email, u.display_name, u.auth_provider, u.created_at AS account_created_at,
            p.*
       FROM users u
       LEFT JOIN user_preferences p ON p.user_id = u.id
      WHERE u.id = ?`,
    [userId]
  );
  if (!row) return null;
  return {
    ...row,
    ...Object.fromEntries(PREF_FIELDS.map((field) => [field, row[field] ?? DEFAULT_PROFILE[field]])),
  };
}

export async function updateProfile(userId, changes) {
  const db = await getDatabase();
  const now = nowISO();
  if (Object.prototype.hasOwnProperty.call(changes, 'display_name')) {
    await db.runAsync('UPDATE users SET display_name = ?, updated_at = ? WHERE id = ?', [
      String(changes.display_name || '').trim(),
      now,
      userId,
    ]);
  }
  const fields = PREF_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(changes, field));
  if (fields.length) {
    const values = fields.map((field) => {
      const value = changes[field];
      if (value === '' || value === undefined) return null;
      return value;
    });
    values.push(now, userId);
    await db.runAsync(
      `UPDATE user_preferences SET ${fields.map((field) => `${field} = ?`).join(', ')}, updated_at = ? WHERE user_id = ?`,
      values
    );
  }
  return getProfile(userId);
}

export async function completeOnboarding(userId) {
  return updateProfile(userId, { onboarded: 1 });
}

export async function updateEmail(userId, email) {
  const db = await getDatabase();
  await db.runAsync('UPDATE users SET email = ?, updated_at = ? WHERE id = ?', [email, nowISO(), userId]);
}

export async function getUsersCount() {
  const db = await getDatabase();
  const row = await db.getFirstAsync('SELECT COUNT(*) AS total FROM users');
  return Number(row?.total || 0);
}
