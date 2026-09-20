import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../src/context/AuthContext";

const BASE_URL = "https://parentriskapp-backend.vercel.app";

const ACTIONS = [
  { label: "Attendance", route: "/attendance", icon: "calendar", color: "#0ea5e9" },
  { label: "Testing", route: "/testing", icon: "flask", color: "#4f46e5" },
  { label: "Examination", route: "/examination", icon: "document-text", color: "#a855f7" },
  { label: "Fee", route: "/fee", icon: "cash", color: "#10b981" },
] as const;

export default function Parent() {
  const { user, logout, refreshUser } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefreshing, setAutoRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const appState = useRef(AppState.currentState);
  const busyRef = useRef(false);
  const refreshUserRef = useRef(refreshUser);
  refreshUserRef.current = refreshUser; // always the latest function

  const studentList: any[] = user?.students || [];
  const totalStudents = studentList.length;

  // Silent refresh (focus, foreground, timer)
  const doRefresh = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setAutoRefreshing(true);
    try {
      await refreshUserRef.current();
      setLastUpdated(new Date());
    } catch (e) {
      console.log("Auto-refresh error:", e);
    } finally {
      busyRef.current = false;
      setAutoRefreshing(false);
    }
  }, []);

  // Pull-to-refresh
  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshUserRef.current();
      setLastUpdated(new Date());
    } catch (e) {
      console.log("Manual refresh error:", e);
    } finally {
      setRefreshing(false);
    }
  };

  // Refresh when the screen is focused
  useFocusEffect(
    useCallback(() => {
      doRefresh();
    }, [doRefresh])
  );

  // Refresh when the app returns to the foreground
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (appState.current.match(/inactive|background/) && next === "active") {
        doRefresh();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [doRefresh]);

  // Refresh every 30 seconds
  useEffect(() => {
    if (!user) return;
    const t = setInterval(doRefresh, 30000);
    return () => clearInterval(t);
  }, [user, doRefresh]);

  // Recount unread notifications whenever the student list changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (studentList.length === 0) {
        setUnreadCount(0);
        return;
      }
      const counts = await Promise.all(
        studentList.map(async (s: any) => {
          try {
            const res = await fetch(`${BASE_URL}/api/notifications?studentId=${s.id}`);
            if (!res.ok) return 0;
            const data = await res.json();
            return (Array.isArray(data) ? data : []).filter(
              (n: any) => Number(n.read_status) === 0
            ).length;
          } catch {
            return 0;
          }
        })
      );
      if (!cancelled) setUnreadCount(counts.reduce((a, b) => a + b, 0));
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.students]);

  if (autoRefreshing && totalStudents === 0) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f4f6f8" }}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={{ marginTop: 10, color: "gray" }}>Loading students...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f4f6f8" }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleManualRefresh} colors={["#4f46e5"]} />
      }
    >
      {/* Header Card */}
      <View style={{ backgroundColor: "#fff", padding: 20, borderRadius: 15, marginTop: 50, elevation: 3 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 22, fontWeight: "bold" }}>Parent Dashboard</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <TouchableOpacity onPress={handleManualRefresh} disabled={refreshing || autoRefreshing}>
              <Ionicons
                name="refresh"
                size={22}
                color={refreshing || autoRefreshing ? "#999" : "#4f46e5"}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/notification")}
              style={{ position: "relative", padding: 6 }}
            >
              <Ionicons name="notifications" size={26} color="#ef4444" />
              {unreadCount > 0 && (
                <View
                  style={{
                    position: "absolute", top: 0, right: 0, backgroundColor: "#ef4444",
                    borderRadius: 10, minWidth: 18, height: 18, alignItems: "center",
                    justifyContent: "center", paddingHorizontal: 3,
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <Text style={{ marginTop: 10, color: "gray" }}>Welcome: {user?.phone}</Text>
        <Text style={{ marginTop: 5, color: "#4f46e5", fontWeight: "600" }}>
          {totalStudents} Student{totalStudents === 1 ? "" : "s"}
        </Text>

        {autoRefreshing && (
          <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <ActivityIndicator size="small" color="#4f46e5" />
            <Text style={{ color: "#4f46e5", fontSize: 12 }}>Refreshing...</Text>
          </View>
        )}
        {lastUpdated && (
          <Text style={{ marginTop: 5, color: "#999", fontSize: 10 }}>
            Last updated: {lastUpdated.toLocaleTimeString()}
          </Text>
        )}
      </View>

      <Text style={{ fontSize: 16, fontWeight: "700", color: "#1e293b", marginTop: 20, marginBottom: 10 }}>
        My Children
      </Text>

      {studentList.length === 0 ? (
        <View style={{ backgroundColor: "#fff", padding: 20, borderRadius: 10, alignItems: "center" }}>
          <Text style={{ color: "gray" }}>No students found for this number</Text>
        </View>
      ) : (
        studentList.map((student: any) => {
          const lowAttendance =
            student.attendancePercent !== undefined && student.attendancePercent < 75;
          return (
            <View
              key={student.id || student._id}
              style={{ backgroundColor: "#fff", borderRadius: 15, padding: 16, marginBottom: 12, elevation: 2 }}
            >
              {/* Profile */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 17, fontWeight: "700", color: "#1e293b" }}>{student.name}</Text>
                  {!!student.fatherName && (
                    <Text style={{ color: "gray", marginTop: 3 }}>Father: {student.fatherName}</Text>
                  )}
                  <Text style={{ color: "gray", marginTop: 3 }}>
                    Grade {student.grade}
                    {student.section ? ` - ${student.section}` : ""}
                    {student.session ? `  |  ${student.session}` : ""}
                  </Text>
                  <Text style={{ color: "gray", marginTop: 3 }}>
                    Roll No: {student.rollNo ?? "—"}
                    {student.admissionNo ? `  |  Adm: ${student.admissionNo}` : ""}
                  </Text>
                </View>
                {lowAttendance && (
                  <View style={{ backgroundColor: "#fff7ed", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ color: "#f97316", fontSize: 11, fontWeight: "700" }}>
                      ATT: {student.attendancePercent}%
                    </Text>
                  </View>
                )}
              </View>

              {/* Sections: 2 x 2 buttons */}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
                {ACTIONS.map((a) => (
                  <TouchableOpacity
                    key={a.label}
                    onPress={() =>
                      router.push({ pathname: a.route as any, params: { studentId: student.id } })
                    }
                    style={{
                      width: "48%", backgroundColor: a.color, padding: 10, borderRadius: 10,
                      alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6,
                    }}
                  >
                    <Ionicons name={a.icon as any} size={16} color="#fff" />
                    <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>{a.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        })
      )}

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
        onPress={async () => {
          await logout();
          router.replace("/login");
        }}
        style={{ backgroundColor: "#e74c3c", padding: 15, borderRadius: 12, marginTop: 20, alignItems: "center" }}
      >
        <Text style={{ color: "white", fontWeight: "bold" }}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}