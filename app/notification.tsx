import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
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

const BASE_URL = "https://parent-risk-app-mobile-production-30bb.up.railway.app";

export default function Notification() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (user?.students && user.students.length > 0) {
        fetchNotifications();
      }
    }, [user])
  );

  async function fetchNotifications() {
    try {
      const studentId = user?.students[0]?.id;
      if (!studentId) return;
      const res = await fetch(`${BASE_URL}/api/notifications/${studentId}`);
      if (!res.ok) return;
      const data = await res.json();
      setNotifications((data.notifications || []).reverse());
    } catch (e) {
      console.log("Failed to fetch notifications:", e);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id: number) {
    try {
      await fetch(`${BASE_URL}/api/notifications/${id}/read`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      });
    } catch (e) {
      console.log("Failed to mark as read:", e);
    }
  }

  async function deleteNotification(id: number) {
    Alert.alert(
      "Delete Notification",
      "Are you sure you want to delete this notification?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await fetch(`${BASE_URL}/api/notifications/${id}`, {
                method: "DELETE",
              });
              setNotifications((prev) => prev.filter((n: any) => n.id !== id));
            } catch (e) {
              console.log("Failed to delete notification:", e);
            }
          },
        },
      ]
    );
  }

  function handleTap(notification: any) {
    markAsRead(notification.id);
    setNotifications((prev) =>
      prev.map((n: any) =>
        n.id === notification.id ? { ...n, read_status: 1 } : n
      )
    );
    if (notification.type === "academic") {
      router.push("/performance");
    } else {
      router.push("/attendance");
    }
  }

  const unreadCount = notifications.filter(
    (n: any) => Number(n.read_status) === 0
  ).length;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIconBtn}>
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
          <Text style={styles.emptyText}>No notifications yet.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {notifications.map((n: any) => {
            const isAcademic = n.type === "academic";
            const isUnread = Number(n.read_status) === 0;
            return (
              <TouchableOpacity
                key={n.id}
                onPress={() => handleTap(n)}
                style={[
                  styles.card,
                  isUnread && styles.unreadCard,
                  isAcademic ? styles.academicCard : styles.attendanceCard,
                ]}
              >
                <View style={styles.cardTop}>
                  <View style={styles.cardTopLeft}>
                    <Text
                      style={[
                        styles.badge,
                        isAcademic ? styles.academicBadge : styles.attendanceBadge,
                      ]}
                    >
                      {isAcademic ? "Academic" : "Attendance"}
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
                  {isAcademic
                    ? "Tap to view Academic Performance →"
                    : "Tap to view Attendance →"}
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
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#ef4444" },
  deleteBtn: { padding: 4 },
  message: { fontSize: 13, color: "#475569", lineHeight: 20, marginBottom: 8 },
  tapHint: { fontSize: 12, color: "#3b82f6", fontWeight: "600", marginBottom: 4 },
  time: { fontSize: 11, color: "#94a3b8" },
});