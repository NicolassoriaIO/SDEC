export const MEAL_TYPES = [
  { key: 'desayuno', label: 'Desayuno', icon: 'sunny-outline' },
  { key: 'media_manana', label: 'Media mañana', icon: 'cafe-outline' },
  { key: 'almuerzo', label: 'Almuerzo', icon: 'restaurant-outline' },
  { key: 'merienda', label: 'Merienda', icon: 'ice-cream-outline' },
  { key: 'cena', label: 'Cena', icon: 'moon-outline' },
  { key: 'otros', label: 'Otros', icon: 'add-circle-outline' },
];

export const ACTIVITY_LEVELS = [
  { key: 'sedentario', label: 'Sedentario', factor: 1.2, description: 'Poco o ningún ejercicio cotidiano.' },
  { key: 'ligero', label: 'Ligero', factor: 1.375, description: 'Ejercicio ligero 1–3 días por semana.' },
  { key: 'moderado', label: 'Moderado', factor: 1.55, description: 'Ejercicio moderado 3–5 días por semana.' },
  { key: 'activo', label: 'Activo', factor: 1.725, description: 'Ejercicio intenso 6–7 días por semana.' },
  { key: 'muy_activo', label: 'Muy activo', factor: 1.9, description: 'Trabajo físico o entrenamiento doble.' },
];

export const EXPERIENCE_LEVELS = [
  { key: 'principiante', label: 'Principiante' },
  { key: 'intermedio', label: 'Intermedio' },
  { key: 'avanzado', label: 'Avanzado' },
];

export const GOALS = [
  { key: 'perder_grasa', label: 'Reducir grasa corporal' },
  { key: 'definicion', label: 'Mejorar definición abdominal' },
  { key: 'ganar_fuerza', label: 'Ganar fuerza' },
  { key: 'mantener', label: 'Mantener el peso' },
  { key: 'salud', label: 'Mejorar hábitos y salud' },
];

export const FOOD_CATEGORIES = [
  'Cereales y tubérculos',
  'Proteínas animales',
  'Legumbres',
  'Lácteos',
  'Verduras',
  'Frutas',
  'Grasas y aceites',
  'Panadería',
  'Otros',
];

export const FOOD_STATES = ['crudo', 'cocido', 'escurrido', 'envasado', 'listo para consumir'];

export const SUPPLEMENT_TYPES = [
  { key: 'creatina', label: 'Creatina monohidratada' },
  { key: 'whey_concentrada', label: 'Proteína whey concentrada' },
  { key: 'whey_aislada', label: 'Proteína whey aislada' },
  { key: 'proteina_vegetal', label: 'Proteína vegetal' },
  { key: 'caseina', label: 'Caseína' },
  { key: 'cafeina', label: 'Cafeína' },
  { key: 'electrolitos', label: 'Electrolitos' },
  { key: 'otro', label: 'Otro suplemento' },
];

export const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'Dólar estadounidense' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'MXN', symbol: '$', label: 'Peso mexicano' },
  { code: 'ARS', symbol: '$', label: 'Peso argentino' },
  { code: 'COP', symbol: '$', label: 'Peso colombiano' },
  { code: 'CLP', symbol: '$', label: 'Peso chileno' },
  { code: 'PEN', symbol: 'S/', label: 'Sol peruano' },
  { code: 'UYU', symbol: '$', label: 'Peso uruguayo' },
  { code: 'BOB', symbol: 'Bs', label: 'Boliviano' },
  { code: 'PYG', symbol: '₲', label: 'Guaraní' },
  { code: 'BRL', symbol: 'R$', label: 'Real brasileño' },
];

export const SEVERITY = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
};

export const DEFAULT_PROFILE = {
  display_name: '',
  birth_date: '',
  sex: 'no_especificado',
  height_cm: null,
  activity_level: 'ligero',
  experience_level: 'principiante',
  training_days: 3,
  goal: 'perder_grasa',
  weekly_budget: null,
  currency: 'USD',
  region: '',
  dietary_preferences: '',
  allergies: '',
  available_foods: '',
  meals_per_day: 4,
  step_goal: 8000,
  water_goal_ml: 2000,
  deficit_percent: 15,
  protein_per_kg: 1.8,
  target_weight_kg: null,
  waist_cm: null,
  supplements_enabled: 0,
  theme: 'dark',
  units: 'metrico',
  onboarded: 0,
};

export const APP_INFO = {
  name: 'SDEC',
  fullName: 'Seguimiento de Ejercicio y Comida',
  version: '1.2.1',
  manualVersion: '1.0',
};

export const DATA_SOURCES = [
  {
    title: 'USDA FoodData Central',
    url: 'https://fdc.nal.usda.gov/',
    note: 'Base de referencia para los valores nutricionales genéricos del catálogo inicial. Los valores se muestran por 100 g o 100 ml.',
  },
  {
    title: 'Food and Agriculture Organization (FAO) / datos regionales',
    url: 'https://www.fao.org/food-composition/es/',
    note: 'Referencia general para alimentos tradicionales y composición de alimentos cuando se documenten adaptaciones regionales.',
  },
  {
    title: 'Mifflin-St Jeor (1990)',
    url: 'https://pubmed.ncbi.nlm.nih.gov/2305711/',
    note: 'Ecuación utilizada para estimar el metabolismo basal en adultos.',
  },
  {
    title: 'Organización Mundial de la Salud (OMS)',
    url: 'https://www.who.int/es',
    note: 'Referencias generales de actividad física y recomendaciones de salud.',
  },
];

export const NOTIFICATION_DEFAULTS = [
  { type: 'comida', title: 'Registrar comida', time: '13:00', body: 'Recuerda registrar tu almuerzo en SDEC.' },
  { type: 'entrenamiento', title: 'Entrenamiento', time: '18:00', body: 'Si toca entrenar, prepara tu sesión y registra tus series.' },
  { type: 'pasos', title: 'Pasos del día', time: '20:00', body: 'Añade los pasos que marca tu reloj.' },
  { type: 'peso', title: 'Peso y cintura', time: '08:00', body: 'Un registro semanal ayuda a ver la tendencia real.' },
  { type: 'compras', title: 'Revisar compras', time: '19:00', body: 'Revisa tu lista de compras y el presupuesto semanal.' },
  { type: 'suplemento', title: 'Suplemento', time: '09:00', body: 'Registra el suplemento que hayas tomado.' },
  { type: 'agua', title: 'Beber agua', time: '11:00', body: 'Un vaso de agua ahora y otro más tarde.' },
];

export const EXPENSE_CATEGORIES = [
  { key: 'alimentacion', label: 'Alimentación', icon: 'cart-outline' },
  { key: 'suplementos', label: 'Suplementos', icon: 'flask-outline' },
  { key: 'transporte', label: 'Transporte', icon: 'bus-outline' },
  { key: 'hogar', label: 'Hogar', icon: 'home-outline' },
  { key: 'salud', label: 'Salud', icon: 'medkit-outline' },
  { key: 'ocio', label: 'Ocio', icon: 'game-controller-outline' },
  { key: 'otros', label: 'Otros', icon: 'ellipsis-horizontal-outline' },
];

export const SHOPPING_UNITS = ['kg', 'g', 'ml', 'l', 'unidad', 'paquete'];

export const REMINDER_TYPES = [
  { key: 'comida', label: 'Comida', icon: 'restaurant-outline' },
  { key: 'entrenamiento', label: 'Entrenamiento', icon: 'barbell-outline' },
  { key: 'pasos', label: 'Pasos', icon: 'footsteps-outline' },
  { key: 'peso', label: 'Peso y medidas', icon: 'scale-outline' },
  { key: 'compras', label: 'Compras', icon: 'cart-outline' },
  { key: 'suplemento', label: 'Suplemento', icon: 'flask-outline' },
  { key: 'agua', label: 'Agua', icon: 'water-outline' },
  { key: 'otro', label: 'Otro', icon: 'notifications-outline' },
];
