import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../src/context/AuthContext";
import { playNotificationSound } from "../src/utils/sound";
import type { NotifType } from "../src/utils/soundSettings";

const BASE_URL = "https://parentriskapp-backend.vercel.app";
const POLL_INTERVAL_MS = 20000; // check for new notifications every 20s

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

// Maps this screen's Kind values to the sound-settings NotifType keys
function toSoundType(kind: Kind): NotifType {
  if (kind === "exam") return "examination";
  if (kind === "test") return "test";
  if (kind === "fee") return "fee";
  return "attendance";
}

const KIND_LABEL: Record<Kind, string> = {
  attendance: "Attendance",
  test: "Test Section",
  exam: "Examination",
  fee: "Fee",
  info: "Notification",
};

export default function Notification() {
  const { user } = useAuth();
  const students = user?.students || [];
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Multi-select mode
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ✅ Tracks which notification IDs we've already seen, so we only
  // play sound for genuinely NEW ones (not on every fetch/reopen)
  const seenIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (students.length > 0) fetchAll();
    else setLoading(false);

    const interval = setInterval(() => {
      if (students.length > 0) fetchAll(true);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [user?.students]);

  async function fetchAll(isPoll: boolean = false) {
    try {
      if (!isPoll) setLoading(true);
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
        } catch (e) {
          console.log("Fetch error for student", s.id, e);
        }
      }
      all.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // ✅ Detect new notifications since last check and play their assigned sound
      const currentIds = new Set(all.map((n) => String(n.id)));
      if (seenIdsRef.current !== null) {
        const newOnes = all.filter(
          (n) => !seenIdsRef.current!.has(String(n.id))
        );
        for (const n of newOnes) {
          const kind = getKind(n);
          await playNotificationSound(toSoundType(kind));
        }
      }
      seenIdsRef.current = currentIds;

      setNotifications(all);
    } catch (e) {
      console.log("Failed to fetch notifications:", e);
    } finally {
      if (!isPoll) setLoading(false);
    }
  }

  async function markAsRead(id: string) {
    try {
      await fetch(`${BASE_URL}/api/notifications`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch (e) {
      console.log("Failed to mark as read:", e);
    }
  }

  // Delete one (existing behavior)
  async function deleteNotification(id: string) {
    Alert.alert("Delete Notification", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await fetch(`${BASE_URL}/api/notifications?id=${id}`, {
              method: "DELETE",
            });
            setNotifications((prev) => prev.filter((n) => n.id !== id));
            setSelectedIds((prev) => {
              const copy = new Set(prev);
              copy.delete(id);
              return copy;
            });
          } catch (e) {
            console.log("Failed to delete:", e);
          }
        },
      },
    ]);
  }

  // ✅ Delete everything selected
  async function deleteSelected() {
    if (selectedIds.size === 0) {
      Alert.alert("Nothing selected", "Select at least one notification first.");
      return;
    }
    Alert.alert(
      "Delete Selected",
      `Delete ${selectedIds.size} notification${selectedIds.size === 1 ? "" : "s"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const ids = Array.from(selectedIds);
            for (const id of ids) {
              try {
                await fetch(`${BASE_URL}/api/notifications?id=${id}`, {
                  method: "DELETE",
                });
              } catch (e) {
                console.log("Delete failed:", id, e);
              }
            }
            setNotifications((prev) => prev.filter((n) => !selectedIds.has(n.id)));
            setSelectedIds(new Set());
            setSelectMode(false);
          },
        },
      ]
    );
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(notifications.map((n) => String(n.id))));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  function handleTap(n: any) {
    if (selectMode) {
      toggleSelect(String(n.id));
      return;
    }
    markAsRead(n.id);
    setNotifications((prev) =>
      prev.map((x) => (x.id === n.id ? { ...x, readStatus: true } : x))
    );
    const studentId = n._studentId;
    const kind = getKind(n);
    if (kind === "attendance") {
      router.push({ pathname: "/attendance", params: { studentId } });
    } else if (kind === "test") {
      router.push({ pathname: "/testing", params: { studentId } });
    } else if (kind === "exam") {
      router.push({ pathname: "/examination", params: { studentId } });
    } else if (kind === "fee") {
      router.push({ pathname: "/fee", params: { studentId } });
    }
  }

  const unreadCount = notifications.filter(
    (n) => n.readStatus === false || n.readStatus === 0
  ).length;

  function getBadgeStyle(kind: Kind) {
    if (kind === "test") return styles.testBadge;
    if (kind === "exam") return styles.examBadge;
    if (kind === "fee") return styles.feeBadge;
    if (kind === "attendance") return styles.attendanceBadge;
    return styles.infoBadge;
  }
  function getBorderStyle(kind: Kind) {
    if (kind === "test") return styles.testCard;
    if (kind === "exam") return styles.examCard;
    if (kind === "fee") return styles.feeCard;
    if (kind === "attendance") return styles.attendanceCard;
    return styles.infoCard;
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top bar */}
      <View style={styles.topBar}>
        {selectMode ? (
          <>
            <TouchableOpacity onPress={exitSelectMode} style={styles.iconBtn}>
              <Ionicons name="close" size={22} color="#2563eb" />
            </TouchableOpacity>
            <Text style={styles.title}>
              {selectedIds.size} selected
            </Text>
            <TouchableOpacity
              onPress={
                selectedIds.size === notifications.length ? clearSelection : selectAll
              }
              style={styles.textBtn}
            >
              <Text style={styles.textBtnLabel}>
                {selectedIds.size === notifications.length ? "Unselect All" : "Select All"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={deleteSelected}
              style={styles.deleteSelectedBtn}
            >
              <Ionicons name="trash" size={18} color="#fff" />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="arrow-back" size={22} color="#2563eb" />
            </TouchableOpacity>
            <Text style={styles.title}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{unreadCount}</Text>
              </View>
            )}
            {notifications.length > 0 && (
              <TouchableOpacity
                onPress={() => setSelectMode(true)}
                style={styles.selectToggleBtn}
              >
                <Ionicons name="checkmark-done" size={18} color="#2563eb" />
                <Text style={styles.selectToggleText}>Select</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="notifications-off-outline" size={48} color="#cbd5e1" />
          <Text style={styles.emptyText}>No notifications yet.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {notifications.map((n) => {
            const isUnread = n.readStatus === false || n.readStatus === 0;
            const kind = getKind(n);
            const isSelected = selectedIds.has(String(n.id));
            return (
              <TouchableOpacity
                key={n.id}
                onPress={() => handleTap(n)}
                style={[
                  styles.card,
                  isUnread && !selectMode && styles.unreadCard,
                  getBorderStyle(kind),
                  selectMode && isSelected && styles.selectedCard,
                ]}
              >
                <View style={styles.cardTop}>
                  <View style={styles.cardTopLeft}>
                    {/* ✅ Checkbox in select mode */}
                    {selectMode && (
                      <View
                        style={[
                          styles.checkbox,
                          isSelected && styles.checkboxChecked,
                        ]}
                      >
                        {isSelected && (
                          <Ionicons name="checkmark" size={14} color="#fff" />
                        )}
                      </View>
                    )}
                    <Text style={[styles.badge, getBadgeStyle(kind)]}>
                      {KIND_LABEL[kind]}
                    </Text>
                    {isUnread && !selectMode && <View style={styles.unreadDot} />}
                    <Text style={styles.studentTag}>{n._studentName}</Text>
                  </View>
                  {!selectMode && (
                    <TouchableOpacity
                      onPress={() => deleteNotification(n.id)}
                      style={styles.deleteBtn}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.message}>{n.message}</Text>

                <Text style={styles.hint}>
                  {selectMode
                    ? ""
                    : kind === "test"
                    ? "Tap to view Test Section →"
                    : kind === "exam"
                    ? "Tap to view Examination →"
                    : kind === "fee"
                    ? "Tap to view Fee Management →"
                    : kind === "attendance"
                    ? "Tap to view Attendance →"
                    : ""}
                </Text>

                <Text style={styles.time}>
                  {new Date(n.createdAt).toLocaleString()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f4f6f8" },
  topBar: {
    backgroundColor: "#fff",
    padding: 20,
    paddingTop: 55,
    elevation: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: "700", color: "#1e293b", flex: 1 },
  countBadge: {
    backgroundColor: "#ef4444",
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 3,
    minWidth: 24,
    alignItems: "center",
  },
  countBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  // ✅ Select-mode toggle button
  selectToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#eef2ff",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  selectToggleText: { color: "#2563eb", fontWeight: "800", fontSize: 12 },

  // ✅ In select mode
  textBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  textBtnLabel: { color: "#2563eb", fontWeight: "800", fontSize: 13 },
  deleteSelectedBtn: {
    backgroundColor: "#ef4444",
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  // ✅ Checkbox
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    marginRight: 6,
  },
  checkboxChecked: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },

  selectedCard: {
    borderWidth: 2,
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff",
  },

  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },
  loadingText: { color: "#64748b", marginTop: 8 },
  emptyText: { fontSize: 15, color: "#94a3b8" },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  unreadCard: { borderLeftWidth: 4 },
  testCard: { borderLeftColor: "#4f46e5" },
  examCard: { borderLeftColor: "#7c3aed" },
  attendanceCard: { borderLeftColor: "#3b82f6" },
  feeCard: { borderLeftColor: "#16a34a" },
  infoCard: { borderLeftColor: "#4f46e5" },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardTopLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: {
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  testBadge: { backgroundColor: "#e0e7ff", color: "#4f46e5" },
  examBadge: { backgroundColor: "#ede9fe", color: "#7c3aed" },
  attendanceBadge: { backgroundColor: "#dbeafe", color: "#2563eb" },
  feeBadge: { backgroundColor: "#dcfce7", color: "#16a34a" },
  infoBadge: { backgroundColor: "#e0e7ff", color: "#4f46e5" },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#ef4444" },
  studentTag: { fontSize: 11, color: "#64748b", marginLeft: 4 },
  deleteBtn: { padding: 4 },
  message: { fontSize: 13, color: "#475569", lineHeight: 20, marginBottom: 4 },
  hint: { fontSize: 11, color: "#4f46e5", fontWeight: "700", marginBottom: 6 },
  time: { fontSize: 11, color: "#94a3b8" },
});