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

interface FeePayment {
  id: string;
  studentId: string;
  grade: string;
  section: string;
  session: string;
  month: string; // "02/2026"
  amount: number;
  paidDate: string;
  note: string;
  paidAt: string;
}

export default function FeeScreen() {
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

  const [fees, setFees] = useState<FeePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFees = useCallback(async () => {
    if (!student) {
      setError("Student not found");
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const url = `${BASE_URL}/api/fees?studentId=${student.id}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setFees(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || "Failed to load fees");
    } finally {
      setLoading(false);
    }
  }, [student]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchFees();
    }, [fetchFees])
  );

  async function onRefresh() {
    setRefreshing(true);
    await fetchFees();
    setRefreshing(false);
  }

  function confirmDelete(payment: FeePayment) {
    Alert.alert(
      "Delete Payment",
      `Remove the Rs. ${payment.amount} payment for ${payment.month}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deletePayment(payment),
        },
      ]
    );
  }

  async function deletePayment(payment: FeePayment) {
    try {
      const res = await fetch(`${BASE_URL}/api/fees?id=${payment.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setFees((prev) => prev.filter((f) => f.id !== payment.id));
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not delete payment");
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="dark-content" backgroundColor="#f3f5fb" />
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Loading fees...</Text>
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
        <TouchableOpacity onPress={fetchFees} style={styles.retryBtn}>
          <Ionicons name="refresh" size={16} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "700" }}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 12 }}
        >
          <Text style={{ color: "#059669", fontWeight: "600" }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const studentName = student?.name || "Your Child";
  const grade = student?.grade || "";
  const monthlyFee = (student as any)?.fee || 0;

  // ✅ Group by month, sorted newest first
  const byMonth: Record<string, FeePayment[]> = {};
  fees.forEach((p) => {
    if (!byMonth[p.month]) byMonth[p.month] = [];
    byMonth[p.month].push(p);
  });

  const monthKeys = Object.keys(byMonth).sort((a, b) => {
    const [ma, ya] = a.split("/").map(Number);
    const [mb, yb] = b.split("/").map(Number);
    return yb * 12 + mb - (ya * 12 + ma); // newest month first
  });

  const totalPaid = fees.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const monthsPaid = monthKeys.length;

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#064e3b" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#059669"]}
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
            <Text style={styles.topTitle}>Fee Management</Text>
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
            {monthlyFee > 0 && (
              <View style={styles.heroChip}>
                <Ionicons name="cash" size={12} color="#fff" />
                <Text style={styles.heroChipText}>
                  Fee Rs. {monthlyFee}/mo
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          {/* Summary cards */}
          <View style={[styles.summaryRow, { marginTop: -34 }]}>
            <View style={styles.summaryCard}>
              <View
                style={[styles.summaryIcon, { backgroundColor: "#d1fae5" }]}
              >
                <Ionicons name="wallet" size={18} color="#059669" />
              </View>
              <Text style={styles.summaryLabel}>Total Paid</Text>
              <Text style={[styles.summaryValue, { color: "#059669" }]}>
                Rs. {totalPaid}
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <View
                style={[styles.summaryIcon, { backgroundColor: "#e0e7ff" }]}
              >
                <Ionicons name="calendar" size={18} color="#4338ca" />
              </View>
              <Text style={styles.summaryLabel}>Months Paid</Text>
              <Text style={[styles.summaryValue, { color: "#4338ca" }]}>
                {monthsPaid}
              </Text>
            </View>
          </View>

          {fees.length === 0 ? (
            <View style={[styles.emptyCard, { marginTop: 14 }]}>
              <View style={styles.emptyIcon}>
                <Ionicons name="cash-outline" size={30} color="#059669" />
              </View>
              <Text style={styles.emptyTitle}>No payments yet</Text>
              <Text style={styles.emptySub}>
                Fee payments made by the school will appear here.
              </Text>
            </View>
          ) : (
            monthKeys.map((monthKey) => {
              const list = byMonth[monthKey];
              const monthTotal = list.reduce(
                (sum, p) => sum + Number(p.amount || 0),
                0
              );

              return (
                <View key={monthKey} style={styles.card}>
                  <View style={styles.sectionHead}>
                    <View
                      style={[
                        styles.sectionIcon,
                        { backgroundColor: "#d1fae5" },
                      ]}
                    >
                      <Ionicons name="calendar" size={18} color="#059669" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sectionTitle}>{monthKey}</Text>
                      <Text style={styles.sectionSub}>
                        {list.length}{" "}
                        {list.length === 1 ? "payment" : "payments"}
                      </Text>
                    </View>
                    <View style={styles.monthTotalPill}>
                      <Text style={styles.monthTotalText}>
                        Rs. {monthTotal}
                      </Text>
                    </View>
                  </View>

                  {list.map((p, i) => (
                    <View
                      key={p.id}
                      style={[
                        styles.row,
                        i === list.length - 1 && { borderBottomWidth: 0 },
                      ]}
                    >
                      <View
                        style={[styles.avatar, { backgroundColor: "#d1fae5" }]}
                      >
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color="#059669"
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.amount}>Rs. {p.amount}</Text>
                        <Text style={styles.meta}>
                          {p.paidDate || "—"}
                          {p.note ? ` • ${p.note}` : ""}
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={() => confirmDelete(p)}
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
                  ))}
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
  shadowColor: "#064e3b",
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
    backgroundColor: "#064e3b",
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
    backgroundColor: "rgba(52,211,153,0.25)",
  },
  circleB: {
    position: "absolute",
    bottom: -70,
    left: -50,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "rgba(16,185,129,0.20)",
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

  summaryRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 14,
    ...shadow,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  summaryLabel: { fontSize: 12, color: "#64748b", marginBottom: 2 },
  summaryValue: { fontSize: 20, fontWeight: "800" },

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
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  sectionSub: { fontSize: 11, color: "#64748b", marginTop: 2 },
  monthTotalPill: {
    backgroundColor: "#d1fae5",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  monthTotalText: { color: "#059669", fontSize: 12, fontWeight: "800" },

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
  amount: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  meta: { fontSize: 12, color: "#64748b", marginTop: 2 },
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
    backgroundColor: "#d1fae5",
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
    backgroundColor: "#059669",
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 14,
  },
});