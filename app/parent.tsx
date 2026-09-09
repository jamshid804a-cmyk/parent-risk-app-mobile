import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useState } from "react";
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../src/context/AuthContext";

const BASE_URL = "https://parent-risk-app-mobile-production-30bb.up.railway.app";

export default function Parent() {
  const { user, logout, refreshUser } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      refreshUser();
      fetchUnreadCount();
    }, [])
  );

  async function fetchUnreadCount() {
    try {
      const students = user?.students || [];
      if (students.length === 0) return;
      const results = await Promise.all(
        students.map(async (student: any) => {
          try {
            const res = await fetch(`${BASE_URL}/api/notifications?studentId=${student.id}`);
            if (!res.ok) return 0;
            const data = await res.json();
            return (Array.isArray(data) ? data : []).filter((n: any) => Number(n.read_status) === 0).length;
          } catch {
            return 0;
          }
        })
      );
      setUnreadCount(results.reduce((sum, count) => sum + count, 0));
    } catch (e) {
      console.log("Failed to fetch notifications:", e);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await refreshUser();
    await fetchUnreadCount();
    setRefreshing(false);
  }

  const totalStudents = user?.students?.length || 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f4f6f8" }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4f46e5"]} />}
    >
      <View style={{ backgroundColor: "#fff", padding: 20, borderRadius: 15, marginTop: 50, elevation: 3 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 22, fontWeight: "bold" }}>Parent Dashboard</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <TouchableOpacity onPress={onRefresh}>
              <Ionicons name="refresh" size={22} color="#4f46e5" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/notification")} style={{ position: "relative", padding: 6 }}>
              <Ionicons name="notifications" size={26} color="#ef4444" />
              {unreadCount > 0 && (
                <View style={{ position: "absolute", top: 0, right: 0, backgroundColor: "#ef4444", borderRadius: 10, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 }}>
                  <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
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
                style={{ flex: 1, backgroundColor: "#4f46e5", padding: 10, borderRadius: 10, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 }}
              >
                <Ionicons name="book" size={16} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>Performance</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push({ pathname: "/attendance", params: { studentId: student.id } })}
                style={{ flex: 1, backgroundColor: "#0ea5e9", padding: 10, borderRadius: 10, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 }}
              >
                <Ionicons name="bar-chart" size={16} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>Attendance</Text>
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Ionicons name="notifications" size={22} color="#ef4444" />
            <View>
              <Text style={{ fontSize: 16, fontWeight: "600" }}>Notifications</Text>
              <Text style={{ color: "gray", marginTop: 5 }}>Academic & attendance alerts</Text>
            </View>
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
