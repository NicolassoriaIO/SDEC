import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { Header } from '../../../src/components/Header';
import { Input } from '../../../src/components/Input';
import { Button } from '../../../src/components/Button';
import { Notice } from '../../../src/components/Notice';
import { LoadingState } from '../../../src/components/EmptyState';
import { ModalSheet } from '../../../src/components/ModalSheet';
import { useAuth } from '../../../src/features/auth/AuthContext';
import { useData } from '../../../src/features/profile/DataContext';
import { listFoods } from '../../../src/database/repositories/foodsRepo';
import {
  deleteIngredientPrice,
  listIngredientPrices,
  upsertIngredientPrice,
} from '../../../src/database/repositories/budgetRepo';
import { formatCurrency, formatNumber, parseNumber } from '../../../src/utils/numbers';
import { useTheme, spacing, radius, typography } from '../../../src/theme';

export default function PricesScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { profile } = useData();
  const currency = profile?.currency || 'USD';
  const [prices, setPrices] = useState([]);
  const [foods, setFoods] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ package_grams: '', price: '', unit: 'g', store: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [priceRows, foodRows] = await Promise.all([
        listIngredientPrices(user.id),
        listFoods(user.id, { limit: 400 }),
      ]);
      setPrices(priceRows);
      setFoods(foodRows);
      setError('');
    } catch (caught) {
      setError(caught?.message || 'No se pudieron cargar los precios.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const priceMap = useMemo(() => new Map(prices.map((price) => [price.food_id, price])), [prices]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const rows = term ? foods.filter((food) => food.name.toLowerCase().includes(term)) : foods;
    return [...rows].sort((a, b) => Number(priceMap.has(b.id)) - Number(priceMap.has(a.id)) || a.name.localeCompare(b.name));
  }, [foods, query, priceMap]);

  function open(food) {
    const existing = priceMap.get(food.id);
    setSelected(food);
    setForm({
      package_grams: existing ? String(existing.package_grams) : '',
      price: existing ? String(existing.price) : '',
      unit: existing?.unit || 'g',
      store: existing?.store || '',
    });
    setError('');
  }

  async function save() {
    const packageGrams = parseNumber(form.package_grams, NaN);
    const price = parseNumber(form.price, NaN);
    if (!Number.isFinite(packageGrams) || packageGrams <= 0) return setError('Indica cuántos gramos trae el envase.');
    if (!Number.isFinite(price) || price <= 0) return setError('Indica un precio mayor que cero.');
    setSaving(true);
    try {
      await upsertIngredientPrice(user.id, {
        foodId: selected.id,
        name: selected.name,
        packageGrams,
        price,
        unit: form.unit || 'g',
        store: form.store.trim(),
      });
      setSelected(null);
      await load();
    } catch (caught) {
      setError(caught?.message || 'No se pudo guardar el precio.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(price) {
    try {
      await deleteIngredientPrice(user.id, price.id);
      setSelected(null);
      await load();
    } catch (caught) {
      setError(caught?.message || 'No se pudo eliminar el precio.');
    }
  }

  return (
    <Screen scroll>
      <Header back title="Precios" subtitle="Precio del envase y gramos para estimar recetas" />
      <Notice tone="info" title="Cómo calcularlo">
        Usa el precio que pagaste y el peso neto del envase (no el bruto). El coste por ración se calcula de forma proporcional.
      </Notice>
      <Input value={query} onChangeText={setQuery} placeholder="Buscar alimento…" icon="search-outline" autoCapitalize="none" />
      {error ? <Notice tone="danger" title="Aviso" style={{ marginBottom: spacing.sm }}>{error}</Notice> : null}
      {loading && !foods.length ? <LoadingState message="Cargando…" /> : null}
      {filtered.map((food) => {
        const price = priceMap.get(food.id);
        return (
          <Pressable
            key={food.id}
            onPress={() => open(food)}
            style={({ pressed }) => [styles.row, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.75 : 1 }]}
          >
            <View style={[styles.icon, { backgroundColor: price ? colors.successSoft : colors.surfaceAlt }]}>
              <Ionicons name={price ? 'pricetag' : 'pricetag-outline'} size={17} color={price ? colors.accent : colors.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.small, { color: colors.text }]}>{food.name}</Text>
              <Text style={[typography.tiny, { color: colors.textSubtle, textTransform: 'none', letterSpacing: 0 }]}>
                {price
                  ? `${formatCurrency(price.price, currency)} / ${formatNumber(price.package_grams)} g · ${formatCurrency((price.price / price.package_grams) * 100, currency)} por 100 g`
                  : 'Sin precio registrado'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={15} color={colors.textSubtle} />
          </Pressable>
        );
      })}

      <ModalSheet
        visible={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.name || 'Precio'}
        subtitle="Precio del envase completo"
        footer={
          <View style={{ gap: spacing.sm }}>
            <Button onPress={save} loading={saving} icon="save-outline">Guardar precio</Button>
            {selected && priceMap.get(selected.id) ? (
              <Button variant="danger" icon="trash-outline" disabled={saving} onPress={() => remove(priceMap.get(selected.id))}>
                Eliminar precio
              </Button>
            ) : null}
          </View>
        }
      >
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Input label="Precio del envase" required style={{ flex: 1 }} value={form.price} onChangeText={(value) => setForm((current) => ({ ...current, price: value }))} keyboardType="decimal-pad" autoFocus />
          <Input label="Peso neto (g)" required style={{ flex: 1 }} value={form.package_grams} onChangeText={(value) => setForm((current) => ({ ...current, package_grams: value }))} keyboardType="decimal-pad" />
        </View>
        <Input label="Tienda" value={form.store} onChangeText={(value) => setForm((current) => ({ ...current, store: value }))} placeholder="Opcional" icon="storefront-outline" />
        {form.price && form.package_grams ? (
          <Notice tone="info" title="Equivalencia">
            {formatCurrency((parseNumber(form.price, 0) / (parseNumber(form.package_grams, 1) || 1)) * 100, currency)} por 100 g.
            {form.store ? ` Precio de ${form.store}.` : ''}
          </Notice>
        ) : null}
        <Text style={[typography.tiny, { color: colors.textSubtle, textTransform: 'none', letterSpacing: 0, marginTop: spacing.sm }]}>
          Los precios no se actualizan solos. Revísalos cuando cambien.
        </Text>
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  icon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
