import Constants from "expo-constants";
import { Platform } from "react-native";
import { playNotificationSound } from "./sound";
import type { NotifType, SoundKey } from "./soundSettings";
import { getSoundFor } from "./soundSettings";

const SOUND_KEYS: SoundKey[] = ["notification1", "notification2", "notification3"];

// ---- Detect Expo Go (expo-notifications is unsupported there since SDK 53) ----
export function isExpoGo(): boolean {
  return (
    Constants.appOwnership === "expo" ||
    Constants.executionEnvironment === "storeClient"
  );
}

// ---- Lazy-load expo-notifications so it never crashes Expo Go at boot ----
let NotificationsModule: any = null;
let handlerSet = false;

function loadNotifications(): any {
  if (NotificationsModule) return NotificationsModule;
  if (isExpoGo()) return null;
  try {
    NotificationsModule = require("expo-notifications");
    return NotificationsModule;
  } catch (e) {
    console.log("[notifications] module not available:", e);
    return null;
  }
}

// Set the foreground handler once, when the module loads successfully.
function ensureHandler() {
  const N = loadNotifications();
  if (!N || handlerSet) return;
  try {
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false, // we manually play the per-type sound
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    handlerSet = true;
  } catch (e) {
    console.log("[notifications] setHandler error:", e);
  }
}

// One Android channel per sound choice.
// Note: Android channels are immutable once created — if you ever change
// a channel's sound, you must use a NEW channel id (e.g. add "_v2").
export async function setupNotificationChannels(): Promise<void> {
  if (isExpoGo()) return;
  if (Platform.OS !== "android") return;
  const N = loadNotifications();
  if (!N) return;

  try {
    for (const key of SOUND_KEYS) {
      await N.setNotificationChannelAsync(`channel_${key}`, {
        name: `Sound - ${key}`,
        importance: N.AndroidImportance.HIGH,
        sound: key, // matches bundled asset name without extension
        vibrationPattern: [0, 250, 250, 250],
        enableVibrate: true,
      });
    }
  } catch (e) {
    console.log("[notifications] channel setup error:", e);
  }
}

export async function getChannelIdForType(type: NotifType): Promise<string> {
  const key = await getSoundFor(type);
  return `channel_${key}`;
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (isExpoGo()) return false;
  const N = loadNotifications();
  if (!N) return false;
  try {
    const { status } = await N.requestPermissionsAsync();
    return status === "granted";
  } catch (e) {
    console.log("[notifications] permission error:", e);
    return false;
  }
}

// Called when a push is received while the app is running.
// Plays the correct custom sound for the notification type.
export async function handleIncomingNotification(data: any): Promise<void> {
  const type = data?.type as NotifType | undefined;
  if (type) {
    try {
      await playNotificationSound(type);
    } catch (e) {
      console.log("[notifications] sound error:", e);
    }
  }
}

// Attach listeners. Returns a detach function or null (Expo Go).
export function attachNotificationListeners(): (() => void) | null {
  if (isExpoGo()) return null;
  const N = loadNotifications();
  if (!N) return null;

  ensureHandler();

  try {
    const receivedSub = N.addNotificationReceivedListener(
      (notification: any) => {
        handleIncomingNotification(notification?.request?.content?.data);
      }
    );

    const responseSub = N.addNotificationResponseReceivedListener(
      (response: any) => {
        handleIncomingNotification(
          response?.notification?.request?.content?.data
        );
      }
    );

    return () => {
      try {
        receivedSub?.remove?.();
      } catch {}
      try {
        responseSub?.remove?.();
      } catch {}
    };
  } catch (e) {
    console.log("[notifications] listener attach error:", e);
    return null;
  }
}