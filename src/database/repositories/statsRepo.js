import { getDatabase } from '../db';
import { lastNDates, todayKey, weekDates } from '../../utils/date';
import { getDayTotals, dailyNutritionSeries } from './mealsRepo';
import { getDaySupplementTotals, supplementSpending } from './supplementsRepo';
import { getStepsForDate, stepsSeries } from './stepsRepo';
import { getWaterForDate, waterSeries } from './waterRepo';
import { getLatestWeight, weightsSeries } from './weightsRepo';
import { todayScheduledPlan, workoutStats, workoutsByDate } from './workoutsRepo';
import { spendingSummary } from './budgetRepo';

export async function dashboardData(userId) {
  const today = todayKey();
  const [foodTotals, supplementTotals, water, steps, weight, workout, plan, budget] = await Promise.all([
    getDayTotals(userId, today),
    getDaySupplementTotals(userId, today),
    getWaterForDate(userId, today),
    getStepsForDate(userId, today),
    getLatestWeight(userId),
    workoutStats(userId),
    todayScheduledPlan(userId),
    spendingSummary(userId),
  ]);
  const days = lastNDates(7);
  const [nutritionWeek, stepsWeek, workoutsWeek, waterWeek] = await Promise.all([
    dailyNutritionSeries(userId, 7),
    stepsSeries(userId, 7),
    workoutsByDate(userId, weekDates()),
    waterSeries(userId, days),
  ]);
  return {
    date: today,
    foodTotals,
    supplementTotals,
    totals: {
      calories: foodTotals.calories + supplementTotals.calories,
      protein: foodTotals.protein + supplementTotals.protein,
      carbs: foodTotals.carbs + supplementTotals.carbs,
      fat: foodTotals.fat + supplementTotals.fat,
      fiber: foodTotals.fiber,
    },
    water,
    steps: steps || { steps: 0, goal: 0, source: null },
    weight,
    workout,
    plan,
    budget,
    week: { nutrition: nutritionWeek, steps: stepsWeek, workouts: workoutsWeek, water: waterWeek },
  };
}

export async function statisticsData(userId, days = 30) {
  const db = await getDatabase();
  const dates = lastNDates(days);
  const [nutrition, steps, workouts, weights, water, spending, suppSpending] = await Promise.all([
    dailyNutritionSeries(userId, days),
    stepsSeries(userId, days),
    workoutsByDate(userId, dates),
    weightsSeries(userId, days),
    waterSeries(userId, dates),
    spendingSummary(userId),
    supplementSpending(userId),
  ]);
  const mealDays = await db.getFirstAsync(
    `SELECT COUNT(DISTINCT date) AS total FROM meal_logs WHERE user_id = ? AND date >= ?`,
    [userId, dates[0]]
  );
  const supplementTotals = await db.getFirstAsync(
    `SELECT COALESCE(SUM(protein),0) AS protein, COALESCE(SUM(calories),0) AS calories
       FROM supplement_logs WHERE user_id = ? AND date >= ?`,
    [userId, dates[0]]
  );
  const avgCalories = nutrition.filter((row) => row.calories > 0);
  const activeStepDays = steps.filter((row) => row.source);
  const consistencyDays = new Set([
    ...nutrition.filter((row) => row.calories > 0).map((row) => row.date),
    ...workouts.filter((row) => row.count > 0).map((row) => row.date),
    ...steps.filter((row) => row.source).map((row) => row.date),
  ]);
  return {
    days,
    dates,
    nutrition,
    steps,
    workouts,
    weights,
    water,
    spending,
    supplementSpending: suppSpending,
    mealDays: Number(mealDays?.total || 0),
    supplementProtein: Number(supplementTotals?.protein || 0),
    supplementCalories: Number(supplementTotals?.calories || 0),
    avgCalories: avgCalories.length ? avgCalories.reduce((sum, row) => sum + row.calories, 0) / avgCalories.length : 0,
    avgProtein: avgCalories.length ? avgCalories.reduce((sum, row) => sum + row.protein, 0) / avgCalories.length : 0,
    avgSteps: activeStepDays.length ? Math.round(activeStepDays.reduce((sum, row) => sum + row.steps, 0) / activeStepDays.length) : 0,
    workoutCount: workouts.reduce((sum, row) => sum + row.count, 0),
    consistencyDays: consistencyDays.size,
  };
}

export async function sevenDaySummary(userId) {
  const nutrition = await dailyNutritionSeries(userId, 7);
  const steps = await stepsSeries(userId, 7);
  return { nutrition, steps };
}

export async function dataForExport(userId) {
  const db = await getDatabase();
  const tables = [
    'user_preferences',
    'food_items',
    'food_favorites',
    'meal_logs',
    'meal_log_items',
    'recipes',
    'recipe_ingredients',
    'weight_logs',
    'body_measurements',
    'workout_plans',
    'workout_plan_exercises',
    'workout_sessions',
    'workout_exercises',
    'exercise_sets',
    'daily_steps',
    'budget_items',
    'ingredient_prices',
    'shopping_lists',
    'shopping_list_items',
    'supplements',
    'supplement_logs',
    'supplement_purchases',
    'water_logs',
    'reminders',
    'supplement_reminders',
  ];
  const result = { exportado_en: new Date().toISOString(), user_id: userId, tablas: {} };
  for (const table of tables) {
    const columns = await db.getAllAsync(`PRAGMA table_info(${table})`);
    const hasUser = columns.some((column) => column.name === 'user_id');
    if (!hasUser) continue;
    result.tablas[table] = await db.getAllAsync(`SELECT * FROM ${table} WHERE user_id = ?`, [userId]);
  }
  const user = await db.getFirstAsync(
    'SELECT id, email, display_name, auth_provider, created_at, updated_at FROM users WHERE id = ?',
    [userId]
  );
  result.cuenta = user;
  return result;
}

export async function recentActivity(userId, limit = 8) {
  const db = await getDatabase();
  const meals = await db.getAllAsync(
    `SELECT ml.date, ml.meal_type AS label, COUNT(li.id) AS total FROM meal_logs ml
       JOIN meal_log_items li ON li.meal_log_id = ml.id
      WHERE ml.user_id = ? GROUP BY ml.id ORDER BY ml.date DESC, ml.id DESC LIMIT 4`,
    [userId]
  );
  const workouts = await db.getAllAsync(
    `SELECT date, COALESCE(plan_id, 'Entrenamiento') AS label, status FROM workout_sessions
      WHERE user_id = ? ORDER BY date DESC, id DESC LIMIT 3`,
    [userId]
  );
  const supplements = await db.getAllAsync(
    `SELECT date, supplement_name AS label, servings FROM supplement_logs
      WHERE user_id = ? ORDER BY date DESC, id DESC LIMIT 3`,
    [userId]
  );
  return { meals, workouts, supplements };
}
