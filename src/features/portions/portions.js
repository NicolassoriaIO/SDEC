import { parseNumber } from '../../utils/numbers';

export const QUANTITY_UNITS = [
  { key: 'g', label: 'gramos (g)', base: 'g' },
  { key: 'ml', label: 'mililitros (ml)', base: 'ml' },
  { key: 'unidad', label: 'unidad', base: 'unit' },
  { key: 'rebanada', label: 'rebanada', base: 'unit' },
  { key: 'cucharadita', label: 'cucharadita', base: 'unit' },
  { key: 'cucharada', label: 'cucharada', base: 'unit' },
  { key: 'taza', label: 'taza', base: 'unit' },
  { key: 'vaso', label: 'vaso', base: 'unit' },
  { key: 'palma', label: 'palma de la mano', base: 'visual' },
  { key: 'puno', label: 'puño', base: 'visual' },
  { key: 'mano_ahuecada', label: 'mano ahuecada', base: 'visual' },
  { key: 'pulgar', label: 'pulgar', base: 'visual' },
  { key: 'porcion', label: 'porción', base: 'unit' },
];

export function unitLabel(unit) {
  const found = QUANTITY_UNITS.find((item) => item.key === unit);
  return found ? found.label : unit || 'g';
}

export function findPortion(portions, unit) {
  if (!portions || !unit) return null;
  return portions.find((portion) => portion.unit === unit) || null;
}

export function resolveQuantity({ food, portions = [], quantity, unit = 'g' }) {
  const amount = parseNumber(quantity, 0);
  if (amount <= 0) {
    return { grams: 0, approximate: false, label: '', unit, valid: false };
  }
  if (unit === 'g' || unit === 'ml') {
    return { grams: amount, approximate: false, label: `${amount} ${unit}`, unit, valid: true };
  }
  const portion = findPortion(portions, unit);
  if (!portion || !portion.grams) {
    return {
      grams: null,
      approximate: false,
      label: '',
      unit,
      valid: false,
      message: 'No hay una equivalencia segura para esta medida. Introduce los gramos manualmente.',
    };
  }
  const grams = amount * parseNumber(portion.grams, 0);
  const approximate = Boolean(portion.is_visual) || ['palma', 'puno', 'mano_ahuecada', 'pulgar'].includes(unit);
  return {
    grams,
    approximate,
    label: `${amount} × ${portion.label || unitLabel(unit)}`,
    unit,
    valid: true,
    message: approximate ? 'Cantidad aproximada: puede variar según el tamaño de la porción.' : '',
    portion,
  };
}

export function gramsLabel(food, grams) {
  const unit = food?.base_unit === 'ml' ? 'ml' : 'g';
  return `${Math.round(parseNumber(grams, 0))} ${unit}`;
}

export const VISUAL_PORTIONS = [
  {
    food: 'Pollo o carne cocida',
    visual: 'Palma de la mano',
    grams: '80–120 g',
    note: 'Incluye el grosor de una baraja de cartas. Depende del tamaño de tu mano.',
    icon: 'hand-left-outline',
  },
  {
    food: 'Arroz, pasta o papa cocidos',
    visual: 'Puño cerrado',
    grams: '130–180 g',
    note: 'Un puño suele equivaler a una taza pequeña; el tamaño real varía.',
    icon: 'ellipse-outline',
  },
  {
    food: 'Avena, frutos secos o legumbres secas',
    visual: 'Mano ahuecada',
    grams: '25–40 g',
    note: 'La mano ahuecada es útil para alimentos secos y densos.',
    icon: 'hand-right-outline',
  },
  {
    food: 'Aceite, mantequilla de cacahuete',
    visual: 'Pulgar',
    grams: '10–15 g',
    note: 'Un pulgar de aceite aporta unas 90–130 kcal. Prefiere medir con cuchara si puedes.',
    icon: 'thumbs-up-outline',
  },
  {
    food: 'Verduras cocidas',
    visual: 'Dos manos ahuecadas',
    grams: '75–100 g',
    note: 'Las verduras aportan volumen y fibra con pocas calorías.',
    icon: 'leaf-outline',
  },
  {
    food: 'Frutas',
    visual: 'Puño o unidad mediana',
    grams: '100–150 g',
    note: 'Una pieza mediana suele caber en la palma. Usa el peso cuando quieras precisión.',
    icon: 'nutrition-outline',
  },
];

export const VISUAL_WARNING =
  'Las equivalencias visuales son orientativas. El tamaño de las manos, los utensilios y las porciones cambia mucho: la balanza es el método más preciso.';
