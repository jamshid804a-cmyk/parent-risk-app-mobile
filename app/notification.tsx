import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
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

const BASE_URL = "https://parentriskapp-backend.vercel.app";

export default function Notification() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.studentId) {
      fetchNotifications();
    } else {
      setLoading(false);
    }
  }, [user]);

  async function fetchNotifications() {
    try {
      console.log("📥 Fetching notifications for studentId:", user?.studentId);
      const res = await fetch(
        `${BASE_URL}/api/notifications?studentId=${user?.studentId}`
      );
      console.log("📥 Response status:", res.status);

      if (!res.ok) {
        console.log("❌ Bad status:", res.status);
        setNotifications([]);
        return;
      }

      const data = await res.json();
      console.log("📥 Notifications data:", data);

      const list = Array.isArray(data) ? data : [];
      setNotifications(list);
    } catch (e) {
      console.log("❌ Failed to fetch notifications:", e);
    } finally {
      setLoading(false);
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
            setNotifications((prev) => prev.filter((n: any) => n.id !== id));
          } catch (e) {
            console.log("Failed to delete:", e);
          }
        },
      },
    ]);
  }

  function handleTap(notification: any) {
    markAsRead(notification.id);
    setNotifications((prev) =>
      prev.map((n: any) =>
        n.id === notification.id ? { ...n, readStatus: true } : n
      )
    );

    if (notification.type === "academic") {
      router.push("/performance");
    } else if (notification.type === "fee") {
      // Add a fee screen if you have one; for now go to home
      router.back();
    } else {
      router.push("/attendance");
    }
  }

  const unreadCount = notifications.filter(
    (n: any) => !n.readStatus
  ).length;

  function getTypeLabel(type: string) {
    if (type === "academic") return "Academic";
    if (type === "fee") return "Fee";
    return "Attendance";
  }

  function getBadgeStyle(type: string) {
    if (type === "academic") return styles.academicBadge;
    if (type === "fee") return styles.feeBadge;
    return styles.attendanceBadge;
  }

  function getBorderStyle(type: string) {
    if (type === "academic") return styles.academicCard;
    if (type === "fee") return styles.feeCard;
    return styles.attendanceCard;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backIconBtn}
        >
          <Ionicons name="arrow-back" size={22} color="#2563eb" />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        {unreadCount > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <Ionicons
            name="notifications-off-outline"
            size={48}
            color="#cbd5e1"
          />
          <Text style={styles.emptyText}>No notifications yet.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {notifications.map((n: any) => {
            const isUnread = !n.readStatus;
            const typeLabel = getTypeLabel(n.type);
            return (
              <TouchableOpacity
                key={n.id}
                onPress={() => handleTap(n)}
                style={[
                  styles.card,
                  isUnread && styles.unreadCard,
                  getBorderStyle(n.type),
                ]}
              >
                <View style={styles.cardTop}>
                  <View style={styles.cardTopLeft}>
                    <Text style={[styles.badge, getBadgeStyle(n.type)]}>
                      {typeLabel}
                    </Text>
                    {isUnread && <View style={styles.unreadDot} />}
                  </View>
                  <TouchableOpacity
                    onPress={() => deleteNotification(n.id)}
                    style={styles.deleteBtn}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.message}>{n.message}</Text>

                <Text style={styles.tapHint}>
                  {n.type === "academic"
                    ? "Tap to view Academic Performance"
                    : n.type === "fee"
                    ? "Tap to view Fee"
                    : "Tap to view Attendance"}
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
  backIconBtn: { padding: 2 },
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
  academicCard: { borderLeftColor: "#f59e0b" },
  attendanceCard: { borderLeftColor: "#3b82f6" },
  feeCard: { borderLeftColor: "#16a34a" },
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
  academicBadge: { backgroundColor: "#fef3c7", color: "#d97706" },
  attendanceBadge: { backgroundColor: "#dbeafe", color: "#2563eb" },
  feeBadge: { backgroundColor: "#dcfce7", color: "#16a34a" },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#ef4444" },
  deleteBtn: { padding: 4 },
  message: { fontSize: 13, color: "#475569", lineHeight: 20, marginBottom: 8 },
  tapHint: { fontSize: 12, color: "#3b82f6", fontWeight: "600", marginBottom: 4 },
  time: { fontSize: 11, color: "#94a3b8" },
});