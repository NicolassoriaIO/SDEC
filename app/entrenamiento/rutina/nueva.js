import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../../src/components/Screen';
import { Header } from '../../../src/components/Header';
import { Card } from '../../../src/components/Card';
import { Input, SelectField } from '../../../src/components/Input';
import { Button, IconButton } from '../../../src/components/Button';
import { Notice } from '../../../src/components/Notice';
import { EmptyState } from '../../../src/components/EmptyState';
import { useAuth } from '../../../src/features/auth/AuthContext';
import { useData } from '../../../src/features/profile/DataContext';
import { createPlan } from '../../../src/database/repositories/workoutsRepo';
import { EXPERIENCE_LEVELS } from '../../../src/constants';
import { parseNumber } from '../../../src/utils/numbers';
import { useTheme, spacing, radius, typography } from '../../../src/theme';

const DAYS = [
  { key: 1, label: 'Lun' },
  { key: 2, label: 'Mar' },
  { key: 3, label: 'Mié' },
  { key: 4, label: 'Jue' },
  { key: 5, label: 'Vie' },
  { key: 6, label: 'Sáb' },
  { key: 0, label: 'Dom' },
];

export default function NewRoutineScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useData();
  const [values, setValues] = useState({ name: '', level: profile?.experience_level || 'principiante', notes: '' });
  const [schedule, setSchedule] = useState([]);
  const [exercises, setExercises] = useState([{ name: '', target_sets: '3', target_reps: '8-12' }]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function setField(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setError('');
  }

  function toggleDay(day) {
    setSchedule((current) => (current.includes(day) ? current.filter((value) => value !== day) : [...current, day]));
  }

  function setExercise(index, field, value) {
    setExercises((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)));
    setError('');
  }

  async function save() {
    if (!values.name.trim()) return setError('Ponle nombre a la rutina.');
    if (!schedule.length) return setError('Elige al menos un día de entrenamiento.');
    const valid = exercises.filter((exercise) => exercise.name.trim());
    if (!valid.length) return setError('Añade al menos un ejercicio con nombre.');
    setSaving(true);
    try {
      const plan = await createPlan(user.id, {
        name: values.name.trim(),
        level: values.level,
        schedule,
        notes: values.notes.trim(),
        exercises: valid.map((exercise) => ({
          name: exercise.name.trim(),
          target_sets: parseNumber(exercise.target_sets, 3),
          target_reps: exercise.target_reps || '8-12',
        })),
      });
      router.replace({ pathname: '/entrenamiento/rutina/[id]', params: { id: plan.id } });
    } catch (caught) {
      setError(caught?.message || 'No se pudo crear la rutina.');
      setSaving(false);
    }
  }

  return (
    <Screen scroll>
      <Header back title="Nueva rutina" subtitle="Diseña una sesión que puedas repetir" />
      {error ? <Notice tone="danger" title="Revisa la rutina" style={{ marginBottom: spacing.sm }}>{error}</Notice> : null}
      <Input label="Nombre" required value={values.name} onChangeText={(value) => setField('name', value)} placeholder="Ej.: Empuje · pecho, hombro y tríceps" icon="barbell-outline" />
      <SelectField label="Nivel" value={values.level} onChange={(value) => setField('level', value)} options={EXPERIENCE_LEVELS} />
      <Text style={[typography.label, { color: colors.textMuted, marginBottom: 6 }]}>Días de la semana</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
        {DAYS.map((day) => {
          const active = schedule.includes(day.key);
          return (
            <Pressable
              key={day.key}
              onPress={() => toggleDay(day.key)}
              style={[styles.day, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primarySoft : 'transparent' }]}
            >
              <Text style={[typography.small, { color: active ? colors.text : colors.textMuted, fontWeight: '700' }]}>{day.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.sectionRow}>
        <Text style={[typography.h3, { color: colors.text }]}>Ejercicios</Text>
        <Button small full={false} variant="secondary" icon="add" onPress={() => setExercises((current) => [...current, { name: '', target_sets: '3', target_reps: '8-12' }])}>
          Añadir
        </Button>
      </View>
      {exercises.map((exercise, index) => (
        <Card key={`exercise-${index}`} padding="sm" style={{ marginBottom: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text style={[typography.tiny, { color: colors.primary, width: 18 }]}>{index + 1}.</Text>
            <Input label="Ejercicio" value={exercise.name} onChangeText={(value) => setExercise(index, 'name', value)} placeholder="Ej.: Press banca" style={{ flex: 1, marginBottom: 0 }} />
            {exercises.length > 1 ? (
              <IconButton icon="close" size={16} onPress={() => setExercises((current) => current.filter((_, itemIndex) => itemIndex !== index))} accessibilityLabel="Quitar ejercicio" />
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
            <Input label="Series" value={exercise.target_sets} onChangeText={(value) => setExercise(index, 'target_sets', value)} keyboardType="number-pad" style={{ flex: 1, marginBottom: 0 }} />
            <Input label="Repeticiones" value={exercise.target_reps} onChangeText={(value) => setExercise(index, 'target_reps', value)} placeholder="8-12" style={{ flex: 1, marginBottom: 0 }} />
          </View>
        </Card>
      ))}
      {!exercises.length ? (
        <EmptyState icon="barbell-outline" title="Sin ejercicios" message="Añade al menos uno para guardar la rutina." actionLabel="Añadir ejercicio" onAction={() => setExercises([{ name: '', target_sets: '3', target_reps: '8-12' }])} />
      ) : null}
      <Input label="Notas de la rutina" value={values.notes} onChangeText={(value) => setField('notes', value)} placeholder="Técnica, descansos, material…" multiline />
      <Button onPress={save} loading={saving} icon="save-outline">Guardar rutina</Button>
      <Notice tone="info" title="Progresión" style={{ marginTop: spacing.md }}>
        Registra las series y el peso de cada sesión. La app muestra tu mejor serie por ejercicio para que puedas aplicar
        sobrecarga progresiva sin inventar objetivos.
      </Notice>
    </Screen>
  );
}

const styles = StyleSheet.create({
  day: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 8, minWidth: 48, alignItems: 'center' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md, marginBottom: spacing.sm },
});
