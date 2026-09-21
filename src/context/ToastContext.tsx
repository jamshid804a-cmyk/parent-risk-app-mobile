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

type ToastContextType = {
  showToast: (t: Omit<ToastData, "id">) => void;
};

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

export const useToast = () => useContext(ToastContext);

type Kind = "attendance" | "test" | "exam" | "fee" | "info";

function getKind(n: any): Kind {
  const t = String(n?.type || "").toLowerCase();
  const msg = String(n?.message || "").toLowerCase();
  if (t === "fee") return "fee";
  if (t === "attendance") return "attendance";
  if (t === "test") return "test";
  if (t === "exam") return "exam";
  if (t === "academic") {
    if (msg.includes("exam")) return "exam";
    return "test";
  }
  return "info";
}

function kindToToastType(k: Kind): ToastData["type"] {
  if (k === "test") return "academic";
  if (k === "exam") return "academic";
  if (k === "fee") return "fee";
  if (k === "attendance") return "attendance";
  return "info";
}

function kindLabel(k: Kind): string {
  if (k === "test") return "Test Section";
  if (k === "exam") return "Examination";
  if (k === "fee") return "Fee";
  if (k === "attendance") return "Attendance";
  return "Notification";
}

function isUnread(n: any): boolean {
  return n?.readStatus === false || n?.readStatus === 0;
}

export const ToastProvider = ({ children }: any) => {
  const { user } = useAuth();
  const [toast, setToast] = useState<ToastData | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const busyRef = useRef(false);
  const appState = useRef(AppState.currentState);

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
          const res = await fetch(`${BASE_URL}/api/notifications?studentId=${s.id}`);
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
      all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      if (!initializedRef.current) {
        all.forEach((n) => seenIdsRef.current.add(String(n.id)));
        initializedRef.current = true;
        return;
      }
      const fresh = all.filter((n) => isUnread(n) && !seenIdsRef.current.has(String(n.id)));
      fresh.forEach((n) => seenIdsRef.current.add(String(n.id)));
      if (fresh.length > 0) {
        const n = fresh[0];
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
            else if (kind === "exam")
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
      seenIdsRef.current.clear();
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
