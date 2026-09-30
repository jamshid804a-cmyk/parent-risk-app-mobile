import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import { SmartToast, ToastData } from "../components/SmartToast";
import { playNotificationSound } from "../utils/sound";
import { useAuth } from "./AuthContext";

const BASE_URL = "https://parentriskapp-backend.vercel.app";
const POLL_MS = 10000;
const SEEN_KEY = "toast_seen_ids_v1";

type ToastContextType = {
  showToast: (t: Omit<ToastData, "id">) => void;
};

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

export const useToast = () => useContext(ToastContext);

type Kind = "attendance" | "test" | "examination" | "fee" | "info";

function getKind(n: any): Kind {
  const t = String(n?.type || "").toLowerCase();
  const msg = String(n?.message || "").toLowerCase();

  if (t === "fee") return "fee";
  if (t === "attendance") return "attendance";
  if (t === "test") return "test";
  if (t === "examination" || t === "exam") return "examination";

  // Legacy "academic" fallback — inspect the message to guess
  if (t === "academic") {
    if (msg.includes("exam")) return "examination";
    return "test";
  }
  return "info";
}

function kindToToastType(k: Kind): ToastData["type"] {
  if (k === "test") return "test";
  if (k === "examination") return "examination";
  if (k === "fee") return "fee";
  if (k === "attendance") return "attendance";
  return "info";
}

function kindLabel(k: Kind): string {
  if (k === "test") return "Test Section";
  if (k === "examination") return "Examination";
  if (k === "fee") return "Fee";
  if (k === "attendance") return "Attendance";
  return "Notification";
}

function isUnread(n: any): boolean {
  return n?.readStatus === false || n?.readStatus === 0;
}

async function loadSeen(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.map(String));
  } catch {
    return new Set();
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSaveSeen(set: Set<string>) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const arr = Array.from(set).slice(-500);
    AsyncStorage.setItem(SEEN_KEY, JSON.stringify(arr)).catch(() => {});
  }, 400);
}

export const ToastProvider = ({ children }: any) => {
  const { user } = useAuth();
  const [toast, setToast] = useState<ToastData | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const busyRef = useRef(false);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    (async () => {
      const s = await loadSeen();
      seenIdsRef.current = s;
    })();
  }, []);

  const showToast = useCallback((t: Omit<ToastData, "id">) => {
    const id = String(Date.now()) + Math.random().toString(36).slice(2, 8);
    setToast({ id, ...t });
  }, []);

  const poll = useCallback(async () => {
    if (busyRef.current) return;
    const students = user?.students || [];
    if (students.length === 0) return;

    busyRef.current = true;
    try {
      const all: any[] = [];
      for (const s of students) {
        try {
          const res = await fetch(
            `${BASE_URL}/api/notifications?studentId=${s.id}`
          );
          if (!res.ok) continue;
          const data = await res.json();
          if (Array.isArray(data)) {
            data.forEach((n: any) => {
              n._studentName = s.name;
              n._studentId = s.id;
            });
            all.push(...data);
          }
        } catch {}
      }

      all.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      if (!initializedRef.current) {
        all.forEach((n) => seenIdsRef.current.add(String(n.id)));
        initializedRef.current = true;
        scheduleSaveSeen(seenIdsRef.current);
        return;
      }

      const fresh = all.filter(
        (n) => isUnread(n) && !seenIdsRef.current.has(String(n.id))
      );

      const FIVE_MIN = 5 * 60 * 1000;
      const now = Date.now();
      const trulyNew = fresh.filter((n) => {
        const t = new Date(n.createdAt).getTime();
        return !isNaN(t) && now - t < FIVE_MIN;
      });

      fresh.forEach((n) => seenIdsRef.current.add(String(n.id)));
      scheduleSaveSeen(seenIdsRef.current);

      if (trulyNew.length > 0) {
        const n = trulyNew[0];
        const kind = getKind(n);
        const toastType = kindToToastType(kind);

        showToast({
          title: n._studentName || kindLabel(kind),
          message: kindLabel(kind) + ": " + (n.message || ""),
          type: toastType,
          onPress: () => {
            const sid = n._studentId;
            if (kind === "attendance")
              router.push({ pathname: "/attendance", params: { studentId: sid } });
            else if (kind === "test")
              router.push({ pathname: "/testing", params: { studentId: sid } });
            else if (kind === "examination")
              router.push({ pathname: "/examination", params: { studentId: sid } });
            else if (kind === "fee")
              router.push({ pathname: "/fee", params: { studentId: sid } });
            else router.push("/notification");
          },
        });

        try {
          await playNotificationSound(toastType);
        } catch {}
      }
    } finally {
      busyRef.current = false;
    }
  }, [user, showToast]);

  useEffect(() => {
    if (!user) {
      initializedRef.current = false;
      return;
    }
    poll();
    const t = setInterval(poll, POLL_MS);
    return () => clearInterval(t);
  }, [user, poll]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (appState.current.match(/inactive|background/) && next === "active") {
        poll();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [poll]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <SmartToast toast={toast} onDismiss={() => setToast(null)} />
    </ToastContext.Provider>
  );
};