import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { Header } from '../../../src/components/Header';
import { Card } from '../../../src/components/Card';
import { StatCard } from '../../../src/components/StatCard';
import { Input } from '../../../src/components/Input';
import { Button, IconButton } from '../../../src/components/Button';
import { Notice } from '../../../src/components/Notice';
import { LoadingState } from '../../../src/components/EmptyState';
import { ModalSheet } from '../../../src/components/ModalSheet';
import { LineChart } from '../../../src/components/Charts';
import { useAuth } from '../../../src/features/auth/AuthContext';
import {
  addSessionExercise,
  addSet,
  completeSession,
  deleteSession,
  deleteSessionExercise,
  deleteSet,
  exerciseProgress,
  getSession,
} from '../../../src/database/repositories/workoutsRepo';
import { formatDateEs, formatDateShort, todayKey } from '../../../src/utils/date';
import { formatNumber, parseNumber } from '../../../src/utils/numbers';
import { useTheme, spacing, radius, typography } from '../../../src/theme';

export default function SessionScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const id = params.id;
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [setTarget, setSetTarget] = useState(null);
  const [setValues, setSetValues] = useState({ reps: '8', weight: '', rest: '90', notes: '' });
  const [finishOpen, setFinishOpen] = useState(false);
  const [finishValues, setFinishValues] = useState({ duration: '45', notes: '' });
  const [exerciseOpen, setExerciseOpen] = useState(false);
  const [exerciseName, setExerciseName] = useState('');
  const [progressTarget, setProgressTarget] = useState(null);
  const [progressRows, setProgressRows] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const found = await getSession(user.id, id);
      if (!found) setError('La sesión no existe o se ha eliminado.');
      setSession(found);
      if (found?.status === 'en_progreso' && found.created_at) {
        const created = new Date(found.created_at).getTime();
        if (Number.isFinite(created)) setSeconds(Math.max(0, Math.floor((Date.now() - created) / 1000)));
      }
      setError('');
    } catch (caught) {
      setError(caught?.message || 'No se pudo cargar la sesión.');
    } finally {
      setLoading(false);
    }
  }, [user, id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const active = session?.status === 'en_progreso';

  useEffect(() => {
    if (!active) return undefined;
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [active]);

  const totals = useMemo(() => {
    if (!session) return { sets: 0, volume: 0, reps: 0 };
    let sets = 0;
    let volume = 0;
    let reps = 0;
    for (const exercise of session.exercises) {
      for (const set of exercise.sets) {
        sets += 1;
        reps += Number(set.reps || 0);
        volume += Number(set.reps || 0) * Number(set.weight_kg || 0);
      }
    }
    return { sets, volume, reps };
  }, [session]);

  function openSet(exercise) {
    const target = String(exercise.notes || '').match(/[×x]\s*(\d+)/);
    setSetTarget(exercise);
    setSetValues({ reps: target ? target[1] : '8', weight: '', rest: '90', notes: '' });
  }

  async function saveSet() {
    const reps = parseNumber(setValues.reps, NaN);
    if (!Number.isFinite(reps) || reps <= 0) return setError('Indica las repeticiones realizadas.');
    setSaving(true);
    try {
      await addSet(user.id, {
        exerciseId: setTarget.id,
        reps,
        weightKg: parseNumber(setValues.weight, 0),
        restSec: parseNumber(setValues.rest, 0),
        notes: setValues.notes.trim(),
      });
      setSetTarget(null);
      await load();
    } catch (caught) {
      setError(caught?.message || 'No se pudo guardar la serie.');
    } finally {
      setSaving(false);
    }
  }

  async function removeSet(set) {
    try {
      await deleteSet(user.id, set.id);
      await load();
    } catch (caught) {
      setError(caught?.message || 'No se pudo eliminar la serie.');
    }
  }

  async function removeExercise(exercise) {
    Alert.alert('Quitar ejercicio', `¿Quitar ${exercise.name} de esta sesión?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSessionExercise(user.id, exercise.id);
            await load();
          } catch (caught) {
            setError(caught?.message || 'No se pudo quitar el ejercicio.');
          }
        },
      },
    ]);
  }

  async function addExercise() {
    if (!exerciseName.trim()) return setError('Escribe el nombre del ejercicio.');
    setSaving(true);
    try {
      await addSessionExercise(user.id, session.id, exerciseName.trim());
      setExerciseOpen(false);
      setExerciseName('');
      await load();
    } catch (caught) {
      setError(caught?.message || 'No se pudo añadir el ejercicio.');
    } finally {
      setSaving(false);
    }
  }

  function openFinish() {
    setFinishValues({ duration: String(Math.max(1, Math.round(seconds / 60))), notes: '' });
    setFinishOpen(true);
  }

  async function finish() {
    const duration = parseNumber(finishValues.duration, NaN);
    if (!Number.isFinite(duration) || duration <= 0) return setError('Indica una duración válida.');
    setSaving(true);
    try {
      await completeSession(user.id, session.id, { durationMin: duration, notes: finishValues.notes.trim() });
      setFinishOpen(false);
      await load();
    } catch (caught) {
      setError(caught?.message || 'No se pudo completar la sesión.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDeleteSession() {
    Alert.alert('Eliminar sesión', 'Se borrarán también sus series.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSession(user.id, session.id);
            router.back();
          } catch (caught) {
            setError(caught?.message || 'No se pudo eliminar la sesión.');
          }
        },
      },
    ]);
  }

  async function openProgress(exercise) {
    setProgressTarget(exercise);
    try {
      const rows = await exerciseProgress(user.id, exercise.name, 12);
      setProgressRows(rows);
    } catch {
      setProgressRows([]);
    }
  }

  function timerLabel() {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
  }

  if (loading) return <Screen><LoadingState message="Cargando sesión…" /></Screen>;
  if (!session) {
    return (
      <Screen scroll>
        <Header back title="Sesión" />
        <Notice tone="danger">{error || 'Sesión no encontrada.'}</Notice>
      </Screen>
    );
  }

  const chartData = [...progressRows]
    .reverse()
    .map((row) => ({ label: formatDateShort(row.date), value: row.max_weight }));

  return (
    <Screen scroll>
      <Header
        back
        title={session.plan_name || 'Sesión libre'}
        subtitle={formatDateEs(session.date) + (session.duration_min ? ` · ${session.duration_min} min` : '')}
        right={
          !active ? (
            <IconButton icon="trash-outline" color={colors.danger} onPress={confirmDeleteSession} accessibilityLabel="Eliminar sesión" />
          ) : (
            <View style={[styles.timer, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
              <Ionicons name="time-outline" size={13} color={colors.primary} />
              <Text style={[typography.tiny, { color: colors.primary }]}>{timerLabel()}</Text>
            </View>
          )
        }
      />
      {error ? <Notice tone="danger" title="Aviso" style={{ marginBottom: spacing.sm }}>{error}</Notice> : null}
      {active ? (
        <Notice tone="success" title="Sesión en curso">
          Añade cada serie justo después de hacerla. Puedes salir y volver: la sesión sigue guardada.
        </Notice>
      ) : (
        <Notice tone="info" title="Sesión completada">
          {session.notes || 'Buen trabajo. Revisa el volumen y la progresión de tus ejercicios.'}
        </Notice>
      )}

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
        <StatCard label="Ejercicios" value={session.exercises.length} icon="barbell-outline" compact />
        <StatCard label="Series" value={totals.sets} icon="layers-outline" compact />
        <StatCard label="Volumen" value={formatNumber(Math.round(totals.volume))} unit="kg" icon="trending-up-outline" compact />
      </View>

      <View style={styles.sectionRow}>
        <Text style={[typography.h3, { color: colors.text }]}>Ejercicios</Text>
        {active ? <Button small full={false} variant="ghost" icon="add" onPress={() => setExerciseOpen(true)}>Añadir</Button> : null}
      </View>

      {session.exercises.length ? (
        session.exercises.map((exercise) => (
          <Card key={exercise.id} style={{ marginBottom: spacing.sm }} padding="sm">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Pressable onPress={() => openProgress(exercise)} style={{ flex: 1 }} accessibilityLabel={`Ver progreso de ${exercise.name}`}>
                <Text style={[typography.small, { color: colors.text, fontWeight: '800' }]}>{exercise.name}</Text>
                <Text style={[typography.tiny, { color: colors.textSubtle, textTransform: 'none', letterSpacing: 0 }]}>
                  {exercise.notes || 'Sin objetivo definido'} · {exercise.sets.length} series
                </Text>
              </Pressable>
              <IconButton icon="stats-chart-outline" size={16} onPress={() => openProgress(exercise)} accessibilityLabel="Progreso" />
              {active ? <IconButton icon="close" size={15} onPress={() => removeExercise(exercise)} accessibilityLabel="Quitar ejercicio" /> : null}
            </View>
            {exercise.sets.map((set) => (
              <View key={set.id} style={[styles.setRow, { borderTopColor: colors.border }]}>
                <Text style={[typography.tiny, { color: colors.primary, width: 24 }]}>#{set.set_number}</Text>
                <Text style={[typography.small, { color: colors.text, flex: 1 }]}>
                  {set.reps} reps × {formatNumber(set.weight_kg, 1)} kg
                </Text>
                <Text style={[typography.tiny, { color: colors.textSubtle, textTransform: 'none', letterSpacing: 0 }]}>
                  {set.rest_sec ? `${set.rest_sec}s descanso` : ''}
                </Text>
                {active ? <IconButton icon="trash-outline" size={14} onPress={() => removeSet(set)} accessibilityLabel="Eliminar serie" /> : null}
              </View>
            ))}
            {active ? (
              <Button small variant="secondary" icon="add" onPress={() => openSet(exercise)} style={{ marginTop: spacing.sm }}>
                Añadir serie
              </Button>
            ) : null}
          </Card>
        ))
      ) : (
        <Notice tone="info" title="Sin ejercicios">
          Añade un ejercicio para empezar a registrar series. Puedes usar una rutina para que se carguen automáticamente.
        </Notice>
      )}

      {active ? (
        <Button onPress={openFinish} icon="checkmark-done-outline" style={{ marginTop: spacing.md }}>
          Terminar sesión
        </Button>
      ) : (
        <Button variant="secondary" icon="arrow-back" onPress={() => router.replace('/(tabs)/entrenamiento')} style={{ marginTop: spacing.md }}>
          Volver a entrenamientos
        </Button>
      )}

      <ModalSheet
        visible={Boolean(setTarget)}
        onClose={() => setSetTarget(null)}
        title={setTarget ? `Serie de ${setTarget.name}` : 'Añadir serie'}
        subtitle="Registra lo que has hecho, no lo que planeabas."
        footer={<Button onPress={saveSet} loading={saving} icon="checkmark">Guardar serie</Button>}
      >
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Input label="Repeticiones" required style={{ flex: 1 }} value={setValues.reps} onChangeText={(value) => setSetValues((current) => ({ ...current, reps: value }))} keyboardType="number-pad" autoFocus />
          <Input label="Peso (kg)" style={{ flex: 1 }} value={setValues.weight} onChangeText={(value) => setSetValues((current) => ({ ...current, weight: value }))} keyboardType="decimal-pad" placeholder="0 si es corporal" />
        </View>
        <Input label="Descanso (segundos)" value={setValues.rest} onChangeText={(value) => setSetValues((current) => ({ ...current, rest: value }))} keyboardType="number-pad" />
        <Input label="Notas" value={setValues.notes} onChangeText={(value) => setSetValues((current) => ({ ...current, notes: value }))} placeholder="Técnica, RIR, molestias…" />
        <Notice tone="info">Si entrenas con peso corporal, deja el peso en 0. Anota repeticiones reales, aunque sean menos de las previstas.</Notice>
      </ModalSheet>

      <ModalSheet
        visible={finishOpen}
        onClose={() => setFinishOpen(false)}
        title="Terminar sesión"
        subtitle="Guarda la duración y una nota rápida"
        footer={<Button onPress={finish} loading={saving} icon="checkmark-done-outline">Completar sesión</Button>}
      >
        <Input label="Duración (minutos)" value={finishValues.duration} onChangeText={(value) => setFinishValues((current) => ({ ...current, duration: value }))} keyboardType="number-pad" />
        <Input label="Notas" value={finishValues.notes} onChangeText={(value) => setFinishValues((current) => ({ ...current, notes: value }))} placeholder="Sensaciones, récords, incidencias…" multiline />
        <Notice tone="success">
          {totals.sets} series · {formatNumber(Math.round(totals.volume))} kg de volumen total · {totals.reps} repeticiones.
        </Notice>
      </ModalSheet>

      <ModalSheet visible={exerciseOpen} onClose={() => setExerciseOpen(false)} title="Añadir ejercicio" footer={<Button onPress={addExercise} loading={saving}>Añadir</Button>}>
        <Input label="Nombre del ejercicio" value={exerciseName} onChangeText={setExerciseName} placeholder="Ej.: Sentadilla" autoFocus />
      </ModalSheet>

      <ModalSheet
        visible={Boolean(progressTarget)}
        onClose={() => setProgressTarget(null)}
        title={progressTarget ? progressTarget.name : 'Progreso'}
        subtitle="Peso máximo por sesión completada"
      >
        {chartData.length ? (
          <>
            <LineChart data={chartData} unit="kg" color={colors.primary} height={170} />
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
              <StatCard label="Mejor peso" value={formatNumber(Math.max(...progressRows.map((row) => row.max_weight || 0)), 1)} unit="kg" compact />
              <StatCard label="Sesiones" value={progressRows.length} compact />
            </View>
          </>
        ) : (
          <Notice tone="info">Aún no hay series completadas de este ejercicio. Termina una sesión para ver la progresión.</Notice>
        )}
        <Notice tone="info" title="Cómo leerlo" style={{ marginTop: spacing.sm }}>
          La gráfica muestra el peso máximo de cada sesión. Asegúrate de comparar series con repeticiones parecidas; más peso con
          menos repeticiones no siempre es más progreso.
        </Notice>
      </ModalSheet>

      <Text style={[typography.tiny, { color: colors.textSubtle, textAlign: 'center', marginTop: spacing.md, textTransform: 'none', letterSpacing: 0 }]}>
        {session.date === todayKey() ? 'Sesión de hoy' : `Sesión del ${formatDateEs(session.date, { weekday: 'long' })}`}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  timer: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg, marginBottom: spacing.sm },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 7, marginTop: spacing.xs },
});
