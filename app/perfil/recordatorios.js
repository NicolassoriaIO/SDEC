import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { Header } from '../../src/components/Header';
import { Card } from '../../src/components/Card';
import { Input } from '../../src/components/Input';
import { Button, IconButton } from '../../src/components/Button';
import { Notice } from '../../src/components/Notice';
import { LoadingState, EmptyState } from '../../src/components/EmptyState';
import { ModalSheet } from '../../src/components/ModalSheet';
import { useAuth } from '../../src/features/auth/AuthContext';
import {
  createReminder,
  deleteReminder,
  listReminders,
  updateReminder,
} from '../../src/database/repositories/remindersRepo';
import {
  cancelReminderNotifications,
  syncReminderNotifications,
} from '../../src/services/reminderNotifications';
import { REMINDER_TYPES } from '../../src/constants';
import { useTheme, spacing, radius, typography } from '../../src/theme';

const DAY_OPTIONS = [
  { key: 1, label: 'L' },
  { key: 2, label: 'M' },
  { key: 3, label: 'X' },
  { key: 4, label: 'J' },
  { key: 5, label: 'V' },
  { key: 6, label: 'S' },
  { key: 0, label: 'D' },
];
const DAY_NAMES = { 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb', 0: 'Dom' };
const DEFAULT_DAYS = [1, 2, 3, 4, 5, 6, 0];

function typeInfo(type) {
  return REMINDER_TYPES.find((item) => item.key === type) || REMINDER_TYPES[REMINDER_TYPES.length - 1];
}

function daysLabel(days) {
  if (!days?.length) return 'Ningún día';
  if (days.length === 7) return 'Todos los días';
  return [...days]
    .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
    .map((day) => DAY_NAMES[day])
    .join(' · ');
}

export default function RemindersScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ type: 'comida', title: '', body: '', time: '09:00', days: DEFAULT_DAYS });
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      setReminders(await listReminders(user.id));
      setError('');
    } catch (caught) {
      setError(caught?.message || 'No se pudieron cargar los recordatorios.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function openCreate() {
    setEditing(null);
    setForm({ type: 'comida', title: '', body: '', time: '09:00', days: DEFAULT_DAYS });
    setFormOpen(true);
    setError('');
  }

  function openEdit(reminder) {
    setEditing(reminder);
    setForm({
      type: reminder.type,
      title: reminder.title,
      body: reminder.body || '',
      time: reminder.time,
      days: reminder.days?.length ? reminder.days : DEFAULT_DAYS,
    });
    setFormOpen(true);
    setError('');
  }

  function toggleDay(day) {
    setForm((current) => {
      const has = current.days.includes(day);
      if (has && current.days.length === 1) return current;
      return {
        ...current,
        days: has ? current.days.filter((item) => item !== day) : [...current.days, day],
      };
    });
  }

  async function save() {
    if (!form.title.trim()) return setError('Escribe un título para el recordatorio.');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.time.trim())) return setError('La hora debe tener el formato HH:MM, por ejemplo 09:30.');
    setSaving(true);
    setError('');
    setWarning('');
    try {
      const payload = {
        type: form.type,
        title: form.title.trim(),
        body: form.body.trim(),
        time: form.time.trim(),
        days: form.days,
        enabled: editing ? Boolean(editing.enabled) : true,
      };
      const saved = editing
        ? (await updateReminder(user.id, editing.id, payload), { ...editing, ...payload })
        : await createReminder(user.id, payload);
      const normalized = { ...saved, days: payload.days, enabled: payload.enabled };
      const result = await syncReminderNotifications(normalized);
      await updateReminder(user.id, normalized.id, { notification_id: result.notificationId });
      if (result.permissionDenied) {
        setWarning('El recordatorio se guardó, pero las notificaciones están bloqueadas en el sistema. Actívalas en los ajustes del dispositivo.');
      }
      setFormOpen(false);
      await load();
    } catch (caught) {
      setError(caught?.message || 'No se pudo guardar el recordatorio.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleEnabled(reminder) {
    setBusyId(reminder.id);
    setWarning('');
    try {
      const enabled = !Boolean(reminder.enabled);
      await updateReminder(user.id, reminder.id, { enabled });
      const result = await syncReminderNotifications({ ...reminder, enabled });
      await updateReminder(user.id, reminder.id, { notification_id: result.notificationId });
      if (result.permissionDenied) setWarning('Las notificaciones están bloqueadas en el sistema. El recordatorio queda guardado como inactivo.');
      await load();
    } catch (caught) {
      setError(caught?.message || 'No se pudo cambiar el recordatorio.');
    } finally {
      setBusyId(null);
    }
  }

  function confirmDelete(reminder) {
    Alert.alert('Eliminar recordatorio', `¿Eliminar “${reminder.title}”?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelReminderNotifications(reminder.notification_id);
            await deleteReminder(user.id, reminder.id);
            await load();
          } catch (caught) {
            setError(caught?.message || 'No se pudo eliminar el recordatorio.');
          }
        },
      },
    ]);
  }

  if (loading) return <Screen><LoadingState message="Cargando recordatorios…" /></Screen>;

  return (
    <Screen scroll>
      <Header back title="Recordatorios" subtitle="Avisos locales en tu dispositivo" right={<IconButton icon="add" onPress={openCreate} accessibilityLabel="Nuevo recordatorio" />} />
      {error ? <Notice tone="danger" title="Aviso" style={{ marginBottom: spacing.sm }}>{error}</Notice> : null}
      {warning ? <Notice tone="warning" title="Notificaciones" style={{ marginBottom: spacing.sm }}>{warning}</Notice> : null}
      <Notice tone="info" title="Cómo funcionan">
        Los recordatorios se programan en tu teléfono; no se envían a ningún servidor. Si cambias de dispositivo, tendrás que
        crearlos de nuevo. Puedes desactivar cada aviso sin borrarlo.
      </Notice>

      <View style={styles.sectionRow}>
        <Text style={[typography.h3, { color: colors.text }]}>Tus avisos</Text>
        <Button small full={false} variant="ghost" icon="add" onPress={openCreate}>Nuevo</Button>
      </View>

      {reminders.length ? (
        reminders.map((reminder) => {
          const info = typeInfo(reminder.type);
          const enabled = Boolean(reminder.enabled);
          return (
            <Card key={reminder.id} style={{ marginBottom: spacing.sm }} padding="sm">
              <View style={styles.row}>
                <View style={[styles.icon, { backgroundColor: enabled ? colors.primarySoft : colors.surfaceAlt }]}>
                  <Ionicons name={info.icon} size={19} color={enabled ? colors.primary : colors.textSubtle} />
                </View>
                <Pressable onPress={() => openEdit(reminder)} style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel={`Editar ${reminder.title}`}>
                  <Text style={[typography.small, { color: colors.text, fontWeight: '800' }]}>{reminder.title}</Text>
                  <Text style={[typography.tiny, { color: colors.textMuted, textTransform: 'none', letterSpacing: 0 }]}>
                    {info.label} · {reminder.time} · {daysLabel(reminder.days)}
                  </Text>
                  {reminder.body ? (
                    <Text style={[typography.tiny, { color: colors.textSubtle, textTransform: 'none', letterSpacing: 0 }]} numberOfLines={2}>
                      {reminder.body}
                    </Text>
                  ) : null}
                </Pressable>
                <Switch
                  value={enabled}
                  onValueChange={() => toggleEnabled(reminder)}
                  disabled={busyId === reminder.id}
                  trackColor={{ false: colors.surfaceStrong, true: colors.primarySoft }}
                  thumbColor={enabled ? colors.primary : colors.textSubtle}
                />
              </View>
              <View style={[styles.actions, { borderTopColor: colors.border }]}>
                <Button small full={false} variant="ghost" icon="create-outline" onPress={() => openEdit(reminder)}>Editar</Button>
                <Button small full={false} variant="ghost" icon="trash-outline" onPress={() => confirmDelete(reminder)}>Eliminar</Button>
              </View>
            </Card>
          );
        })
      ) : (
        <EmptyState
          icon="notifications-outline"
          title="Sin recordatorios"
          message="Crea avisos para comidas, entrenamientos, agua o compras. Los avisos locales funcionan sin conexión."
          actionLabel="Crear recordatorio"
          onAction={openCreate}
        />
      )}

      <Notice tone="warning" title="Sin presión" style={{ marginTop: spacing.md }}>
        Elige pocos recordatorios y en horarios que puedas cumplir. Si un aviso te genera ansiedad o culpa, desactívalo sin
        problema: la app no necesita notificaciones para funcionar.
      </Notice>

      <ModalSheet
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Editar recordatorio' : 'Nuevo recordatorio'}
        subtitle="Se repetirá cada semana en los días elegidos"
        footer={<Button onPress={save} loading={saving} icon="checkmark">Guardar recordatorio</Button>}
      >
        <Text style={[typography.label, { color: colors.textMuted, marginBottom: 6 }]}>Tipo</Text>
        <View style={styles.types}>
          {REMINDER_TYPES.map((type) => {
            const active = form.type === type.key;
            return (
              <Pressable
                key={type.key}
                onPress={() => setForm((current) => ({ ...current, type: type.key }))}
                style={[styles.type, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primarySoft : 'transparent' }]}
              >
                <Ionicons name={type.icon} size={14} color={active ? colors.primary : colors.textMuted} />
                <Text style={[typography.tiny, { color: active ? colors.text : colors.textMuted, textTransform: 'none', letterSpacing: 0 }]}>{type.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ height: spacing.sm }} />
        <Input label="Título" required value={form.title} onChangeText={(value) => setForm((current) => ({ ...current, title: value }))} placeholder="Ej.: Desayuno" />
        <Input label="Mensaje" value={form.body} onChangeText={(value) => setForm((current) => ({ ...current, body: value }))} placeholder="Opcional" multiline />
        <Input label="Hora" required value={form.time} onChangeText={(value) => setForm((current) => ({ ...current, time: value }))} placeholder="09:00" keyboardType="numbers-and-punctuation" hint="Formato de 24 horas, HH:MM." />
        <Text style={[typography.label, { color: colors.textMuted, marginBottom: 6 }]}>Días</Text>
        <View style={styles.days}>
          {DAY_OPTIONS.map((day) => {
            const active = form.days.includes(day.key);
            return (
              <Pressable
                key={day.key}
                onPress={() => toggleDay(day.key)}
                style={[styles.day, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primarySoft : 'transparent' }]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[typography.small, { color: active ? colors.text : colors.textMuted, fontWeight: '800' }]}>{day.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ height: spacing.md }} />
        <Notice tone="info">Los avisos usan la hora local del teléfono. Si el sistema tiene activado el modo silencio o concentración, puede que no suenen.</Notice>
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: StyleSheet.hairlineWidth, marginTop: spacing.sm, paddingTop: 2 },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  type: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  days: { flexDirection: 'row', gap: 6 },
  day: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
