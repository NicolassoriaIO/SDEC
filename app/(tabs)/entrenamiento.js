import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { Header } from '../../src/components/Header';
import { Card } from '../../src/components/Card';
import { StatCard } from '../../src/components/StatCard';
import { Button, IconButton } from '../../src/components/Button';
import { EmptyState, LoadingState } from '../../src/components/EmptyState';
import { Notice } from '../../src/components/Notice';
import { useAuth } from '../../src/features/auth/AuthContext';
import { useData } from '../../src/features/profile/DataContext';
import { useEnergyPlan } from '../../src/features/profile/useEnergyPlan';
import { listPlans, listSessions, quickAttendance, startSession, workoutStats } from '../../src/database/repositories/workoutsRepo';
import { formatDateEs, formatDateShort, todayKey } from '../../src/utils/date';
import { formatNumber } from '../../src/utils/numbers';
import { useTheme, spacing, radius, typography } from '../../src/theme';

const DAY_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

export default function WorkoutScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useData();
  const { plan: energyPlan } = useEnergyPlan();
  const [plans, setPlans] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [planRows, sessionRows, workoutSummary] = await Promise.all([
        listPlans(user.id),
        listSessions(user.id, 12),
        workoutStats(user.id),
      ]);
      setPlans(planRows);
      setSessions(sessionRows);
      setStats(workoutSummary);
      setError('');
    } catch (caught) {
      setError(caught?.message || 'No se pudieron cargar los entrenamientos.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function start(plan) {
    setStarting(plan?.id || 'libre');
    try {
      const session = await startSession(user.id, plan?.id || null, todayKey());
      router.push(`/entrenamiento/sesion/${session.id}`);
    } catch (caught) {
      setError(caught?.message || 'No se pudo iniciar la sesión.');
    } finally {
      setStarting(null);
    }
  }

  async function attendance(plan) {
    setStarting(`asistencia-${plan.id}`);
    try {
      await quickAttendance(user.id, plan.id, todayKey());
      await load();
    } catch (caught) {
      setError(caught?.message || 'No se pudo registrar la asistencia.');
    } finally {
      setStarting(null);
    }
  }

  const weekday = new Date().getDay();
  const todayPlans = plans.filter((plan) => plan.schedule.includes(weekday));

  return (
    <Screen scroll>
      <Header
        title="Entrenamiento"
        subtitle={`${profile?.experience_level || 'principiante'} · ${profile?.training_days || 3} días/semana`}
        right={<IconButton icon="add" onPress={() => router.push('/entrenamiento/rutina/nueva')} accessibilityLabel="Crear rutina" />}
      />
      {error ? <Notice tone="danger" title="Aviso" style={{ marginBottom: spacing.sm }}>{error}</Notice> : null}

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <StatCard label="Esta semana" value={stats?.weekCount || 0} unit="sesiones" icon="barbell-outline" sub={`${formatNumber(stats?.weekMinutes || 0)} minutos`} />
        <StatCard label="Este mes" value={stats?.monthCount || 0} unit="sesiones" icon="calendar-outline" sub={stats?.completedToday ? 'Hoy ya entrenaste' : 'Aún sin entreno hoy'} />
      </View>

      {todayPlans.length ? (
        todayPlans.map((plan) => (
          <Card key={plan.id} style={{ marginTop: spacing.sm }} tone="primary">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={[styles.icon, { backgroundColor: colors.surface }]}>
                <Ionicons name="flash-outline" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.tiny, { color: colors.primaryText }]}>TOCA HOY</Text>
                <Text style={[typography.h3, { color: colors.text }]}>{plan.name}</Text>
                <Text style={[typography.small, { color: colors.textMuted }]}>
                  {plan.exercise_count} ejercicios · nivel {plan.level}
                </Text>
              </View>
              <Button small full={false} onPress={() => start(plan)} loading={starting === plan.id}>
                Entrenar
              </Button>
            </View>
          </Card>
        ))
      ) : (
        <Card style={{ marginTop: spacing.sm }}>
          <Text style={[typography.h3, { color: colors.text }]}>Hoy no hay rutina programada</Text>
          <Text style={[typography.small, { color: colors.textMuted, marginTop: 4 }]}>
            Puedes empezar una sesión libre, elegir una rutina o ajustar los días en tu perfil.
          </Text>
          <Button variant="secondary" small icon="play-outline" onPress={() => start(null)} loading={starting === 'libre'} style={{ marginTop: spacing.md }}>
            Sesión libre
          </Button>
        </Card>
      )}

      <View style={styles.sectionRow}>
        <Text style={[typography.h3, { color: colors.text }]}>Rutinas</Text>
        <Button small full={false} variant="ghost" icon="add" onPress={() => router.push('/entrenamiento/rutina/nueva')}>
          Nueva
        </Button>
      </View>
      {loading && !plans.length ? <LoadingState message="Cargando rutinas…" /> : null}
      {!loading && !plans.length ? (
        <EmptyState icon="barbell-outline" title="Sin rutinas" message="Crea tu primera rutina o usa una plantilla." actionLabel="Crear rutina" onAction={() => router.push('/entrenamiento/rutina/nueva')} />
      ) : null}
      {plans.map((plan) => (
        <Pressable
          key={plan.id}
          onPress={() => router.push({ pathname: '/entrenamiento/rutina/[id]', params: { id: plan.id } })}
          style={({ pressed }) => [styles.planCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.78 : 1 }]}
        >
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[typography.small, { color: colors.text, fontWeight: '800' }]} numberOfLines={1}>{plan.name}</Text>
              {plan.is_template ? <Tag label="PLANTILLA" /> : <Tag label="MÍA" tone="primary" />}
            </View>
            <Text style={[typography.tiny, { color: colors.textSubtle, textTransform: 'none', letterSpacing: 0, marginTop: 2 }]}>
              {plan.exercise_count} ejercicios · {plan.level}
            </Text>
            <View style={styles.days}>
              {DAY_LABELS.map((label, index) => (
                <View
                  key={`${plan.id}-${label}`}
                  style={[
                    styles.day,
                    {
                      backgroundColor: plan.schedule.includes(index) ? colors.primary : 'transparent',
                      borderColor: plan.schedule.includes(index) ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[typography.tiny, { color: plan.schedule.includes(index) ? colors.primaryText : colors.textSubtle, fontSize: 9 }]}>{label}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={{ gap: spacing.sm, alignItems: 'center' }}>
            <IconButton icon="play" color={colors.primaryText} style={{ backgroundColor: colors.primary }} onPress={() => start(plan)} accessibilityLabel={`Empezar ${plan.name}`} />
            {plan.schedule.includes(weekday) && !stats?.completedToday ? (
              <Pressable onPress={() => attendance(plan)} hitSlop={8}>
                <Text style={[typography.tiny, { color: colors.textMuted, textTransform: 'none', letterSpacing: 0 }]}>Asistencia</Text>
              </Pressable>
            ) : null}
          </View>
        </Pressable>
      ))}

      <View style={styles.sectionRow}>
        <Text style={[typography.h3, { color: colors.text }]}>Historial</Text>
        <Text style={[typography.small, { color: colors.textMuted }]}>{sessions.length} sesiones</Text>
      </View>
      {sessions.length ? (
        sessions.map((session) => (
          <Pressable
            key={session.id}
            onPress={() => router.push(`/entrenamiento/sesion/${session.id}`)}
            style={({ pressed }) => [styles.sessionRow, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.75 : 1 }]}
          >
            <View style={[styles.sessionIcon, { backgroundColor: session.status === 'completado' ? colors.successSoft : colors.warningSoft }]}>
              <Ionicons name={session.status === 'completado' ? 'checkmark' : 'time-outline'} size={16} color={session.status === 'completado' ? colors.accent : colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.small, { color: colors.text, fontWeight: '700' }]}>{session.plan_name || 'Sesión libre'}</Text>
              <Text style={[typography.tiny, { color: colors.textSubtle, textTransform: 'none', letterSpacing: 0 }]}>
                {formatDateShort(session.date)} · {session.exercise_count} ejercicios {session.duration_min ? `· ${session.duration_min} min` : ''}
              </Text>
            </View>
            <Text style={[typography.tiny, { color: session.status === 'completado' ? colors.accent : colors.warning }]}>
              {session.status === 'completado' ? 'COMPLETADO' : 'EN CURSO'}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textSubtle} />
          </Pressable>
        ))
      ) : (
        <Text style={[typography.small, { color: colors.textMuted }]}>Aún no hay sesiones registradas.</Text>
      )}

      <Notice tone="medical" title="Entrena con cabeza" style={{ marginTop: spacing.md }}>
        {energyPlan?.warnings?.[0] ||
          'Progresa de forma gradual y respeta el descanso. Si sientes dolor agudo, mareo o molestias persistentes, detén el entrenamiento y consulta con un profesional.'}
      </Notice>
      <Text style={[typography.tiny, { color: colors.textSubtle, textAlign: 'center', marginTop: spacing.md, textTransform: 'none', letterSpacing: 0 }]}>
        {formatDateEs(todayKey(), { weekday: 'long', year: 'numeric' })}
      </Text>
    </Screen>
  );
}

function Tag({ label, tone = 'muted' }) {
  const { colors } = useTheme();
  return (
    <View style={{ backgroundColor: tone === 'primary' ? colors.primarySoft : colors.surfaceAlt, borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 2 }}>
      <Text style={[typography.tiny, { color: tone === 'primary' ? colors.primary : colors.textSubtle, fontSize: 9 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  icon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.sm },
  planCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm },
  days: { flexDirection: 'row', gap: 4, marginTop: spacing.sm },
  day: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm },
  sessionIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
