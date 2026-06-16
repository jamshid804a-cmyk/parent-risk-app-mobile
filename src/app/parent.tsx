import { router, useFocusEffect } from "expo-router";
import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../context/AuthContext";

const BASE_URL = "https://parent-risk-app-mobile-production-30bb.up.railway.app";

export default function Parent() {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [atRiskCount, setAtRiskCount] = useState(0);

  useEffect(() => {
    if (user?.students) {
      const riskCount = user.students.filter(s => (s.cgpa || 0) < 2.5).length;
      setAtRiskCount(riskCount);
    }
    if (user?.students?.[0]?.id) fetchUnreadCount();
  }, [user]);

  useFocusEffect(
    React.useCallback(() => {
      if (user?.students?.[0]?.id) fetchUnreadCount();
    }, [user])
  );

  async function fetchUnreadCount() {
    try {
      const res = await fetch(
        `${BASE_URL}/api/notifications?studentId=${user?.students?.[0]?.id}`
      );
      const data = await res.json();
      const unread = data.filter((n: any) => !n.readStatus).length;
      setUnreadCount(unread);
    } catch (e) {
      console.log("Failed to fetch notifications:", e);
    }
  }

  const totalStudents = user?.students?.length || 0;

  return (
    <View style={{ flex: 1, backgroundColor: "#f4f6f8", padding: 20 }}>

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
        <Text style={{ marginTop: 5, color: "#4f46e5", fontWeight: "600" }}>
          📚 {totalStudents} Student{totalStudents > 1 ? 's' : ''} • ⚠️ {atRiskCount} At Risk
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => router.push("/notification")}
        style={[styles.card, { borderLeftWidth: 4, borderLeftColor: "#ef4444" }]}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={styles.title}>🔔 Notifications</Text>
            <Text style={styles.desc}>Academic & attendance alerts</Text>
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

      <TouchableOpacity
        onPress={() => router.push("/attendance")}
        style={styles.card}
      >
        <Text style={styles.title}>📊 Student Attendance</Text>
        <Text style={styles.desc}>Check daily attendance record</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push("/performance")}
        style={styles.card}
      >
        <Text style={styles.title}>📘 Academic Performance</Text>
        <Text style={styles.desc}>GPA, CGPA & risk status</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={async () => { await logout(); router.replace("/login"); }}
        style={{
          backgroundColor: "#e74c3c",
          padding: 15,
          borderRadius: 12,
          marginTop: 30,
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
