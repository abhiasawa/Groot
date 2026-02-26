import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  PanResponder,
  Platform,
} from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Plus, Type, Mic, Camera, X } from "lucide-react-native";

import { useTheme } from "../../lib/theme/provider";
import { useCompose } from "../../lib/compose-context";

const TAB_ORDER = ["today", "garden", "__fab__", "mirror", "settings"] as const;

// Radial menu config: 3 items in an arc above the FAB
const RADIAL_RADIUS = 80;
// Angles: -135 = top-left, -90 = straight up, -45 = top-right
const ITEM_ANGLES = [-135, -90, -45] as const;
const ITEM_MODES = ["text", "voice", "image"] as const;
type ComposeMode = "text" | "voice" | "image";

// Hit area radius for detecting which option the thumb is over
const HIT_RADIUS = 34;

function getTabLabel(name: string, title?: string) {
  if (title) return title;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Calculate x,y offset for a radial item */
function radialXY(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: Math.cos(rad) * radius, y: Math.sin(rad) * radius };
}

// Pre-compute positions
const POSITIONS = ITEM_ANGLES.map((a) => radialXY(a, RADIAL_RADIUS));

export function BottomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const { open: openCompose } = useCompose();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === "ios" ? 8 : 6);
  const [expanded, setExpanded] = useState(false);
  const [hoveredMode, setHoveredMode] = useState<ComposeMode | null>(null);

  // Track FAB center position for gesture math
  const fabCenterRef = useRef({ x: 0, y: 0 });

  const fabRotation = useSharedValue(0);
  const menuProgress = useSharedValue(0);

  const fabAnimStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${fabRotation.value}deg` }],
  }));

  // Animate scale + opacity only (NO translateX/Y — breaks touch targets on Android)
  const itemStyle0 = useAnimatedStyle(() => ({
    opacity: menuProgress.value,
    transform: [{ scale: 0.3 + 0.7 * menuProgress.value }],
  }));
  const itemStyle1 = useAnimatedStyle(() => ({
    opacity: menuProgress.value,
    transform: [{ scale: 0.3 + 0.7 * menuProgress.value }],
  }));
  const itemStyle2 = useAnimatedStyle(() => ({
    opacity: menuProgress.value,
    transform: [{ scale: 0.3 + 0.7 * menuProgress.value }],
  }));
  const itemStyles = [itemStyle0, itemStyle1, itemStyle2];

  // Use refs for callbacks so PanResponder never captures stale closures
  const openMenuRef = useRef<() => void>(() => {});
  const findHoveredRef = useRef<(px: number, py: number) => ComposeMode | null>(() => null);
  const selectOptionRef = useRef<(mode: ComposeMode) => void>(() => {});

  const openMenu = useCallback(() => {
    setExpanded(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    fabRotation.value = withTiming(45, { duration: 200 });
    menuProgress.value = withTiming(1, { duration: 250 });
  }, [fabRotation, menuProgress]);

  const closeMenu = useCallback(() => {
    fabRotation.value = withTiming(0, { duration: 200 });
    menuProgress.value = withTiming(0, { duration: 150 });
    setExpanded(false);
    setHoveredMode(null);
  }, [fabRotation, menuProgress]);

  const selectOption = useCallback(
    (mode: ComposeMode) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      closeMenu();
      openCompose(mode);
    },
    [closeMenu, openCompose],
  );

  const findHoveredItem = useCallback(
    (pageX: number, pageY: number): ComposeMode | null => {
      const cx = fabCenterRef.current.x;
      const cy = fabCenterRef.current.y;
      const dx = pageX - cx;
      const dy = pageY - cy;

      for (let i = 0; i < POSITIONS.length; i++) {
        const pos = POSITIONS[i]!;
        const itemDx = dx - pos.x;
        const itemDy = dy - pos.y;
        const dist = Math.sqrt(itemDx * itemDx + itemDy * itemDy);
        if (dist < HIT_RADIUS) return ITEM_MODES[i]!;
      }
      return null;
    },
    [],
  );

  // Keep refs in sync
  openMenuRef.current = openMenu;
  findHoveredRef.current = findHoveredItem;
  selectOptionRef.current = selectOption;

  // PanResponder — uses refs to avoid stale closures
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          openMenuRef.current();
        },
        onPanResponderMove: (evt) => {
          const hovered = findHoveredRef.current(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
          setHoveredMode((prev) => {
            if (prev !== hovered && hovered) {
              Haptics.selectionAsync();
            }
            return hovered;
          });
        },
        onPanResponderRelease: (evt) => {
          const selected = findHoveredRef.current(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
          if (selected) {
            selectOptionRef.current(selected);
          }
          // If no selection, menu stays open for tap interaction
        },
      }),
    [],
  );

  const getIconForMode = (mode: ComposeMode, isHovered: boolean) => {
    const size = isHovered ? 22 : 18;
    const sw = isHovered ? 2.4 : 2;
    switch (mode) {
      case "text":
        return <Type size={size} color={isHovered ? colors.primaryForeground : colors.chart1} strokeWidth={sw} />;
      case "voice":
        return <Mic size={size} color={isHovered ? colors.primaryForeground : colors.chart3} strokeWidth={sw} />;
      case "image":
        return <Camera size={size} color={isHovered ? colors.primaryForeground : colors.primary} strokeWidth={sw} />;
    }
  };

  const getBgForMode = (mode: ComposeMode, isHovered: boolean) => {
    if (isHovered) {
      switch (mode) {
        case "text": return colors.chart1;
        case "voice": return colors.chart3;
        case "image": return colors.primary;
      }
    }
    return colors.card;
  };

  return (
    <View
      style={[
        st.shell,
        {
          paddingBottom: bottomInset,
          backgroundColor: colors.card,
          shadowColor: colors.shadowColor,
        },
      ]}
    >
      {/* Radial menu items — positioned at final locations, animate scale/opacity only */}
      {expanded && ITEM_MODES.map((mode, i) => {
        const isHovered = hoveredMode === mode;
        const pos = POSITIONS[i]!;
        return (
          <Animated.View
            key={mode}
            style={[
              st.radialItemFinal,
              {
                // Position relative to center of tab bar, shifted to center of FAB
                left: "50%",
                bottom: 68,
                marginLeft: pos.x - 24, // 24 = half of circle width (48)
                marginBottom: -pos.y - 24, // negate because y is negative (upward)
              },
              itemStyles[i],
            ]}
          >
            <Pressable
              onPress={() => selectOption(mode)}
              hitSlop={16}
              style={({ pressed }) => [
                st.radialCircle,
                {
                  backgroundColor: getBgForMode(mode, isHovered),
                  transform: [{ scale: pressed ? 0.85 : 1 }],
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.2,
                  shadowRadius: 6,
                  elevation: 12,
                },
              ]}
            >
              {getIconForMode(mode, isHovered)}
            </Pressable>
          </Animated.View>
        );
      })}

      <View style={st.row}>
        {TAB_ORDER.map((slot) => {
          if (slot === "__fab__") {
            return (
              <View
                key="fab"
                style={st.fabSlot}
                onLayout={(e) => {
                  e.target.measureInWindow((x, y, w, h) => {
                    fabCenterRef.current = { x: x + w / 2, y: y + h / 2 - 24 };
                  });
                }}
              >
                <Animated.View style={fabAnimStyle}>
                  <View {...(expanded ? {} : panResponder.panHandlers)}>
                    <Pressable
                      onPress={() => {
                        if (expanded) {
                          closeMenu();
                        } else {
                          openMenu();
                        }
                      }}
                      style={[
                        st.fab,
                        {
                          backgroundColor: expanded
                            ? colors.mutedForeground
                            : colors.primary,
                        },
                      ]}
                    >
                      {expanded ? (
                        <X size={24} color={colors.primaryForeground} strokeWidth={2.4} />
                      ) : (
                        <Plus size={26} color={colors.primaryForeground} strokeWidth={2.4} />
                      )}
                    </Pressable>
                  </View>
                </Animated.View>
              </View>
            );
          }

          const route = state.routes.find((r) => r.name === slot);
          if (!route) return <View key={slot} style={st.item} />;

          const descriptor = descriptors[route.key];
          if (!descriptor) return <View key={slot} style={st.item} />;

          const focused = state.index === state.routes.findIndex((r) => r.key === route.key);
          const label = getTabLabel(route.name, typeof descriptor.options.title === "string" ? descriptor.options.title : undefined);
          const tint = focused ? colors.primary : colors.mutedForeground;

          const onPress = () => {
            if (expanded) {
              closeMenu();
              return;
            }
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const icon =
            descriptor.options.tabBarIcon?.({
              focused,
              color: tint,
              size: 22,
            }) ?? null;

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={() => {
                navigation.emit({ type: "tabLongPress", target: route.key });
              }}
              style={st.item}
            >
              <View style={st.iconWrap}>{icon}</View>
              <Text
                style={[
                  st.label,
                  {
                    color: tint,
                    fontFamily: focused ? "Manrope_700Bold" : "Manrope_500Medium",
                  },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  shell: {
    paddingTop: 8,
    paddingHorizontal: 6,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    height: 52,
  },
  iconWrap: {
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 13,
    includeFontPadding: false,
  },
  fabSlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 4,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 6,
  },
  radialItemFinal: {
    position: "absolute",
    zIndex: 20,
    elevation: 20,
  },
  radialCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
