import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from "expo-audio";
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

let currentPlayer: AudioPlayer | null = null;
let currentKey: SoundKey | null = null;
let audioModeSet = false;

async function destroyCurrentPlayer() {
  if (currentPlayer) {
    try { currentPlayer.pause(); } catch {}
    try { currentPlayer.remove?.(); } catch {}
    currentPlayer = null;
    currentKey = null;
  }
}

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

    await destroyCurrentPlayer();
    await new Promise((r) => setTimeout(r, 60));

    currentPlayer = createAudioPlayer(SOURCE[key]);
    currentKey = key;
    await new Promise((r) => setTimeout(r, 30));
    currentPlayer.play();
  } catch (e: any) {
    console.log("playSound error:", e);
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