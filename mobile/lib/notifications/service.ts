/**
 * Local notification scheduling service for Groot.
 *
 * Each preference key maps to a scheduled local notification.
 * We never use push notifications — everything is scheduled on-device.
 */
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// ── Channel (Android only) ─────────────────────

const CHANNEL_ID = "groot-reminders";

// ── Notification definitions ────────────────────

interface NotificationDef {
  key: string;
  title: string;
  body: string;
  /** Hour in 24-h format */
  hour: number;
  minute: number;
  /** Which weekday(s)? undefined = every day. 1=Sun…7=Sat */
  weekdays?: number[];
}

const NOTIFICATION_DEFS: NotificationDef[] = [
  {
    key: "morning_checkin",
    title: "Good morning! \u2600\uFE0F",
    body: "Start your day with intention \u2014 how are you feeling?",
    hour: 8,
    minute: 0,
  },
  {
    key: "evening_journal",
    title: "Time to reflect \uD83C\uDF19",
    body: "Take a moment to close your day and capture what matters.",
    hour: 21,
    minute: 0,
  },
  {
    key: "weekly_report",
    title: "Your weekly report is ready \uD83D\uDCCA",
    body: "See your patterns, insights and highlights from this week.",
    hour: 10,
    minute: 0,
    weekdays: [1], // Sunday
  },
  {
    key: "feature_tips",
    title: "Did you know? \uD83D\uDCA1",
    body: "Tap to discover a handy Groot feature you might have missed.",
    hour: 14,
    minute: 0,
    weekdays: [4], // Wednesday
  },
];

// ── Configure foreground behaviour ──────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ── Public helpers ──────────────────────────────

/**
 * Request notification permissions (must be called once, e.g. on app start).
 * Returns `true` if granted.
 */
export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Groot Reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#8B7355",
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

/**
 * Cancel every Groot notification and re-schedule only those whose
 * preference is enabled. Call this whenever preferences change.
 */
export async function syncScheduledNotifications(
  prefs: Record<string, boolean>,
): Promise<void> {
  // Cancel all existing scheduled notifications
  await Notifications.cancelAllScheduledNotificationsAsync();

  for (const def of NOTIFICATION_DEFS) {
    const enabled = prefs[def.key] ?? true;
    if (!enabled) continue;

    if (def.weekdays && def.weekdays.length > 0) {
      // Schedule one trigger per weekday
      for (const weekday of def.weekdays) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: def.title,
            body: def.body,
            data: { screen: screenForKey(def.key) },
            ...(Platform.OS === "android" && { channelId: CHANNEL_ID }),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday,
            hour: def.hour,
            minute: def.minute,
          },
        });
      }
    } else {
      // Daily trigger
      await Notifications.scheduleNotificationAsync({
        content: {
          title: def.title,
          body: def.body,
          data: { screen: screenForKey(def.key) },
          ...(Platform.OS === "android" && { channelId: CHANNEL_ID }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: def.hour,
          minute: def.minute,
        },
      });
    }
  }
}

/**
 * Map a preference key to the deep-link screen path.
 */
function screenForKey(key: string): string {
  switch (key) {
    case "morning_checkin":
      return "/(tabs)/mood";
    case "evening_journal":
      return "/(tabs)/journal";
    case "weekly_report":
      return "/(tabs)/journal";
    case "feature_tips":
      return "/(tabs)/settings";
    default:
      return "/(tabs)/journal";
  }
}
