import React, { useState, useCallback, useRef, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Audio } from "expo-av";
import { Play, Pause } from "lucide-react-native";
import {
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { fonts } from "../../constants/typography";

interface AudioPlayerProps {
  uri: string;
}

const BAR_COUNT = 30;
// Pre-generated waveform heights for visual consistency
const WAVEFORM_HEIGHTS = [
  0.3, 0.5, 0.7, 0.4, 0.9, 0.6, 0.8, 0.3, 0.7, 0.5,
  0.4, 0.8, 0.6, 0.9, 0.3, 0.7, 0.5, 0.8, 0.4, 0.6,
  0.9, 0.3, 0.7, 0.5, 0.4, 0.8, 0.6, 0.3, 0.5, 0.7,
];

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioPlayer({ uri }: AudioPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const progress = useSharedValue(0);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const togglePlay = useCallback(async () => {
    if (playing && soundRef.current) {
      await soundRef.current.pauseAsync();
      setPlaying(false);
      return;
    }

    if (soundRef.current) {
      await soundRef.current.playAsync();
      setPlaying(true);
      return;
    }

    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true },
      (status) => {
        if (!status.isLoaded) return;
        setPosition(status.positionMillis);
        setDuration(status.durationMillis ?? 0);
        const dur = status.durationMillis ?? 1;
        progress.value = withTiming(status.positionMillis / dur, { duration: 200 });
        if (status.didJustFinish) {
          setPlaying(false);
          progress.value = withTiming(0, { duration: 300 });
        }
      },
    );

    soundRef.current = sound;
    setPlaying(true);
  }, [playing, uri, progress]);

  return (
    <View style={styles.container}>
      {/* Play/Pause button */}
      <Pressable onPress={togglePlay} style={styles.playBtn}>
        {playing ? (
          <Pause size={14} color="#1E1E1E" strokeWidth={2.4} />
        ) : (
          <Play size={14} color="#1E1E1E" strokeWidth={2.4} style={{ marginLeft: 2 }} />
        )}
      </Pressable>

      {/* Waveform bars */}
      <View style={styles.waveform}>
        {WAVEFORM_HEIGHTS.map((h, i) => {
          const barProgress = i / BAR_COUNT;
          const currentProgress = duration > 0 ? position / duration : 0;
          const isPlayed = barProgress <= currentProgress;

          return (
            <View
              key={i}
              style={[
                styles.bar,
                {
                  height: 4 + h * 20,
                  backgroundColor: isPlayed ? "#FF720E" : "#D9D9D9",
                },
              ]}
            />
          );
        })}
      </View>

      {/* Duration */}
      <Text style={styles.time}>
        {duration > 0 ? formatTime(playing ? position : duration) : "0:00"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 10,
    marginBottom: 20,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFBB2C",
    alignItems: "center",
    justifyContent: "center",
  },
  waveform: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    height: 24,
  },
  bar: {
    width: 2,
    borderRadius: 1,
  },
  time: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: "#555555",
    fontVariant: ["tabular-nums"],
    minWidth: 36,
    textAlign: "right",
  },
});
