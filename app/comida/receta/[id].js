import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../../src/components/Screen';
import { Header } from '../../../src/components/Header';
import { Card } from '../../../src/components/Card';
import { Button, IconButton } from '../../../src/components/Button';
import { Input, Chips } from '../../../src/components/Input';
import { Notice } from '../../../src/components/Notice';
import { LoadingState } from '../../../src/components/EmptyState';
import { ModalSheet } from '../../../src/components/ModalSheet';
import { useAuth } from '../../../src/features/auth/AuthContext';
import { useData } from '../../../src/features/profile/DataContext';
import { addRecipeToMeal, deleteRecipe, getRecipe } from '../../../src/database/repositories/recipesRepo';
import { MEAL_TYPES } from '../../../src/constants';
import { formatDateEs, todayKey } from '../../../src/utils/date';
import { formatCurrency, formatNumber, parseNumber } from '../../../src/utils/numbers';
import { useTheme, spacing, radius, typography } from '../../../src/theme';

export default function RecipeDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useData();
  const params = useLocalSearchParams();
  const id = params.id;
  const date = typeof params.date === 'string' ? params.date : todayKey();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [mealType, setMealType] = useState('almuerzo');
  const [servings, setServings] = useState('1');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const found = await getRecipe(user.id, id);
      if (!found) setError('La receta no existe o se ha eliminado.');
      setRecipe(found);
    } catch (caught) {
      setError(caught?.message || 'No se pudo cargar la receta.');
    } finally {
      setLoading(false);
    }
  }, [user, id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function add() {
    const amount = parseNumber(servings, NaN);
    if (!Number.isFinite(amount) || amount <= 0) return setError('Introduce un número de porciones mayor que cero.');
    setSaving(true);
    try {
      await addRecipeToMeal(user.id, { recipeId: recipe.id, date, mealType, servingsEaten: amount });
      setAddOpen(false);
      router.back();
    } catch (caught) {
      setError(caught?.message || 'No se pudo añadir la receta.');
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Eliminar receta', 'Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteRecipe(user.id, recipe.id);
            router.back();
          } catch (caught) {
            setError(caught?.message || 'No se pudo eliminar la receta.');
          }
        },
      },
    ]);
  }

  if (loading) return <Screen><LoadingState message="Cargando receta…" /></Screen>;
  if (!recipe) {
    return (
      <Screen scroll>
        <Header back title="Receta" />
        <Notice tone="danger">{error || 'Receta no encontrada.'}</Notice>
      </Screen>
    );
  }

  const currency = profile?.currency || 'USD';
  const servingsNumber = parseNumber(servings, 1);
  const servingsCalories = recipe.per_serving.calories * servingsNumber;

  return (
    <Screen scroll>
      <Header
        back
        title={recipe.name}
        subtitle={`${recipe.servings} porciones · ${recipe.prep_minutes} min · ${formatDateEs(date)}`}
        right={
          recipe.is_custom ? (
            <IconButton icon="trash-outline" color={colors.danger} onPress={confirmDelete} accessibilityLabel="Eliminar receta" />
          ) : null
        }
      />
      {error ? <Notice tone="danger" style={{ marginBottom: spacing.sm }}>{error}</Notice> : null}
      {recipe.description ? <Text style={[typography.body, { color: colors.textMuted, marginBottom: spacing.md, lineHeight: 21 }]}>{recipe.description}</Text> : null}

      <Card>
        <Text style={[typography.label, { color: colors.textMuted }]}>Por porción</Text>
        <View style={styles.macroRow}>
          <Macro label="Calorías" value={formatNumber(Math.round(recipe.per_serving.calories))} unit="kcal" color={colors.primary} />
          <Macro label="Proteína" value={formatNumber(recipe.per_serving.protein, 1)} unit="g" color={colors.protein} />
          <Macro label="Carbs" value={formatNumber(recipe.per_serving.carbs, 1)} unit="g" color={colors.carbs} />
          <Macro label="Grasas" value={formatNumber(recipe.per_serving.fat, 1)} unit="g" color={colors.fat} />
        </View>
        <View style={[styles.costRow, { borderTopColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.small, { color: colors.textMuted }]}>Coste estimado por porción</Text>
            <Text style={[typography.small, { color: colors.textSubtle }]}>
              {recipe.cost_complete ? 'Con los precios de tus ingredientes' : 'Faltan precios de algunos ingredientes'}
            </Text>
          </View>
          <Text style={[typography.h3, { color: recipe.cost_complete ? colors.accent : colors.textMuted }]}>
            {recipe.cost_complete ? formatCurrency(recipe.per_serving.cost, currency) : '—'}
          </Text>
        </View>
        {!recipe.cost_complete ? (
          <Text style={[typography.tiny, { color: colors.textSubtle, textTransform: 'none', letterSpacing: 0 }]}>
            Sin precios: {recipe.missing_prices.join(', ')}
          </Text>
        ) : null}
      </Card>

      <Button onPress={() => setAddOpen(true)} icon="add-circle-outline" style={{ marginTop: spacing.md }}>
        Añadir a una comida
      </Button>

      <Text style={[typography.h3, { color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm }]}>Ingredientes</Text>
      <Card padding="sm">
        {recipe.ingredients.map((ingredient, index) => (
          <View key={ingredient.id} style={[styles.ingredient, index > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.small, { color: colors.text }]}>{ingredient.name}</Text>
              <Text style={[typography.tiny, { color: colors.textSubtle, textTransform: 'none', letterSpacing: 0 }]}>
                {formatNumber(ingredient.quantity_g)} g · {formatNumber(Math.round(ingredient.calories))} kcal
                {ingredient.note ? ` · ${ingredient.note}` : ''}
              </Text>
            </View>
            <Text style={[typography.tiny, { color: colors.textMuted, textTransform: 'none', letterSpacing: 0 }]}>
              {ingredient.estimated_cost !== null ? formatCurrency(ingredient.estimated_cost, currency) : 'sin precio'}
            </Text>
          </View>
        ))}
      </Card>

      <Text style={[typography.h3, { color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm }]}>Preparación</Text>
      <Card>
        <Text style={[typography.body, { color: colors.textMuted, lineHeight: 22 }]}>
          {recipe.instructions || 'Sin instrucciones detalladas. Cocina los ingredientes al gusto y registra la porción que consumas.'}
        </Text>
      </Card>

      <Notice tone="info" title="Los macros son una estimación" style={{ marginTop: spacing.md }}>
        Se calculan a partir de ingredientes genéricos. El método de cocción, las marcas y los pesos reales cambian el resultado.
      </Notice>

      <ModalSheet
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        title="Añadir receta"
        subtitle={`${formatDateEs(date)} · ${formatNumber(recipe.per_serving.calories)} kcal por porción`}
        footer={<Button onPress={add} loading={saving} icon="add-circle-outline">Registrar</Button>}
      >
        <Text style={[typography.label, { color: colors.textMuted, marginBottom: 6 }]}>Comida</Text>
        <Chips options={MEAL_TYPES.map((type) => ({ key: type.key, label: type.label }))} value={mealType} onChange={setMealType} />
        <View style={{ height: spacing.md }} />
        <Input label="Porciones que vas a comer" value={servings} onChangeText={setServings} keyboardType="decimal-pad" hint="La receta completa rinde varias porciones; registra solo lo que consumes." />
        <View style={[styles.addPreview, { backgroundColor: colors.surfaceAlt }]}>
          <Text style={[typography.small, { color: colors.textMuted }]}>Total aproximado</Text>
          <Text style={[typography.h3, { color: colors.primary }]}>
            {formatNumber(Math.round(servingsCalories))} kcal · P {formatNumber(recipe.per_serving.protein * servingsNumber, 1)} g
          </Text>
        </View>
        {recipe.cost_complete ? (
          <Notice tone="info">Coste de lo que consumes: {formatCurrency(recipe.per_serving.cost * servingsNumber, currency)}.</Notice>
        ) : null}
      </ModalSheet>
    </Screen>
  );
}

function Macro({ label, value, unit, color }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text style={[typography.tiny, { color: colors.textSubtle, textTransform: 'none', letterSpacing: 0 }]}>{label}</Text>
      <Text style={[typography.small, { color, fontWeight: '800' }]}>
        {value} <Text style={{ color: colors.textSubtle, fontWeight: '500' }}>{unit}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  macroRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  costRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: 1, paddingTop: spacing.sm, marginTop: spacing.md },
  ingredient: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  addPreview: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
});
