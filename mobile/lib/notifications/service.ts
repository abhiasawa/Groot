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

// ── Feature tips pool ──────────────────────────

export const FEATURE_TIPS = [
  {
    title: "Voice notes",
    body: "Tap the cloud to record a voice note. Groot will transcribe and save it to your journal.",
  },
  {
    title: "Camera capture",
    body: "Tap the cloud, then switch to Photo mode to snap and save a photo memory.",
  },
  {
    title: "Evening reflection",
    body: "Every evening at 9 PM, Groot sends you a reflection prompt. Try responding — it builds your journal.",
  },
  {
    title: "Weekly report",
    body: "Every Sunday, Groot generates a weekly summary of your mood, habits, and journal patterns.",
  },
  {
    title: "WhatsApp linking",
    body: "Link your WhatsApp in Settings to chat with Groot directly from WhatsApp.",
  },
  {
    title: "Mood tracking",
    body: "Groot tracks your mood as you journal. Check trends in Settings.",
  },
  {
    title: "Task management",
    body: "Mention tasks in your messages and Groot will automatically track them in the Tasks tab.",
  },
  {
    title: "Journal filters",
    body: "Switch to calendar view in Journal to filter entries by text, voice, or photo.",
  },
  {
    title: "Dark mode",
    body: "You can switch between light, dark, or system theme in Settings > Appearance.",
  },
  {
    title: "Journal search",
    body: "Use the search bar in Journal to find any thought you have captured.",
  },
];

/** Pick a deterministic tip based on the current week number. */
export function getTipForCurrentWeek(): (typeof FEATURE_TIPS)[number] {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.floor(
    (now.getTime() - startOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000),
  );
  return FEATURE_TIPS[weekNumber % FEATURE_TIPS.length]!;
}

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

  // Schedule standard notifications
  for (const def of NOTIFICATION_DEFS) {
    const enabled = prefs[def.key] ?? true;
    if (!enabled) continue;

    if (def.weekdays && def.weekdays.length > 0) {
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

  // Schedule feature tips (Wednesday 2 PM, rotating content)
  const featureTipsEnabled = prefs["feature_tips"] ?? true;
  if (featureTipsEnabled) {
    const tip = getTipForCurrentWeek();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Tip: ${tip.title}`,
        body: tip.body,
        data: { screen: "/", type: "feature_tip" },
        ...(Platform.OS === "android" && { channelId: CHANNEL_ID }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 4, // Wednesday
        hour: 14,
        minute: 0,
      },
    });
  }
}

/**
 * Map a preference key to the deep-link screen path.
 */
function screenForKey(_key: string): string {
  return "/";
}
