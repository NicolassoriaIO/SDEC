export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || '').trim());
}

export function passwordIssues(password) {
  const value = String(password || '');
  const issues = [];
  if (value.length < 8) issues.push('Debe tener al menos 8 caracteres.');
  if (!/[A-Za-z]/.test(value)) issues.push('Debe incluir al menos una letra.');
  if (!/[0-9]/.test(value)) issues.push('Debe incluir al menos un número.');
  return issues;
}

export function validateRegistration({ name, email, password, confirmPassword }) {
  const errors = {};
  if (!String(name || '').trim() || String(name).trim().length < 2) {
    errors.name = 'Escribe un nombre de al menos 2 caracteres.';
  }
  if (!isEmail(email)) errors.email = 'Introduce un correo electrónico válido.';
  const issues = passwordIssues(password);
  if (issues.length) errors.password = issues.join(' ');
  if (password !== confirmPassword) errors.confirmPassword = 'Las contraseñas no coinciden.';
  return errors;
}

export function validateLogin({ email, password }) {
  const errors = {};
  if (!isEmail(email)) errors.email = 'Introduce un correo electrónico válido.';
  if (!password) errors.password = 'Introduce tu contraseña.';
  return errors;
}

export function required(value, message = 'Este campo es obligatorio.') {
  if (value === null || value === undefined || String(value).trim() === '') return message;
  return null;
}

export function numericRange(value, { min, max, label = 'El valor', optional = false } = {}) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return optional ? null : 'Introduce un valor.';
  }
  const n = Number(String(value).replace(',', '.'));
  if (!Number.isFinite(n)) return `${label} debe ser numérico.`;
  if (min !== undefined && n < min) return `${label} debe ser al menos ${min}.`;
  if (max !== undefined && n > max) return `${label} no debe superar ${max}.`;
  return null;
}

export function validateProfile(profile) {
  const errors = {};
  if (!String(profile.birth_date || '').match(/^\d{4}-\d{2}-\d{2}$/)) {
    errors.birth_date = 'Introduce una fecha de nacimiento con formato AAAA-MM-DD.';
  }
  const heightError = numericRange(profile.height_cm, { min: 100, max: 250, label: 'La estatura' });
  if (heightError) errors.height_cm = heightError;
  if (profile.target_weight_kg) {
    const targetError = numericRange(profile.target_weight_kg, { min: 35, max: 300, label: 'El peso objetivo', optional: true });
    if (targetError) errors.target_weight_kg = targetError;
  }
  if (profile.meals_per_day && (profile.meals_per_day < 1 || profile.meals_per_day > 8)) {
    errors.meals_per_day = 'Elige entre 1 y 8 comidas al día.';
  }
  return errors;
}

export function sanitizeText(value, maxLength = 500) {
  return String(value || '').trim().slice(0, maxLength);
}
