import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../src/context/AuthContext";

const BASE_URL = "https://parentriskapp-backend.vercel.app";

// ---------- Design tokens ----------
const C = {
  bg: "#f3f5fb",
  card: "#ffffff",
  ink: "#0f172a",
  sub: "#64748b",
  line: "#eef1f6",
  primary: "#4338ca",
  primarySoft: "#4f46e5",
  header: "#1e1b4b",
  danger: "#ef4444",
  warn: "#f97316",
};

const shadow = {
  shadowColor: "#1e1b4b",
  shadowOpacity: 0.08,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 4,
} as const;

const ACTIONS = [
  { label: "Attendance", hint: "Daily presence record", route: "/attendance", icon: "calendar", color: "#0ea5e9", tint: "#e0f2fe" },
  { label: "Test Section", hint: "Monthly, weekly & daily tests", route: "/testing", icon: "flask", color: "#4f46e5", tint: "#e0e7ff" },
  { label: "Examination", hint: "Mid term & final term", route: "/examination", icon: "document-text", color: "#a855f7", tint: "#f3e8ff" },
  { label: "Fee Management", hint: "Fee status & payments", route: "/fee", icon: "cash", color: "#10b981", tint: "#d1fae5" },
] as const;

const HEADER_TOP = Platform.OS === "android" ? (StatusBar.currentHeight || 24) + 14 : 58;

// ---------- Small UI pieces ----------
function InfoTile({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={{ width: "48.5%", backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 14, padding: 10, flexDirection: "row", alignItems: "center" }}>
      <View
        style={{
          width: 30, height: 30, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.2)",
          alignItems: "center", justifyContent: "center", marginRight: 8,
        }}
      >
        <Ionicons name={icon as any} size={15} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 10.5, color: "#c7d2fe" }}>{label}</Text>
        <Text style={{ fontSize: 13, fontWeight: "700", color: "#fff" }} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

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
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.bg }}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={{ marginTop: 12, color: C.sub }}>Loading students...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.header} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleManualRefresh}
            colors={[C.primary]}
            progressViewOffset={HEADER_TOP}
          />
        }
      >
        {/* ================= HEADER ================= */}
        <View
          style={{
            backgroundColor: C.header,
            paddingTop: HEADER_TOP,
            paddingHorizontal: 22,
            paddingBottom: 30,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              position: "absolute", top: -60, right: -40, width: 200, height: 200,
              borderRadius: 100, backgroundColor: "rgba(129,140,248,0.22)",
            }}
          />
          <View
            style={{
              position: "absolute", bottom: -70, left: -50, width: 170, height: 170,
              borderRadius: 85, backgroundColor: "rgba(99,102,241,0.18)",
            }}
          />

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ color: "#a5b4fc", fontSize: 13 }}>Welcome back</Text>
              <Text style={{ color: "#fff", fontSize: 25, fontWeight: "800", marginTop: 2 }}>
                Parent Dashboard
              </Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <TouchableOpacity
                onPress={handleManualRefresh}
                disabled={refreshing || autoRefreshing}
                style={{
                  width: 42, height: 42, borderRadius: 21, alignItems: "center",
                  justifyContent: "center", backgroundColor: "rgba(255,255,255,0.14)",
                }}
              >
                {refreshing || autoRefreshing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="refresh" size={20} color="#fff" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push("/notification")}
                style={{
                  width: 42, height: 42, borderRadius: 21, alignItems: "center",
                  justifyContent: "center", backgroundColor: "rgba(255,255,255,0.14)",
                }}
              >
                <Ionicons name="notifications" size={20} color="#fff" />
                {unreadCount > 0 && (
                  <View
                    style={{
                      position: "absolute", top: -3, right: -3, backgroundColor: C.danger,
                      borderRadius: 10, minWidth: 19, height: 19, alignItems: "center",
                      justifyContent: "center", paddingHorizontal: 4, borderWidth: 2,
                      borderColor: C.header,
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>{unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 16 }}>
            <Ionicons name="call" size={14} color="#a5b4fc" />
            <Text style={{ color: "#e0e7ff", fontSize: 14, marginLeft: 6, fontWeight: "500" }}>
              {user?.phone}
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 12, marginTop: 18 }}>
            <View
              style={{
                flex: 1, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 18,
                padding: 14, flexDirection: "row", alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.18)",
                  alignItems: "center", justifyContent: "center", marginRight: 10,
                }}
              >
                <Ionicons name="people" size={19} color="#fff" />
              </View>
              <View>
                <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800" }}>{totalStudents}</Text>
                <Text style={{ color: "#c7d2fe", fontSize: 12 }}>
                  Student{totalStudents === 1 ? "" : "s"}
                </Text>
              </View>
            </View>

            <View
              style={{
                flex: 1, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 18,
                padding: 14, flexDirection: "row", alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.18)",
                  alignItems: "center", justifyContent: "center", marginRight: 10,
                }}
              >
                <Ionicons name="mail-unread" size={19} color="#fff" />
              </View>
              <View>
                <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800" }}>{unreadCount}</Text>
                <Text style={{ color: "#c7d2fe", fontSize: 12 }}>Unread alerts</Text>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 14 }}>
            {autoRefreshing ? (
              <>
                <ActivityIndicator size="small" color="#a5b4fc" />
                <Text style={{ color: "#a5b4fc", fontSize: 12, marginLeft: 8 }}>Refreshing...</Text>
              </>
            ) : (
              <>
                <View
                  style={{
                    width: 8, height: 8, borderRadius: 4, backgroundColor: "#34d399", marginRight: 8,
                  }}
                />
                <Text style={{ color: "#a5b4fc", fontSize: 12 }}>
                  {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : "Up to date"}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* ================= BODY ================= */}
        <View style={{ paddingHorizontal: 16 }}>
          {/* Section title */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 26, marginBottom: 12, paddingHorizontal: 4 }}>
            <Text style={{ fontSize: 20, fontWeight: "800", color: C.ink }}>My Children</Text>
            <View style={{ backgroundColor: "#e0e7ff", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 }}>
              <Text style={{ color: C.primary, fontWeight: "700", fontSize: 12 }}>
                {totalStudents} on this number
              </Text>
            </View>
          </View>

          {/* Big box that holds all students of this number */}
          <View
            style={{
              backgroundColor: "#e6e9f8", borderRadius: 30, padding: 10,
              borderWidth: 1, borderColor: "#d8dcf3",
            }}
          >
            {studentList.length === 0 ? (
              <View
                style={{
                  backgroundColor: C.card, borderRadius: 24, padding: 28, alignItems: "center",
                }}
              >
                <View
                  style={{
                    width: 68, height: 68, borderRadius: 34, backgroundColor: "#e0e7ff",
                    alignItems: "center", justifyContent: "center", marginBottom: 14,
                  }}
                >
                  <Ionicons name="school" size={30} color={C.primary} />
                </View>
                <Text style={{ fontSize: 16, fontWeight: "700", color: C.ink }}>No students yet</Text>
                <Text style={{ color: C.sub, textAlign: "center", marginTop: 6, lineHeight: 20 }}>
                  Students registered with this phone number will appear here. Pull down to refresh.
                </Text>
              </View>
            ) : (
              studentList.map((student: any, index: number) => {
                const lowAttendance =
                  student.attendancePercent !== undefined && student.attendancePercent < 75;
                const initial = String(student.name || "?").trim().charAt(0).toUpperCase();

                return (
                  <View
                    key={student.id || student._id}
                    style={{
                      backgroundColor: C.card, borderRadius: 24, overflow: "hidden",
                      marginBottom: index === studentList.length - 1 ? 0 : 12, ...shadow,
                    }}
                  >
                    {/* Curved student information header */}
                    <View
                      style={{
                        backgroundColor: C.primarySoft, padding: 16, paddingBottom: 20,
                        borderBottomLeftRadius: 34, borderBottomRightRadius: 34, overflow: "hidden",
                      }}
                    >
                      <View
                        style={{
                          position: "absolute", top: -40, right: -30, width: 130, height: 130,
                          borderRadius: 65, backgroundColor: "rgba(255,255,255,0.12)",
                        }}
                      />

                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <View
                          style={{
                            width: 54, height: 54, borderRadius: 18, backgroundColor: "#fff",
                            alignItems: "center", justifyContent: "center", marginRight: 12,
                          }}
                        >
                          <Text style={{ color: C.primary, fontSize: 23, fontWeight: "800" }}>{initial}</Text>
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 18, fontWeight: "800", color: "#fff" }} numberOfLines={1}>
                            {student.name}
                          </Text>
                          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                            <View
                              style={{
                                backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 8,
                                paddingHorizontal: 9, paddingVertical: 3,
                              }}
                            >
                              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>
                                Grade {student.grade}
                                {student.section ? ` - ${student.section}` : ""}
                              </Text>
                            </View>
                            {lowAttendance && (
                              <View
                                style={{
                                  backgroundColor: "#ffedd5", borderRadius: 8,
                                  paddingHorizontal: 9, paddingVertical: 3,
                                }}
                              >
                                <Text style={{ color: C.warn, fontSize: 12, fontWeight: "700" }}>
                                  ATT: {student.attendancePercent}%
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>

                      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 8, marginTop: 14 }}>
                        <InfoTile icon="man" label="Father" value={student.fatherName || "—"} />
                        <InfoTile icon="ribbon" label="Roll No" value={String(student.rollNo ?? "—")} />
                        <InfoTile icon="id-card" label="Admission No" value={student.admissionNo || "—"} />
                        <InfoTile icon="calendar-number" label="Session" value={student.session || "—"} />
                      </View>
                    </View>

                    {/* Clickable sections */}
                    <View style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
                      {ACTIONS.map((a, i) => (
                        <TouchableOpacity
                          key={a.label}
                          activeOpacity={0.7}
                          onPress={() =>
                            router.push({ pathname: a.route as any, params: { studentId: student.id } })
                          }
                          style={{
                            flexDirection: "row", alignItems: "center", paddingVertical: 12,
                            borderBottomWidth: i === ACTIONS.length - 1 ? 0 : 1,
                            borderBottomColor: C.line,
                          }}
                        >
                          <View
                            style={{
                              width: 44, height: 44, borderRadius: 14, backgroundColor: a.tint,
                              alignItems: "center", justifyContent: "center", marginRight: 12,
                            }}
                          >
                            <Ionicons name={a.icon as any} size={21} color={a.color} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 15, fontWeight: "700", color: C.ink }}>{a.label}</Text>
                            <Text style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>{a.hint}</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* Notifications */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/notification")}
            style={{
              backgroundColor: C.card, borderRadius: 22, padding: 16, marginTop: 20,
              flexDirection: "row", alignItems: "center", ...shadow,
            }}
          >
            <View
              style={{
                width: 48, height: 48, borderRadius: 16, backgroundColor: "#fee2e2",
                alignItems: "center", justifyContent: "center", marginRight: 14,
              }}
            >
              <Ionicons name="notifications" size={22} color={C.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: C.ink }}>Notifications</Text>
              <Text style={{ color: C.sub, fontSize: 12, marginTop: 3 }}>
                Academic & attendance alerts
              </Text>
            </View>
            {unreadCount > 0 && (
              <View
                style={{
                  backgroundColor: C.danger, borderRadius: 12,
                  paddingHorizontal: 10, paddingVertical: 4, marginRight: 6,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>{unreadCount} new</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={async () => {
              await logout();
              router.replace("/login");
            }}
            style={{
              marginTop: 18, paddingVertical: 15, borderRadius: 18, alignItems: "center",
              flexDirection: "row", justifyContent: "center", gap: 8,
              backgroundColor: "#fff1f2", borderWidth: 1, borderColor: "#fecdd3",
            }}
          >
            <Ionicons name="log-out-outline" size={20} color="#e11d48" />
            <Text style={{ color: "#e11d48", fontWeight: "800", fontSize: 15 }}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
