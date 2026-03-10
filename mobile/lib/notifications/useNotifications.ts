/**
 * React hook that:
 * 1. Requests notification permissions on mount.
 * 2. Listens for notification taps and navigates to the relevant screen.
 */
import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";

import { requestPermissions } from "./service";

export function useNotifications(): void {
  const router = useRouter();
  const hasRequestedRef = useRef(false);

  // ── 1. Request permissions once ───────────────
  useEffect(() => {
    if (hasRequestedRef.current) return;
    hasRequestedRef.current = true;

    void requestPermissions();
  }, []);

  // ── 2. Handle notification taps ───────────────
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const screen = response.notification.request.content.data
          ?.screen as string | undefined;

        if (screen) {
          setTimeout(() => {
            router.push(screen as never);
          }, 100);
        }
      },
    );

    return () => subscription.remove();
  }, [router]);
}
