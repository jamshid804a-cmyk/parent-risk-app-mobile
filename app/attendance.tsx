import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../src/context/AuthContext";

const BASE_URL = "https://parent-risk-app-mobile-production-30bb.up.railway.app";

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
      if (!user?.students || user.students.length === 0) {
        setError("Student info missing. Please log out and log in again.");
        setLoading(false);
        return;
      }
      if (!student) {
        setError("Student not found.");
        setLoading(false);
        return;
      }
      // ✅ FIXED: route param instead of query param
      const url = `${BASE_URL}/api/attendance/${student.id}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      // ✅ FIXED: backend returns { success, attendance: [...] }
      const data = await res.json();
      const allRecords: AttendanceRecord[] = data.attendance;
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

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading attendance...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </SafeAreaView>
    );
  }

  const [m, y] = month.split("/");
  const monthName = new Date(Number(y), Number(m) - 1, 1)
    .toLocaleString("default", { month: "long", year: "numeric" });

  const studentName = student?.name || "Your Child";
  const grade = student?.grade || "";
  const presentDays = records.filter((r) => r.present).length;
  const totalDays = daysInMonth(month);
  const atRisk = percent < 75;
  const needsMore = 75 - percent;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Student Attendance</Text>
          <Text style={styles.headerSub}>
            {studentName}{grade ? ` - Grade ${grade}` : ""}
          </Text>
          <Text style={styles.monthLabel}>{monthName}</Text>
        </View>

        <View style={[styles.banner, atRisk ? styles.bannerRisk : styles.bannerGood]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, atRisk ? styles.riskText : styles.goodText]}>
              {atRisk ? "At-Risk Student" : "Good Attendance"}
            </Text>
            <Text style={[styles.bannerSub, atRisk ? styles.riskSubText : styles.goodSubText]}>
              {studentName} - {percent}% this month
              {atRisk ? ". Below 75% threshold." : ". Keep it up!"}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {studentName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.studentName}>{studentName}</Text>
              <Text style={styles.studentGrade}>{grade ? `Grade ${grade}` : ""}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.percentBig}>{percent}%</Text>
              <Text style={styles.daysSmall}>{presentDays}/{totalDays} days present</Text>
            </View>
          </View>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${percent}%` as any, backgroundColor: atRisk ? "#ef4444" : "#22c55e" }]} />
          </View>
          <View style={styles.barLabels}>
            <Text style={styles.barLabel}>0%</Text>
            <Text style={styles.barMarkerLabel}>75% required</Text>
            <Text style={styles.barLabel}>100%</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Weekly Breakdown</Text>
          {weeks.length === 0 ? (
            <Text style={styles.emptyText}>No attendance data yet.</Text>
          ) : (
            weeks.map((week) => {
              const wPresent = week.days.filter((d) => d.present).length;
              const wPercent = Math.round((wPresent / week.days.length) * 100);
              const wAtRisk = wPercent < 75;
              return (
                <View key={week.weekLabel} style={styles.weekBlock}>
                  <View style={styles.weekHeader}>
                    <Text style={styles.weekLabel}>{week.weekLabel}</Text>
                    <Text style={styles.weekRange}>Days {week.weekStart}-{week.weekEnd}</Text>
                    <Text style={[styles.weekPercent, { color: wAtRisk ? "#ef4444" : "#22c55e" }]}>
                      {wPercent}%
                    </Text>
                  </View>
                  <View style={styles.dotsRow}>
                    {week.days.map((d) => (
                      <View key={d.day} style={[styles.dayDot, { backgroundColor: d.present ? "#22c55e" : "#e5e7eb" }]}>
                        <Text style={[styles.dayDotText, { color: d.present ? "#fff" : "#6b7280" }]}>
                          {d.day}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {atRisk && (
          <View style={styles.warningCard}>
            <Text style={styles.warningText}>
              Needs {needsMore}% more to reach 75% threshold
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  container: { padding: 16, gap: 12, paddingBottom: 32, paddingTop: 40 },
  header: { marginBottom: 4 },
  backBtn: { marginBottom: 8 },
  backBtnText: { fontSize: 15, color: "#2563eb", fontWeight: "600" },
  headerTitle: { fontSize: 24, fontWeight: "700", color: "#1e293b" },
  headerSub: { fontSize: 15, color: "#64748b", marginTop: 4 },
  monthLabel: { fontSize: 14, color: "#3b82f6", marginTop: 4, fontWeight: "600" },
  banner: { flexDirection: "row", alignItems: "flex-start", borderRadius: 12, padding: 14, gap: 10, borderWidth: 1 },
  bannerRisk: { backgroundColor: "#fef2f2", borderColor: "#fca5a5" },
  bannerGood: { backgroundColor: "#f0fdf4", borderColor: "#86efac" },
  bannerTitle: { fontSize: 15, fontWeight: "700" },
  bannerSub: { fontSize: 13, marginTop: 3, lineHeight: 18 },
  riskText: { color: "#b91c1c" },
  riskSubText: { color: "#ef4444" },
  goodText: { color: "#15803d" },
  goodSubText: { color: "#16a34a" },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, elevation: 2, borderWidth: 1, borderColor: "#fee2e2" },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#1e293b", marginBottom: 14 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#fee2e2", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#dc2626", fontWeight: "700", fontSize: 18 },
  studentName: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
  studentGrade: { fontSize: 13, color: "#64748b", marginTop: 2 },
  percentBig: { fontSize: 24, fontWeight: "700", color: "#ef4444" },
  daysSmall: { fontSize: 11, color: "#94a3b8" },
  barBg: { height: 10, backgroundColor: "#e2e8f0", borderRadius: 5, marginBottom: 4 },
  barFill: { height: "100%", borderRadius: 5 },
  barLabels: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  barLabel: { fontSize: 10, color: "#94a3b8" },
  barMarkerLabel: { fontSize: 10, color: "#f97316", fontWeight: "600" },
  weekBlock: { marginBottom: 16 },
  weekHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 },
  weekLabel: { fontSize: 13, fontWeight: "700", color: "#1e293b" },
  weekRange: { flex: 1, fontSize: 11, color: "#94a3b8" },
  weekPercent: { fontSize: 13, fontWeight: "700" },
  dotsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  dayDot: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  dayDotText: { fontSize: 10, fontWeight: "600" },
  warningCard: { backgroundColor: "#fef2f2", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#fca5a5" },
  warningText: { fontSize: 13, color: "#dc2626", fontWeight: "600" },
  emptyText: { fontSize: 14, color: "#94a3b8", textAlign: "center", paddingVertical: 12 },
  loadingText: { color: "#64748b", marginTop: 8 },
  errorText: { color: "#ef4444", fontSize: 15, textAlign: "center", padding: 24 },
});