import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { lightTheme, darkTheme, type ThemeColors } from "./tokens";

const STORAGE_KEY = "groot-theme";

type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  /** The user-selected mode (includes "system"). */
  mode: ThemeMode;
  /** The resolved mode after applying system preference (never "system"). */
  resolvedMode: "light" | "dark";
  /** Active color tokens for the resolved mode. */
  colors: ThemeColors;
  /** Persist a new theme mode selection. */
  setMode: (mode: ThemeMode) => void;
  /** Toggle between light and dark (bypasses system). */
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");

  // Load persisted preference on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === "light" || stored === "dark" || stored === "system") {
          setModeState(stored);
        }
      })
      .catch((err) => {
        console.warn("[Theme] Failed to load persisted theme:", err);
      });
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const resolvedMode: "light" | "dark" = useMemo(() => {
    if (mode === "system") {
      return systemScheme === "dark" ? "dark" : "light";
    }
    return mode;
  }, [mode, systemScheme]);

  const colors = useMemo(
    () => (resolvedMode === "dark" ? darkTheme : lightTheme),
    [resolvedMode],
  );

  const toggleTheme = useCallback(() => {
    setMode(resolvedMode === "dark" ? "light" : "dark");
  }, [resolvedMode, setMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, resolvedMode, colors, setMode, toggleTheme }),
    [mode, resolvedMode, colors, setMode, toggleTheme],
  );

  // Always render children — default "system" theme is used until the
  // persisted preference finishes loading from AsyncStorage.
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a <ThemeProvider>");
  }
  return ctx;
}
