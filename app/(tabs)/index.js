import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Screen } from '../../src/components/Screen';
import { Card } from '../../src/components/Card';
import { StatCard } from '../../src/components/StatCard';
import { ProgressRing, BarChart } from '../../src/components/Charts';
import { MacroBars } from '../../src/components/ProgressBar';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { ModalSheet } from '../../src/components/ModalSheet';
import { EmptyState, LoadingState } from '../../src/components/EmptyState';
import { Notice } from '../../src/components/Notice';
import { useAuth } from '../../src/features/auth/AuthContext';
import { useData } from '../../src/features/profile/DataContext';
import { useEnergyPlan } from '../../src/features/profile/useEnergyPlan';
import { dashboardData } from '../../src/database/repositories/statsRepo';
import { addWater } from '../../src/database/repositories/waterRepo';
import { upsertSteps } from '../../src/database/repositories/stepsRepo';
import { startSession } from '../../src/database/repositories/workoutsRepo';
import { formatDateEs, todayKey, weekdayShort } from '../../src/utils/date';
import { formatCurrency, formatNumber, parseOptionalNumber } from '../../src/utils/numbers';
import { useTheme, spacing, radius, typography } from '../../src/theme';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { profile, latestWeight, saveWeight } = useData();
  const { plan, waterGoal, ready } = useEnergyPlan();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stepModal, setStepModal] = useState(false);
  const [weightModal, setWeightModal] = useState(false);
  const [stepsValue, setStepsValue] = useState('');
  const [weightValue, setWeightValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await dashboardData(user.id);
      setStats(data);
      setError('');
    } catch (caught) {
      setError(caught?.message || 'No se pudieron cargar los datos de hoy.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const target = plan?.target || null;
  const calories = stats?.totals?.calories || 0;
  const remaining = target ? Math.max(0, Math.round(target - calories)) : null;
  const water = stats?.water || 0;
  const steps = stats?.steps?.steps || 0;
  const stepGoal = stats?.steps?.goal || profile?.step_goal || 8000;
  const weeklyCalories = (stats?.week?.nutrition || []).map((row) => ({ label: weekdayShort(row.date), value: row.calories }));
  const planned = stats?.plan;

  async function quickWater(ml) {
    try {
      await addWater(user.id, ml);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      await load();
    } catch (caught) {
      setError(caught?.message || 'No se pudo registrar el agua.');
    }
  }

  async function saveSteps() {
    const value = parseOptionalNumber(stepsValue);
    if (value === null || value < 0) return setError('Introduce un número de pasos válido.');
    setSaving(true);
    try {
      await upsertSteps(user.id, { date: todayKey(), steps: value, goal: stepGoal, source: 'manual' });
      setStepModal(false);
      setStepsValue('');
      await load();
    } catch (caught) {
      setError(caught?.message || 'No se pudieron guardar los pasos.');
    } finally {
      setSaving(false);
    }
  }

  async function saveWeightEntry() {
    const value = parseOptionalNumber(weightValue);
    if (value === null || value < 35 || value > 300) return setError('Introduce un peso entre 35 y 300 kg.');
    setSaving(true);
    try {
      await saveWeight({ date: todayKey(), weightKg: value });
      setWeightModal(false);
      setWeightValue('');
      await load();
    } catch (caught) {
      setError(caught?.message || 'No se pudo guardar el peso.');
    } finally {
      setSaving(false);
    }
  }

  async function startWorkout() {
    setStarting(true);
    try {
      const session = await startSession(user.id, planned?.id || null, todayKey());
      router.push(`/entrenamiento/sesion/${session.id}`);
    } catch (caught) {
      setError(caught?.message || 'No se pudo iniciar el entrenamiento.');
      setStarting(false);
    }
  }

  if (loading && !stats) return <Screen><LoadingState message="Cargando tu día…" /></Screen>;

  return (
    <Screen scroll>
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={[typography.small, { color: colors.textMuted }]}>{greeting()},</Text>
          <Text style={[typography.h1, { color: colors.text }]} numberOfLines={1}>
            {profile?.display_name || 'Atleta'}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/(tabs)/perfil')}
          style={[styles.avatar, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}
          accessibilityLabel="Abrir perfil"
        >
          <Text style={{ color: colors.primary, fontWeight: '900', fontSize: 18 }}>
            {(profile?.display_name || 'S').trim().charAt(0).toUpperCase()}
          </Text>
        </Pressable>
      </View>

      <View style={[styles.datePill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="calendar-outline" size={15} color={colors.primary} />
        <Text style={[typography.small, { color: colors.textMuted }]}>
          {formatDateEs(todayKey(), { weekday: 'long', year: 'numeric' })}
        </Text>
      </View>

      {error ? (
        <Notice tone="danger" title="Algo no salió bien" style={{ marginTop: spacing.md }}>
          {error}
        </Notice>
      ) : null}

      {!ready ? (
        <Card style={{ marginTop: spacing.md }}>
          <Text style={[typography.h3, { color: colors.text }]}>Completa tu perfil</Text>
          <Text style={[typography.small, { color: colors.textMuted, marginTop: 4 }]}>
            Necesitamos tu peso, estatura y fecha de nacimiento para calcular tus objetivos.
          </Text>
          <Button onPress={() => router.push('/(tabs)/perfil')} variant="secondary" small style={{ marginTop: spacing.md }}>
            Ir a mi perfil
          </Button>
        </Card>
      ) : (
        <Card style={{ marginTop: spacing.md }}>
          <View style={styles.calorieTop}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.label, { color: colors.textMuted }]}>Balance de hoy</Text>
              <Text style={[typography.h3, { color: colors.text, marginTop: 2 }]}>
                {remaining === 0 ? 'Objetivo alcanzado' : `${formatNumber(Math.round(remaining || 0))} kcal restantes`}
              </Text>
              <Text style={[typography.small, { color: colors.textMuted }]}>
                {formatNumber(Math.round(calories))} de {formatNumber(target)} kcal
              </Text>
            </View>
            <ProgressRing
              value={calories}
              max={target}
              size={108}
              strokeWidth={9}
              color={calories > target * 1.05 ? colors.warning : colors.primary}
              centerValue={`${Math.min(999, Math.round((calories / target) * 100))}%`}
              centerLabel="del objetivo"
            />
          </View>
          <MacroBars
            calories={calories}
            target={target}
            protein={stats?.totals?.protein || 0}
            carbs={stats?.totals?.carbs || 0}
            fat={stats?.totals?.fat || 0}
            targets={plan?.macros}
          />
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
            <Button variant="secondary" small icon="restaurant-outline" onPress={() => router.push('/(tabs)/comida')} style={{ flex: 1 }}>
              Comidas
            </Button>
            <Button variant="secondary" small icon="scale-outline" onPress={() => setWeightModal(true)} style={{ flex: 1 }}>
              Pesar
            </Button>
          </View>
        </Card>
      )}

      <View style={styles.grid}>
        <StatCard
          label="Agua"
          value={formatNumber(water)}
          unit={`/ ${formatNumber(waterGoal)} ml`}
          icon="water-outline"
          tone="water"
          valueColor={colors.water}
          sub="Toca +250 o +500 para sumar"
          onPress={() => quickWater(250)}
        />
        <StatCard
          label="Pasos"
          value={formatNumber(steps)}
          unit={`/ ${formatNumber(stepGoal)}`}
          icon="footsteps-outline"
          sub={steps >= stepGoal ? 'Meta cumplida' : 'Registro manual'}
          onPress={() => {
            setStepsValue(String(steps || ''));
            setStepModal(true);
          }}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
        <Button variant="outline" small icon="water-outline" onPress={() => quickWater(250)} style={{ flex: 1 }}>
          +250 ml
        </Button>
        <Button variant="outline" small icon="water" onPress={() => quickWater(500)} style={{ flex: 1 }}>
          +500 ml
        </Button>
      </View>

      {planned ? (
        <Card style={{ marginTop: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={[styles.iconBadge, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="barbell-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.tiny, { color: colors.primary }]}>TOCA ENTRENAR</Text>
              <Text style={[typography.h3, { color: colors.text }]} numberOfLines={1}>
                {planned.name}
              </Text>
              <Text style={[typography.small, { color: colors.textMuted }]}>
                {planned.exercise_count} ejercicios · {planned.level}
              </Text>
            </View>
            {stats?.workout?.completedToday ? (
              <View style={[styles.done, { backgroundColor: colors.successSoft }]}>
                <Ionicons name="checkmark" size={16} color={colors.accent} />
                <Text style={[typography.tiny, { color: colors.accent }]}>Hecho</Text>
              </View>
            ) : (
              <Button small variant="primary" onPress={startWorkout} loading={starting} style={{ alignSelf: 'center' }}>
                Empezar
              </Button>
            )}
          </View>
        </Card>
      ) : (
        <EmptyState
          icon="barbell-outline"
          title="Hoy no hay rutina programada"
          message="Puedes entrenar igualmente o revisar tus rutinas."
          actionLabel="Ver entrenamiento"
          onAction={() => router.push('/(tabs)/entrenamiento')}
          style={{ marginTop: spacing.md }}
        />
      )}

      <Card style={{ marginTop: spacing.md }}>
        <View style={styles.cardHeader}>
          <Text style={[typography.h3, { color: colors.text }]}>Calorías · 7 días</Text>
          <Text style={[typography.small, { color: colors.textMuted }]}>
            {formatNumber(stats?.week?.nutrition?.reduce((sum, row) => sum + row.calories, 0) / 7)} kcal/día
          </Text>
        </View>
        <BarChart data={weeklyCalories} height={132} unit="kcal" target={target} color={colors.primary} />
      </Card>

      <View style={styles.grid}>
        <StatCard
          label="Entrenos esta semana"
          value={stats?.workout?.weekCount || 0}
          unit="sesiones"
          icon="barbell-outline"
          sub={`${formatNumber(stats?.workout?.weekMinutes || 0)} min acumulados`}
        />
        <StatCard
          label="Gasto semanal"
          value={formatCurrency(stats?.budget?.week || 0, profile?.currency || 'USD')}
          icon="wallet-outline"
          sub={
            profile?.weekly_budget
              ? `Presupuesto ${formatCurrency(profile.weekly_budget, profile.currency)}`
              : 'Sin presupuesto definido'
          }
          tone={(stats?.budget?.week || 0) > (profile?.weekly_budget || Infinity) ? 'danger' : 'default'}
        />
      </View>

      <View style={[styles.tip, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
        <Ionicons name="bulb-outline" size={18} color={colors.warning} />
        <Text style={[typography.small, { color: colors.textMuted, flex: 1, lineHeight: 19 }]}>
          {plan?.warnings?.length
            ? plan.warnings[0]
            : `Hoy es un buen día para cumplir tu meta de ${formatNumber(stepGoal)} pasos y dormir bien. El progreso se construye con constancia.`}
        </Text>
      </View>

      <Text style={[typography.tiny, { color: colors.textSubtle, textAlign: 'center', marginTop: spacing.lg, textTransform: 'none', letterSpacing: 0 }]}>
        {formatDateEs(todayKey(), { weekday: 'long', year: 'numeric' })} · Datos guardados en este dispositivo
      </Text>

      <ModalSheet
        visible={stepModal}
        onClose={() => setStepModal(false)}
        title="Registrar pasos"
        subtitle="Introduce los pasos que marca tu reloj o teléfono."
        footer={<Button onPress={saveSteps} loading={saving}>Guardar pasos</Button>}
      >
        <Input label="Pasos de hoy" value={stepsValue} onChangeText={setStepsValue} keyboardType="number-pad" icon="footsteps-outline" autoFocus />
        <Text style={[typography.small, { color: colors.textMuted }]}>Meta actual: {formatNumber(stepGoal)} pasos.</Text>
      </ModalSheet>

      <ModalSheet
        visible={weightModal}
        onClose={() => setWeightModal(false)}
        title="Registrar peso"
        subtitle={`Último registro: ${latestWeight ? `${formatNumber(latestWeight.weight_kg, 1)} kg` : 'sin datos'}`}
        footer={<Button onPress={saveWeightEntry} loading={saving}>Guardar peso</Button>}
      >
        <Input label="Peso (kg)" value={weightValue} onChangeText={setWeightValue} keyboardType="decimal-pad" placeholder={latestWeight ? String(latestWeight.weight_kg) : '72,5'} icon="scale-outline" autoFocus />
        <Notice tone="info">Pésate en condiciones similares y no todos los días si te afecta anímicamente. La tendencia importa más que un dato aislado.</Notice>
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  datePill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6, marginBottom: spacing.sm },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  calorieTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  grid: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  iconBadge: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  done: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: radius.pill },
  tip: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginTop: spacing.md, alignItems: 'flex-start' },
});
