import { parseNumber } from './numbers';

export function pricePerGram({ price, packageGrams }) {
  const p = parseNumber(price, 0);
  const grams = parseNumber(packageGrams, 0);
  if (p <= 0 || grams <= 0) return null;
  return p / grams;
}

export function proportionalCost({ price, packageGrams, grams }) {
  const unitCost = pricePerGram({ price, packageGrams });
  if (unitCost === null) return null;
  return unitCost * parseNumber(grams, 0);
}

export function costPerServing({ packagePrice, servingsPerPackage }) {
  const price = parseNumber(packagePrice, 0);
  const servings = parseNumber(servingsPerPackage, 0);
  if (price <= 0 || servings <= 0) return null;
  return price / servings;
}

export function supplementEconomics({
  price,
  containerSize,
  servingSize,
  servingsPerDay = 1,
  remaining,
  remainingUnit = 'g',
}) {
  const packagePrice = parseNumber(price, 0);
  const container = parseNumber(containerSize, 0);
  const serving = parseNumber(servingSize, 0);
  const daily = parseNumber(servingsPerDay, 1) || 1;
  const perGram = container > 0 && packagePrice > 0 ? packagePrice / container : null;
  const perServing = perGram !== null && serving > 0 ? perGram * serving : null;
  const dailyCost = perServing !== null ? perServing * daily : null;
  const remainingAmount = parseNumber(remaining, 0) * (remainingUnit === 'kg' ? 1000 : 1);
  const containerGrams = container * (remainingUnit === 'kg' ? 1000 : 1);
  const daysLeft = serving > 0 && remainingAmount > 0 ? Math.floor(remainingAmount / (serving * daily)) : null;
  return {
    perGram,
    perServing,
    dailyCost,
    weeklyCost: dailyCost !== null ? dailyCost * 7 : null,
    monthlyCost: dailyCost !== null ? dailyCost * 30 : null,
    daysLeft,
    remainingPercent: containerGrams > 0 ? Math.min(100, Math.max(0, (remainingAmount / containerGrams) * 100)) : 0,
  };
}

export function shoppingListTotal(items) {
  return (items || []).reduce((total, item) => {
    if (item.estimated_cost !== null && item.estimated_cost !== undefined) {
      return total + parseNumber(item.estimated_cost, 0);
    }
    return total;
  }, 0);
}
