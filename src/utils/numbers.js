export function parseNumber(value, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value === null || value === undefined) return fallback;
  const normalized = String(value).trim().replace(/\s/g, '').replace(',', '.');
  if (!normalized) return fallback;
  const parsed = Number(normalized.replace(/[^0-9.+-]/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseOptionalNumber(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const parsed = parseNumber(value, NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function round(value, decimals = 0) {
  const factor = 10 ** decimals;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

export function round1(value) {
  return round(value, 1);
}

export function formatNumber(value, decimals = 0) {
  const number = parseNumber(value, 0);
  return number.toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatCurrency(value, currency = 'USD') {
  const number = parseNumber(value, 0);
  try {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency,
      maximumFractionDigits: number < 10 ? 2 : 1,
    }).format(number);
  } catch {
    return `${formatNumber(number, 2)} ${currency}`;
  }
}

export function formatPercent(value, decimals = 0) {
  return `${formatNumber(value, decimals)} %`;
}

export function formatMacro(value) {
  return `${formatNumber(value, 1)} g`;
}

export function sum(items, selector) {
  return (items || []).reduce((total, item) => total + parseNumber(selector(item), 0), 0);
}

export function percentage(part, total) {
  if (!total) return 0;
  return clamp((parseNumber(part, 0) / parseNumber(total, 0)) * 100, 0, 999);
}
