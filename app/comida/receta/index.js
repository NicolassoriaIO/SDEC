import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { Header } from '../../../src/components/Header';
import { Input } from '../../../src/components/Input';
import { IconButton } from '../../../src/components/Button';
import { EmptyState, LoadingState } from '../../../src/components/EmptyState';
import { Notice } from '../../../src/components/Notice';
import { useAuth } from '../../../src/features/auth/AuthContext';
import { useData } from '../../../src/features/profile/DataContext';
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

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return recipes;
    return recipes.filter(
      (recipe) =>
        recipe.name.toLowerCase().includes(term) ||
        String(recipe.tags || '').toLowerCase().includes(term) ||
        String(recipe.description || '').toLowerCase().includes(term)
    );
  }, [recipes, query]);

  return (
    <Screen scroll>
      <Header
        back
        title="Recetas"
        subtitle="Ideas económicas con macros y coste estimado"
        right={<IconButton icon="add" onPress={() => router.push({ pathname: '/comida/receta/nueva', params: { date } })} accessibilityLabel="Crear receta" />}
      />
      <Input value={query} onChangeText={setQuery} placeholder="Buscar receta o etiqueta…" icon="search-outline" autoCapitalize="none" />
      {error ? <Notice tone="danger" title="Aviso" style={{ marginBottom: spacing.sm }}>{error}</Notice> : null}
      {loading && !recipes.length ? <LoadingState message="Cargando recetas…" /> : null}
      {!loading && !filtered.length ? (
        <EmptyState
          icon="book-outline"
          title={recipes.length ? 'Sin coincidencias' : 'Aún no hay recetas'}
          message="Crea una receta con tus ingredientes para calcular macros y coste."
          actionLabel="Crear receta"
          onAction={() => router.push({ pathname: '/comida/receta/nueva', params: { date } })}
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
});
