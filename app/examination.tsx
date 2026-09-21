import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
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

interface ExamRecord {
  id: string;
  subject: string;
  examType: string; // "Mid Term" | "Final Term"
  month: string; // "01/2026"
  studentId: string;
  grade: string;
  obtained: number;
  total: number;
  percentage: number;
  section: string;
  session: string;
}

const TYPES = ["Mid Term", "Final Term"] as const;

const TYPE_STYLE: Record<
  string,
  { color: string; bg: string; icon: any; label: string }
> = {
  "Mid Term": {
    color: "#7c3aed",
    bg: "#ede9fe",
    icon: "document-text",
    label: "Mid Term Exams",
  },
  "Final Term": {
    color: "#db2777",
    bg: "#fce7f3",
    icon: "ribbon",
    label: "Final Term Exams",
  },
};

export default function ExaminationScreen() {
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

  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExams = useCallback(async () => {
    if (!student) {
      setError("Student not found");
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const url = `${BASE_URL}/api/exams?studentId=${student.id}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setExams(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || "Failed to load exams");
    } finally {
      setLoading(false);
    }
  }, [student]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchExams();
    }, [fetchExams])
  );

  async function onRefresh() {
    setRefreshing(true);
    await fetchExams();
    setRefreshing(false);
  }

  function confirmDelete(exam: ExamRecord) {
    Alert.alert(
      "Delete Exam",
      `Remove "${exam.subject}" (${exam.examType}) permanently?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteExam(exam),
        },
      ]
    );
  }

  async function deleteExam(exam: ExamRecord) {
    try {
      const res = await fetch(`${BASE_URL}/api/exams?id=${exam.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setExams((prev) => prev.filter((e) => e.id !== exam.id));
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not delete exam");
    }
  }

  const grouped: Record<string, ExamRecord[]> = {
    "Mid Term": [],
    "Final Term": [],
  };
  exams.forEach((e) => {
    const key = TYPES.includes(e.examType as any) ? e.examType : "Mid Term";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="dark-content" backgroundColor="#f3f5fb" />
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text style={styles.loadingText}>Loading exams...</Text>
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
        <TouchableOpacity onPress={fetchExams} style={styles.retryBtn}>
          <Ionicons name="refresh" size={16} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "700" }}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 12 }}
        >
          <Text style={{ color: "#7c3aed", fontWeight: "600" }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const studentName = student?.name || "Your Child";
  const grade = student?.grade || "";

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#2e1065" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#7c3aed"]}
            progressViewOffset={HEADER_TOP}
          />
        }
      >
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
            <Text style={styles.topTitle}>Examination</Text>
            <TouchableOpacity onPress={onRefresh} style={styles.roundBtn}>
              <Ionicons name="refresh" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <Text style={styles.heroName}>{studentName}</Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginTop: 8,
            }}
          >
            {!!grade && (
              <View style={styles.heroChip}>
                <Text style={styles.heroChipText}>Grade {grade}</Text>
              </View>
            )}
            <View style={styles.heroChip}>
              <Ionicons name="document-text" size={12} color="#fff" />
              <Text style={styles.heroChipText}>
                {exams.length} {exams.length === 1 ? "exam" : "exams"}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          {exams.length === 0 ? (
            <View style={[styles.emptyCard, { marginTop: -34 }]}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="document-text-outline"
                  size={30}
                  color="#7c3aed"
                />
              </View>
              <Text style={styles.emptyTitle}>No exams yet</Text>
              <Text style={styles.emptySub}>
                Exams added by the school will appear here.
              </Text>
            </View>
          ) : (
            TYPES.map((type, idx) => {
              const list = grouped[type] || [];
              if (list.length === 0) return null;
              const style = TYPE_STYLE[type];

              return (
                <View
                  key={type}
                  style={[styles.card, { marginTop: idx === 0 ? -34 : 14 }]}
                >
                  <View style={styles.sectionHead}>
                    <View
                      style={[
                        styles.sectionIcon,
                        { backgroundColor: style.bg },
                      ]}
                    >
                      <Ionicons
                        name={style.icon}
                        size={18}
                        color={style.color}
                      />
                    </View>
                    <Text style={styles.sectionTitle}>{style.label}</Text>
                    <View
                      style={[styles.countPill, { backgroundColor: style.bg }]}
                    >
                      <Text
                        style={[styles.countPillText, { color: style.color }]}
                      >
                        {list.length}
                      </Text>
                    </View>
                  </View>

                  {list.map((e, i) => {
                    const pct =
                      typeof e.percentage === "number"
                        ? e.percentage
                        : e.total > 0
                        ? Math.round((e.obtained / e.total) * 100)
                        : 0;
                    const danger = pct < 50;
                    return (
                      <View
                        key={e.id}
                        style={[
                          styles.row,
                          i === list.length - 1 && { borderBottomWidth: 0 },
                        ]}
                      >
                        <View
                          style={[
                            styles.avatar,
                            {
                              backgroundColor: danger ? "#fee2e2" : "#dcfce7",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.avatarText,
                              { color: danger ? "#dc2626" : "#16a34a" },
                            ]}
                          >
                            {String(e.subject || "?")
                              .charAt(0)
                              .toUpperCase()}
                          </Text>
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={styles.subjectName}>{e.subject}</Text>
                          <Text style={styles.subjectMeta}>
                            {e.month}
                            {e.session ? ` • ${e.session}` : ""}
                          </Text>
                        </View>

                        <View style={{ alignItems: "flex-end" }}>
                          <Text
                            style={[
                              styles.percent,
                              { color: danger ? "#dc2626" : "#16a34a" },
                            ]}
                          >
                            {pct}%
                          </Text>
                          <Text style={styles.marks}>
                            {e.obtained}/{e.total}
                          </Text>
                        </View>

                        <TouchableOpacity
                          onPress={() => confirmDelete(e)}
                          style={styles.deleteBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={18}
                            color="#ef4444"
                          />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const shadow = {
  shadowColor: "#2e1065",
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
    backgroundColor: "#2e1065",
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
    backgroundColor: "rgba(167,139,250,0.28)",
  },
  circleB: {
    position: "absolute",
    bottom: -70,
    left: -50,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "rgba(236,72,153,0.22)",
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
    padding: 16,
    marginBottom: 14,
    ...shadow,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  countPill: {
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  countPillText: { fontSize: 12, fontWeight: "800" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eef1f6",
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontWeight: "800", fontSize: 17 },
  subjectName: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  subjectMeta: { fontSize: 12, color: "#64748b", marginTop: 2 },
  percent: { fontSize: 17, fontWeight: "800" },
  marks: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#fef2f2",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },

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
    backgroundColor: "#ede9fe",
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
    backgroundColor: "#7c3aed",
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 14,
  },
});