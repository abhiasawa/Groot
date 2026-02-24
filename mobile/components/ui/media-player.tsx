import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Audio, type AVPlaybackStatus } from "expo-av";
import { Play, Pause, Mic, ImageIcon } from "lucide-react-native";

import { useTheme } from "../../lib/theme/provider";
import { typography } from "../../constants/typography";
import { PressScale } from "./press-scale";
import { apiFetch } from "../../lib/api/client";

const SCREEN_WIDTH = Dimensions.get("window").width;

// ── Helpers ──────────────────────────────────

/** Extract the storage path from a "storage:userId/type/uuid.ext" URL */
function extractStoragePath(mediaUrl: string): string | null {
  if (mediaUrl.startsWith("storage:")) {
    return mediaUrl.slice("storage:".length);
  }
  return null;
}

/** Extract the WhatsApp media ID from a "media:WHATSAPP_ID" URL */
function extractMediaId(mediaUrl: string): string | null {
  if (mediaUrl.startsWith("media:")) {
    const id = mediaUrl.slice("media:".length).trim();
    return id.length > 0 ? id : null;
  }
  return null;
}

/**
 * Resolve a media URL to a fetchable signed URL.
 * - storage: URLs → fetch signed URL from /api/media/signed-url
 * - media: URLs → fetch via /api/media/proxy which downloads from WhatsApp,
 *   uploads to storage (backfill), and returns the binary as a blob URL
 */
async function resolveMediaUrl(
  mediaUrl: string,
  messageType: string,
): Promise<string | null> {
  const storagePath = extractStoragePath(mediaUrl);
  if (storagePath) {
    const data = await apiFetch<{ url: string }>(
      `/api/media/signed-url?path=${encodeURIComponent(storagePath)}`,
    );
    return data.url;
  }

  const mediaId = extractMediaId(mediaUrl);
  if (mediaId) {
    // Use the proxy endpoint — it returns a JSON { url } with a data URL or signed URL
    const data = await apiFetch<{ url: string }>(
      `/api/media/proxy?mediaId=${encodeURIComponent(mediaId)}&messageType=${encodeURIComponent(messageType)}`,
    );
    return data.url;
  }

  return null;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// ── Audio Player Component ──────────────────

interface AudioPlayerProps {
  mediaUrl: string;
}

function AudioPlayer({ mediaUrl }: AudioPlayerProps) {
  const { colors } = useTheme();
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  // Resolve media URL on mount
  useEffect(() => {
    resolveMediaUrl(mediaUrl, "audio")
      .then((url) => {
        if (url) setResolvedUrl(url);
        else setHasError(true);
      })
      .catch(() => setHasError(true));
  }, [mediaUrl]);

  // Cleanup sound on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setIsPlaying(status.isPlaying);
    setPosition(status.positionMillis);
    setDuration(status.durationMillis ?? 0);
    if (status.didJustFinish) {
      setIsPlaying(false);
      setPosition(0);
      soundRef.current?.setPositionAsync(0).catch(() => {});
    }
  }, []);

  const togglePlay = useCallback(async () => {
    if (!resolvedUrl) return;

    try {
      // First time — load
      if (!soundRef.current) {
        setIsLoading(true);
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
        const { sound } = await Audio.Sound.createAsync(
          { uri: resolvedUrl },
          { shouldPlay: true },
          onPlaybackStatusUpdate,
        );
        soundRef.current = sound;
        setIsLoading(false);
        return;
      }

      // Already loaded — toggle
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded && status.isPlaying) {
        await soundRef.current.pauseAsync();
      } else {
        await soundRef.current.playAsync();
      }
    } catch {
      setIsLoading(false);
    }
  }, [resolvedUrl, onPlaybackStatusUpdate]);

  const progress = duration > 0 ? position / duration : 0;

  if (hasError) {
    return (
      <View
        style={[
          styles.audioContainer,
          { backgroundColor: colors.glassSurface, borderColor: colors.glassBorder },
        ]}
      >
        <View style={[styles.playButton, { backgroundColor: colors.primary + "22" }]}>
          <Mic size={16} color={colors.mutedForeground} strokeWidth={2} />
        </View>
        <Text style={[styles.durationText, { color: colors.mutedForeground }]}>
          Audio unavailable
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.audioContainer,
        { backgroundColor: colors.glassSurface, borderColor: colors.glassBorder },
      ]}
    >
      <PressScale onPress={togglePlay} scale={0.92}>
        <View
          style={[
            styles.playButton,
            { backgroundColor: colors.primary + "22" },
          ]}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : isPlaying ? (
            <Pause size={16} color={colors.primary} strokeWidth={2} />
          ) : (
            <Play size={16} color={colors.primary} strokeWidth={2} />
          )}
        </View>
      </PressScale>

      <View style={styles.audioInfo}>
        {/* Progress bar */}
        <View style={[styles.progressBar, { backgroundColor: colors.glassBorder }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: colors.primary, width: `${progress * 100}%` },
            ]}
          />
        </View>
        <View style={styles.audioMeta}>
          <Mic size={10} color={colors.mutedForeground} strokeWidth={1.5} />
          <Text style={[styles.durationText, { color: colors.mutedForeground }]}>
            {duration > 0
              ? `${formatDuration(position)} / ${formatDuration(duration)}`
              : "Voice note"}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── Image Viewer Component ──────────────────

interface InlineImageProps {
  mediaUrl: string;
}

function InlineImage({ mediaUrl }: InlineImageProps) {
  const { colors } = useTheme();
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    resolveMediaUrl(mediaUrl, "image")
      .then((url) => {
        if (url) setResolvedUrl(url);
        else setHasError(true);
      })
      .catch(() => setHasError(true));
  }, [mediaUrl]);

  if (hasError) {
    return (
      <View
        style={[
          styles.imagePlaceholder,
          { backgroundColor: colors.glassSurface, borderColor: colors.glassBorder },
        ]}
      >
        <ImageIcon size={20} color={colors.mutedForeground} strokeWidth={1.5} />
        <Text style={[styles.imagePlaceholderText, { color: colors.mutedForeground }]}>
          Image unavailable
        </Text>
      </View>
    );
  }

  if (!resolvedUrl) {
    return (
      <View
        style={[
          styles.imagePlaceholder,
          { backgroundColor: colors.glassSurface, borderColor: colors.glassBorder },
        ]}
      >
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.imagePlaceholderText, { color: colors.mutedForeground }]}>
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.imageContainer, { borderColor: colors.glassBorder }]}>
      {isLoading && (
        <View style={[styles.imageLoadingOverlay, { backgroundColor: colors.glassSurface }]}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
      <Image
        source={{ uri: resolvedUrl }}
        style={styles.image}
        resizeMode="cover"
        onLoadEnd={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
      />
    </View>
  );
}

// ── Main export ─────────────────────────────

interface MediaPlayerProps {
  mediaUrl: string;
  messageType: string;
}

export function MediaPlayer({ mediaUrl, messageType }: MediaPlayerProps) {
  // Accept both storage: and media: URLs
  const storagePath = extractStoragePath(mediaUrl);
  const mediaId = extractMediaId(mediaUrl);
  if (!storagePath && !mediaId) return null;

  if (messageType === "audio") {
    return <AudioPlayer mediaUrl={mediaUrl} />;
  }

  if (messageType === "image") {
    return <InlineImage mediaUrl={mediaUrl} />;
  }

  return null;
}

// ── Styles ──────────────────────────────────

const styles = StyleSheet.create({
  // Audio
  audioContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 10,
    marginBottom: 10,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  audioInfo: {
    flex: 1,
  },
  progressBar: {
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  audioMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  durationText: {
    fontFamily: "Inter_400Regular",
    ...typography.xs,
  },

  // Image
  imageContainer: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 10,
  },
  image: {
    width: "100%",
    height: Math.min(SCREEN_WIDTH * 0.55, 220),
    borderRadius: 11,
  },
  imageLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
    borderRadius: 11,
  },
  imagePlaceholder: {
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  imagePlaceholderText: {
    fontFamily: "Inter_400Regular",
    ...typography.xs,
  },
});
