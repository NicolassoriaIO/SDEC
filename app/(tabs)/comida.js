import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { Card } from '../../src/components/Card';
import { Header } from '../../src/components/Header';
import { DateStepper } from '../../src/components/DateStepper';
import { ProgressRing } from '../../src/components/Charts';
import { MacroBars } from '../../src/components/ProgressBar';
import { Button, IconButton } from '../../src/components/Button';
import { EmptyState, LoadingState } from '../../src/components/EmptyState';
import { Notice } from '../../src/components/Notice';
import { QuantityStepper } from '../../src/components/QuantityStepper';
import { ModalSheet } from '../../src/components/ModalSheet';
import { useAuth } from '../../src/features/auth/AuthContext';
import { useEnergyPlan } from '../../src/features/profile/useEnergyPlan';
import { copyMeal, deleteMealItem, getDayMeals, updateMealItemQuantity } from '../../src/database/repositories/mealsRepo';
import { getDaySupplementTotals } from '../../src/database/repositories/supplementsRepo';
import { addDays, formatDateEs, todayKey } from '../../src/utils/date';
import { formatNumber, parseOptionalNumber } from '../../src/utils/numbers';
import { useTheme, spacing, radius, typography } from '../../src/theme';

export default function MealsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { plan } = useEnergyPlan();
  const [date, setDate] = useState(todayKey());
  const [data, setData] = useState(null);
  const [supplements, setSupplements] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0, logs: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState('');

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [meals, supp] = await Promise.all([getDayMeals(user.id, date), getDaySupplementTotals(user.id, date)]);
      setData(meals);
      setSupplements(supp);
      setError('');
    } catch (caught) {
      setError(caught?.message || 'No se pudieron cargar las comidas.');
    } finally {
      setLoading(false);
    }
  }, [user, date]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const totals = {
    calories: (data?.totals?.calories || 0) + supplements.calories,
    protein: (data?.totals?.protein || 0) + supplements.protein,
    carbs: (data?.totals?.carbs || 0) + supplements.carbs,
    fat: (data?.totals?.fat || 0) + supplements.fat,
    fiber: data?.totals?.fiber || 0,
  };
  const target = plan?.target || null;
  const editingIsPortion = Boolean(editing?.serving_grams > 0 && editing?.display_quantity != null);
  const editingUnits = parseOptionalNumber(quantity) || 0;
  const editingGrams = editingIsPortion ? editingUnits * editing.serving_grams : editingUnits;

  function openItem(item) {
    setEditing(item);
    setQuantity(String(item.serving_grams > 0 && item.display_quantity != null ? item.display_quantity : item.quantity_g));
  }

  async function saveQuantity() {
    if (editingGrams <= 0) return setError('Introduce una cantidad mayor que cero.');
    setSaving(true);
    try {
      await updateMealItemQuantity(
        user.id,
        editing.id,
        editingGrams,
        editingIsPortion
          ? { displayQuantity: editingUnits, unit: editing.unit }
          : { displayQuantity: editingGrams, unit: 'g' }
      );
      setEditing(null);
      await load();
    } catch (caught) {
      setError(caught?.message || 'No se pudo actualizar el alimento.');
    } finally {
      setSaving(false);
    }
  }

  async function removeItem() {
    setSaving(true);
    try {
      await deleteMealItem(user.id, editing.id);
      setEditing(null);
      await load();
    } catch (caught) {
      setError(caught?.message || 'No se pudo eliminar el alimento.');
    } finally {
      setSaving(false);
    }
  }

  async function copyPrevious(mealType) {
    setCopying(mealType);
    try {
      const result = await copyMeal(user.id, { fromDate: addDays(date, -1), toDate: date, mealType });
      if (!result.copied) setError('No hay alimentos registrados en esa comida ayer.');
      await load();
    } catch (caught) {
      setError(caught?.message || 'No se pudo copiar la comida.');
    } finally {
      setCopying('');
    }
  }

  const mealsWithContent = (data?.groups || []).filter((group) => group.items.length || ['desayuno', 'almuerzo', 'cena'].includes(group.key));
  const caloriePct = target ? Math.round((totals.calories / target) * 100) : 0;
  const isToday = date === todayKey();

  return (
    <Screen scroll>
      <Header
        title="Comida"
        subtitle={formatDateEs(date, { weekday: 'long', year: 'numeric' })}
        right={<IconButton icon="clipboard-outline" onPress={() => router.push('/(tabs)/perfil')} accessibilityLabel="Exportar datos" />}
      />
      <DateStepper date={date} onChange={setDate} />

      {error ? (
        <Notice tone="danger" title="Aviso" style={{ marginTop: spacing.md }}>
          {error}
        </Notice>
      ) : null}

      <Card style={{ marginTop: spacing.md }}>
        <View style={styles.summaryTop}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.label, { color: colors.textMuted }]}>Calorías del día</Text>
            <Text style={[typography.h1, { color: colors.text, marginTop: 2 }]}>
              {formatNumber(Math.round(totals.calories))}
            </Text>
            <Text style={[typography.small, { color: colors.textMuted }]}>
              {target ? `de ${formatNumber(target)} kcal objetivo` : 'Sin objetivo calculado'}
            </Text>
            {supplements.calories > 0 ? (
              <Text style={[typography.tiny, { color: colors.textSubtle, marginTop: 4, textTransform: 'none', letterSpacing: 0 }]}>
                Incluye {formatNumber(Math.round(supplements.calories))} kcal de suplementos
              </Text>
            ) : null}
          </View>
          <ProgressRing
            value={totals.calories}
            max={target || totals.calories || 1}
            size={104}
            strokeWidth={9}
            color={target && totals.calories > target * 1.05 ? colors.warning : colors.primary}
            centerValue={`${target ? caloriePct : 0}%`}
            centerLabel="objetivo"
          />
        </View>
        <View style={{ marginTop: spacing.md }}>
          <MacroBars
            calories={totals.calories}
            target={target}
            protein={totals.protein}
            carbs={totals.carbs}
            fat={totals.fat}
            targets={plan?.macros}
          />
        </View>
        <View style={[styles.fiberRow, { borderTopColor: colors.border }]}>
          <Text style={[typography.small, { color: colors.textMuted }]}>Fibra</Text>
          <Text style={[typography.small, { color: colors.text, fontWeight: '700' }]}>
            {formatNumber(totals.fiber, 1)} g {plan?.macros?.fiber ? `/ ${formatNumber(plan.macros.fiber)} g` : ''}
          </Text>
        </View>
      </Card>

      <View style={styles.quickGrid}>
        <QuickAction icon="search-outline" label="Alimentos" onPress={() => router.push({ pathname: '/comida/alimento', params: { date, mealType: 'almuerzo' } })} />
        <QuickAction icon="book-outline" label="Recetas" onPress={() => router.push({ pathname: '/comida/receta', params: { date } })} />
        <QuickAction icon="flask-outline" label="Suplementos" onPress={() => router.push({ pathname: '/comida/suplemento', params: { date } })} />
        <QuickAction icon="wallet-outline" label="Presupuesto" onPress={() => router.push('/comida/presupuesto')} />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[typography.h3, { color: colors.text }]}>Comidas</Text>
        <Text style={[typography.small, { color: colors.textMuted }]}>{data?.items?.length || 0} alimentos</Text>
      </View>

      {loading && !data ? <LoadingState message="Cargando comidas…" /> : null}

      {mealsWithContent.map((group) => (
        <Card key={group.key} style={{ marginBottom: spacing.sm }} padding="sm">
          <View style={styles.mealHeader}>
            <View style={[styles.mealIcon, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name={group.icon} size={17} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.small, { color: colors.text, fontWeight: '800' }]}>{group.label}</Text>
              <Text style={[typography.tiny, { color: colors.textSubtle, textTransform: 'none', letterSpacing: 0 }]}>
                {group.items.length ? `${formatNumber(Math.round(group.totals.calories))} kcal · P ${formatNumber(group.totals.protein, 1)} g` : 'Sin registrar'}
              </Text>
            </View>
            {group.items.length ? (
              <IconButton
                icon="copy-outline"
                size={16}
                onPress={() => copyPrevious(group.key)}
                accessibilityLabel={`Copiar ${group.label} de ayer`}
                disabled={copying === group.key}
              />
            ) : null}
            <Button
              variant="ghost"
              small
              full={false}
              icon="add"
              onPress={() => router.push({ pathname: '/comida/alimento', params: { date, mealType: group.key } })}
              accessibilityLabel={`Añadir a ${group.label}`}
            >
              Añadir
            </Button>
          </View>
          {group.items.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => openItem(item)}
              style={({ pressed }) => [styles.itemRow, { borderTopColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[typography.small, { color: colors.text }]} numberOfLines={1}>
                  {item.food_name}
                </Text>
                <Text style={[typography.tiny, { color: colors.textSubtle }]}>
                  {item.serving_grams && item.display_quantity
                    ? `${formatNumber(item.display_quantity)} × ${item.unit} · ${formatNumber(item.quantity_g)} g`
                    : `${formatNumber(item.quantity_g)} g`}{' '}
                  · P {formatNumber(item.protein, 1)} · C {formatNumber(item.carbs, 1)} · G {formatNumber(item.fat, 1)}
                </Text>
              </View>
              <Text style={[typography.small, { color: colors.primary, fontWeight: '800' }]}>
                {formatNumber(Math.round(item.calories))} kcal
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textSubtle} />
            </Pressable>
          ))}
          {group.notes ? (
            <Text style={[typography.small, { color: colors.textMuted, paddingTop: spacing.xs }]}>{group.notes}</Text>
          ) : null}
        </Card>
      ))}

      {supplements.logs?.length ? (
        <Card style={{ marginTop: spacing.sm }}>
          <View style={styles.mealHeader}>
            <View style={[styles.mealIcon, { backgroundColor: colors.surfaceAlt }]}>
              <Ionicons name="flask-outline" size={17} color={colors.info} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.small, { color: colors.text, fontWeight: '800' }]}>Suplementos</Text>
              <Text style={[typography.tiny, { color: colors.textSubtle, textTransform: 'none', letterSpacing: 0 }]}>
                {supplements.logs.length} registros · {formatNumber(Math.round(supplements.calories))} kcal
              </Text>
            </View>
            <IconButton icon="chevron-forward" size={16} onPress={() => router.push({ pathname: '/comida/suplemento', params: { date } })} />
          </View>
          {supplements.logs.map((log) => (
            <View key={log.id} style={[styles.itemRow, { borderTopColor: colors.border }]}>
              <Text style={[typography.small, { color: colors.text, flex: 1 }]}>{log.supplement_name}</Text>
              <Text style={[typography.tiny, { color: colors.textMuted }]}>
                {formatNumber(log.servings, 1)} × {log.time || ''}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}

      {!isToday ? (
        <Notice tone="info" title="Estás viendo otro día" style={{ marginTop: spacing.sm }}>
          Los cambios se guardan en la fecha seleccionada. Vuelve a “Hoy” tocando la fecha.
        </Notice>
      ) : null}

      <EmptyState
        icon="book-outline"
        title="¿Sin ideas para cocinar?"
        message="Usa las recetas económicas con macros y coste estimado por porción."
        actionLabel="Ver recetas"
        onAction={() => router.push({ pathname: '/comida/receta', params: { date } })}
        style={{ marginTop: spacing.sm }}
      />

      <ModalSheet
        visible={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.food_name || 'Editar alimento'}
        subtitle="Ajusta la cantidad; los macros se recalculan."
        footer={
          <View style={{ gap: spacing.sm }}>
            <Button onPress={saveQuantity} loading={saving}>Guardar cantidad</Button>
            <Button variant="danger" onPress={removeItem} disabled={saving} icon="trash-outline">
              Eliminar del registro
            </Button>
          </View>
        }
      >
        {editing ? (
          <>
            <QuantityStepper
              label={editingIsPortion ? 'Número de porciones' : 'Cantidad (g)'}
              value={quantity}
              onChangeText={setQuantity}
              step={editingIsPortion ? 1 : 10}
              min={1}
              unit={editingIsPortion ? 'porciones' : 'g'}
              autoFocus
              hint={
                editingIsPortion
                  ? `${formatNumber(editingUnits)} × ${editing.unit} = ${formatNumber(editingGrams)} g. Ajusta con − y +.`
                  : 'Ajusta con − y +. Los macros se recalculan.'
              }
            />
            <View style={[styles.macroGrid, { backgroundColor: colors.surfaceAlt }]}>
              <MacroPill label="kcal" value={formatNumber(Math.round((editing.calories / editing.quantity_g) * editingGrams))} color={colors.primary} />
              <MacroPill label="P" value={`${formatNumber((editing.protein / editing.quantity_g) * editingGrams, 1)} g`} color={colors.protein} />
              <MacroPill label="C" value={`${formatNumber((editing.carbs / editing.quantity_g) * editingGrams, 1)} g`} color={colors.carbs} />
              <MacroPill label="G" value={`${formatNumber((editing.fat / editing.quantity_g) * editingGrams, 1)} g`} color={colors.fat} />
            </View>
            <Notice tone="info">Los valores provienen del catálogo o de tu registro. Las estimaciones visuales son aproximadas.</Notice>
          </>
        ) : null}
      </ModalSheet>
    </Screen>
  );
}

function QuickAction({ icon, label, onPress }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.quick, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
    >
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={[typography.tiny, { color: colors.textMuted, textTransform: 'none', letterSpacing: 0 }]}>{label}</Text>
    </Pressable>
  );
}

function MacroPill({ label, value, color }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={[typography.tiny, { color }]}>{label}</Text>
      <Text style={[typography.small, { color, fontWeight: '800' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  fiberRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, marginTop: spacing.md, paddingTop: spacing.sm },
  quickGrid: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  quick: { flex: 1, alignItems: 'center', gap: 5, paddingVertical: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.sm },
  mealHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.xs },
  mealIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: spacing.sm },
  macroGrid: { flexDirection: 'row', borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm },
});
