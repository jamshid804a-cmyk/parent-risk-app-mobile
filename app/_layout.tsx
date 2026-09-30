import { Stack } from "expo-router";
import { useEffect } from "react";
import { AuthProvider } from "../src/context/AuthContext";
import { ThemeProvider } from "../src/context/ThemeContext";
import { ToastProvider } from "../src/context/ToastContext";
import {
  attachNotificationListeners,
  isExpoGo,
  requestNotificationPermissions,
  setupNotificationChannels,
} from "../src/utils/notifications";

export default function RootLayout() {
  useEffect(() => {
    if (isExpoGo()) {
      console.log("[notifications] Expo Go — skipping push setup");
      return;
    }

    (async () => {
      try {
        await requestNotificationPermissions();
        await setupNotificationChannels();
      } catch (e) {
        console.log("[notifications] setup error:", e);
      }
    })();

    const detach = attachNotificationListeners();
    return () => {
      detach?.();
    };
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}