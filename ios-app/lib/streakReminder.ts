import * as Notifications from 'expo-notifications';

const IDENTIFIER = 'viajero.streak-reminder';
const REMINDER_HOUR = 19;
const REMINDER_MINUTE = 0;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export type ReminderResult = { enabled: boolean; error?: string };

export async function enableStreakReminder(): Promise<ReminderResult> {
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return { enabled: false, error: 'Notification permission was not granted.' };

  await Notifications.cancelScheduledNotificationAsync(IDENTIFIER).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: IDENTIFIER,
    content: { title: '¡No pierdas tu racha! 🔥', body: 'A quick Viajero lesson keeps your streak alive today.' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: REMINDER_HOUR, minute: REMINDER_MINUTE },
  });
  return { enabled: true };
}

export async function disableStreakReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(IDENTIFIER).catch(() => {});
}
