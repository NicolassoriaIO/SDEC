import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { Header } from '../../../src/components/Header';
import { Card } from '../../../src/components/Card';
import { StatCard } from '../../../src/components/StatCard';
import { Input, SelectField } from '../../../src/components/Input';
import { Button, IconButton } from '../../../src/components/Button';
import { Notice } from '../../../src/components/Notice';
import { EmptyState, LoadingState } from '../../../src/components/EmptyState';
import { ModalSheet } from '../../../src/components/ModalSheet';
import { useAuth } from '../../../src/features/auth/AuthContext';
import { useData } from '../../../src/features/profile/DataContext';
import {
  addPurchase,
  createSupplement,
  deleteSupplement,
  getDaySupplementTotals,
  listSupplements,
  logSupplement,
  purchases,
  supplementSpending,
  updateSupplement,
} from '../../../src/database/repositories/supplementsRepo';
import { SUPPLEMENT_TYPES } from '../../../src/constants';
import { nowTime, todayKey } from '../../../src/utils/date';
import { formatCurrency, formatNumber, parseNumber, parseOptionalNumber } from '../../../src/utils/numbers';
import { useTheme, spacing, typography } from '../../../src/theme';

const EMPTY = {
  name: '',
  type: 'creatina',
  brand: '',
  presentation: '',
  container_size: '',
  container_unit: 'g',
  price: '',
  purchase_date: '',
  opened_date: '',
  remaining: '',
  serving_size: '',
  serving_unit: 'g',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  ingredients: '',
  warnings: '',
  expiry_date: '',
  source: '',
  notes: '',
  servings_per_day: '1',
};

export default function SupplementsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { profile } = useData();
  const params = useLocalSearchParams();
  const date = typeof params.date === 'string' ? params.date : todayKey();
  const [items, setItems] = useState([]);
  const [todayTotals, setTodayTotals] = useState({ logs: [], calories: 0, protein: 0 });
  const [spending, setSpending] = useState({ month: 0, total: 0 });
  const [purchaseList, setPurchaseList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [logTarget, setLogTarget] = useState(null);
  const [logValues, setLogValues] = useState({ servings: '1', time: nowTime(), notes: '' });
  const [purchaseTarget, setPurchaseTarget] = useState(null);
  const [purchaseValues, setPurchaseValues] = useState({ price: '', quantity: '', notes: '' });

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [list, totals, spend, buys] = await Promise.all([
        listSupplements(user.id),
        getDaySupplementTotals(user.id, date),
        supplementSpending(user.id),
        purchases(user.id, 20),
      ]);
      setItems(list);
      setTodayTotals(totals);
      setSpending(spend);
      setPurchaseList(buys);
      setError('');
    } catch (caught) {
      setError(caught?.message || 'No se pudieron cargar los suplementos.');
    } finally {
      setLoading(false);
    }
  }, [user, date]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setFormError('');
  }

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setFormError('');
    setFormOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({
      ...EMPTY,
      ...Object.fromEntries(Object.keys(EMPTY).map((key) => [key, item[key] === null || item[key] === undefined ? '' : String(item[key])])),
      name: item.name,
      type: item.type,
      container_size: item.container_size ?? '',
      container_unit: item.container_unit || 'g',
      serving_size: item.serving_size ?? '',
      serving_unit: item.serving_unit || 'g',
      remaining: item.remaining ?? '',
    });
    setFormError('');
    setFormOpen(true);
  }

  async function saveForm() {
    if (!form.name.trim()) return setFormError('Escribe el nombre del suplemento.');
    const calories = parseNumber(form.calories, 0);
    if (calories < 0) return setFormError('Las calorías no pueden ser negativas.');
    setSaving(true);
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        brand: form.brand.trim(),
        presentation: form.presentation.trim(),
        container_size: parseOptionalNumber(form.container_size),
        price: parseOptionalNumber(form.price),
        remaining: parseOptionalNumber(form.remaining),
        serving_size: parseOptionalNumber(form.serving_size),
        calories: parseNumber(form.calories, 0),
        protein: parseNumber(form.protein, 0),
        carbs: parseNumber(form.carbs, 0),
        fat: parseNumber(form.fat, 0),
        servings_per_day: parseNumber(form.servings_per_day, 1),
      };
      if (editing) await updateSupplement(user.id, editing.id, payload);
      else await createSupplement(user.id, payload);
      setFormOpen(false);
      await load();
    } catch (caught) {
      setFormError(caught?.message || 'No se pudo guardar el suplemento.');
    } finally {
      setSaving(false);
    }
  }

  async function log() {
    const servings = parseNumber(logValues.servings, NaN);
    if (!Number.isFinite(servings) || servings <= 0) return setError('Introduce una cantidad mayor que cero.');
    setSaving(true);
    try {
      await logSupplement(user.id, logTarget, {
        servings,
        date,
        time: logValues.time || nowTime(),
        notes: logValues.notes.trim(),
      });
      setLogTarget(null);
      setLogValues({ servings: '1', time: nowTime(), notes: '' });
      await load();
    } catch (caught) {
      setError(caught?.message || 'No se pudo registrar la toma.');
    } finally {
      setSaving(false);
    }
  }

  async function savePurchase() {
    const price = parseNumber(purchaseValues.price, NaN);
    if (!Number.isFinite(price) || price < 0) return setError('Introduce un precio válido.');
    setSaving(true);
    try {
      await addPurchase(user.id, {
        supplementId: purchaseTarget.id,
        date: todayKey(),
        price,
        quantity: parseOptionalNumber(purchaseValues.quantity),
        notes: purchaseValues.notes.trim(),
      });
      setPurchaseTarget(null);
      setPurchaseValues({ price: '', quantity: '', notes: '' });
      await load();
    } catch (caught) {
      setError(caught?.message || 'No se pudo registrar la compra.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(item) {
    Alert.alert('Eliminar suplemento', `¿Eliminar ${item.name}? También se borrarán sus registros y compras.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSupplement(user.id, item.id);
            await load();
          } catch (caught) {
            setError(caught?.message || 'No se pudo eliminar.');
          }
        },
      },
    ]);
  }

  const currency = profile?.currency || 'USD';

  return (
    <Screen scroll>
      <Header
        back
        title="Suplementos"
        subtitle="Registra lo que tomas, sin dosis recomendadas"
        right={<IconButton icon="add" onPress={openNew} accessibilityLabel="Añadir suplemento" />}
      />
      {error ? <Notice tone="danger" title="Aviso" style={{ marginBottom: spacing.sm }}>{error}</Notice> : null}

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <StatCard label="Hoy" value={todayTotals.logs?.length || 0} unit="tomas" icon="flask-outline" sub={`${formatNumber(todayTotals.protein, 1)} g de proteína`} />
        <StatCard label="Gasto del mes" value={formatCurrency(spending.month, currency)} icon="cart-outline" sub={`Total histórico ${formatCurrency(spending.total, currency)}`} />
      </View>

      <Notice tone="warning" title="Sin recomendaciones de dosis" style={{ marginTop: spacing.md }}>
        SDEC no sugiere dosis, pautas ni combinaciones. Registra únicamente lo que ya consumes y los datos de la etiqueta.
        Consulta con un profesional si tienes dudas, enfermedades, embarazo o tomas medicación.
      </Notice>

      <View style={styles.sectionRow}>
        <Text style={[typography.h3, { color: colors.text }]}>Mi estantería</Text>
        <Button small full={false} variant="secondary" icon="add" onPress={openNew}>Añadir</Button>
      </View>

      {loading && !items.length ? <LoadingState message="Cargando suplementos…" /> : null}
      {!loading && !items.length ? (
        <EmptyState
          icon="flask-outline"
          title="Sin suplementos"
          message="Añade un producto con los valores reales de su etiqueta para controlar lo que tomas y su gasto."
          actionLabel="Añadir suplemento"
          onAction={openNew}
        />
      ) : null}

      {items.map((item) => {
        const typeLabel = SUPPLEMENT_TYPES.find((type) => type.key === item.type)?.label || item.type;
        const lowStock = item.remaining !== null && item.remaining !== undefined && Number(item.remaining) <= 0;
        return (
          <Card key={item.id} style={{ marginBottom: spacing.sm }} padding="sm">
            <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
              <View style={[styles.icon, { backgroundColor: colors.surfaceAlt }]}>
                <Ionicons name="flask-outline" size={19} color={colors.info} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.small, { color: colors.text, fontWeight: '800' }]}>{item.name}</Text>
                <Text style={[typography.tiny, { color: colors.textMuted, textTransform: 'none', letterSpacing: 0 }]}>
                  {typeLabel}{item.brand ? ` · ${item.brand}` : ''}
                </Text>
                <Text style={[typography.tiny, { color: lowStock ? colors.warning : colors.textSubtle, textTransform: 'none', letterSpacing: 0, marginTop: 3 }]}>
                  {item.container_size ? `Envase ${formatNumber(item.container_size)} ${item.container_unit}` : 'Sin tamaño de envase'}
                  {item.remaining !== null && item.remaining !== undefined ? ` · Quedan ${formatNumber(item.remaining, 1)}` : ''}
                  {item.price ? ` · ${formatCurrency(item.price, currency)}` : ''}
                </Text>
                {item.serving_size ? (
                  <Text style={[typography.tiny, { color: colors.textSubtle, textTransform: 'none', letterSpacing: 0 }]}>
                    Porción: {formatNumber(item.serving_size, 1)} {item.serving_unit} · {formatNumber(item.calories)} kcal · P {formatNumber(item.protein, 1)} g
                  </Text>
                ) : null}
              </View>
              <IconButton icon="create-outline" size={17} onPress={() => openEdit(item)} accessibilityLabel="Editar" />
            </View>
            {item.warnings ? <Text style={[typography.tiny, { color: colors.warning, marginTop: spacing.xs, textTransform: 'none', letterSpacing: 0 }]}>{item.warnings}</Text> : null}
            <View style={[styles.actions, { borderTopColor: colors.border }]}>
              <Button small variant="secondary" icon="add-circle-outline" onPress={() => { setLogTarget(item); setLogValues({ servings: '1', time: nowTime(), notes: '' }); }} style={{ flex: 1 }}>
                Registrar toma
              </Button>
              <IconButton icon="cart-outline" onPress={() => { setPurchaseTarget(item); setPurchaseValues({ price: '', quantity: '', notes: '' }); }} accessibilityLabel="Registrar compra" />
              <IconButton icon="trash-outline" color={colors.danger} onPress={() => confirmDelete(item)} accessibilityLabel="Eliminar suplemento" />
            </View>
          </Card>
        );
      })}

      {todayTotals.logs?.length ? (
        <>
          <Text style={[typography.h3, { color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm }]}>Tomas de hoy</Text>
          <Card padding="sm">
            {todayTotals.logs.map((log, index) => (
              <View key={log.id} style={[styles.logRow, index > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.small, { color: colors.text }]}>{log.supplement_name}</Text>
                  <Text style={[typography.tiny, { color: colors.textSubtle, textTransform: 'none', letterSpacing: 0 }]}>
                    {formatNumber(log.servings, 1)} porción(es) · {log.time || 'sin hora'}
                  </Text>
                </View>
                <Text style={[typography.tiny, { color: colors.textMuted }]}>{formatNumber(log.calories)} kcal</Text>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      {purchaseList.length ? (
        <>
          <Text style={[typography.h3, { color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm }]}>Compras recientes</Text>
          <Card padding="sm">
            {purchaseList.slice(0, 6).map((purchase, index) => (
              <View key={purchase.id} style={[styles.logRow, index > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.small, { color: colors.text }]}>{purchase.supplement_name || 'Compra'}</Text>
                  <Text style={[typography.tiny, { color: colors.textSubtle, textTransform: 'none', letterSpacing: 0 }]}>{purchase.date}</Text>
                </View>
                <Text style={[typography.small, { color: colors.text, fontWeight: '700' }]}>{formatCurrency(purchase.price, currency)}</Text>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <Notice tone="info" title="Trazabilidad" style={{ marginTop: spacing.md }}>
        Los valores nutricionales de un suplemento solo se suman a tu día si los introduces desde la etiqueta. No se completan
        automáticamente porque la composición varía entre marcas y lotes.
      </Notice>

      <ModalSheet
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Editar suplemento' : 'Añadir suplemento'}
        subtitle="Copia los datos de la etiqueta; deja en blanco lo que no sepas"
        maxHeight="92%"
        footer={<Button onPress={saveForm} loading={saving} icon="save-outline">Guardar</Button>}
      >
        {formError ? <Notice tone="danger" style={{ marginBottom: spacing.sm }}>{formError}</Notice> : null}
        <Input label="Nombre" required value={form.name} onChangeText={(value) => setField('name', value)} placeholder="Ej.: Creatina monohidratada" icon="flask-outline" />
        <SelectField label="Tipo" value={form.type} onChange={(value) => setField('type', value)} options={SUPPLEMENT_TYPES} />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Input label="Marca" style={{ flex: 1 }} value={form.brand} onChangeText={(value) => setField('brand', value)} />
          <Input label="Presentación" style={{ flex: 1 }} value={form.presentation} onChangeText={(value) => setField('presentation', value)} placeholder="Polvo, cápsulas…" />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Input label="Tamaño envase" style={{ flex: 1 }} value={form.container_size} onChangeText={(value) => setField('container_size', value)} keyboardType="decimal-pad" />
          <Input label="Unidad" style={{ flex: 1 }} value={form.container_unit} onChangeText={(value) => setField('container_unit', value)} placeholder="g, ml, caps" />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Input label="Precio" style={{ flex: 1 }} value={form.price} onChangeText={(value) => setField('price', value)} keyboardType="decimal-pad" icon="cash-outline" />
          <Input label="Fecha compra" style={{ flex: 1 }} value={form.purchase_date} onChangeText={(value) => setField('purchase_date', value)} placeholder="AAAA-MM-DD" />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Input label="Abierto el" style={{ flex: 1 }} value={form.opened_date} onChangeText={(value) => setField('opened_date', value)} placeholder="AAAA-MM-DD" />
          <Input label="Caduca el" style={{ flex: 1 }} value={form.expiry_date} onChangeText={(value) => setField('expiry_date', value)} placeholder="AAAA-MM-DD" />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Input label="Restante" style={{ flex: 1 }} value={form.remaining} onChangeText={(value) => setField('remaining', value)} keyboardType="decimal-pad" />
          <Input label="Tomas/día" style={{ flex: 1 }} value={form.servings_per_day} onChangeText={(value) => setField('servings_per_day', value)} keyboardType="decimal-pad" />
        </View>
        <Text style={[typography.label, { color: colors.textMuted, marginBottom: 6 }]}>Porción de la etiqueta</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Input label="Cantidad" style={{ flex: 1 }} value={form.serving_size} onChangeText={(value) => setField('serving_size', value)} keyboardType="decimal-pad" />
          <Input label="Unidad" style={{ flex: 1 }} value={form.serving_unit} onChangeText={(value) => setField('serving_unit', value)} placeholder="g, scoop…" />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Input label="kcal" style={{ flex: 1 }} value={form.calories} onChangeText={(value) => setField('calories', value)} keyboardType="decimal-pad" />
          <Input label="Proteína (g)" style={{ flex: 1 }} value={form.protein} onChangeText={(value) => setField('protein', value)} keyboardType="decimal-pad" />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Input label="Carbos (g)" style={{ flex: 1 }} value={form.carbs} onChangeText={(value) => setField('carbs', value)} keyboardType="decimal-pad" />
          <Input label="Grasas (g)" style={{ flex: 1 }} value={form.fat} onChangeText={(value) => setField('fat', value)} keyboardType="decimal-pad" />
        </View>
        <Input label="Ingredientes" value={form.ingredients} onChangeText={(value) => setField('ingredients', value)} multiline placeholder="Según la etiqueta" />
        <Input label="Advertencias" value={form.warnings} onChangeText={(value) => setField('warnings', value)} multiline placeholder="Alérgenos, contraindicaciones de la etiqueta" />
        <Input label="Fuente de los datos" value={form.source} onChangeText={(value) => setField('source', value)} placeholder="Etiqueta del producto, web del fabricante…" />
        <Input label="Notas" value={form.notes} onChangeText={(value) => setField('notes', value)} multiline />
        <Notice tone="warning">No completes valores que no aparezcan en la etiqueta. Si faltan, déjalos en 0 y anótalo.</Notice>
      </ModalSheet>

      <ModalSheet
        visible={Boolean(logTarget)}
        onClose={() => setLogTarget(null)}
        title={logTarget ? `Registrar ${logTarget.name}` : 'Registrar toma'}
        subtitle="¿Cuántas porciones tomaste?"
        footer={<Button onPress={log} loading={saving} icon="checkmark">Registrar toma</Button>}
      >
        <Input label="Porciones" value={logValues.servings} onChangeText={(value) => setLogValues((current) => ({ ...current, servings: value }))} keyboardType="decimal-pad" autoFocus />
        <Input label="Hora" value={logValues.time} onChangeText={(value) => setLogValues((current) => ({ ...current, time: value }))} placeholder="HH:MM" />
        <Input label="Notas" value={logValues.notes} onChangeText={(value) => setLogValues((current) => ({ ...current, notes: value }))} placeholder="Opcional" />
        {logTarget?.serving_size ? (
          <Notice tone="info">
            Cada porción son {formatNumber(logTarget.serving_size, 1)} {logTarget.serving_unit}. Aporta {formatNumber(logTarget.calories)} kcal y{' '}
            {formatNumber(logTarget.protein, 1)} g de proteína según la etiqueta.
          </Notice>
        ) : null}
      </ModalSheet>

      <ModalSheet
        visible={Boolean(purchaseTarget)}
        onClose={() => setPurchaseTarget(null)}
        title={purchaseTarget ? `Compra de ${purchaseTarget.name}` : 'Registrar compra'}
        subtitle="Añade el gasto y actualiza el stock"
        footer={<Button onPress={savePurchase} loading={saving} icon="cart-outline">Guardar compra</Button>}
      >
        <Input label={`Precio (${profile?.currency || 'USD'})`} value={purchaseValues.price} onChangeText={(value) => setPurchaseValues((current) => ({ ...current, price: value }))} keyboardType="decimal-pad" autoFocus />
        <Input label="Cantidad añadida al stock" value={purchaseValues.quantity} onChangeText={(value) => setPurchaseValues((current) => ({ ...current, quantity: value }))} keyboardType="decimal-pad" placeholder="Opcional" />
        <Input label="Notas" value={purchaseValues.notes} onChangeText={(value) => setPurchaseValues((current) => ({ ...current, notes: value }))} placeholder="Tienda, oferta…" />
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg, marginBottom: spacing.sm },
  icon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: 1, marginTop: spacing.sm, paddingTop: spacing.sm },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
});
