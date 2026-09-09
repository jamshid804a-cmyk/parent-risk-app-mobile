import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useAuth } from "../src/context/AuthContext";

const BASE_URL = "https://parent-risk-app-mobile-production-30bb.up.railway.app";

export default function Parent() {
  const { user, logout, forceRefresh } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefreshing, setAutoRefreshing] = useState(false);
  const appState = useRef(AppState.currentState);

  // 🔥 AUTO-REFRESH: When screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log("📱 Screen focused - auto refreshing...");
      handleAutoRefresh();
      return () => {
        console.log("📱 Screen unfocused");
      };
    }, [])
  );

  // 🔥 AUTO-REFRESH: When app comes back to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('📱 App came to foreground - auto refreshing...');
        handleAutoRefresh();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // 🔥 AUTO-REFRESH: Every 30 seconds (optional)
  useEffect(() => {
    const interval = setInterval(() => {
      if (user) {
        console.log('⏰ Auto-refresh timer triggered...');
        handleAutoRefresh();
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [user]);

  // 🔥 Main refresh function
  const handleAutoRefresh = async () => {
    if (autoRefreshing) return; // Prevent multiple simultaneous refreshes
    
    try {
      setAutoRefreshing(true);
      console.log("🔄 Auto-refreshing...");
      
      // 🔥 Fetch fresh data from server
      await forceRefresh();
      
      // 🔥 Fetch unread notifications
      await fetchUnreadCount();
      
      const studentCount = user?.students?.length || 0;
      console.log(`✅ Auto-refresh complete! ${studentCount} students found`);
      
    } catch (error) {
      console.log("❌ Auto-refresh error:", error);
    } finally {
      setAutoRefreshing(false);
    }
  };

  // 🔥 Manual refresh (pull to refresh)
  const handleManualRefresh = async () => {
    try {
      setRefreshing(true);
      console.log("🔄 Manual refresh triggered...");
      
      // 🔥 Force refresh from server
      await forceRefresh();
      
      // 🔥 Fetch unread notifications
      await fetchUnreadCount();
      
      const studentCount = user?.students?.length || 0;
      console.log(`✅ Manual refresh complete! ${studentCount} students found`);
      
      // Show success message
      Alert.alert('✅ Refreshed', `Found ${studentCount} students`);
      
    } catch (error) {
      console.log("❌ Manual refresh error:", error);
      Alert.alert('❌ Error', 'Failed to refresh. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

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
      
      const total = results.reduce((sum, count) => sum + count, 0);
      setUnreadCount(total);
    } catch (e) {
      console.log("Failed to fetch notifications:", e);
    }
  }

  const studentList = user?.students || [];
  const totalStudents = studentList.length;

  // 🔥 Show loading state while auto-refreshing and no students
  if (autoRefreshing && totalStudents === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f6f8' }}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={{ marginTop: 10, color: 'gray' }}>Loading students...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f4f6f8" }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={handleManualRefresh} 
          colors={["#4f46e5"]} 
        />
      }
    >
      {/* Header Card */}
      <View style={{ backgroundColor: "#fff", padding: 20, borderRadius: 15, marginTop: 50, elevation: 3 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 22, fontWeight: "bold" }}>Parent Dashboard</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {/* 🔥 Refresh Button with indicator */}
            <TouchableOpacity onPress={handleManualRefresh} disabled={refreshing || autoRefreshing}>
              <Ionicons 
                name="refresh" 
                size={22} 
                color={(refreshing || autoRefreshing) ? "#999" : "#4f46e5"} 
              />
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
        
        {/* 🔥 Auto-refresh indicator */}
        {autoRefreshing && (
          <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ActivityIndicator size="small" color="#4f46e5" />
            <Text style={{ color: "#4f46e5", fontSize: 12 }}>Auto-refreshing...</Text>
          </View>
        )}
        
        {/* 🔥 Last updated time */}
        <Text style={{ marginTop: 5, color: "#999", fontSize: 10 }}>
          Last updated: {new Date().toLocaleTimeString()}
        </Text>
      </View>

      <Text style={{ fontSize: 16, fontWeight: "700", color: "#1e293b", marginTop: 20, marginBottom: 10 }}>
        At-Risk Students
      </Text>

      {studentList.length === 0 ? (
        <View style={{ backgroundColor: "#fff", padding: 20, borderRadius: 10, alignItems: "center" }}>
          <Text style={{ color: "gray" }}>No at-risk students found</Text>
        </View>
      ) : (
        studentList.map((student: any) => {
          const isAcademicRisk = parseFloat(student.cgpa) < 2.5;
          const isAttendanceRisk = student.attendancePercent < 75;
          return (
            <View key={student.id || student._id} style={{ backgroundColor: "#fff", borderRadius: 15, padding: 16, marginBottom: 12, elevation: 2, borderLeftWidth: 4, borderLeftColor: "#ef4444" }}>
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