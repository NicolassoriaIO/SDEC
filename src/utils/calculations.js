import { ACTIVITY_LEVELS } from '../constants';
import { clamp, round1 } from './numbers';

export function calculateBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) return null;
  return round1(weightKg / (heightCm / 100) ** 2);
}

export function bmiCategory(bmi) {
  if (bmi === null || bmi === undefined) return 'Sin datos';
  if (bmi < 18.5) return 'Bajo peso';
  if (bmi < 25) return 'Peso normal';
  if (bmi < 30) return 'Sobrepeso';
  return 'Obesidad';
}

export function calculateBMR({ weightKg, heightCm, age, sex = 'no_especificado' }) {
  if (!weightKg || !heightCm || !age) return null;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (sex === 'masculino') return round1(base + 5);
  if (sex === 'femenino') return round1(base - 161);
  return round1(base - 78);
}

export function activityFactor(activityLevel) {
  const found = ACTIVITY_LEVELS.find((level) => level.key === activityLevel);
  return found ? found.factor : 1.375;
}

export function calculateTDEE(bmr, activityLevel = 'ligero') {
  if (!bmr) return null;
  return round1(bmr * activityFactor(activityLevel));
}

export function deficitRange(calories) {
  if (!calories) return { min: 0, max: 0 };
  return {
    min: Math.round((calories * 0.1) / 10) * 10,
    max: Math.round((calories * 0.2) / 10) * 10,
  };
}

export function calorieTarget(maintenance, deficitPercent) {
  if (!maintenance) return null;
  const percent = clamp(Number(deficitPercent) || 0, 0, 30);
  return Math.round((maintenance * (1 - percent / 100)) / 10) * 10;
}

export function calculateMacros({ calories, weightKg, proteinPerKg = 1.8 }) {
  if (!calories || !weightKg) return null;
  const protein = Math.min(weightKg * proteinPerKg, (calories * 0.4) / 4);
  const fat = (calories * 0.25) / 9;
  const carbs = Math.max(0, (calories - protein * 4 - fat * 9) / 4);
  return {
    protein: round1(protein),
    carbs: round1(carbs),
    fat: round1(fat),
    fiber: round1((calories / 1000) * 14),
  };
}

export function estimatedWeeklyChange(maintenance, target) {
  if (!maintenance || !target) return null;
  const dailyDeficit = maintenance - target;
  return {
    dailyDeficit: Math.round(dailyDeficit),
    kgPerWeek: round1((dailyDeficit * 7) / 7700),
    kgPerMonth: round1((dailyDeficit * 30) / 7700),
  };
}

export function buildEnergyPlan({
  weightKg,
  heightCm,
  age,
  sex,
  activityLevel,
  deficitPercent = 15,
  proteinPerKg = 1.8,
  goal = 'perder_grasa',
  healthNotes = '',
}) {
  const bmi = calculateBMI(weightKg, heightCm);
  const bmr = calculateBMR({ weightKg, heightCm, age, sex });
  const maintenance = calculateTDEE(bmr, activityLevel);
  const warnings = [];
  const isMinor = age !== null && age !== undefined && age < 18;
  const hasClinicalNote = Boolean(String(healthNotes || '').trim());
  const maintainOnly = goal === 'mantener' || goal === 'salud';
  const safePercent = maintainOnly ? 0 : clamp(Number(deficitPercent) || 0, 0, 25);

  if (!bmr || !maintenance) {
    warnings.push('Faltan peso, estatura, edad o sexo para estimar el gasto energético.');
  }
  if (isMinor) {
    warnings.push('No generamos un déficit automático para menores de 18 años. Consulta con un profesional sanitario o nutricionista.');
  }
  if (hasClinicalNote) {
    warnings.push('Has indicado embarazo, lactancia o una condición clínica. No se aplica déficit automático; consulta con un profesional cualificado.');
  }
  if (age === null || age === undefined) {
    warnings.push('La edad es necesaria para la ecuación de Mifflin-St Jeor.');
  }
  if (sex === 'no_especificado') {
    warnings.push('Al no indicar sexo se usa un valor intermedio de la ecuación; la estimación es menos precisa.');
  }
  if (safePercent > 20 && !isMinor && !hasClinicalNote) {
    warnings.push('Un déficit superior al 20 % puede ser difícil de sostener. Valora un ritmo más conservador.');
  }

  const applyDeficit = !isMinor && !hasClinicalNote && !maintainOnly;
  const target = maintenance ? (applyDeficit ? calorieTarget(maintenance, safePercent) : Math.round(maintenance)) : null;
  const macros = target ? calculateMacros({ calories: target, weightKg, proteinPerKg }) : null;
  const pace = applyDeficit ? estimatedWeeklyChange(maintenance, target) : null;
  const range = deficitRange(maintenance);

  return {
    bmi,
    bmiLabel: bmiCategory(bmi),
    bmr,
    maintenance,
    target,
    deficitPercent: applyDeficit ? safePercent : 0,
    deficitKcal: target ? Math.max(0, Math.round(maintenance - target)) : 0,
    macros,
    pace,
    range,
    applyDeficit,
    warnings,
    activityFactor: activityFactor(activityLevel),
  };
}

export function waterTarget(weightKg, activityLevel = 'ligero') {
  if (!weightKg) return 2000;
  const base = weightKg * 30;
  const extra = activityLevel === 'activo' || activityLevel === 'muy_activo' ? 500 : 250;
  return Math.round((base + extra) / 50) * 50;
}
