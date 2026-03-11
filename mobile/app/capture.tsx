import React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ComposeModal } from "../components/ui/compose-modal";

type CaptureMode = "text" | "voice" | "image";

export default function CaptureScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    mode?: string;
    editId?: string;
    editContent?: string;
  }>();

  const initialMode =
    params.mode === "voice" || params.mode === "image" || params.mode === "text"
      ? (params.mode as CaptureMode)
      : "text";

  return (
    <ComposeModal
      visible
      initialMode={initialMode}
      editId={params.editId}
      editContent={params.editContent}
      onClose={() => router.back()}
    />
  );
}
