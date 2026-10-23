import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { Header } from '../../src/components/Header';
import { Card } from '../../src/components/Card';
import { StatCard } from '../../src/components/StatCard';
import { LineChart, BarChart, ProgressRing } from '../../src/components/Charts';
import { ProgressBar, MacroBars } from '../../src/components/ProgressBar';
import { Input, Segmented } from '../../src/components/Input';
import { Button, IconButton } from '../../src/components/Button';
import { Notice } from '../../src/components/Notice';
import { LoadingState, EmptyState } from '../../src/components/EmptyState';
import { ModalSheet } from '../../src/components/ModalSheet';
import { useAuth } from '../../src/features/auth/AuthContext';
import { useData } from '../../src/features/profile/DataContext';
import { useEnergyPlan } from '../../src/features/profile/useEnergyPlan';
import { statisticsData } from '../../src/database/repositories/statsRepo';
import {
  deleteMeasurement,
  deleteWeight,
  listMeasurements,
  saveMeasurement,
  upsertWeight,
} from '../../src/database/repositories/weightsRepo';
import { formatDateEs, formatDateShort, todayKey, weekdayShort } from '../../src/utils/date';
import { calculateBMI, bmiCategory } from '../../src/utils/calculations';
import { formatNumber, parseOptionalNumber } from '../../src/utils/numbers';
import { useTheme, spacing, typography } from '../../src/theme';

const PERIODS = [
  { key: 7, label: '7 días' },
  { key: 30, label: '30 días' },
  { key: 90, label: '90 días' },
];

export default function ProgressScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { profile, latestWeight, refreshProfile } = useData();
  const { plan } = useEnergyPlan();
  const [period, setPeriod] = useState(30);
  const [data, setData] = useState(null);
  const [measurements, setMeasurements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [weightOpen, setWeightOpen] = useState(false);
  const [weightForm, setWeightForm] = useState({ weight: '', waist: '', notes: '' });
  const [measureOpen, setMeasureOpen] = useState(false);
  const [measureForm, setMeasureForm] = useState({ waist_cm: '', chest_cm: '', hip_cm: '', arm_cm: '', thigh_cm: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [stats, measurementRows] = await Promise.all([
        statisticsData(user.id, period),
        listMeasurements(user.id, 12),
      ]);
      setData(stats);
      setMeasurements(measurementRows);
      setError('');
    } catch (caught) {
      setError(caught?.message || 'No se pudieron cargar las estadísticas.');
    } finally {
      setLoading(false);
    }
  }, [user, period]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const weights = data?.weights || [];
  const firstWeight = weights[0]?.weight_kg;
  const lastWeight = weights[weights.length - 1]?.weight_kg ?? latestWeight?.weight_kg;
  const weightChange = firstWeight && lastWeight ? Number(lastWeight) - Number(firstWeight) : null;
  const bmi = lastWeight && profile?.height_cm ? calculateBMI(Number(lastWeight), Number(profile.height_cm)) : null;
  const weightChart = weights.map((row) => ({ label: formatDateShort(row.date), value: row.weight_kg }));
  const stepsChart = (data?.steps || []).map((row) => ({ label: weekdayShort(row.date), value: row.steps }));
  const calorieChart = (data?.nutrition || []).map((row) => ({ label: formatDateShort(row.date), value: row.calories }));
  const waterAvg = data?.water?.length ? data.water.reduce((sum, row) => sum + row.ml, 0) / data.water.length : 0;
  const consistency = data ? Math.round((data.consistencyDays / period) * 100) : 0;
  const adherence = data?.avgCalories && plan?.target ? Math.min(150, Math.round((data.avgCalories / plan.target) * 100)) : 0;
  const periodLabel = PERIODS.find((item) => item.key === period)?.label;

  async function saveWeight() {
    const value = parseOptionalNumber(weightForm.weight);
    if (value === null || value < 35 || value > 300) return setError('Introduce un peso entre 35 y 300 kg.');
    setSaving(true);
    try {
      await upsertWeight(user.id, {
        date: todayKey(),
        weightKg: value,
        waistCm: parseOptionalNumber(weightForm.waist),
        notes: weightForm.notes.trim() || undefined,
      });
      setWeightOpen(false);
      setWeightForm({ weight: '', waist: '', notes: '' });
      await Promise.all([load(), refreshProfile()]);
    } catch (caught) {
      setError(caught?.message || 'No se pudo guardar el peso.');
    } finally {
      setSaving(false);
    }
  }

  async function saveMeasures() {
    setSaving(true);
    try {
      await saveMeasurement(user.id, {
        date: todayKey(),
        waist_cm: parseOptionalNumber(measureForm.waist_cm),
        chest_cm: parseOptionalNumber(measureForm.chest_cm),
        hip_cm: parseOptionalNumber(measureForm.hip_cm),
        arm_cm: parseOptionalNumber(measureForm.arm_cm),
        thigh_cm: parseOptionalNumber(measureForm.thigh_cm),
        notes: measureForm.notes.trim(),
      });
      setMeasureOpen(false);
      setMeasureForm({ waist_cm: '', chest_cm: '', hip_cm: '', arm_cm: '', thigh_cm: '', notes: '' });
      await load();
    } catch (caught) {
      setError(caught?.message || 'No se pudieron guardar las medidas.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDeleteWeight(row) {
    Alert.alert('Eliminar registro', `¿Eliminar el peso del ${formatDateShort(row.date)}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteWeight(user.id, row.id);
            await Promise.all([load(), refreshProfile()]);
          } catch (caught) {
            setError(caught?.message || 'No se pudo eliminar.');
          }
        },
      },
    ]);
  }

  function confirmDeleteMeasurement(row) {
    Alert.alert('Eliminar medidas', `¿Eliminar las medidas del ${formatDateShort(row.date)}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMeasurement(user.id, row.id);
            await load();
          } catch (caught) {
            setError(caught?.message || 'No se pudo eliminar.');
          }
        },
      },
    ]);
  }

  if (loading && !data) return <Screen><LoadingState message="Calculando tu progreso…" /></Screen>;

  return (
    <Screen scroll>
      <Header title="Progreso" subtitle="Tendencias, no días aislados" />
      <Segmented options={PERIODS.map((item) => ({ key: item.key, label: item.label }))} value={period} onChange={setPeriod} />
      {error ? <Notice tone="danger" title="Aviso" style={{ marginTop: spacing.sm }}>{error}</Notice> : null}

      <Card style={{ marginTop: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.label, { color: colors.textMuted }]}>Peso actual</Text>
            <Text style={[typography.h1, { color: colors.text, marginTop: 2 }]}>
              {lastWeight ? `${formatNumber(lastWeight, 1)} kg` : 'Sin datos'}
            </Text>
            <Text style={[typography.small, { color: colors.textMuted }]}>
              {weightChange === null
                ? 'Registra tu peso para ver la tendencia'
                : `${weightChange > 0 ? '+' : ''}${formatNumber(weightChange, 1)} kg en ${periodLabel.toLowerCase()}`}
            </Text>
            {profile?.target_weight_kg ? (
              <Text style={[typography.tiny, { color: colors.textSubtle, textTransform: 'none', letterSpacing: 0, marginTop: 3 }]}>
                Objetivo: {formatNumber(profile.target_weight_kg, 1)} kg
              </Text>
            ) : null}
          </View>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <ProgressRing
              value={bmi || 0}
              max={40}
              size={84}
              strokeWidth={8}
              centerValue={bmi ? formatNumber(bmi, 1) : '—'}
              centerLabel="IMC"
              color={bmi && bmi >= 18.5 && bmi < 25 ? colors.accent : colors.warning}
            />
            <Text style={[typography.tiny, { color: colors.textMuted, textTransform: 'none', letterSpacing: 0 }]}>{bmiCategory(bmi)}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
          <Button variant="secondary" small icon="scale-outline" onPress={() => setWeightOpen(true)} style={{ flex: 1 }}>
            Registrar peso
          </Button>
          <Button variant="outline" small icon="body-outline" onPress={() => setMeasureOpen(true)} style={{ flex: 1 }}>
            Medidas
          </Button>
        </View>
        <Text style={[typography.tiny, { color: colors.textSubtle, marginTop: spacing.sm, textTransform: 'none', letterSpacing: 0 }]}>
          El IMC es una referencia poblacional, no un diagnóstico. No distingue grasa de músculo.
        </Text>
      </Card>

      <Card style={{ marginTop: spacing.sm }}>
        <View style={styles.cardHeader}>
          <Text style={[typography.h3, { color: colors.text }]}>Peso</Text>
          <Text style={[typography.small, { color: colors.textMuted }]}>{weights.length} registros</Text>
        </View>
        <LineChart data={weightChart} height={160} unit="kg" color={colors.primary} emptyMessage="Añade al menos un peso para ver la evolución." />
        {weights.length > 1 ? (
          <Text style={[typography.tiny, { color: colors.textSubtle, marginTop: spacing.sm, textTransform: 'none', letterSpacing: 0 }]}>
            La báscula fluctúa por agua, glucógeno y digestión. Mira la línea de varias semanas, no el cambio de un día.
          </Text>
        ) : null}
      </Card>

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
        <StatCard label="Calorías medias" value={data?.avgCalories ? formatNumber(Math.round(data.avgCalories)) : '—'} unit="kcal" icon="flame-outline" sub={plan?.target ? `Objetivo ${formatNumber(plan.target)}` : 'Sin objetivo'} />
        <StatCard label="Proteína media" value={data?.avgProtein ? formatNumber(data.avgProtein, 0) : '—'} unit="g" icon="barbell-outline" sub={plan?.macros ? `Objetivo ${formatNumber(plan.macros.protein)} g` : ''} />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
        <StatCard label="Pasos medios" value={data?.avgSteps ? formatNumber(data.avgSteps) : '—'} icon="footsteps-outline" sub={`Meta ${formatNumber(profile?.step_goal || 8000)}`} />
        <StatCard label="Agua media" value={formatNumber(Math.round(waterAvg))} unit="ml" icon="water-outline" sub={plan ? `Objetivo ${formatNumber(profile?.water_goal_ml || 0)} ml` : ''} />
      </View>

      <Card style={{ marginTop: spacing.sm }}>
        <View style={styles.cardHeader}>
          <Text style={[typography.h3, { color: colors.text }]}>Calorías</Text>
          <Text style={[typography.small, { color: colors.textMuted }]}>{periodLabel}</Text>
        </View>
        <BarChart data={calorieChart} height={150} unit="kcal" target={plan?.target} color={colors.primary} emptyMessage="Registra comidas para ver tu energía diaria." />
      </Card>

      <Card style={{ marginTop: spacing.sm }}>
        <View style={styles.cardHeader}>
          <Text style={[typography.h3, { color: colors.text }]}>Pasos</Text>
          <Text style={[typography.small, { color: colors.textMuted }]}>{periodLabel}</Text>
        </View>
        <BarChart data={stepsChart} height={150} unit="pasos" target={profile?.step_goal || 8000} color={colors.info} emptyMessage="Registra pasos desde Inicio o Progreso." />
      </Card>

      <Card style={{ marginTop: spacing.sm }}>
        <View style={styles.cardHeader}>
          <Text style={[typography.h3, { color: colors.text }]}>Constancia</Text>
          <Text style={[typography.small, { color: colors.textMuted }]}>{data?.consistencyDays || 0} de {period} días</Text>
        </View>
        <ProgressBar value={data?.consistencyDays || 0} max={period} color={colors.accent} height={9} />
        <View style={styles.constancyGrid}>
          <Constancy label="Días con comida" value={data?.mealDays || 0} />
          <Constancy label="Entrenos" value={data?.workoutCount || 0} />
          <Constancy label="Registros" value={`${consistency}%`} />
        </View>
        {plan?.target ? (
          <View style={{ marginTop: spacing.sm }}>
            <Text style={[typography.tiny, { color: colors.textMuted, marginBottom: 4, textTransform: 'none', letterSpacing: 0 }]}>
              Calorías medias frente al objetivo: {adherence}%
            </Text>
            <ProgressBar value={adherence} max={100} color={adherence > 115 ? colors.warning : colors.primary} height={6} />
          </View>
        ) : null}
      </Card>

      {weights.length ? (
        <>
          <View style={styles.sectionRow}>
            <Text style={[typography.h3, { color: colors.text }]}>Últimos pesos</Text>
            <Button small full={false} variant="ghost" icon="add" onPress={() => setWeightOpen(true)}>Añadir</Button>
          </View>
          <Card padding="sm">
            {[...weights].reverse().slice(0, 6).map((row, index) => (
              <View key={row.id} style={[styles.logRow, index > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
                <Text style={[typography.tiny, { color: colors.textSubtle, width: 52, textTransform: 'none', letterSpacing: 0 }]}>{formatDateShort(row.date)}</Text>
                <Text style={[typography.small, { color: colors.text, flex: 1 }]}>{formatNumber(row.weight_kg, 1)} kg</Text>
                {row.waist_cm ? <Text style={[typography.tiny, { color: colors.textMuted, textTransform: 'none', letterSpacing: 0 }]}>cintura {formatNumber(row.waist_cm, 1)} cm</Text> : null}
                <IconButton icon="trash-outline" size={14} color={colors.danger} onPress={() => confirmDeleteWeight(row)} accessibilityLabel="Eliminar peso" />
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <View style={styles.sectionRow}>
        <Text style={[typography.h3, { color: colors.text }]}>Medidas corporales</Text>
        <Button small full={false} variant="ghost" icon="add" onPress={() => setMeasureOpen(true)}>Añadir</Button>
      </View>
      {measurements.length ? (
        <Card padding="sm">
          {measurements.slice(0, 5).map((row, index) => (
            <View key={row.id} style={[styles.logRow, index > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.small, { color: colors.text }]}>{formatDateEs(row.date)}</Text>
                <Text style={[typography.tiny, { color: colors.textSubtle, textTransform: 'none', letterSpacing: 0 }]}>
                  {[
                    row.waist_cm ? `cintura ${formatNumber(row.waist_cm, 1)}` : null,
                    row.chest_cm ? `pecho ${formatNumber(row.chest_cm, 1)}` : null,
                    row.hip_cm ? `cadera ${formatNumber(row.hip_cm, 1)}` : null,
                    row.arm_cm ? `brazo ${formatNumber(row.arm_cm, 1)}` : null,
                    row.thigh_cm ? `muslo ${formatNumber(row.thigh_cm, 1)}` : null,
                  ].filter(Boolean).join(' · ') || 'Sin datos'} cm
                </Text>
              </View>
              <IconButton icon="trash-outline" size={14} color={colors.danger} onPress={() => confirmDeleteMeasurement(row)} accessibilityLabel="Eliminar medidas" />
            </View>
          ))}
        </Card>
      ) : (
        <EmptyState icon="body-outline" title="Sin medidas" message="Medir cintura, pecho o brazos ayuda cuando la báscula no cuenta toda la historia." actionLabel="Añadir medidas" onAction={() => setMeasureOpen(true)} />
      )}

      {plan?.macros ? (
        <Card style={{ marginTop: spacing.md }}>
          <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.sm }]}>Tus objetivos actuales</Text>
          <MacroBars calories={data?.avgCalories || 0} target={plan.target} protein={data?.avgProtein || 0} carbs={0} fat={0} targets={plan.macros} />
          <Text style={[typography.tiny, { color: colors.textSubtle, marginTop: spacing.sm, textTransform: 'none', letterSpacing: 0 }]}>
            Las barras de carbohidratos y grasas muestran el objetivo; el detalle diario está en Comida. Las medias de la gráfica
            solo incluyen días con registros.
          </Text>
        </Card>
      ) : null}

      <ModalSheet visible={weightOpen} onClose={() => setWeightOpen(false)} title="Registrar peso y cintura" subtitle={formatDateEs(todayKey())} footer={<Button onPress={saveWeight} loading={saving}>Guardar</Button>}>
        <Input label="Peso (kg)" required value={weightForm.weight} onChangeText={(value) => setWeightForm((current) => ({ ...current, weight: value }))} keyboardType="decimal-pad" placeholder={latestWeight ? String(latestWeight.weight_kg) : '72,5'} autoFocus />
        <Input label="Cintura (cm)" value={weightForm.waist} onChangeText={(value) => setWeightForm((current) => ({ ...current, waist: value }))} keyboardType="decimal-pad" placeholder="Opcional" />
        <Input label="Notas" value={weightForm.notes} onChangeText={(value) => setWeightForm((current) => ({ ...current, notes: value }))} placeholder="Ayunas, después de entrenar…" />
        <Notice tone="info">Mide siempre en condiciones parecidas. La tendencia semanal es más fiable que un único registro.</Notice>
      </ModalSheet>

      <ModalSheet visible={measureOpen} onClose={() => setMeasureOpen(false)} title="Medidas corporales" subtitle={formatDateEs(todayKey())} footer={<Button onPress={saveMeasures} loading={saving}>Guardar medidas</Button>}>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Input label="Cintura (cm)" style={{ flex: 1 }} value={measureForm.waist_cm} onChangeText={(value) => setMeasureForm((current) => ({ ...current, waist_cm: value }))} keyboardType="decimal-pad" />
          <Input label="Pecho (cm)" style={{ flex: 1 }} value={measureForm.chest_cm} onChangeText={(value) => setMeasureForm((current) => ({ ...current, chest_cm: value }))} keyboardType="decimal-pad" />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Input label="Cadera (cm)" style={{ flex: 1 }} value={measureForm.hip_cm} onChangeText={(value) => setMeasureForm((current) => ({ ...current, hip_cm: value }))} keyboardType="decimal-pad" />
          <Input label="Brazo (cm)" style={{ flex: 1 }} value={measureForm.arm_cm} onChangeText={(value) => setMeasureForm((current) => ({ ...current, arm_cm: value }))} keyboardType="decimal-pad" />
        </View>
        <Input label="Muslo (cm)" value={measureForm.thigh_cm} onChangeText={(value) => setMeasureForm((current) => ({ ...current, thigh_cm: value }))} keyboardType="decimal-pad" />
        <Input label="Notas" value={measureForm.notes} onChangeText={(value) => setMeasureForm((current) => ({ ...current, notes: value }))} placeholder="Zona medida, condiciones…" multiline />
        <Notice tone="info">Mide sin ropa gruesa, con la cinta ajustada sin apretar y en el mismo punto anatómico cada vez.</Notice>
      </ModalSheet>

      <Notice tone="medical" title="Interpreta con contexto" style={{ marginTop: spacing.md }}>
        El peso y las medidas cambian por hidratación, ciclo menstrual, sal, fibra y entrenamiento. Si el malestar con tu cuerpo
        o la comida persiste, busca apoyo profesional.
      </Notice>
    </Screen>
  );
}

function Constancy({ label, value }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={[typography.h3, { color: colors.text }]}>{value}</Text>
      <Text style={[typography.tiny, { color: colors.textSubtle, textTransform: 'none', letterSpacing: 0, textAlign: 'center' }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.sm },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  constancyGrid: { flexDirection: 'row', marginTop: spacing.md },
});
