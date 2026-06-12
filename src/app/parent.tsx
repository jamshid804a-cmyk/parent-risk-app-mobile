import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useAuth } from "../context/AuthContext";
import { router, useFocusEffect } from "expo-router";

const BASE_URL = "http://192.168.18.137:3000";

export default function Parent() {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user?.studentId) fetchUnreadCount();
  }, [user]);

  // Refresh badge count every time this screen comes back into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user?.studentId) fetchUnreadCount();
    }, [user])
  );

  async function fetchUnreadCount() {
    try {
      const res = await fetch(
        `${BASE_URL}/api/notifications?studentId=${user?.studentId}`
      );
      const data = await res.json();
      const unread = data.filter((n: any) => !n.readStatus).length;
      setUnreadCount(unread);
    } catch (e) {
      console.log("Failed to fetch notifications:", e);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f4f6f8", padding: 20 }}>

      {/* HEADER */}
      <View style={{
        backgroundColor: "#fff",
        padding: 20,
        borderRadius: 15,
        marginTop: 50,
        elevation: 3,
      }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 22, fontWeight: "bold" }}>
            👨‍👩‍👧 Parent Dashboard
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/notification")}
            style={{ position: "relative", padding: 6 }}
          >
            <Text style={{ fontSize: 26 }}>🔔</Text>
            {unreadCount > 0 && (
              <View style={{
                position: "absolute",
                top: 2,
                right: 2,
                backgroundColor: "#ef4444",
                borderRadius: 10,
                minWidth: 18,
                height: 18,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 3,
              }}>
                <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
                  {unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        <Text style={{ marginTop: 10, color: "gray" }}>
          Welcome: {user?.phone}
        </Text>
      </View>

      {/* NOTIFICATIONS CARD */}
      <TouchableOpacity
        onPress={() => router.push("/notification")}
        style={[styles.card, { borderLeftWidth: 4, borderLeftColor: "#ef4444" }]}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={styles.title}>🔔 Notifications</Text>
            <Text style={styles.desc}>Attendance alerts from school</Text>
          </View>
          {unreadCount > 0 && (
            <View style={{
              backgroundColor: "#ef4444",
              borderRadius: 12,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>
                {unreadCount} new
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* STUDENT ATTENDANCE */}
      <TouchableOpacity
        onPress={() => router.push("/attendance")}
        style={styles.card}
      >
        <Text style={styles.title}>📊 Student Attendance</Text>
        <Text style={styles.desc}>Check student daily attendance record</Text>
      </TouchableOpacity>

      {/* ACADEMIC PERFORMANCE */}
      <TouchableOpacity
        onPress={() => router.push("/performance")}
        style={styles.card}
      >
        <Text style={styles.title}>📘 Academic Performance</Text>
        <Text style={styles.desc}>Midterm, Final marks & GPA report</Text>
      </TouchableOpacity>

      {/* LOGOUT */}
      <TouchableOpacity
        onPress={async () => { await logout(); router.replace("/login"); }}
        style={{
          backgroundColor: "#e74c3c",
          padding: 15,
          borderRadius: 12,
          marginTop: 30,       // ← moved up from "auto"
          alignItems: "center",
        }}
      >
        <Text style={{ color: "white", fontWeight: "bold" }}>Logout</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = {
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 15,
    marginTop: 15,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  desc: {
    color: "gray",
    marginTop: 5,
  },
};