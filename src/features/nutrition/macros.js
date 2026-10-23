import { parseNumber } from '../../utils/numbers';

export function macroFromAmount(food, grams) {
  const factor = (parseNumber(grams, 0) || 0) / 100;
  return {
    calories: (parseNumber(food.calories_per_100, 0) * factor) || 0,
    protein: (parseNumber(food.protein_per_100, 0) * factor) || 0,
    carbs: (parseNumber(food.carbs_per_100, 0) * factor) || 0,
    fat: (parseNumber(food.fat_per_100, 0) * factor) || 0,
    fiber: (parseNumber(food.fiber_per_100, 0) * factor) || 0,
  };
}

export function sumMacros(items) {
  return (items || []).reduce(
    (totals, item) => ({
      calories: totals.calories + parseNumber(item.calories, 0),
      protein: totals.protein + parseNumber(item.protein, 0),
      carbs: totals.carbs + parseNumber(item.carbs, 0),
      fat: totals.fat + parseNumber(item.fat, 0),
      fiber: totals.fiber + parseNumber(item.fiber, 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );
}

export function remainingMacros(planMacros, consumed) {
  if (!planMacros) return null;
  return {
    calories: Math.max(0, parseNumber(planMacros.calories, 0) - parseNumber(consumed?.calories, 0)),
  };
}
