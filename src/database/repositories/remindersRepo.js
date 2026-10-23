import { getDatabase, nowISO } from '../db';

export async function listReminders(userId) {
  const db = await getDatabase();
  const rows = await db.getAllAsync('SELECT * FROM reminders WHERE user_id = ? ORDER BY time ASC', [userId]);
  return rows.map((row) => ({
    ...row,
    days: (() => {
      try {
        const parsed = JSON.parse(row.days || '[]');
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })(),
  }));
}

export async function createReminder(userId, reminder) {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT INTO reminders (user_id, type, title, body, time, days, enabled, notification_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)',
    [
      userId,
      reminder.type || 'otro',
      reminder.title,
      reminder.body || null,
      reminder.time || '09:00',
      JSON.stringify(reminder.days || [1, 2, 3, 4, 5, 6, 0]),
      reminder.enabled === false ? 0 : 1,
      nowISO(),
    ]
  );
  return db.getFirstAsync('SELECT * FROM reminders WHERE user_id = ? ORDER BY id DESC LIMIT 1', [userId]);
}

export async function updateReminder(userId, id, changes) {
  const db = await getDatabase();
  const fields = [];
  const values = [];
  for (const field of ['type', 'title', 'body', 'time', 'enabled', 'notification_id']) {
    if (Object.prototype.hasOwnProperty.call(changes, field)) {
      fields.push(`${field} = ?`);
      values.push(field === 'enabled' ? (changes[field] ? 1 : 0) : changes[field]);
    }
  }
  if (Object.prototype.hasOwnProperty.call(changes, 'days')) {
    fields.push('days = ?');
    values.push(JSON.stringify(changes.days));
  }
  if (!fields.length) return;
  values.push(id, userId);
  await db.runAsync(`UPDATE reminders SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, values);
}

export async function deleteReminder(userId, id) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM reminders WHERE id = ? AND user_id = ?', [id, userId]);
}
