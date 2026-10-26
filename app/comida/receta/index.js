import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { Header } from '../../../src/components/Header';
import { Input } from '../../../src/components/Input';
import { Button, IconButton } from '../../../src/components/Button';
import { EmptyState, LoadingState } from '../../../src/components/EmptyState';
import { ModalSheet } from '../../../src/components/ModalSheet';
import { Notice } from '../../../src/components/Notice';
import { useAuth } from '../../../src/features/auth/AuthContext';
import { useData } from '../../../src/features/profile/DataContext';
import { listFoods } from '../../../src/database/repositories/foodsRepo';
import { listRecipes } from '../../../src/database/repositories/recipesRepo';
import { formatCurrency, formatNumber } from '../../../src/utils/numbers';
import { todayKey } from '../../../src/utils/date';
import { useTheme, spacing, radius, typography } from '../../../src/theme';

export default function RecipesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useData();
  const params = useLocalSearchParams();
  const date = typeof params.date === 'string' ? params.date : todayKey();
  const [recipes, setRecipes] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ingredientPickerOpen, setIngredientPickerOpen] = useState(false);
  const [ingredientQuery, setIngredientQuery] = useState('');
  const [ingredientFoods, setIngredientFoods] = useState([]);
  const [selectedIngredients, setSelectedIngredients] = useState([]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      setRecipes(await listRecipes(user.id));
      setError('');
    } catch (caught) {
      setError(caught?.message || 'No se pudieron cargar las recetas.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const searchIngredients = useCallback(async () => {
    if (!user?.id) return;
    try {
      setIngredientFoods(await listFoods(user.id, { query: ingredientQuery, limit: 80 }));
    } catch {
      setIngredientFoods([]);
    }
  }, [user, ingredientQuery]);

  useEffect(() => {
    if (!ingredientPickerOpen) return undefined;
    const timer = setTimeout(searchIngredients, 120);
    return () => clearTimeout(timer);
  }, [ingredientPickerOpen, searchIngredients]);

  const selectedIds = useMemo(() => new Set(selectedIngredients.map((item) => item.id)), [selectedIngredients]);
  const availableRecipes = useMemo(() => {
    if (!selectedIds.size) return recipes;
    return recipes.filter(
      (recipe) =>
        recipe.ingredient_food_ids?.length > 0 &&
        recipe.ingredient_food_ids.every((id) => selectedIds.has(id))
    );
  }, [recipes, selectedIds]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return availableRecipes;
    return availableRecipes.filter(
      (recipe) =>
        recipe.name.toLowerCase().includes(term) ||
        String(recipe.tags || '').toLowerCase().includes(term) ||
        String(recipe.description || '').toLowerCase().includes(term)
    );
  }, [availableRecipes, query]);

  function toggleIngredient(food) {
    setSelectedIngredients((current) =>
      current.some((item) => item.id === food.id)
        ? current.filter((item) => item.id !== food.id)
        : [...current, { id: food.id, name: food.name }]
    );
  }

  function removeIngredient(foodId) {
    setSelectedIngredients((current) => current.filter((item) => item.id !== foodId));
  }

  const noIngredientMatches = selectedIngredients.length > 0 && availableRecipes.length === 0;
  const emptyTitle = noIngredientMatches
    ? 'No hay recetas con esos ingredientes'
    : recipes.length
      ? 'Sin coincidencias'
      : 'Aún no hay recetas';
  const emptyMessage = noIngredientMatches
    ? 'El filtro solo muestra recetas cuyos ingredientes estén todos seleccionados. Añade más ingredientes o limpia el filtro.'
    : recipes.length
      ? 'Prueba con otro nombre, etiqueta o combinación de ingredientes.'
      : 'Crea una receta con tus ingredientes para calcular macros y coste.';
  const emptyActionLabel = noIngredientMatches ? 'Añadir ingredientes' : recipes.length ? null : 'Crear receta';

  return (
    <Screen scroll>
      <Header
        back
        title="Recetas"
        subtitle="Ideas económicas con macros y coste estimado"
        right={<IconButton icon="add" onPress={() => router.push({ pathname: '/comida/receta/nueva', params: { date } })} accessibilityLabel="Crear receta" />}
      />
      <Input value={query} onChangeText={setQuery} placeholder="Buscar receta o etiqueta…" icon="search-outline" autoCapitalize="none" />
      <View style={[styles.ingredientFilter, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.ingredientFilterTop}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.h3, { color: colors.text }]}>Cocinar con lo que tengo</Text>
            <Text style={[typography.small, { color: colors.textMuted, lineHeight: 18 }]}>
              Solo verás recetas que no necesiten otros ingredientes.
            </Text>
          </View>
          <Button small full={false} variant="secondary" icon="add" onPress={() => setIngredientPickerOpen(true)}>
            Añadir
          </Button>
        </View>
        {selectedIngredients.length ? (
          <>
            <View style={styles.selectedIngredients}>
              {selectedIngredients.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => removeIngredient(item.id)}
                  style={[styles.ingredientChip, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Quitar ${item.name}`}
                >
                  <Text style={[typography.small, { color: colors.text, fontWeight: '700' }]}>{item.name}</Text>
                  <Ionicons name="close" size={13} color={colors.primary} />
                </Pressable>
              ))}
              <Pressable onPress={() => setSelectedIngredients([])} style={{ paddingVertical: 6 }}>
                <Text style={[typography.small, { color: colors.textMuted, fontWeight: '700' }]}>Limpiar</Text>
              </Pressable>
            </View>
            <Text style={[typography.tiny, { color: availableRecipes.length ? colors.primary : colors.textMuted, textTransform: 'none', letterSpacing: 0 }]}>
              {availableRecipes.length
                ? `${availableRecipes.length} ${availableRecipes.length === 1 ? 'receta disponible' : 'recetas disponibles'}`
                : 'Todavía no hay recetas con esos ingredientes'}
            </Text>
          </>
        ) : (
          <Text style={[typography.tiny, { color: colors.textSubtle, textTransform: 'none', letterSpacing: 0 }]}>
            Ej.: tomate, lechuga y pollo.
          </Text>
        )}
      </View>
      {error ? <Notice tone="danger" title="Aviso" style={{ marginBottom: spacing.sm }}>{error}</Notice> : null}
      {loading && !recipes.length ? <LoadingState message="Cargando recetas…" /> : null}
      {!loading && !filtered.length ? (
        <EmptyState
          icon={noIngredientMatches ? 'basket-outline' : 'book-outline'}
          title={emptyTitle}
          message={emptyMessage}
          actionLabel={emptyActionLabel}
          onAction={
            noIngredientMatches
              ? () => setIngredientPickerOpen(true)
              : recipes.length
                ? undefined
                : () => router.push({ pathname: '/comida/receta/nueva', params: { date } })
          }
        />
      ) : null}
      {filtered.map((recipe) => (
        <Pressable
          key={recipe.id}
          onPress={() => router.push({ pathname: '/comida/receta/[id]', params: { id: recipe.id, date } })}
          style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.78 : 1 }]}
        >
          <View style={styles.cardTop}>
            <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="restaurant-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[typography.h3, { color: colors.text, flexShrink: 1 }]} numberOfLines={1}>
                  {recipe.name}
                </Text>
                {recipe.user_id ? <Text style={[typography.tiny, { color: colors.primary }]}>MÍA</Text> : null}
              </View>
              <Text style={[typography.small, { color: colors.textMuted }]} numberOfLines={2}>
                {recipe.description || `${recipe.ingredient_count} ingredientes · ${recipe.prep_minutes} min`}
              </Text>
            </View>
          </View>
          <View style={[styles.stats, { borderTopColor: colors.border }]}>
            <Stat label="Por porción" value={`${formatNumber(Math.round(recipe.totals.calories))} kcal`} />
            <Stat label="Proteína" value={`${formatNumber(recipe.totals.protein, 1)} g`} color={colors.protein} />
            <Stat
              label="Coste"
              value={recipe.cost_complete ? formatCurrency(recipe.cost_per_serving, profile?.currency || 'USD') : 'Sin precios'}
              color={recipe.cost_complete ? colors.accent : colors.textSubtle}
            />
          </View>
          {recipe.missing_prices?.length ? (
            <Text style={[typography.tiny, { color: colors.textSubtle, marginTop: spacing.xs, textTransform: 'none', letterSpacing: 0 }]}>
              Faltan precios: {recipe.missing_prices.slice(0, 4).join(', ')}{recipe.missing_prices.length > 4 ? '…' : ''}
            </Text>
          ) : null}
          <View style={styles.tags}>
            {String(recipe.tags || '')
              .split(',')
              .filter(Boolean)
              .slice(0, 4)
              .map((tag) => (
                <View key={tag} style={[styles.tag, { backgroundColor: colors.surfaceAlt }]}>
                  <Text style={[typography.tiny, { color: colors.textMuted, textTransform: 'none', letterSpacing: 0 }]}>{tag.trim()}</Text>
                </View>
              ))}
            <Text style={[typography.tiny, { color: colors.textSubtle, textTransform: 'none', letterSpacing: 0, marginLeft: 'auto' }]}>
              {recipe.servings} porciones · {recipe.prep_minutes} min
            </Text>
          </View>
        </Pressable>
      ))}
      <Notice tone="info" title="Costes orientativos" style={{ marginTop: spacing.sm }}>
        El coste por porción solo aparece cuando todos los ingredientes tienen precio de compra registrado. Los precios cambian
        según tienda, región y temporada.
      </Notice>

      <ModalSheet
        visible={ingredientPickerOpen}
        onClose={() => setIngredientPickerOpen(false)}
        title="Ingredientes que tengo"
        subtitle="Selecciona todo lo que tengas disponible"
        maxHeight="85%"
        footer={<Button onPress={() => setIngredientPickerOpen(false)}>Listo</Button>}
      >
        <Input
          value={ingredientQuery}
          onChangeText={setIngredientQuery}
          placeholder="Buscar tomate, lechuga, pollo…"
          icon="search-outline"
          autoCapitalize="none"
          autoFocus
        />
        {selectedIngredients.length ? (
          <Text style={[typography.tiny, { color: colors.primary, textTransform: 'none', letterSpacing: 0, marginBottom: spacing.sm }]}>
            {selectedIngredients.length} {selectedIngredients.length === 1 ? 'ingrediente seleccionado' : 'ingredientes seleccionados'}
          </Text>
        ) : null}
        {ingredientFoods.map((food) => {
          const active = selectedIds.has(food.id);
          return (
            <Pressable
              key={food.id}
              onPress={() => toggleIngredient(food)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [styles.foodRow, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[typography.small, { color: colors.text, fontWeight: active ? '800' : '400' }]}>{food.name}</Text>
                <Text style={[typography.tiny, { color: colors.textSubtle, textTransform: 'none', letterSpacing: 0 }]}>
                  {food.category} · {food.state}
                </Text>
              </View>
              <Ionicons
                name={active ? 'checkmark-circle' : 'add-circle-outline'}
                size={22}
                color={active ? colors.primary : colors.textMuted}
              />
            </Pressable>
          );
        })}
        {!ingredientFoods.length ? (
          <Text style={[typography.small, { color: colors.textMuted, textAlign: 'center', padding: spacing.lg }]}>
            Sin resultados.
          </Text>
        ) : null}
      </ModalSheet>
    </Screen>
  );
}

function Stat({ label, value, color }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text style={[typography.tiny, { color: colors.textSubtle, textTransform: 'none', letterSpacing: 0 }]}>{label}</Text>
      <Text style={[typography.small, { color: color || colors.text, fontWeight: '800' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, gap: spacing.sm },
  cardTop: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', borderTopWidth: 1, paddingTop: spacing.sm, gap: spacing.sm },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  tag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.pill },
  ingredientFilter: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, gap: spacing.sm },
  ingredientFilterTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  selectedIngredients: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  ingredientChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: radius.pill, paddingVertical: 5, paddingHorizontal: 9 },
  foodRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
});
