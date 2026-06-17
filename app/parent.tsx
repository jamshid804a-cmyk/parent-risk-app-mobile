import { router, useFocusEffect } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../src/context/AuthContext";

const BASE_URL = "https://parent-risk-app-mobile-production-30bb.up.railway.app";

export default function Parent() {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user?.students?.[0]?.id) fetchUnreadCount();
  }, [user]);

  useFocusEffect(
    React.useCallback(() => {
      if (user?.students?.[0]?.id) fetchUnreadCount();
    }, [user])
  );

  async function fetchUnreadCount() {
    try {
      const res = await fetch(`${BASE_URL}/api/notifications?studentId=${user?.students?.[0]?.id}`);
      const data = await res.json();
      const unread = data.filter((n: any) => !n.read_status).length;
      setUnreadCount(unread);
    } catch (e) {
      console.log("Failed to fetch notifications:", e);
    }
  }

  const totalStudents = user?.students?.length || 0;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f4f6f8" }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <View style={{ backgroundColor: "#fff", padding: 20, borderRadius: 15, marginTop: 50, elevation: 3 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 22, fontWeight: "bold" }}>Parent Dashboard</Text>
          <TouchableOpacity onPress={() => router.push("/notification")} style={{ position: "relative", padding: 6 }}>
            <Text style={{ fontSize: 26 }}>🔔</Text>
            {unreadCount > 0 && (
              <View style={{ position: "absolute", top: 2, right: 2, backgroundColor: "#ef4444", borderRadius: 10, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 }}>
                <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        <Text style={{ marginTop: 10, color: "gray" }}>Welcome: {user?.phone}</Text>
        <Text style={{ marginTop: 5, color: "#ef4444", fontWeight: "600" }}>
          ⚠️ {totalStudents} At-Risk Student{totalStudents > 1 ? "s" : ""}
        </Text>
      </View>

      <Text style={{ fontSize: 16, fontWeight: "700", color: "#1e293b", marginTop: 20, marginBottom: 10 }}>
        At-Risk Students
      </Text>

      {user?.students?.map((student: any) => {
        const isAcademicRisk = parseFloat(student.cgpa) < 2.5;
        const isAttendanceRisk = student.attendancePercent < 75;
        return (
          <View key={student.id} style={{ backgroundColor: "#fff", borderRadius: 15, padding: 16, marginBottom: 12, elevation: 2, borderLeftWidth: 4, borderLeftColor: "#ef4444" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#1e293b" }}>{student.name}</Text>
                <Text style={{ color: "gray", marginTop: 4 }}>{student.grade}</Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                {isAcademicRisk && (
                  <View style={{ backgroundColor: "#fef2f2", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ color: "#ef4444", fontSize: 11, fontWeight: "700" }}>⚠️ CGPA: {student.cgpa}</Text>
                  </View>
                )}
                {isAttendanceRisk && (
                  <View style={{ backgroundColor: "#fff7ed", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ color: "#f97316", fontSize: 11, fontWeight: "700" }}>⚠️ ATT: {student.attendancePercent}%</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                onPress={() => router.push({ pathname: "/performance", params: { studentId: student.id } })}
                style={{ flex: 1, backgroundColor: "#4f46e5", padding: 10, borderRadius: 10, alignItems: "center" }}
              >
                <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>📘 Performance</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push({ pathname: "/attendance", params: { studentId: student.id } })}
                style={{ flex: 1, backgroundColor: "#0ea5e9", padding: 10, borderRadius: 10, alignItems: "center" }}
              >
                <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>📊 Attendance</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      <TouchableOpacity
        onPress={() => router.push("/notification")}
        style={{ backgroundColor: "#fff", padding: 20, borderRadius: 15, marginTop: 5, elevation: 2, borderLeftWidth: 4, borderLeftColor: "#ef4444" }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={{ fontSize: 16, fontWeight: "600" }}>🔔 Notifications</Text>
            <Text style={{ color: "gray", marginTop: 5 }}>Academic & attendance alerts</Text>
          </View>
          {unreadCount > 0 && (
            <View style={{ backgroundColor: "#ef4444", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>{unreadCount} new</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={async () => { await logout(); router.replace("/login"); }}
        style={{ backgroundColor: "#e74c3c", padding: 15, borderRadius: 12, marginTop: 20, alignItems: "center" }}
      >
        <Text style={{ color: "white", fontWeight: "bold" }}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
