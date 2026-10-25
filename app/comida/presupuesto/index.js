import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { Header } from '../../../src/components/Header';
import { Card } from '../../../src/components/Card';
import { StatCard } from '../../../src/components/StatCard';
import { ProgressBar } from '../../../src/components/ProgressBar';
import { Input, SelectField } from '../../../src/components/Input';
import { Button, IconButton } from '../../../src/components/Button';
import { Notice } from '../../../src/components/Notice';
import { EmptyState, LoadingState } from '../../../src/components/EmptyState';
import { ModalSheet } from '../../../src/components/ModalSheet';
import { useAuth } from '../../../src/features/auth/AuthContext';
import { useData } from '../../../src/features/profile/DataContext';
import {
  addBudgetItem,
  addShoppingItem,
  completeShoppingList,
  deleteBudgetItem,
  deleteShoppingItem,
  getActiveShoppingList,
  listBudgetItems,
  listIngredientPrices,
  spendingSummary,
  toggleShoppingItem,
} from '../../../src/database/repositories/budgetRepo';
import { EXPENSE_CATEGORIES, SHOPPING_UNITS } from '../../../src/constants';
import { formatDateShort, monthStartKey, todayKey } from '../../../src/utils/date';
import { formatCurrency, formatNumber, parseNumber, parseOptionalNumber } from '../../../src/utils/numbers';
import { proportionalCost } from '../../../src/utils/cost';
import { useTheme, spacing, radius, typography } from '../../../src/theme';

function toQuantityGrams(quantity, unit) {
  if (quantity === null || quantity === undefined) return null;
  if (unit === 'kg' || unit === 'l') return quantity * 1000;
  return quantity;
}

function formatShoppingQuantity(item) {
  const quantity = Number(item.quantity_g);
  if (!quantity) return 'Sin cantidad';
  const unit = item.unit || 'g';
  const value = unit === 'kg' || unit === 'l' ? quantity / 1000 : quantity;
  const decimals = Math.abs(value - Math.round(value)) > 0.001 ? 2 : 0;
  return `${formatNumber(value, decimals)} ${unit}`;
}

export default function BudgetScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { profile, updateProfile } = useData();
  const currency = profile?.currency || 'USD';
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ week: 0, month: 0, byCategory: [] });
  const [prices, setPrices] = useState([]);
  const [list, setList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expense, setExpense] = useState({ name: '', amount: '', category: 'alimentacion', date: todayKey(), notes: '' });
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgetValue, setBudgetValue] = useState(profile?.weekly_budget ? String(profile.weekly_budget) : '');
  const [itemOpen, setItemOpen] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', quantity: '', unit: 'kg' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [expenses, totals, priceRows, shopping] = await Promise.all([
        listBudgetItems(user.id, 100),
        spendingSummary(user.id),
        listIngredientPrices(user.id),
        getActiveShoppingList(user.id),
      ]);
      setItems(expenses);
      setSummary(totals);
      setPrices(priceRows);
      setList(shopping);
      setError('');
    } catch (caught) {
      setError(caught?.message || 'No se pudo cargar el presupuesto.');
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
  const shoppingTotal = useMemo(
    () =>
      (list?.items || []).reduce((sum, item) => {
        const price = priceMap.get(item.food_id);
        const cost =
          price && item.quantity_g
            ? proportionalCost({ price: price.price, packageGrams: price.package_grams, grams: item.quantity_g })
            : item.estimated_cost;
        return sum + (cost || 0);
      }, 0),
    [list, priceMap]
  );

  async function saveExpense() {
    if (!expense.name.trim()) return setError('Escribe un nombre para el gasto.');
    const amount = parseNumber(expense.amount, NaN);
    if (!Number.isFinite(amount) || amount <= 0) return setError('Introduce un importe mayor que cero.');
    setSaving(true);
    try {
      await addBudgetItem(user.id, { ...expense, name: expense.name.trim(), amount });
      setExpenseOpen(false);
      setExpense({ name: '', amount: '', category: 'alimentacion', date: todayKey(), notes: '' });
      await load();
    } catch (caught) {
      setError(caught?.message || 'No se pudo guardar el gasto.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(item) {
    Alert.alert('Eliminar gasto', `¿Eliminar “${item.name}”?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBudgetItem(user.id, item.id);
            await load();
          } catch (caught) {
            setError(caught?.message || 'No se pudo eliminar.');
          }
        },
      },
    ]);
  }

  async function saveBudget() {
    const value = parseOptionalNumber(budgetValue);
    if (value !== null && value < 0) return setError('El presupuesto no puede ser negativo.');
    setSaving(true);
    try {
      await updateProfile({ weekly_budget: value });
      setBudgetOpen(false);
    } catch (caught) {
      setError(caught?.message || 'No se pudo guardar el presupuesto.');
    } finally {
      setSaving(false);
    }
  }

  async function addItem() {
    if (!newItem.name.trim()) return setError('Escribe el nombre del producto.');
    const quantity = parseOptionalNumber(newItem.quantity);
    setSaving(true);
    try {
      await addShoppingItem(user.id, {
        name: newItem.name.trim(),
        quantityG: toQuantityGrams(quantity, newItem.unit),
        unit: newItem.unit,
      });
      setItemOpen(false);
      setNewItem({ name: '', quantity: '', unit: 'kg' });
      await load();
    } catch (caught) {
      setError(caught?.message || 'No se pudo añadir a la lista.');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(item) {
    try {
      await toggleShoppingItem(user.id, item.id, !item.checked);
      await load();
    } catch (caught) {
      setError(caught?.message || 'No se pudo actualizar la lista.');
    }
  }

  async function removeShopping(item) {
    try {
      await deleteShoppingItem(user.id, item.id);
      await load();
    } catch (caught) {
      setError(caught?.message || 'No se pudo eliminar.');
    }
  }

  async function finishList() {
    try {
      await completeShoppingList(user.id);
      await load();
    } catch (caught) {
      setError(caught?.message || 'No se pudo cerrar la lista.');
    }
  }

  const budget = Number(profile?.weekly_budget || 0);
  const monthFood = summary.byCategory?.find((row) => row.category === 'alimentacion')?.total || 0;

  return (
    <Screen scroll>
      <Header back title="Presupuesto" subtitle="Controla gasto, compras y precios" right={<IconButton icon="add" onPress={() => setExpenseOpen(true)} accessibilityLabel="Añadir gasto" />} />
      {error ? <Notice tone="danger" title="Aviso" style={{ marginBottom: spacing.sm }}>{error}</Notice> : null}

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.label, { color: colors.textMuted }]}>Gasto de la semana</Text>
            <Text style={[typography.h1, { color: colors.text, marginTop: 2 }]}>{formatCurrency(summary.week, currency)}</Text>
            <Text style={[typography.small, { color: colors.textMuted }]}>
              {budget ? `de ${formatCurrency(budget, currency)} de presupuesto` : 'Sin presupuesto semanal definido'}
            </Text>
          </View>
          <IconButton icon="create-outline" onPress={() => { setBudgetValue(budget ? String(budget) : ''); setBudgetOpen(true); }} accessibilityLabel="Editar presupuesto" />
        </View>
        {budget ? (
          <View style={{ marginTop: spacing.md }}>
            <ProgressBar value={summary.week} max={budget} color={summary.week > budget ? colors.danger : colors.primary} height={9} />
            <View style={styles.budgetLabels}>
              <Text style={[typography.tiny, { color: colors.textSubtle, textTransform: 'none', letterSpacing: 0 }]}>0</Text>
              <Text style={[typography.tiny, { color: summary.week > budget ? colors.danger : colors.textMuted, textTransform: 'none', letterSpacing: 0 }]}>
                {summary.week > budget ? `Excedido en ${formatCurrency(summary.week - budget, currency)}` : `Quedan ${formatCurrency(budget - summary.week, currency)}`}
              </Text>
            </View>
          </View>
        ) : (
          <Button variant="secondary" small icon="wallet-outline" onPress={() => setBudgetOpen(true)} style={{ marginTop: spacing.md }}>
            Definir presupuesto semanal
          </Button>
        )}
      </Card>

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
        <StatCard label="Gasto del mes" value={formatCurrency(summary.month, currency)} icon="calendar-outline" sub={`Alimentación: ${formatCurrency(monthFood, currency)}`} />
        <StatCard label="Lista de compras" value={formatCurrency(shoppingTotal, currency)} icon="cart-outline" sub={`${list?.items?.length || 0} productos`} />
      </View>

      <Button variant="secondary" icon="pricetags-outline" onPress={() => router.push('/comida/presupuesto/precios')} style={{ marginTop: spacing.sm }}>
        Precios de ingredientes
      </Button>

      <View style={styles.sectionRow}>
        <Text style={[typography.h3, { color: colors.text }]}>Gastos recientes</Text>
        <Button small full={false} variant="ghost" icon="add" onPress={() => setExpenseOpen(true)}>Añadir</Button>
      </View>
      {loading && !items.length ? <LoadingState message="Cargando gastos…" /> : null}
      {!loading && !items.length ? (
        <EmptyState icon="wallet-outline" title="Sin gastos registrados" message="Añade tus compras para comparar el gasto real con tu presupuesto." actionLabel="Añadir gasto" onAction={() => setExpenseOpen(true)} />
      ) : null}
      {items.slice(0, 20).map((item) => {
        const category = EXPENSE_CATEGORIES.find((entry) => entry.key === item.category);
        return (
          <View key={item.id} style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.rowIcon, { backgroundColor: colors.surfaceAlt }]}>
              <Ionicons name={category?.icon || 'ellipsis-horizontal-outline'} size={17} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.small, { color: colors.text, fontWeight: '700' }]}>{item.name}</Text>
              <Text style={[typography.tiny, { color: colors.textSubtle, textTransform: 'none', letterSpacing: 0 }]}>
                {category?.label || item.category} · {formatDateShort(item.date)}
              </Text>
            </View>
            <Text style={[typography.small, { color: colors.text, fontWeight: '800' }]}>{formatCurrency(item.amount, currency)}</Text>
            <IconButton icon="trash-outline" size={16} color={colors.danger} onPress={() => confirmDelete(item)} accessibilityLabel="Eliminar gasto" />
          </View>
        );
      })}

      <View style={styles.sectionRow}>
        <Text style={[typography.h3, { color: colors.text }]}>Lista de compras</Text>
        <Button small full={false} variant="ghost" icon="add" onPress={() => setItemOpen(true)}>Añadir</Button>
      </View>
      <Card padding="sm">
        {list?.items?.length ? (
          <>
            {list.items.map((item) => {
              const price = priceMap.get(item.food_id);
              const cost = price && item.quantity_g
                ? proportionalCost({ price: price.price, packageGrams: price.package_grams, grams: item.quantity_g })
                : item.estimated_cost;
              return (
                <View key={item.id} style={[styles.shoppingRow, { borderTopColor: colors.border }]}>
                  <Pressable onPress={() => toggle(item)} hitSlop={8} accessibilityLabel={item.checked ? 'Marcar pendiente' : 'Marcar comprado'}>
                    <Ionicons name={item.checked ? 'checkbox' : 'square-outline'} size={21} color={item.checked ? colors.primary : colors.textMuted} />
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.small, { color: item.checked ? colors.textSubtle : colors.text, textDecorationLine: item.checked ? 'line-through' : 'none' }]}>
                      {item.name}
                    </Text>
                    <Text style={[typography.tiny, { color: colors.textSubtle, textTransform: 'none', letterSpacing: 0 }]}>
                      {formatShoppingQuantity(item)} {cost ? `· ${formatCurrency(cost, currency)}` : ''}
                    </Text>
                  </View>
                  <IconButton icon="close" size={15} onPress={() => removeShopping(item)} accessibilityLabel="Quitar de la lista" />
                </View>
              );
            })}
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
              <Button variant="secondary" small onPress={finishList} icon="checkmark-done-outline" style={{ flex: 1 }}>
                Cerrar lista
              </Button>
              <Button variant="outline" small onPress={() => setItemOpen(true)} icon="add" style={{ flex: 1 }}>
                Añadir producto
              </Button>
            </View>
          </>
        ) : (
          <Text style={[typography.small, { color: colors.textMuted, textAlign: 'center', padding: spacing.md }]}>
            La lista está vacía. Añade productos o usa una receta para generar la compra.
          </Text>
        )}
      </Card>
      {shoppingTotal > 0 ? (
        <Text style={[typography.small, { color: colors.textMuted, marginTop: spacing.sm }]}>
          Coste estimado de la lista: <Text style={{ color: colors.text, fontWeight: '800' }}>{formatCurrency(shoppingTotal, currency)}</Text>
          {list?.items?.some((item) => !priceMap.get(item.food_id)?.price && item.estimated_cost === null) ? ' · algunos productos no tienen precio' : ''}
        </Text>
      ) : null}

      <Notice tone="info" title="Cómo se estima" style={{ marginTop: spacing.md }}>
        Los costes usan el precio del envase dividido entre sus gramos. Son orientativos: no incluyen transporte, mermas ni
        cambios de precio. Ajusta el presupuesto a tu situación real.
      </Notice>

      <ModalSheet visible={expenseOpen} onClose={() => setExpenseOpen(false)} title="Añadir gasto" subtitle="Registra una compra o gasto" footer={<Button onPress={saveExpense} loading={saving}>Guardar gasto</Button>}>
        <Input label="Concepto" required value={expense.name} onChangeText={(value) => setExpense((current) => ({ ...current, name: value }))} placeholder="Compra semanal, suplemento…" autoFocus />
        <Input label={`Importe (${currency})`} required value={expense.amount} onChangeText={(value) => setExpense((current) => ({ ...current, amount: value }))} keyboardType="decimal-pad" />
        <SelectField label="Categoría" value={expense.category} onChange={(value) => setExpense((current) => ({ ...current, category: value }))} options={EXPENSE_CATEGORIES} />
        <Input label="Fecha" value={expense.date} onChangeText={(value) => setExpense((current) => ({ ...current, date: value }))} placeholder="AAAA-MM-DD" hint="Mes actual para los totales mensuales." />
        <Input label="Notas" value={expense.notes} onChangeText={(value) => setExpense((current) => ({ ...current, notes: value }))} placeholder="Opcional" multiline />
      </ModalSheet>

      <ModalSheet visible={budgetOpen} onClose={() => setBudgetOpen(false)} title="Presupuesto semanal" subtitle={`Moneda: ${currency}`} footer={<Button onPress={saveBudget} loading={saving}>Guardar</Button>}>
        <Input label={`Presupuesto (${currency})`} value={budgetValue} onChangeText={setBudgetValue} keyboardType="decimal-pad" placeholder="Ej.: 60" icon="wallet-outline" hint="Déjalo vacío para no fijar límite." />
        <Notice tone="info">Compara el gasto con un límite realista. Un presupuesto demasiado ajustado puede volver la alimentación menos variada.</Notice>
      </ModalSheet>

      <ModalSheet visible={itemOpen} onClose={() => setItemOpen(false)} title="Añadir a la lista" subtitle={`Desde ${formatDateShort(monthStartKey())} · ${currency}`} footer={<Button onPress={addItem} loading={saving}>Añadir</Button>}>
        <Input label="Producto" required value={newItem.name} onChangeText={(value) => setNewItem((current) => ({ ...current, name: value }))} placeholder="Ej.: Avena" autoFocus />
        <Input label={`Cantidad (${newItem.unit})`} value={newItem.quantity} onChangeText={(value) => setNewItem((current) => ({ ...current, quantity: value }))} keyboardType="decimal-pad" placeholder="Opcional" />
        <SelectField label="Unidad" value={newItem.unit} onChange={(value) => setNewItem((current) => ({ ...current, unit: value }))} options={SHOPPING_UNITS.map((unit) => ({ key: unit, label: unit }))} />
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  budgetLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  shoppingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
});
