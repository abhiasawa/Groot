"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function hasOpenOverlay(): boolean {
  return Boolean(
    document.querySelector(
      '[data-slot="dialog-overlay"][data-state="open"], [data-slot="sheet-overlay"][data-state="open"], [data-slot="alert-dialog-overlay"][data-state="open"]',
    ),
  );
}

function clearStuckPointerEvents() {
  if (document.body.style.pointerEvents === "none" && !hasOpenOverlay()) {
    document.body.style.pointerEvents = "";
  }
}

export default function PointerEventsGuard() {
  const pathname = usePathname();

  useEffect(() => {
    clearStuckPointerEvents();

    const interval = window.setInterval(clearStuckPointerEvents, 250);
    const observer = new MutationObserver(clearStuckPointerEvents);

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["style"],
    });

    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-state"],
    });

    return () => {
      window.clearInterval(interval);
      observer.disconnect();
      clearStuckPointerEvents();
    };
  }, [pathname]);

  return null;
}

