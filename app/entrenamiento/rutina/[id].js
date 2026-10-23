import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../../src/components/Screen';
import { Header } from '../../../src/components/Header';
import { Card } from '../../../src/components/Card';
import { Input } from '../../../src/components/Input';
import { Button, IconButton } from '../../../src/components/Button';
import { Notice } from '../../../src/components/Notice';
import { LoadingState } from '../../../src/components/EmptyState';
import { ModalSheet } from '../../../src/components/ModalSheet';
import { useAuth } from '../../../src/features/auth/AuthContext';
import {
  addPlanExercise,
  clonePlan,
  deletePlan,
  deletePlanExercise,
  exerciseProgress,
  getPlan,
  startSession,
} from '../../../src/database/repositories/workoutsRepo';
import { formatNumber } from '../../../src/utils/numbers';
import { useTheme, spacing, radius, typography } from '../../../src/theme';

const DAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function RoutineDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const id = params.id;
  const [plan, setPlan] = useState(null);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newExercise, setNewExercise] = useState({ name: '', target_sets: '3', target_reps: '8-12' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const found = await getPlan(user.id, id);
      if (!found) {
        setError('La rutina no existe o se ha eliminado.');
        setPlan(null);
        return;
      }
      setPlan(found);
      const entries = await Promise.all(
        found.exercises.map(async (exercise) => [exercise.name, await exerciseProgress(user.id, exercise.name, 1)])
      );
      setProgress(Object.fromEntries(entries));
      setError('');
    } catch (caught) {
      setError(caught?.message || 'No se pudo cargar la rutina.');
    } finally {
      setLoading(false);
    }
  }, [user, id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function start() {
    setStarting(true);
    try {
      const session = await startSession(user.id, plan.id);
      router.push(`/entrenamiento/sesion/${session.id}`);
    } catch (caught) {
      setError(caught?.message || 'No se pudo empezar la sesión.');
      setStarting(false);
    }
  }

  async function duplicate() {
    setCloning(true);
    try {
      const copy = await clonePlan(user.id, plan.id);
      router.replace({ pathname: '/entrenamiento/rutina/[id]', params: { id: copy.id } });
    } catch (caught) {
      setError(caught?.message || 'No se pudo duplicar la rutina.');
      setCloning(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Eliminar rutina', `¿Eliminar “${plan.name}”? Las sesiones ya registradas se conservan.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePlan(user.id, plan.id);
            router.back();
          } catch (caught) {
            setError(caught?.message || 'No se pudo eliminar la rutina.');
          }
        },
      },
    ]);
  }

  async function addExercise() {
    if (!newExercise.name.trim()) return setError('Escribe el nombre del ejercicio.');
    setSaving(true);
    try {
      await addPlanExercise(user.id, plan.id, {
        name: newExercise.name.trim(),
        target_sets: Number(newExercise.target_sets) || 3,
        target_reps: newExercise.target_reps || '8-12',
      });
      setAddOpen(false);
      setNewExercise({ name: '', target_sets: '3', target_reps: '8-12' });
      await load();
    } catch (caught) {
      setError(caught?.message || 'No se pudo añadir el ejercicio.');
    } finally {
      setSaving(false);
    }
  }

  async function removeExercise(exercise) {
    try {
      await deletePlanExercise(user.id, exercise.id);
      await load();
    } catch (caught) {
      setError(caught?.message || 'No se pudo quitar el ejercicio.');
    }
  }

  if (loading) return <Screen><LoadingState message="Cargando rutina…" /></Screen>;
  if (!plan) {
    return (
      <Screen scroll>
        <Header back title="Rutina" />
        <Notice tone="danger">{error || 'Rutina no encontrada.'}</Notice>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Header
        back
        title={plan.name}
        subtitle={`${plan.level} · ${plan.exercises.length} ejercicios`}
        right={
          plan.user_id ? (
            <IconButton icon="trash-outline" color={colors.danger} onPress={confirmDelete} accessibilityLabel="Eliminar rutina" />
          ) : (
            <IconButton icon="copy-outline" onPress={duplicate} accessibilityLabel="Duplicar rutina" />
          )
        }
      />
      {error ? <Notice tone="danger" title="Aviso" style={{ marginBottom: spacing.sm }}>{error}</Notice> : null}
      {plan.is_template ? (
        <Notice tone="info" title="Plantilla de SDEC">
          Puedes empezar directamente o duplicarla para adaptar ejercicios y series a tu material y nivel.
        </Notice>
      ) : null}

      <Card style={{ marginTop: spacing.sm }}>
        <Text style={[typography.label, { color: colors.textMuted }]}>Días programados</Text>
        <View style={styles.days}>
          {DAY_LABELS.map((day, index) => {
            const active = plan.schedule.includes(index);
            return (
              <View key={day} style={[styles.day, { backgroundColor: active ? colors.primarySoft : 'transparent', borderColor: active ? colors.primary : colors.border }]}>
                <Text style={[typography.tiny, { color: active ? colors.primary : colors.textSubtle, textTransform: 'none', letterSpacing: 0 }]}>
                  {day.slice(0, 3)}
                </Text>
              </View>
            );
          })}
        </View>
        {plan.notes ? <Text style={[typography.small, { color: colors.textMuted, marginTop: spacing.sm }]}>{plan.notes}</Text> : null}
      </Card>

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
        <Button onPress={start} loading={starting} icon="play-outline" style={{ flex: 2 }}>Empezar</Button>
        <Button variant="secondary" onPress={duplicate} loading={cloning} icon="copy-outline" style={{ flex: 1 }}>
          Duplicar
        </Button>
      </View>

      <View style={styles.sectionRow}>
        <Text style={[typography.h3, { color: colors.text }]}>Ejercicios</Text>
        {plan.user_id ? (
          <Button small full={false} variant="ghost" icon="add" onPress={() => setAddOpen(true)}>Añadir</Button>
        ) : null}
      </View>

      {plan.exercises.map((exercise, index) => {
        const best = progress[exercise.name]?.[0];
        return (
          <View key={exercise.id} style={[styles.exercise, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.number, { backgroundColor: colors.primarySoft }]}>
              <Text style={[typography.small, { color: colors.primary, fontWeight: '900' }]}>{index + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.small, { color: colors.text, fontWeight: '700' }]}>{exercise.name}</Text>
              <Text style={[typography.tiny, { color: colors.textSubtle, textTransform: 'none', letterSpacing: 0 }]}>
                {exercise.target_sets} series × {exercise.target_reps} reps
              </Text>
              {best ? (
                <Text style={[typography.tiny, { color: colors.accent, textTransform: 'none', letterSpacing: 0 }]}>
                  Mejor serie reciente: {formatNumber(best.max_weight, 1)} kg × {best.max_reps}
                </Text>
              ) : (
                <Text style={[typography.tiny, { color: colors.textSubtle, textTransform: 'none', letterSpacing: 0 }]}>Sin registros completados</Text>
              )}
              {exercise.notes ? <Text style={[typography.tiny, { color: colors.textMuted, textTransform: 'none', letterSpacing: 0 }]}>{exercise.notes}</Text> : null}
            </View>
            {plan.user_id ? <IconButton icon="close" size={16} onPress={() => removeExercise(exercise)} accessibilityLabel={`Quitar ${exercise.name}`} /> : null}
          </View>
        );
      })}

      <Notice tone="medical" title="Técnica y seguridad" style={{ marginTop: spacing.md }}>
        Empieza con un peso que te permita completar las repeticiones con técnica controlada. Deja 1–2 repeticiones en reserva
        las primeras semanas y aumenta la carga solo cuando la serie sea cómoda.
      </Notice>

      <ModalSheet visible={addOpen} onClose={() => setAddOpen(false)} title="Añadir ejercicio" subtitle="Se añadirá al final de la rutina" footer={<Button onPress={addExercise} loading={saving}>Añadir</Button>}>
        <Input label="Nombre" required value={newExercise.name} onChangeText={(value) => setNewExercise((current) => ({ ...current, name: value }))} placeholder="Ej.: Remo con mancuerna" autoFocus />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Input label="Series" value={newExercise.target_sets} onChangeText={(value) => setNewExercise((current) => ({ ...current, target_sets: value }))} keyboardType="number-pad" style={{ flex: 1 }} />
          <Input label="Repeticiones" value={newExercise.target_reps} onChangeText={(value) => setNewExercise((current) => ({ ...current, target_reps: value }))} style={{ flex: 1 }} />
        </View>
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
  day: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 5 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.sm },
  exercise: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  number: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
