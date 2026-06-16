import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../context/AuthContext";

const BASE_URL = "https://parent-risk-app-mobile-production-30bb.up.railway.app";

export default function Notification() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.students && user.students.length > 0) fetchNotifications();
  }, [user]);

  async function fetchNotifications() {
    try {
      const studentId = user?.students[0]?.id;
      const res = await fetch(
        `${BASE_URL}/api/notifications?studentId=${studentId}`
      );
      const data = await res.json();
      setNotifications(data.reverse());
    } catch (e) {
      console.log("Failed to fetch notifications:", e);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id: number) {
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
              await fetch(`${BASE_URL}/api/notifications?id=${id}`, {
                method: "DELETE",
              });
              setNotifications(prev => prev.filter((n: any) => n.id !== id));
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
    setNotifications(prev =>
      prev.map((n: any) => n.id === notification.id ? { ...n, read_status: 1 } : n)
    );
    if (notification.type === "academic") {
      router.push("/performance");
    } else {
      router.push("/attendance");
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f4f6f8" }}>
      <View style={{ backgroundColor: "#fff", padding: 20, paddingTop: 55, elevation: 3 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ fontSize: 22 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: "bold" }}>🔔 Notifications</Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <ScrollView style={{ padding: 16 }}>
          {notifications.length === 0 ? (
            <View style={{ backgroundColor: "#fff", padding: 20, borderRadius: 15, marginTop: 20, elevation: 2, borderLeftWidth: 4, borderLeftColor: "#3b82f6" }}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#1e3a5f" }}>
                No Notifications
              </Text>
              <Text style={{ color: "gray", marginTop: 8, lineHeight: 22 }}>
                You have no notifications at this time.
              </Text>
            </View>
          ) : (
            notifications.map((n: any) => {
              const isAcademic = n.type === "academic";
              const isUnread = !n.read_status;
              return (
                <View
                  key={n.id}
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: 15,
                    marginBottom: 12,
                    elevation: 2,
                    borderLeftWidth: 4,
                    borderLeftColor: isAcademic ? "#f59e0b" : "#3b82f6",
                    opacity: isUnread ? 1 : 0.7,
                  }}
                >
                  <TouchableOpacity onPress={() => handleTap(n)} style={{ padding: 16 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <Text style={{ fontSize: 15, fontWeight: "700", color: isAcademic ? "#92400e" : "#1e3a5f" }}>
                        {isAcademic ? "📘 Academic Alert" : "📋 Attendance Alert"}
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        {isUnread && (
                          <View style={{ backgroundColor: "#ef4444", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
                            <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>NEW</Text>
                          </View>
                        )}
                        <TouchableOpacity
                          onPress={() => deleteNotification(n.id)}
                          style={{ backgroundColor: "#fef2f2", borderRadius: 8, padding: 6, borderWidth: 1, borderColor: "#fca5a5" }}
                        >
                          <Text style={{ fontSize: 14 }}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={{ color: "gray", lineHeight: 20, fontSize: 13 }}>
                      {n.message}
                    </Text>
                    <Text style={{ marginTop: 8, fontSize: 12, color: isAcademic ? "#f59e0b" : "#3b82f6", fontWeight: "600" }}>
                      {isAcademic ? "Tap to view Academic Performance →" : "Tap to view Attendance →"}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}