import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark";

type ThemeContextType = {
  theme: Theme;
  colors: typeof lightColors;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
  ready: boolean;
};

const lightColors = {
  bg: "#f3f5fb",
  card: "#ffffff",
  cardAlt: "#f8fafc",
  ink: "#0f172a",
  sub: "#64748b",
  line: "#eef1f6",
  primary: "#4338ca",
  headerBg: "#1e1b4b",
  headerText: "#ffffff",
  danger: "#ef4444",
  success: "#16a34a",
  inputBg: "#ffffff",
  inputBorder: "#e2e8f0",
};

const darkColors = {
  bg: "#0b1220",
  card: "#111827",
  cardAlt: "#0f172a",
  ink: "#f1f5f9",
  sub: "#94a3b8",
  line: "#1f2937",
  primary: "#818cf8",
  headerBg: "#020617",
  headerText: "#ffffff",
  danger: "#f87171",
  success: "#4ade80",
  inputBg: "#1f2937",
  inputBorder: "#334155",
};

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  colors: lightColors,
  toggleTheme: () => {},
  setTheme: () => {},
  ready: false,
});

const STORAGE_KEY = "app_theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === "dark" || saved === "light") setThemeState(saved);
      } catch {}
      setReady(true);
    })();
  }, []);

  async function setTheme(t: Theme) {
    setThemeState(t);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, t);
    } catch {}
  }

  function toggleTheme() {
    setTheme(theme === "light" ? "dark" : "light");
  }

  const colors = theme === "light" ? lightColors : darkColors;

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme, setTheme, ready }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);