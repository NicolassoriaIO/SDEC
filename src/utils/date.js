export function pad2(value) {
  return String(value).padStart(2, '0');
}

export function toDateKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function todayKey() {
  return toDateKey(new Date());
}

export function parseDateKey(key) {
  if (!key) return null;
  const [y, m, d] = String(key).split('-').map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d, 12, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function addDays(dateKey, amount) {
  const date = parseDateKey(dateKey) || new Date();
  date.setDate(date.getDate() + amount);
  return toDateKey(date);
}

export function startOfWeek(dateKey = todayKey()) {
  const date = parseDateKey(dateKey) || new Date();
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return toDateKey(date);
}

export function weekDates(dateKey = todayKey()) {
  const start = startOfWeek(dateKey);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function lastNDates(n, endKey = todayKey()) {
  return Array.from({ length: n }, (_, i) => addDays(endKey, -(n - 1 - i)));
}

export function formatDateEs(dateKey, options = {}) {
  const date = typeof dateKey === 'string' ? parseDateKey(dateKey) : dateKey;
  if (!date) return '';
  return date.toLocaleDateString('es-ES', {
    weekday: options.weekday || undefined,
    day: 'numeric',
    month: options.month || 'long',
    year: options.year || undefined,
  });
}

export function formatDateShort(dateKey) {
  const date = typeof dateKey === 'string' ? parseDateKey(dateKey) : dateKey;
  if (!date) return '';
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
}

export function weekdayShort(dateKey) {
  const date = typeof dateKey === 'string' ? parseDateKey(dateKey) : dateKey;
  if (!date) return '';
  return date.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '');
}

export function weekdayLong(dateKey) {
  const date = typeof dateKey === 'string' ? parseDateKey(dateKey) : dateKey;
  if (!date) return '';
  return date.toLocaleDateString('es-ES', { weekday: 'long' });
}

export function isToday(dateKey) {
  return dateKey === todayKey();
}

export function nowTime() {
  const now = new Date();
  return `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
}

export function dateTimeLabel(dateKey) {
  return formatDateEs(dateKey, { weekday: 'long', year: 'numeric' });
}

export function ageFromBirthDate(birthDate, reference = new Date()) {
  const date = parseDateKey(birthDate);
  if (!date) return null;
  let age = reference.getFullYear() - date.getFullYear();
  const beforeBirthday =
    reference.getMonth() < date.getMonth() ||
    (reference.getMonth() === date.getMonth() && reference.getDate() < date.getDate());
  if (beforeBirthday) age -= 1;
  if (age < 0 || age > 120) return null;
  return age;
}

export function daysBetween(startKey, endKey) {
  const start = parseDateKey(startKey);
  const end = parseDateKey(endKey);
  if (!start || !end) return 0;
  return Math.round((end - start) / 86400000);
}

export function monthStartKey(dateKey = todayKey()) {
  const date = parseDateKey(dateKey) || new Date();
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-01`;
}
