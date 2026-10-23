import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';

export const NOTIFICATION_CHANNEL_ID = 'recordatorios';

export const REMINDER_ROUTES = {
  comida: '/(tabs)/comida',
  entrenamiento: '/(tabs)/entrenamiento',
  pasos: '/(tabs)',
  peso: '/(tabs)/progreso',
  compras: '/comida/presupuesto',
  suplemento: '/comida/suplemento',
  agua: '/(tabs)',
  otro: '/(tabs)',
};

function parseIds(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return typeof value === 'string' ? [value] : [];
  }
}

function isAllowed(settings) {
  return Boolean(
    settings?.granted ||
      settings?.ios?.status === IosAuthorizationStatus.AUTHORIZED ||
      settings?.ios?.status === IosAuthorizationStatus.PROVISIONAL
  );
}

export async function ensureNotificationPermission() {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
      name: 'Recordatorios',
      importance: AndroidImportance.DEFAULT,
      vibrationPattern: [0, 200, 120, 200],
      lightColor: '#2F9E70',
    });
  }
  let settings = await Notifications.getPermissionsAsync();
  if (!isAllowed(settings) && settings.canAskAgain !== false) {
    settings = await Notifications.requestPermissionsAsync();
  }
  return isAllowed(settings);
}

export async function cancelReminderNotifications(notificationId) {
  const ids = parseIds(notificationId);
  await Promise.all(
    ids.map((id) =>
      Notifications.cancelScheduledNotificationAsync(id).catch(() => null)
    )
  );
}

export async function syncReminderNotifications(reminder) {
  if (!reminder) return { notificationId: null, scheduled: 0, permissionDenied: false };
  await cancelReminderNotifications(reminder.notification_id);
  if (!reminder.enabled) return { notificationId: null, scheduled: 0, permissionDenied: false };

  const allowed = await ensureNotificationPermission();
  if (!allowed) return { notificationId: null, scheduled: 0, permissionDenied: true };

  const [rawHour, rawMinute] = String(reminder.time || '09:00').split(':').map(Number);
  const hour = Number.isFinite(rawHour) ? Math.min(23, Math.max(0, rawHour)) : 9;
  const minute = Number.isFinite(rawMinute) ? Math.min(59, Math.max(0, rawMinute)) : 0;
  const days = Array.isArray(reminder.days) && reminder.days.length ? reminder.days : [1, 2, 3, 4, 5, 6, 0];
  const route = REMINDER_ROUTES[reminder.type] || REMINDER_ROUTES.otro;

  const ids = [];
  for (const day of days) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `SDEC · ${reminder.title}`,
          body: reminder.body || 'Un momento para cuidarte.',
          data: { url: route, reminderId: reminder.id },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: (Number(day) % 7) + 1,
          hour,
          minute,
          channelId: NOTIFICATION_CHANNEL_ID,
        },
      });
      ids.push(id);
    } catch {
      // A single unsupported day must not prevent the rest from being scheduled.
    }
  }
  return {
    notificationId: ids.length ? JSON.stringify(ids) : null,
    scheduled: ids.length,
    permissionDenied: false,
  };
}
