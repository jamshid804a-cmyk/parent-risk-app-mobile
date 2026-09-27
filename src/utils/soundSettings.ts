import AsyncStorage from "@react-native-async-storage/async-storage";

export type SoundKey = "notification1" | "notification2" | "notification3";
export type NotifType = "attendance" | "test" | "examination" | "fee";

export const SOUND_LABELS: Record<SoundKey, string> = {
  notification1: "Sound 1",
  notification2: "Sound 2",
  notification3: "Sound 3",
};

export const NOTIF_LABELS: Record<NotifType, string> = {
  attendance: "Attendance",
  test: "Test",
  examination: "Examination",
  fee: "Fee",
};

export type SoundMap = Record<NotifType, SoundKey>;

const DEFAULTS: SoundMap = {
  attendance: "notification1",
  test: "notification2",
  examination: "notification3",
  fee: "notification1",
};

const SOUND_MAP_KEY = "sound_map_v1";
const SOUND_ON_KEY = "notification_sound_enabled";

// -------- per-type sound map --------
let mapCache: SoundMap | null = null;

export async function getSoundMap(): Promise<SoundMap> {
  if (mapCache) return mapCache;
  try {
    const raw = await AsyncStorage.getItem(SOUND_MAP_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      mapCache = { ...DEFAULTS, ...parsed };
    } else {
      mapCache = { ...DEFAULTS };
    }
  } catch {
    mapCache = { ...DEFAULTS };
  }
  return mapCache;
}

export async function setSoundFor(type: NotifType, sound: SoundKey): Promise<void> {
  const current = await getSoundMap();
  const next = { ...current, [type]: sound };
  mapCache = next;
  try {
    await AsyncStorage.setItem(SOUND_MAP_KEY, JSON.stringify(next));
  } catch {}
}

export async function getSoundFor(type: NotifType): Promise<SoundKey> {
  const map = await getSoundMap();
  return map[type] ?? "notification1";
}

// -------- global on/off --------
let onCache: boolean | null = null;

export async function isSoundEnabled(): Promise<boolean> {
  if (onCache !== null) return onCache;
  try {
    const v = await AsyncStorage.getItem(SOUND_ON_KEY);
    onCache = v === null ? true : v === "true";
  } catch {
    onCache = true;
  }
  return onCache;
}

export async function setSoundEnabled(value: boolean): Promise<void> {
  onCache = value;
  try {
    await AsyncStorage.setItem(SOUND_ON_KEY, value ? "true" : "false");
  } catch {}
}