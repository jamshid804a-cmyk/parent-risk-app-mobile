import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { Alert } from "react-native";
import {
  getSoundFor,
  getSoundMap,
  isSoundEnabled,
  NOTIF_LABELS,
  NotifType,
  setSoundEnabled,
  setSoundFor,
  SOUND_LABELS,
  SoundKey,
} from "./soundSettings";

export { getSoundMap, NOTIF_LABELS, setSoundEnabled, setSoundFor, SOUND_LABELS };
export type { NotifType, SoundKey };

const SOURCE: Record<SoundKey, any> = {
  notification1: require("../../assets/notification1.mp3"),
  notification2: require("../../assets/notification2.mp3"),
  notification3: require("../../assets/notification3.mp3"),
};

const players: Partial<Record<SoundKey, AudioPlayer>> = {};
let audioModeSet = false;

export async function playSound(key: SoundKey): Promise<void> {
  try {
    if (!(await isSoundEnabled())) return;

    if (!audioModeSet) {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: false,
      });
      audioModeSet = true;
    }

    if (!players[key]) {
      players[key] = createAudioPlayer(SOURCE[key]);
    }

    const player = players[key]!;

    try {
      player.seekTo(0);
    } catch {}

    player.play();
  } catch (e: any) {
    console.log("playSound error:", e);
    Alert.alert("Sound Error", String(e?.message || e));
  }
}

export async function playNotificationSound(type: NotifType): Promise<void> {
  const key = await getSoundFor(type);
  await playSound(key);
}

export async function previewSound(key: SoundKey): Promise<void> {
  const wasEnabled = await isSoundEnabled();
  if (!wasEnabled) await setSoundEnabled(true);
  try {
    await playSound(key);
  } finally {
    if (!wasEnabled) await setSoundEnabled(false);
  }
}