/**
 * React hook that:
 * 1. Requests notification permissions on mount.
 * 2. Re-syncs scheduled notifications whenever user preferences change.
 * 3. Listens for notification taps and navigates to the relevant screen.
 */
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";

import { useSettings } from "../api/queries";
import {
  requestPermissions,
  syncScheduledNotifications,
} from "./service";

export function useNotifications(): void {
  const router = useRouter();
  const { data } = useSettings();
  const hasRequestedRef = useRef(false);

  // ── 1. Request permissions once ───────────────
  useEffect(() => {
    if (hasRequestedRef.current) return;
    hasRequestedRef.current = true;

    void requestPermissions();
  }, []);

  // ── 2. Sync scheduled notifications when prefs change ──
  useEffect(() => {
    if (!data?.preferences) return;
    void syncScheduledNotifications(data.preferences);
  }, [data?.preferences]);

  // ── 3. Handle notification taps ───────────────
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const screen = response.notification.request.content.data
          ?.screen as string | undefined;

        if (screen) {
          // Small delay to ensure app is fully mounted after cold start
          setTimeout(() => {
            router.push(screen as never);
          }, 100);
        }
      },
    );

    return () => subscription.remove();
  }, [router]);
}
