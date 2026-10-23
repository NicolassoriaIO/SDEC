import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { Header } from '../../../src/components/Header';
import { Card } from '../../../src/components/Card';
import { Input } from '../../../src/components/Input';
import { Button, IconButton } from '../../../src/components/Button';
import { Notice } from '../../../src/components/Notice';
import { EmptyState } from '../../../src/components/EmptyState';
import { ModalSheet } from '../../../src/components/ModalSheet';
import { useAuth } from '../../../src/features/auth/AuthContext';
import { listFoods } from '../../../src/database/repositories/foodsRepo';
import { createRecipe } from '../../../src/database/repositories/recipesRepo';
import { todayKey } from '../../../src/utils/date';
import { formatNumber, parseNumber } from '../../../src/utils/numbers';
import { useTheme, spacing, typography } from '../../../src/theme';

export default function NewRecipeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const date = typeof params.date === 'string' ? params.date : todayKey();
  const [values, setValues] = useState({
    name: '',
    description: '',
    servings: '2',
    prep_minutes: '30',
    instructions: '',
    tags: '',
  });
  const [ingredients, setIngredients] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [foods, setFoods] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const search = useCallback(async () => {
    if (!user?.id) return;
    try {
      setFoods(await listFoods(user.id, { query, limit: 80 }));
    } catch {
      setFoods([]);
    }
  }, [user, query]);

  useEffect(() => {
    if (!pickerOpen) return;
    const timer = setTimeout(search, 120);
    return () => clearTimeout(timer);
  }, [pickerOpen, search]);

  function setField(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setError('');
  }

  function addIngredient(food) {
    setIngredients((current) => {
      if (current.some((item) => item.food_id === food.id)) return current;
      return [...current, { food_id: food.id, name: food.name, quantity_g: '100', calories_per_100: food.calories_per_100 }];
    });
    setPickerOpen(false);
  }

  function updateIngredient(foodId, value) {
    setIngredients((current) => current.map((item) => (item.food_id === foodId ? { ...item, quantity_g: value } : item)));
  }

  function removeIngredient(foodId) {
    setIngredients((current) => current.filter((item) => item.food_id !== foodId));
  }

  async function save() {
    if (!values.name.trim()) return setError('Escribe un nombre para la receta.');
    if (!ingredients.length) return setError('Añade al menos un ingrediente.');
    if (ingredients.some((item) => !(parseNumber(item.quantity_g, 0) > 0))) {
      return setError('Todos los ingredientes deben tener una cantidad mayor que cero.');
    }
    setSaving(true);
    try {
      const recipe = await createRecipe(user.id, {
        name: values.name.trim(),
        description: values.description.trim(),
        servings: parseNumber(values.servings, 2),
        prep_minutes: parseNumber(values.prep_minutes, 30),
        instructions: values.instructions.trim(),
        tags: values.tags.trim(),
        ingredients: ingredients.map((item) => ({
          food_id: item.food_id,
          quantity_g: parseNumber(item.quantity_g, 0),
        })),
      });
      router.replace({ pathname: '/comida/receta/[id]', params: { id: recipe.id, date } });
    } catch (caught) {
      setError(caught?.message || 'No se pudo crear la receta.');
      setSaving(false);
    }
  }

  const totalCalories = ingredients.reduce(
    (sum, item) => sum + (parseNumber(item.calories_per_100, 0) * parseNumber(item.quantity_g, 0)) / 100,
    0
  );

  return (
    <Screen scroll>
      <Header back title="Nueva receta" subtitle="Tus ingredientes, tus cantidades" />
      {error ? <Notice tone="danger" title="Revisa la receta" style={{ marginBottom: spacing.sm }}>{error}</Notice> : null}
      <Input label="Nombre" required value={values.name} onChangeText={(value) => setField('name', value)} placeholder="Ej.: Lentejas con verduras" icon="restaurant-outline" />
      <Input label="Descripción" value={values.description} onChangeText={(value) => setField('description', value)} placeholder="Opcional" multiline />
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Input label="Porciones" value={values.servings} onChangeText={(value) => setField('servings', value)} keyboardType="number-pad" style={{ flex: 1 }} />
        <Input label="Minutos" value={values.prep_minutes} onChangeText={(value) => setField('prep_minutes', value)} keyboardType="number-pad" style={{ flex: 1 }} />
      </View>

      <View style={styles.sectionRow}>
        <Text style={[typography.h3, { color: colors.text }]}>Ingredientes</Text>
        <Button small full={false} variant="secondary" icon="add" onPress={() => setPickerOpen(true)}>
          Añadir
        </Button>
      </View>
      {ingredients.length ? (
        <Card padding="sm">
          {ingredients.map((item, index) => (
            <View key={item.food_id} style={[styles.ingredient, index > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.small, { color: colors.text }]}>{item.name}</Text>
                <Text style={[typography.tiny, { color: colors.textSubtle, textTransform: 'none', letterSpacing: 0 }]}>
                  {formatNumber((parseNumber(item.calories_per_100, 0) * parseNumber(item.quantity_g, 0)) / 100)} kcal
                </Text>
              </View>
              <Input value={item.quantity_g} onChangeText={(value) => updateIngredient(item.food_id, value)} keyboardType="decimal-pad" style={{ width: 84, marginBottom: 0 }} />
              <Text style={[typography.small, { color: colors.textMuted }]}>g</Text>
              <IconButton icon="close" size={16} onPress={() => removeIngredient(item.food_id)} accessibilityLabel={`Quitar ${item.name}`} />
            </View>
          ))}
          <Text style={[typography.small, { color: colors.textMuted, marginTop: spacing.sm }]}>
            Total de la receta: {formatNumber(Math.round(totalCalories))} kcal
          </Text>
        </Card>
      ) : (
        <EmptyState icon="nutrition-outline" title="Sin ingredientes" message="Añade alimentos del catálogo y ajusta los gramos." />
      )}

      <View style={{ height: spacing.md }} />
      <Input label="Instrucciones" value={values.instructions} onChangeText={(value) => setField('instructions', value)} placeholder="Paso a paso, una línea por paso…" multiline numberOfLines={6} />
      <Input label="Etiquetas" value={values.tags} onChangeText={(value) => setField('tags', value)} placeholder="económico, vegetariano, meal prep" hint="Sepáralas con comas." />
      <Button onPress={save} loading={saving} icon="save-outline">Guardar receta</Button>
      <Notice tone="info" title="Coste" style={{ marginTop: spacing.md }}>
        Para calcular el coste por porción, registra precios de ingredientes en el presupuesto. Sin precios, la receta solo
        mostrará macros.
      </Notice>

      <ModalSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Añadir ingrediente"
        subtitle="Busca en el catálogo de alimentos"
        maxHeight="85%"
      >
        <Input value={query} onChangeText={setQuery} placeholder="Buscar alimento…" icon="search-outline" autoCapitalize="none" />
        {foods.map((food) => (
          <Pressable
            key={food.id}
            onPress={() => addIngredient(food)}
            style={({ pressed }) => [styles.foodRow, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[typography.small, { color: colors.text }]}>{food.name}</Text>
              <Text style={[typography.tiny, { color: colors.textSubtle, textTransform: 'none', letterSpacing: 0 }]}>
                {formatNumber(food.calories_per_100)} kcal / 100 g · {food.category}
              </Text>
            </View>
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
          </Pressable>
        ))}
        {!foods.length ? <Text style={[typography.small, { color: colors.textMuted, textAlign: 'center', padding: spacing.lg }]}>Sin resultados.</Text> : null}
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md, marginBottom: spacing.sm },
  ingredient: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  foodRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
});
