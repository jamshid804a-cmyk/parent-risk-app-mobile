import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

const HEADER_TOP =
  Platform.OS === "android" ? (StatusBar.currentHeight || 24) + 10 : 54;

interface RawAttendance {
  present?: boolean;
  status?: string;
  day: number;
  date?: string;
  studentId?: number | string;
}

interface DayRecord {
  day: number;
  present: boolean;
}

interface MonthData {
  key: string; // "01/2026"
  label: string; // "January 2026"
  days: DayRecord[];
  presentDays: number;
  totalDaysInMonth: number;
  percent: number;
}

// -------- helpers --------
function daysInMonth(month: string): number {
  const [m, y] = month.split("/").map(Number);
  return new Date(y, m, 0).getDate();
}

function monthLabel(month: string): string {
  const [m, y] = month.split("/").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });
}

function normalizeRecord(r: RawAttendance): DayRecord | null {
  const day = Number(r.day);
  if (!day || day < 1) return null;
  let present = false;
  if (typeof r.present === "boolean") present = r.present;
  else if (typeof r.status === "string")
    present = r.status.toUpperCase() === "P";
  return { day, present };
}

function buildWeeks(days: DayRecord[], month: string) {
  const total = daysInMonth(month);
  const presentMap: Record<number, boolean> = {};
  for (const d of days) presentMap[d.day] = d.present;
  const weeks = [];
  let idx = 1;
  for (let start = 1; start <= total; start += 7) {
    const end = Math.min(start + 6, total);
    const list: { day: number; present: boolean }[] = [];
    for (let d = start; d <= end; d++) {
      list.push({ day: d, present: presentMap[d] ?? false });
    }
    weeks.push({ weekLabel: `Week ${idx}`, weekStart: start, weekEnd: end, days: list });
    idx++;
  }
  return weeks;
}

export default function AttendanceScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ studentId?: string }>();
  const rawId = Array.isArray(params.studentId)
    ? params.studentId[0]
    : params.studentId;
  const studentIdNum = rawId ? Number(rawId) : null;

  const student =
    user?.students?.find((s: any) => Number(s.id) === studentIdNum) ||
    (studentIdNum ? null : user?.students?.[0]) ||
    null;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [months, setMonths] = useState<MonthData[]>([]);
  // Which months are expanded (default: all expanded)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  // Prevent "expand all" from firing on every reload
  const [initialized, setInitialized] = useState(false);

  const fetchAttendance = useCallback(async () => {
    if (!student) {
      setError("Student not found");
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const res = await fetch(
        `${BASE_URL}/api/attendance?studentId=${student.id}`
      );
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      const raw: RawAttendance[] = Array.isArray(data)
        ? data
        : data.attendance || [];

      // Group by month
      const byMonth: Record<string, DayRecord[]> = {};
      for (const r of raw) {
        const month = String(r.date || "");
        if (!month) continue;
        const rec = normalizeRecord(r);
        if (!rec) continue;
        if (!byMonth[month]) byMonth[month] = [];
        byMonth[month].push(rec);
      }

      // Build MonthData, newest first
      const list: MonthData[] = Object.keys(byMonth)
        .sort((a, b) => {
          const [ma, ya] = a.split("/").map(Number);
          const [mb, yb] = b.split("/").map(Number);
          return yb * 12 + mb - (ya * 12 + ma);
        })
        .map((key) => {
          const days = byMonth[key];
          const presentDays = days.filter((d) => d.present).length;
          const totalDaysInMonth = daysInMonth(key);
          const percent = Math.round(
            (presentDays / totalDaysInMonth) * 100
          );
          return {
            key,
            label: monthLabel(key),
            days,
            presentDays,
            totalDaysInMonth,
            percent,
          };
        });

      setMonths(list);

      // Default: expand all months on first load only
      if (!initialized) {
        const exp: Record<string, boolean> = {};
        list.forEach((m) => (exp[m.key] = true));
        setExpanded(exp);
        setInitialized(true);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }, [student, initialized]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchAttendance();
    }, [fetchAttendance])
  );

  async function onRefresh() {
    setRefreshing(true);
    await fetchAttendance();
    setRefreshing(false);
  }

  function toggleMonth(key: string) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function confirmDeleteMonth(key: string) {
    Alert.alert(
      "Delete Attendance",
      `Delete all attendance for ${monthLabel(key)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMonth(key),
        },
      ]
    );
  }

  async function deleteMonth(key: string) {
    if (!student) return;
    try {
      const res = await fetch(
        `${BASE_URL}/api/attendance/month?studentId=${student.id}&month=${encodeURIComponent(key)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Delete failed");
      // Remove locally
      setMonths((prev) => prev.filter((m) => m.key !== key));
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not delete month");
    }
  }

  // --- loading / error ---
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

  const studentName = student?.name || "Your Child";
  const grade = student?.grade || "";

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
        {/* ---- Fixed top hero (name, grade) ---- */}
        <View style={styles.hero}>
          <View style={styles.circleA} />
          <View style={styles.circleB} />

          <View style={styles.topRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.roundBtn}
            >
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
              <Text style={styles.heroChipText}>
                {months.length} {months.length === 1 ? "month" : "months"}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          {months.length === 0 ? (
            <View style={[styles.emptyCard, { marginTop: -34 }]}>
              <View style={styles.emptyIcon}>
                <Ionicons name="calendar-outline" size={30} color="#4338ca" />
              </View>
              <Text style={styles.emptyTitle}>No attendance yet</Text>
              <Text style={styles.emptySub}>
                Attendance added by the school will appear here.
              </Text>
            </View>
          ) : (
            months.map((m, idx) => (
              <MonthCard
                key={m.key}
                month={m}
                expanded={!!expanded[m.key]}
                first={idx === 0}
                onToggle={() => toggleMonth(m.key)}
                onDelete={() => confirmDeleteMonth(m.key)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function MonthCard({
  month,
  expanded,
  first,
  onToggle,
  onDelete,
}: {
  month: MonthData;
  expanded: boolean;
  first: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const atRisk = month.percent < 75;
  const accent = atRisk ? "#ef4444" : "#22c55e";
  const weeks = useMemo(
    () => buildWeeks(month.days, month.key),
    [month.days, month.key]
  );
  const needsMore = Math.max(0, 75 - month.percent);

  if (!expanded) {
    // ---- Collapsed short box ----
    return (
      <View
        style={[
          styles.collapsedBox,
          { marginTop: first ? -34 : 12 },
        ]}
      >
        <View
          style={[
            styles.avatar,
            { backgroundColor: atRisk ? "#fee2e2" : "#dcfce7" },
          ]}
        >
          <Text
            style={[
              styles.avatarText,
              { color: atRisk ? "#dc2626" : "#16a34a" },
            ]}
          >
            {month.label.charAt(0)}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.collapsedMonth}>{month.label}</Text>
          <Text style={styles.collapsedMeta}>
            {month.presentDays}/{month.totalDaysInMonth} days
          </Text>
        </View>

        <Text style={[styles.collapsedPercent, { color: accent }]}>
          {month.percent}%
        </Text>

        <TouchableOpacity onPress={onToggle} style={styles.toggleBtnSmall}>
          <Ionicons name="chevron-down" size={18} color="#4338ca" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onDelete}
          style={styles.deleteBtnSmall}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>
    );
  }

  // ---- Expanded full card ----
  return (
    <View style={[styles.card, { marginTop: first ? -34 : 14 }]}>
      {/* Card header: month + buttons */}
      <View style={styles.cardTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardMonth}>{month.label}</Text>
          <Text style={styles.cardMonthSub}>
            {month.presentDays} of {month.totalDaysInMonth} days present
          </Text>
        </View>

        <TouchableOpacity onPress={onToggle} style={styles.toggleBtn}>
          <Text style={styles.toggleText}>Show less</Text>
          <Ionicons name="chevron-up" size={16} color="#4338ca" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onDelete}
          style={styles.deleteBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Percent + progress bar */}
      <View style={styles.statRow}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: atRisk ? "#fee2e2" : "#dcfce7" },
          ]}
        >
          <Text
            style={[
              styles.avatarText,
              { color: atRisk ? "#dc2626" : "#16a34a" },
            ]}
          >
            {month.label.charAt(0)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.studentName}>{month.label}</Text>
          <Text style={styles.studentGrade}>
            {month.presentDays} of {month.totalDaysInMonth} days present
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={[styles.percentBig, { color: accent }]}>
            {month.percent}%
          </Text>
          <Text style={styles.daysSmall}>this month</Text>
        </View>
      </View>

      <View style={styles.barBg}>
        <View
          style={[
            styles.barFill,
            {
              width: `${Math.min(month.percent, 100)}%` as any,
              backgroundColor: accent,
            },
          ]}
        />
        <View style={styles.barMarker} />
      </View>
      <View style={styles.barLabels}>
        <Text style={styles.barLabel}>0%</Text>
        <Text style={styles.barMarkerLabel}>75% required</Text>
        <Text style={styles.barLabel}>100%</Text>
      </View>

      {/* Banner */}
      <View style={[styles.banner, atRisk ? styles.bannerRisk : styles.bannerGood]}>
        <View
          style={[
            styles.bannerIcon,
            { backgroundColor: atRisk ? "#fee2e2" : "#dcfce7" },
          ]}
        >
          <Ionicons
            name={atRisk ? "warning" : "checkmark-circle"}
            size={22}
            color={atRisk ? "#b91c1c" : "#15803d"}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.bannerTitle,
              atRisk ? styles.riskText : styles.goodText,
            ]}
          >
            {atRisk ? "At-Risk Student" : "Good Attendance"}
          </Text>
          <Text
            style={[
              styles.bannerSub,
              atRisk ? styles.riskSubText : styles.goodSubText,
            ]}
          >
            {month.percent}% this month
            {atRisk ? ". Below 75% threshold." : ". Keep it up!"}
          </Text>
        </View>
      </View>

      {/* Weekly breakdown */}
      <View style={styles.sectionHead}>
        <View style={styles.sectionIcon}>
          <Ionicons name="calendar" size={16} color="#4338ca" />
        </View>
        <Text style={styles.cardTitle}>Weekly Breakdown</Text>
      </View>

      {weeks.map((w, i) => {
        const wPresent = w.days.filter((d) => d.present).length;
        const wPercent = Math.round((wPresent / w.days.length) * 100);
        const wAtRisk = wPercent < 75;
        return (
          <View
            key={w.weekLabel}
            style={[
              styles.weekBlock,
              i === weeks.length - 1 && { marginBottom: 0 },
            ]}
          >
            <View style={styles.weekHeader}>
              <Text style={styles.weekLabel}>{w.weekLabel}</Text>
              <Text style={styles.weekRange}>
                Days {w.weekStart}-{w.weekEnd}
              </Text>
              <View
                style={[
                  styles.weekPill,
                  { backgroundColor: wAtRisk ? "#fee2e2" : "#dcfce7" },
                ]}
              >
                <Text
                  style={[
                    styles.weekPercent,
                    { color: wAtRisk ? "#dc2626" : "#16a34a" },
                  ]}
                >
                  {wPercent}%
                </Text>
              </View>
            </View>
            <View style={styles.dotsRow}>
              {w.days.map((d) => (
                <View
                  key={d.day}
                  style={[
                    styles.dayDot,
                    d.present
                      ? { backgroundColor: "#22c55e" }
                      : {
                          backgroundColor: "#f1f5f9",
                          borderWidth: 1,
                          borderColor: "#e2e8f0",
                        },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayDotText,
                      { color: d.present ? "#fff" : "#94a3b8" },
                    ]}
                  >
                    {d.day}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}

      {atRisk && (
        <View style={styles.warningCard}>
          <Ionicons name="trending-up" size={20} color="#dc2626" />
          <Text style={styles.warningText}>
            Needs {needsMore}% more to reach 75% threshold
          </Text>
        </View>
      )}
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
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#f3f5fb",
  },

  hero: {
    backgroundColor: "#1e1b4b",
    paddingTop: HEADER_TOP,
    paddingHorizontal: 20,
    paddingBottom: 58,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden",
  },
  circleA: {
    position: "absolute",
    top: -60,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(129,140,248,0.22)",
  },
  circleB: {
    position: "absolute",
    bottom: -70,
    left: -50,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "rgba(99,102,241,0.18)",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  roundBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  topTitle: { fontSize: 17, fontWeight: "700", color: "#fff" },
  heroName: { fontSize: 26, fontWeight: "800", color: "#fff" },
  heroChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroChipText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    ...shadow,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  cardMonth: { fontSize: 17, fontWeight: "800", color: "#0f172a" },
  cardMonthSub: { fontSize: 12, color: "#64748b", marginTop: 2 },

  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#eef2ff",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  toggleText: { fontSize: 11, fontWeight: "800", color: "#4338ca" },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#fef2f2",
    alignItems: "center",
    justifyContent: "center",
  },

  collapsedBox: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
    ...shadow,
  },
  collapsedMonth: { fontSize: 15, fontWeight: "800", color: "#0f172a" },
  collapsedMeta: { fontSize: 11.5, color: "#64748b", marginTop: 2 },
  collapsedPercent: { fontSize: 18, fontWeight: "800", marginRight: 6 },
  toggleBtnSmall: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#eef2ff",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtnSmall: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#fef2f2",
    alignItems: "center",
    justifyContent: "center",
  },

  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontWeight: "800", fontSize: 20 },
  studentName: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  studentGrade: { fontSize: 12.5, color: "#64748b", marginTop: 3 },
  percentBig: { fontSize: 30, fontWeight: "800" },
  daysSmall: { fontSize: 11, color: "#94a3b8" },

  barBg: {
    height: 12,
    backgroundColor: "#e2e8f0",
    borderRadius: 6,
    marginBottom: 6,
    overflow: "visible",
    justifyContent: "center",
  },
  barFill: { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 6 },
  barMarker: {
    position: "absolute",
    left: "75%",
    top: -4,
    bottom: -4,
    width: 2.5,
    borderRadius: 2,
    backgroundColor: "#f97316",
  },
  barLabels: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  barLabel: { fontSize: 10, color: "#94a3b8" },
  barMarkerLabel: { fontSize: 10, color: "#f97316", fontWeight: "700" },

  banner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  bannerRisk: { backgroundColor: "#fef2f2", borderColor: "#fecaca" },
  bannerGood: { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" },
  bannerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerTitle: { fontSize: 15, fontWeight: "800" },
  bannerSub: { fontSize: 12.5, marginTop: 3, lineHeight: 18 },
  riskText: { color: "#b91c1c" },
  riskSubText: { color: "#ef4444" },
  goodText: { color: "#15803d" },
  goodSubText: { color: "#16a34a" },

  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#e0e7ff",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },

  weekBlock: {
    marginBottom: 18,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 12,
  },
  weekHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  weekLabel: { fontSize: 14, fontWeight: "800", color: "#0f172a" },
  weekRange: { flex: 1, fontSize: 11, color: "#94a3b8" },
  weekPill: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
  weekPercent: { fontSize: 12, fontWeight: "800" },
  dotsRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  dayDot: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  dayDotText: { fontSize: 11, fontWeight: "700" },

  warningCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fef2f2",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#fecaca",
    marginTop: 12,
  },
  warningText: { flex: 1, fontSize: 13, color: "#dc2626", fontWeight: "700" },

  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    ...shadow,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#e0e7ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  emptySub: {
    color: "#64748b",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },

  loadingText: { color: "#64748b", marginTop: 8 },
  errorIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 15,
    textAlign: "center",
    paddingHorizontal: 28,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    backgroundColor: "#4338ca",
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 14,
  },
});