import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../src/context/AuthContext";

const BASE_URL = "https://parentriskapp-backend.vercel.app";

const HEADER_TOP = Platform.OS === "android" ? (StatusBar.currentHeight || 24) + 10 : 54;

interface AttendanceRecord {
  present: boolean;
  day: number;
  date: string;
  studentId: number;
}

interface WeekData {
  weekLabel: string;
  weekStart: number;
  weekEnd: number;
  days: { day: number; present: boolean }[];
}

function getMonthString(): string {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function daysInMonth(month: string): number {
  const [m, y] = month.split("/").map(Number);
  return new Date(y, m, 0).getDate();
}

function buildWeeks(records: AttendanceRecord[], month: string): WeekData[] {
  const total = daysInMonth(month);
  const presentMap: Record<number, boolean> = {};
  for (const r of records) {
    if (r.day > 0) presentMap[r.day] = r.present;
  }
  const weeks: WeekData[] = [];
  let weekIndex = 1;
  for (let start = 1; start <= total; start += 7) {
    const end = Math.min(start + 6, total);
    const days = [];
    for (let d = start; d <= end; d++) {
      days.push({ day: d, present: presentMap[d] ?? false });
    }
    weeks.push({ weekLabel: `Week ${weekIndex}`, weekStart: start, weekEnd: end, days });
    weekIndex++;
  }
  return weeks;
}

function calcPercent(records: AttendanceRecord[], month: string): number {
  const total = daysInMonth(month);
  if (total === 0) return 0;
  const presentDays = records.filter((r) => r.day > 0 && r.present).length;
  return Math.round((presentDays / total) * 100);
}

export default function AttendanceScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ studentId?: string }>();
  const rawId = Array.isArray(params.studentId) ? params.studentId[0] : params.studentId;
  const studentIdNum = rawId ? Number(rawId) : null;

  const student =
    user?.students?.find((s: any) => s.id === studentIdNum) ||
    (studentIdNum ? null : user?.students?.[0]) ||
    null;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [percent, setPercent] = useState(0);
  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const month = getMonthString();

  useEffect(() => {
    if (user) fetchAttendance();
  }, [user, studentIdNum]);

  async function fetchAttendance() {
    setLoading(true);
    setError(null);
    try {
      if (!student) {
        setError("Student not found.");
        setLoading(false);
        return;
      }
      const url = `${BASE_URL}/api/attendance?studentId=${student.id}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      const allRecords: AttendanceRecord[] = Array.isArray(data) ? data : (data.attendance || []);
      const validRecords = allRecords.filter((r) => r.day > 0);
      setRecords(validRecords);
      setWeeks(buildWeeks(validRecords, month));
      setPercent(calcPercent(validRecords, month));
    } catch (e: any) {
      setError(e.message || "Failed to load attendance.");
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await fetchAttendance();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="dark-content" backgroundColor="#f3f5fb" />
        <ActivityIndicator size="large" color="#4338ca" />
        <Text style={styles.loadingText}>Loading attendance...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="dark-content" backgroundColor="#f3f5fb" />
        <View style={styles.errorIcon}>
          <Ionicons name="alert-circle" size={40} color="#ef4444" />
        </View>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={fetchAttendance} style={styles.retryBtn}>
          <Ionicons name="refresh" size={16} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "700" }}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: "#4338ca", fontWeight: "600" }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const [m, y] = month.split("/");
  const monthName = new Date(Number(y), Number(m) - 1, 1).toLocaleString("default", { month: "long", year: "numeric" });
  const studentName = student?.name || "Your Child";
  const grade = student?.grade || "";
  const presentDays = records.filter((r) => r.present).length;
  const totalDays = daysInMonth(month);
  const atRisk = percent < 75;
  const needsMore = 75 - percent;
  const accent = atRisk ? "#ef4444" : "#22c55e";

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#1e1b4b" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#4338ca"]}
            progressViewOffset={HEADER_TOP}
          />
        }
      >
        {/* HEADER */}
        <View style={styles.hero}>
          <View style={styles.circleA} />
          <View style={styles.circleB} />

          <View style={styles.topRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.roundBtn}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.topTitle}>Attendance</Text>
            <TouchableOpacity onPress={onRefresh} style={styles.roundBtn}>
              <Ionicons name="refresh" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <Text style={styles.heroName}>{studentName}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
            {!!grade && (
              <View style={styles.heroChip}>
                <Text style={styles.heroChipText}>Grade {grade}</Text>
              </View>
            )}
            <View style={styles.heroChip}>
              <Ionicons name="calendar" size={12} color="#fff" />
              <Text style={styles.heroChipText}>{monthName}</Text>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          {/* STATS CARD (overlaps header) */}
          <View style={[styles.card, { marginTop: -34 }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.avatar, { backgroundColor: atRisk ? "#fee2e2" : "#dcfce7" }]}>
                <Text style={[styles.avatarText, { color: atRisk ? "#dc2626" : "#16a34a" }]}>
                  {studentName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.studentName}>{studentName}</Text>
                <Text style={styles.studentGrade}>{presentDays} of {totalDays} days present</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.percentBig, { color: accent }]}>{percent}%</Text>
                <Text style={styles.daysSmall}>this month</Text>
              </View>
            </View>

            <View style={styles.barBg}>
              <View style={[styles.barFill, { width: `${Math.min(percent, 100)}%` as any, backgroundColor: accent }]} />
              <View style={styles.barMarker} />
            </View>
            <View style={styles.barLabels}>
              <Text style={styles.barLabel}>0%</Text>
              <Text style={styles.barMarkerLabel}>75% required</Text>
              <Text style={styles.barLabel}>100%</Text>
            </View>
          </View>

          {/* BANNER */}
          <View style={[styles.banner, atRisk ? styles.bannerRisk : styles.bannerGood]}>
            <View style={[styles.bannerIcon, { backgroundColor: atRisk ? "#fee2e2" : "#dcfce7" }]}>
              <Ionicons
                name={atRisk ? "warning" : "checkmark-circle"}
                size={22}
                color={atRisk ? "#b91c1c" : "#15803d"}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerTitle, atRisk ? styles.riskText : styles.goodText]}>
                {atRisk ? "At-Risk Student" : "Good Attendance"}
              </Text>
              <Text style={[styles.bannerSub, atRisk ? styles.riskSubText : styles.goodSubText]}>
                {studentName} - {percent}% this month{atRisk ? ". Below 75% threshold." : ". Keep it up!"}
              </Text>
            </View>
          </View>

          {/* WEEKLY BREAKDOWN */}
          <View style={styles.card}>
            <View style={styles.sectionHead}>
              <View style={styles.sectionIcon}>
                <Ionicons name="calendar" size={16} color="#4338ca" />
              </View>
              <Text style={styles.cardTitle}>Weekly Breakdown</Text>
            </View>

            {weeks.length === 0 ? (
              <Text style={styles.emptyText}>No attendance data yet.</Text>
            ) : (
              weeks.map((week, i) => {
                const wPresent = week.days.filter((d) => d.present).length;
                const wPercent = Math.round((wPresent / week.days.length) * 100);
                const wAtRisk = wPercent < 75;
                return (
                  <View
                    key={week.weekLabel}
                    style={[styles.weekBlock, i === weeks.length - 1 && { marginBottom: 0 }]}
                  >
                    <View style={styles.weekHeader}>
                      <Text style={styles.weekLabel}>{week.weekLabel}</Text>
                      <Text style={styles.weekRange}>Days {week.weekStart}-{week.weekEnd}</Text>
                      <View style={[styles.weekPill, { backgroundColor: wAtRisk ? "#fee2e2" : "#dcfce7" }]}>
                        <Text style={[styles.weekPercent, { color: wAtRisk ? "#dc2626" : "#16a34a" }]}>
                          {wPercent}%
                        </Text>
                      </View>
                    </View>
                    <View style={styles.dotsRow}>
                      {week.days.map((d) => (
                        <View
                          key={d.day}
                          style={[
                            styles.dayDot,
                            d.present
                              ? { backgroundColor: "#22c55e" }
                              : { backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: "#e2e8f0" },
                          ]}
                        >
                          <Text style={[styles.dayDotText, { color: d.present ? "#fff" : "#94a3b8" }]}>
                            {d.day}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })
            )}

            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#22c55e" }]} />
                <Text style={styles.legendText}>Present</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#e2e8f0" }]} />
                <Text style={styles.legendText}>Absent</Text>
              </View>
            </View>
          </View>

          {atRisk && (
            <View style={styles.warningCard}>
              <Ionicons name="trending-up" size={20} color="#dc2626" />
              <Text style={styles.warningText}>Needs {needsMore}% more to reach 75% threshold</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const shadow = {
  shadowColor: "#1e1b4b",
  shadowOpacity: 0.08,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 4,
} as const;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f3f5fb" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, backgroundColor: "#f3f5fb" },

  // hero header
  hero: {
    backgroundColor: "#1e1b4b",
    paddingTop: HEADER_TOP,
    paddingHorizontal: 20,
    paddingBottom: 58,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden",
  },
  circleA: { position: "absolute", top: -60, right: -40, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(129,140,248,0.22)" },
  circleB: { position: "absolute", bottom: -70, left: -50, width: 170, height: 170, borderRadius: 85, backgroundColor: "rgba(99,102,241,0.18)" },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  roundBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.14)" },
  topTitle: { fontSize: 17, fontWeight: "700", color: "#fff" },
  heroName: { fontSize: 26, fontWeight: "800", color: "#fff" },
  heroChip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  heroChipText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  // cards
  card: { backgroundColor: "#fff", borderRadius: 24, padding: 18, marginBottom: 14, ...shadow },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  avatar: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  avatarText: { fontWeight: "800", fontSize: 20 },
  studentName: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  studentGrade: { fontSize: 12.5, color: "#64748b", marginTop: 3 },
  percentBig: { fontSize: 30, fontWeight: "800" },
  daysSmall: { fontSize: 11, color: "#94a3b8" },

  // progress bar with 75% marker
  barBg: { height: 12, backgroundColor: "#e2e8f0", borderRadius: 6, marginBottom: 6, overflow: "visible", justifyContent: "center" },
  barFill: { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 6 },
  barMarker: { position: "absolute", left: "75%", top: -4, bottom: -4, width: 2.5, borderRadius: 2, backgroundColor: "#f97316" },
  barLabels: { flexDirection: "row", justifyContent: "space-between" },
  barLabel: { fontSize: 10, color: "#94a3b8" },
  barMarkerLabel: { fontSize: 10, color: "#f97316", fontWeight: "700" },

  // banner
  banner: { flexDirection: "row", alignItems: "center", borderRadius: 20, padding: 14, gap: 12, borderWidth: 1, marginBottom: 14 },
  bannerRisk: { backgroundColor: "#fef2f2", borderColor: "#fecaca" },
  bannerGood: { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" },
  bannerIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  bannerTitle: { fontSize: 15, fontWeight: "800" },
  bannerSub: { fontSize: 12.5, marginTop: 3, lineHeight: 18 },
  riskText: { color: "#b91c1c" },
  riskSubText: { color: "#ef4444" },
  goodText: { color: "#15803d" },
  goodSubText: { color: "#16a34a" },

  // weekly
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  sectionIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#e0e7ff", alignItems: "center", justifyContent: "center" },
  weekBlock: { marginBottom: 18, backgroundColor: "#f8fafc", borderRadius: 16, padding: 12 },
  weekHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 8 },
  weekLabel: { fontSize: 14, fontWeight: "800", color: "#0f172a" },
  weekRange: { flex: 1, fontSize: 11, color: "#94a3b8" },
  weekPill: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
  weekPercent: { fontSize: 12, fontWeight: "800" },
  dotsRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  dayDot: { width: 32, height: 32, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  dayDotText: { fontSize: 11, fontWeight: "700" },
  legend: { flexDirection: "row", gap: 18, marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: "#f1f5f9" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 7 },
  legendDot: { width: 12, height: 12, borderRadius: 4 },
  legendText: { fontSize: 12, color: "#64748b" },

  warningCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fef2f2", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#fecaca" },
  warningText: { flex: 1, fontSize: 13, color: "#dc2626", fontWeight: "700" },
  emptyText: { fontSize: 14, color: "#94a3b8", textAlign: "center", paddingVertical: 12 },

  loadingText: { color: "#64748b", marginTop: 8 },
  errorIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#fee2e2", alignItems: "center", justifyContent: "center" },
  errorText: { color: "#ef4444", fontSize: 15, textAlign: "center", paddingHorizontal: 28 },
  retryBtn: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, backgroundColor: "#4338ca", paddingVertical: 12, paddingHorizontal: 22, borderRadius: 14 },
});
