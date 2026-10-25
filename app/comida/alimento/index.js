import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { Header } from '../../../src/components/Header';
import { Input, SelectField } from '../../../src/components/Input';
import { QuantityStepper } from '../../../src/components/QuantityStepper';
import { Button, IconButton } from '../../../src/components/Button';
import { Notice } from '../../../src/components/Notice';
import { EmptyState, LoadingState } from '../../../src/components/EmptyState';
import { ModalSheet } from '../../../src/components/ModalSheet';
import { useAuth } from '../../../src/features/auth/AuthContext';
import { createFood, getFood, listFoods, toggleFavorite } from '../../../src/database/repositories/foodsRepo';
import { addMealItem } from '../../../src/database/repositories/mealsRepo';
import { FOOD_CATEGORIES, FOOD_STATES, MEAL_TYPES } from '../../../src/constants';
import { macroFromAmount } from '../../../src/features/nutrition/macros';
import { formatDateEs, todayKey } from '../../../src/utils/date';
import { formatNumber, parseNumber, parseOptionalNumber } from '../../../src/utils/numbers';
import { useTheme, spacing, radius, typography } from '../../../src/theme';

const EMPTY_FOOD = {
  name: '',
  category: 'Otros',
  calories_per_100: '',
  protein_per_100: '',
  carbs_per_100: '',
  fat_per_100: '',
  fiber_per_100: '',
  base_unit: 'g',
  state: 'crudo',
  portion_label: '',
  portion_grams: '',
  source: 'Valores introducidos por el usuario (etiqueta o receta)',
  notes: '',
};

export default function FoodPickerScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const date = typeof params.date === 'string' ? params.date : todayKey();
  const mealType = typeof params.mealType === 'string' ? params.mealType : 'almuerzo';
  const meal = MEAL_TYPES.find((type) => type.key === mealType) || MEAL_TYPES[2];

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [quantity, setQuantity] = useState('100');
  const [selectedPortion, setSelectedPortion] = useState(null);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newFood, setNewFood] = useState(EMPTY_FOOD);
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const rows = await listFoods(user.id, { query, category, favoritesOnly, limit: 300 });
      setFoods(rows);
      setError('');
    } catch (caught) {
      setError(caught?.message || 'No se pudo cargar el catálogo.');
    } finally {
      setLoading(false);
    }
  }, [user, query, category, favoritesOnly]);

  useEffect(() => {
    const timer = setTimeout(load, 120);
    return () => clearTimeout(timer);
  }, [load]);

  async function openFood(food) {
    try {
      const full = await getFood(user.id, food.id);
      setSelected(full);
      setSelectedPortion(null);
      setQuantity('100');
    } catch (caught) {
      setError(caught?.message || 'No se pudo abrir el alimento.');
    }
  }

  async function favorite(food) {
    try {
      await toggleFavorite(user.id, food.id, !food.is_favorite);
      await load();
    } catch (caught) {
      setError(caught?.message || 'No se pudo actualizar el favorito.');
    }
  }

  function choosePortion(portion) {
    setSelectedPortion(portion);
    setQuantity('1');
  }

  function chooseGrams() {
    setSelectedPortion(null);
    setQuantity('100');
  }

  const quantityNumber = parseOptionalNumber(quantity) || 0;
  const grams = selectedPortion ? quantityNumber * selectedPortion.grams : quantityNumber;
  const preview = selected ? macroFromAmount(selected, grams) : null;

  async function addToMeal() {
    if (!selected) return;
    if (!grams || grams <= 0) return setError('Introduce una cantidad mayor que cero.');
    setSaving(true);
    try {
      await addMealItem(user.id, {
        date,
        mealType,
        food: selected,
        quantityG: grams,
        displayQuantity: selectedPortion ? quantityNumber : grams,
        unit: selectedPortion ? selectedPortion.label : 'g',
        servingGrams: selectedPortion ? selectedPortion.grams : null,
      });
      router.back();
    } catch (caught) {
      setError(caught?.message || 'No se pudo añadir el alimento.');
      setSaving(false);
    }
  }

  function setNew(field, value) {
    setNewFood((current) => ({ ...current, [field]: value }));
    setCreateError('');
  }

  async function saveCustomFood() {
    if (!newFood.name.trim()) return setCreateError('Escribe un nombre para el alimento.');
    const calories = parseNumber(newFood.calories_per_100, NaN);
    if (!Number.isFinite(calories) || calories < 0) return setCreateError('Las calorías por 100 g deben ser un número válido.');
    setCreating(true);
    try {
      const created = await createFood(user.id, {
        ...newFood,
        name: newFood.name.trim(),
        calories_per_100: parseNumber(newFood.calories_per_100),
        protein_per_100: parseNumber(newFood.protein_per_100),
        carbs_per_100: parseNumber(newFood.carbs_per_100),
        fat_per_100: parseNumber(newFood.fat_per_100),
        fiber_per_100: parseNumber(newFood.fiber_per_100),
        portion_grams: parseOptionalNumber(newFood.portion_grams),
        portion_label: newFood.portion_label.trim(),
      });
      setCreateOpen(false);
      setNewFood(EMPTY_FOOD);
      await load();
      setSelected(created);
      setQuantity('100');
      setSelectedPortion(null);
    } catch (caught) {
      setCreateError(caught?.message || 'No se pudo crear el alimento.');
    } finally {
      setCreating(false);
    }
  }

  const resultLabel = useMemo(() => `${foods.length} alimentos`, [foods.length]);

  return (
    <Screen scroll padded>
      <Header
        back
        title="Añadir alimento"
        subtitle={`${meal.label} · ${formatDateEs(date)}`}
        right={<IconButton icon="add" onPress={() => setCreateOpen(true)} accessibilityLabel="Crear alimento personalizado" />}
      />
      <Input
        value={query}
        onChangeText={setQuery}
        placeholder="Buscar por nombre o categoría…"
        icon="search-outline"
        autoCapitalize="none"
        right={
          query ? (
            <Pressable onPress={() => setQuery('')} style={{ paddingHorizontal: spacing.md }}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null
        }
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.xs }}>
        <CategoryChip label="Todos" active={!category} onPress={() => setCategory('')} />
        <CategoryChip label="★ Favoritos" active={favoritesOnly} onPress={() => setFavoritesOnly((value) => !value)} />
        {FOOD_CATEGORIES.map((item) => (
          <CategoryChip key={item} label={item} active={category === item} onPress={() => setCategory(category === item ? '' : item)} />
        ))}
      </ScrollView>
      <View style={styles.listHeader}>
        <Text style={[typography.small, { color: colors.textMuted }]}>{resultLabel}</Text>
        <Text style={[typography.tiny, { color: colors.textSubtle, textTransform: 'none', letterSpacing: 0 }]}>Valores por 100 g / 100 ml</Text>
      </View>

      {error ? (
        <Notice tone="danger" title="Aviso" style={{ marginBottom: spacing.sm }}>
          {error}
        </Notice>
      ) : null}

      {loading && !foods.length ? <LoadingState message="Buscando alimentos…" /> : null}
      {!loading && !foods.length ? (
        <EmptyState
          icon="search-outline"
          title="Sin resultados"
          message="Prueba con otro nombre o crea un alimento con los valores de su etiqueta."
          actionLabel="Crear alimento"
          onAction={() => setCreateOpen(true)}
        />
      ) : null}

      {foods.map((food) => (
        <Pressable
          key={food.id}
          onPress={() => openFood(food)}
          style={({ pressed }) => [
            styles.foodRow,
            { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
          ]}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[typography.small, { color: colors.text, fontWeight: '700', flexShrink: 1 }]} numberOfLines={1}>
                {food.name}
              </Text>
              {food.is_custom ? <Badge label="Mío" /> : null}
            </View>
            <Text style={[typography.tiny, { color: colors.textSubtle, textTransform: 'none', letterSpacing: 0 }]}>
              {formatNumber(food.calories_per_100)} kcal · P {formatNumber(food.protein_per_100, 1)} · C {formatNumber(food.carbs_per_100, 1)} · G {formatNumber(food.fat_per_100, 1)}
            </Text>
            <Text style={[typography.tiny, { color: colors.textSubtle, textTransform: 'none', letterSpacing: 0 }]}>
              {food.category} · {food.state}
            </Text>
          </View>
          <Pressable onPress={() => favorite(food)} hitSlop={10} accessibilityLabel={food.is_favorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}>
            <Ionicons name={food.is_favorite ? 'star' : 'star-outline'} size={19} color={food.is_favorite ? colors.warning : colors.textSubtle} />
          </Pressable>
          <Ionicons name="chevron-forward" size={15} color={colors.textSubtle} />
        </Pressable>
      ))}

      <Notice tone="info" title="Sobre los datos" style={{ marginTop: spacing.md }}>
        Los valores del catálogo son genéricos y orientativos (referencia USDA). Los productos envasados deben registrarse con
        los valores de su propia etiqueta. Cocinar o variar la marca cambia la composición.
      </Notice>

      <ModalSheet
        visible={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.name || 'Alimento'}
        subtitle={selected ? `${selected.calories_per_100} kcal / 100 ${selected.base_unit || 'g'} · ${selected.category}` : ''}
        footer={
          <Button onPress={addToMeal} loading={saving} icon="add-circle-outline">
            Añadir a {meal.label.toLowerCase()}
          </Button>
        }
      >
        {selected ? (
          <>
            {selected.portions?.length ? (
              <>
                <Text style={[typography.label, { color: colors.textMuted, marginBottom: 6 }]}>Cantidad por unidad</Text>
                <Text style={[typography.tiny, { color: colors.textSubtle, marginBottom: spacing.sm, textTransform: 'none', letterSpacing: 0 }]}>
                  Elige una porción y usa − / + para indicar cuántas unidades comiste.
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
                  <Pressable
                    onPress={chooseGrams}
                    style={[
                      styles.portion,
                      {
                        borderColor: !selectedPortion ? colors.primary : colors.border,
                        backgroundColor: !selectedPortion ? colors.primarySoft : 'transparent',
                      },
                    ]}
                  >
                    <Text style={[typography.small, { color: colors.text, fontWeight: '700' }]}>Gramos</Text>
                    <Text style={[typography.tiny, { color: colors.textMuted, textTransform: 'none', letterSpacing: 0 }]}>
                      cantidad exacta
                    </Text>
                  </Pressable>
                  {selected.portions.map((portion) => (
                    <Pressable
                      key={portion.id}
                      onPress={() => choosePortion(portion)}
                      style={[
                        styles.portion,
                        {
                          borderColor: selectedPortion?.id === portion.id ? colors.primary : colors.border,
                          backgroundColor: selectedPortion?.id === portion.id ? colors.primarySoft : 'transparent',
                        },
                      ]}
                    >
                      <Text style={[typography.small, { color: colors.text, fontWeight: '700' }]}>{portion.label}</Text>
                      <Text style={[typography.tiny, { color: colors.textMuted, textTransform: 'none', letterSpacing: 0 }]}>
                        {formatNumber(portion.grams)} {portion.unit === 'ml' ? 'ml' : 'g'}
                        {portion.is_visual ? ' · visual' : ''}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}
            <QuantityStepper
              label={selectedPortion ? 'Número de porciones' : 'Cantidad en gramos'}
              value={quantity}
              onChangeText={setQuantity}
              step={selectedPortion ? 1 : 10}
              min={1}
              unit={selectedPortion ? 'porciones' : 'g'}
              autoFocus
              hint={
                selectedPortion
                  ? `${formatNumber(quantityNumber)} × ${selectedPortion.label} = ${formatNumber(grams)} g`
                  : 'Ajusta con − y +. También puedes escribir una cantidad exacta.'
              }
            />
            {preview ? (
              <View style={[styles.preview, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                <Text style={[typography.h2, { color: colors.primary }]}>{formatNumber(Math.round(preview.calories))} kcal</Text>
                <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: 4 }}>
                  <Text style={[typography.small, { color: colors.protein }]}>P {formatNumber(preview.protein, 1)} g</Text>
                  <Text style={[typography.small, { color: colors.carbs }]}>C {formatNumber(preview.carbs, 1)} g</Text>
                  <Text style={[typography.small, { color: colors.fat }]}>G {formatNumber(preview.fat, 1)} g</Text>
                  <Text style={[typography.small, { color: colors.textMuted }]}>Fibra {formatNumber(preview.fiber, 1)} g</Text>
                </View>
              </View>
            ) : null}
            {selected.notes ? <Text style={[typography.small, { color: colors.textMuted, marginBottom: spacing.sm }]}>{selected.notes}</Text> : null}
            {selected.portions?.some((portion) => portion.is_visual) ? (
              <Notice tone="warning" title="Medidas visuales aproximadas">
                Las porciones “a ojo” varían mucho. Si puedes, pesa el alimento o usa un recipiente conocido.
              </Notice>
            ) : null}
            <Notice tone="info" title="Fuente">
              {selected.source || 'Catálogo genérico SDEC con referencia USDA.'} {selected.state ? `Estado: ${selected.state}.` : ''}
            </Notice>
          </>
        ) : null}
      </ModalSheet>

      <ModalSheet
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Crear alimento"
        subtitle="Usa los valores de la etiqueta del producto o de una fuente fiable."
        maxHeight="92%"
        footer={<Button onPress={saveCustomFood} loading={creating} icon="save-outline">Guardar alimento</Button>}
      >
        {createError ? <Notice tone="danger" style={{ marginBottom: spacing.sm }}>{createError}</Notice> : null}
        <Input label="Nombre" required value={newFood.name} onChangeText={(value) => setNew('name', value)} placeholder="Ej.: Yogur natural entero" icon="nutrition-outline" />
        <SelectField label="Categoría" value={newFood.category} onChange={(value) => setNew('category', value)} options={FOOD_CATEGORIES} />
        <Text style={[typography.label, { color: colors.textMuted, marginBottom: 6 }]}>Valores por 100 g / 100 ml</Text>
        <View style={styles.formRow}>
          <Input label="Calorías (kcal)" required style={{ flex: 1 }} value={newFood.calories_per_100} onChangeText={(value) => setNew('calories_per_100', value)} keyboardType="decimal-pad" />
          <Input label="Proteína (g)" style={{ flex: 1 }} value={newFood.protein_per_100} onChangeText={(value) => setNew('protein_per_100', value)} keyboardType="decimal-pad" />
        </View>
        <View style={styles.formRow}>
          <Input label="Carbohidratos (g)" style={{ flex: 1 }} value={newFood.carbs_per_100} onChangeText={(value) => setNew('carbs_per_100', value)} keyboardType="decimal-pad" />
          <Input label="Grasas (g)" style={{ flex: 1 }} value={newFood.fat_per_100} onChangeText={(value) => setNew('fat_per_100', value)} keyboardType="decimal-pad" />
        </View>
        <View style={styles.formRow}>
          <Input label="Fibra (g)" style={{ flex: 1 }} value={newFood.fiber_per_100} onChangeText={(value) => setNew('fiber_per_100', value)} keyboardType="decimal-pad" />
          <Input label="Unidad base" style={{ flex: 1 }} value={newFood.base_unit} onChangeText={(value) => setNew('base_unit', value)} placeholder="g o ml" />
        </View>
        <SelectField label="Estado" value={newFood.state} onChange={(value) => setNew('state', value)} options={FOOD_STATES.map((state) => ({ key: state, label: state }))} />
        <View style={styles.formRow}>
          <Input label="Nombre de porción" style={{ flex: 1 }} value={newFood.portion_label} onChangeText={(value) => setNew('portion_label', value)} placeholder="1 yogur" />
          <Input label="Gramos por porción" style={{ flex: 1 }} value={newFood.portion_grams} onChangeText={(value) => setNew('portion_grams', value)} keyboardType="decimal-pad" placeholder="125" />
        </View>
        <Input label="Fuente" value={newFood.source} onChangeText={(value) => setNew('source', value)} hint="Ej.: etiqueta del envase, receta casera, USDA." />
        <Input label="Notas" value={newFood.notes} onChangeText={(value) => setNew('notes', value)} multiline placeholder="Opcional" />
        <Notice tone="warning" title="No inventes valores">
          Si no conoces un dato nutricional, déjalo en 0 y anótalo. Completar con valores inventados empeora el seguimiento.
        </Notice>
      </ModalSheet>
    </Screen>
  );
}

function CategoryChip({ label, active, onPress }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primarySoft : 'transparent' }]}
    >
      <Text style={[typography.small, { color: active ? colors.text : colors.textMuted, fontWeight: active ? '800' : '500' }]}>{label}</Text>
    </Pressable>
  );
}

function Badge({ label }) {
  const { colors } = useTheme();
  return (
    <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 2 }}>
      <Text style={[typography.tiny, { color: colors.textMuted, letterSpacing: 0 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.xs },
  foodRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  chip: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 7 },
  portion: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minWidth: 100 },
  preview: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, alignItems: 'center' },
  formRow: { flexDirection: 'row', gap: spacing.sm },
});
