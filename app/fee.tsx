import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
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
  month: string;
  amount: number;
  paidDate: string;
  note: string;
  paidAt: string;
}

interface FeeNotice {
  id: string;
  studentId: string;
  message: string;
  type: string;
  readStatus: boolean | number;
  createdAt: string;
  month: string;
}

function extractMonth(message: string): string {
  if (!message) return "";
  const m1 = message.match(/(\d{2})\/(\d{4})/);
  if (m1) return `${m1[1]}/${m1[2]}`;
  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ];
  for (let i = 0; i < monthNames.length; i++) {
    if (message.includes(monthNames[i])) {
      const mm = String(i + 1).padStart(2, "0");
      return `${mm}/${new Date().getFullYear()}`;
    }
  }
  return "";
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
  const [notices, setNotices] = useState<FeeNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!student) {
      setError("Student not found");
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const feesRes = await fetch(`${BASE_URL}/api/fees?studentId=${student.id}`);
      const feesData = feesRes.ok ? await feesRes.json() : [];
      setFees(Array.isArray(feesData) ? feesData : []);

      const nRes = await fetch(`${BASE_URL}/api/notifications?studentId=${student.id}`);
      const nData = nRes.ok ? await nRes.json() : [];
      const list = Array.isArray(nData) ? nData : [];
      const feeNotices: FeeNotice[] = list
        .filter((n: any) => String(n.type || "").toLowerCase() === "fee")
        .map((n: any) => ({
          id: n.id,
          studentId: n.studentId,
          message: n.message || "",
          type: n.type,
          readStatus: n.readStatus,
          createdAt: n.createdAt,
          month: extractMonth(n.message || ""),
        }));
      feeNotices.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setNotices(feeNotices);
    } catch (e: any) {
      setError(e.message || "Failed to load fees");
    } finally {
      setLoading(false);
    }
  }, [student]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchAll();
    }, [fetchAll])
  );

  async function onRefresh() {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }

  function confirmDeletePayment(p: FeePayment) {
    Alert.alert(
      "Delete Payment",
      `Remove the Rs. ${p.amount} payment for ${p.month}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deletePayment(p) },
      ]
    );
  }

  async function deletePayment(p: FeePayment) {
    try {
      const res = await fetch(`${BASE_URL}/api/fees?id=${p.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setFees((prev) => prev.filter((f) => f.id !== p.id));
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not delete payment");
    }
  }

  function confirmDeleteNotice(n: FeeNotice) {
    Alert.alert(
      "Delete Notice",
      `Remove this fee notice${n.month ? ` for ${n.month}` : ""}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteNotice(n) },
      ]
    );
  }

  async function deleteNotice(n: FeeNotice) {
    try {
      const res = await fetch(`${BASE_URL}/api/notifications?id=${n.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setNotices((prev) => prev.filter((x) => x.id !== n.id));
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not delete notice");
    }
  }

  // ✅ Share fee progress
  async function handleShare(
    studentName: string,
    grade: string,
    monthlyFee: number,
    totalPaid: number,
    totalPending: number,
    monthsPaid: number,
    paidMonthKeys: string[],
    pendingNotices: FeeNotice[]
  ) {
    const lines: string[] = [];
    lines.push(`*Fee Statement — ${studentName}*`);
    if (grade) lines.push(`Grade: ${grade}`);
    if (monthlyFee > 0) lines.push(`Monthly Fee: Rs. ${monthlyFee}`);
    lines.push("");
    lines.push(`*Total Paid:* Rs. ${totalPaid}`);
    lines.push(`*Months Paid:* ${monthsPaid}`);
    lines.push(`*Pending:* Rs. ${totalPending}`);

    if (paidMonthKeys.length > 0) {
      lines.push("");
      lines.push("*Paid Months:*");
      paidMonthKeys.forEach((m) => lines.push(`• ${m} — Paid`));
    }

    if (pendingNotices.length > 0) {
      lines.push("");
      lines.push("*Pending Months:*");
      pendingNotices.forEach((n) =>
        lines.push(`• ${n.month || "—"} — Rs. ${monthlyFee || 0} due`)
      );
    }

    lines.push("");
    lines.push("Sent from Parent Portal");

    const message = lines.join("\n");
    const url = `whatsapp://send?text=${encodeURIComponent(message)}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        // Fallback to generic share sheet
        await Share.share({ message });
      }
    } catch (e) {
      try {
        await Share.share({ message });
      } catch (err) {
        console.log("Share error:", err);
      }
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
        <TouchableOpacity onPress={fetchAll} style={styles.retryBtn}>
          <Ionicons name="refresh" size={16} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "700" }}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: "#059669", fontWeight: "600" }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const studentName = student?.name || "Your Child";
  const grade = student?.grade || "";
  const monthlyFee = (student as any)?.fee || 0;

  const paidMonths = new Set(fees.map((p) => p.month).filter(Boolean));
  const pendingNotices = notices.filter((n) => {
    if (!n.month) return true;
    return !paidMonths.has(n.month);
  });

  const paidByMonth: Record<string, FeePayment[]> = {};
  fees.forEach((p) => {
    if (!paidByMonth[p.month]) paidByMonth[p.month] = [];
    paidByMonth[p.month].push(p);
  });
  const paidMonthKeys = Object.keys(paidByMonth).sort((a, b) => {
    const [ma, ya] = a.split("/").map(Number);
    const [mb, yb] = b.split("/").map(Number);
    return yb * 12 + mb - (ya * 12 + ma);
  });

  const totalPaid = fees.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const monthsPaid = paidMonthKeys.length;
  const totalPending = pendingNotices.length * monthlyFee;

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
            <TouchableOpacity onPress={() => router.back()} style={styles.roundBtn}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.topTitle}>Fee Management</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {/* ✅ Share button */}
              <TouchableOpacity
                onPress={() =>
                  handleShare(
                    studentName,
                    grade,
                    monthlyFee,
                    totalPaid,
                    totalPending,
                    monthsPaid,
                    paidMonthKeys,
                    pendingNotices
                  )
                }
                style={styles.roundBtn}
              >
                <Ionicons name="share-social" size={20} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity onPress={onRefresh} style={styles.roundBtn}>
                <Ionicons name="refresh" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.heroName}>{studentName}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
            {!!grade && (
              <View style={styles.heroChip}>
                <Text style={styles.heroChipText}>Grade {grade}</Text>
              </View>
            )}
            {monthlyFee > 0 && (
              <View style={styles.heroChip}>
                <Ionicons name="cash" size={12} color="#fff" />
                <Text style={styles.heroChipText}>Fee Rs. {monthlyFee}/mo</Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          <View style={[styles.summaryRow, { marginTop: -34 }]}>
            <View style={styles.summaryCard}>
              <View style={[styles.summaryIcon, { backgroundColor: "#d1fae5" }]}>
                <Ionicons name="wallet" size={18} color="#059669" />
              </View>
              <Text style={styles.summaryLabel}>Total Paid</Text>
              <Text style={[styles.summaryValue, { color: "#059669" }]}>
                Rs. {totalPaid}
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <View style={[styles.summaryIcon, { backgroundColor: "#fee2e2" }]}>
                <Ionicons name="alert-circle" size={18} color="#dc2626" />
              </View>
              <Text style={styles.summaryLabel}>Pending</Text>
              <Text style={[styles.summaryValue, { color: "#dc2626" }]}>
                Rs. {totalPending}
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <View style={[styles.summaryIcon, { backgroundColor: "#e0e7ff" }]}>
                <Ionicons name="calendar" size={18} color="#4338ca" />
              </View>
              <Text style={styles.summaryLabel}>Months Paid</Text>
              <Text style={[styles.summaryValue, { color: "#4338ca" }]}>
                {monthsPaid}
              </Text>
            </View>
          </View>

          {pendingNotices.length > 0 && (
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeadRow}>
                <View style={[styles.sectionIcon, { backgroundColor: "#fee2e2" }]}>
                  <Ionicons name="alert-circle" size={18} color="#dc2626" />
                </View>
                <Text style={styles.sectionTitle}>Pending Fee</Text>
                <View style={[styles.countPill, { backgroundColor: "#fee2e2" }]}>
                  <Text style={[styles.countPillText, { color: "#dc2626" }]}>
                    {pendingNotices.length}
                  </Text>
                </View>
              </View>

              {pendingNotices.map((n, i) => (
                <View
                  key={n.id}
                  style={[
                    styles.row,
                    i === pendingNotices.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={[styles.avatar, { backgroundColor: "#fee2e2" }]}>
                    <Ionicons name="alert-circle" size={22} color="#dc2626" />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={styles.amountPending}>
                        {n.month || "Fee Due"}
                      </Text>
                      {monthlyFee > 0 && (
                        <Text style={styles.pendingAmount}>Rs. {monthlyFee}</Text>
                      )}
                    </View>
                    <Text style={styles.message} numberOfLines={3}>
                      {n.message}
                    </Text>
                    <Text style={styles.meta}>
                      {new Date(n.createdAt).toLocaleString()}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => confirmDeleteNotice(n)}
                    style={styles.deleteBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {fees.length === 0 && pendingNotices.length === 0 ? (
            <View style={[styles.emptyCard, { marginTop: 14 }]}>
              <View style={styles.emptyIcon}>
                <Ionicons name="cash-outline" size={30} color="#059669" />
              </View>
              <Text style={styles.emptyTitle}>No fee records</Text>
              <Text style={styles.emptySub}>
                Payments and pending notices will appear here.
              </Text>
            </View>
          ) : (
            paidMonthKeys.map((monthKey) => {
              const list = paidByMonth[monthKey];
              const monthTotal = list.reduce((sum, p) => sum + Number(p.amount || 0), 0);

              return (
                <View key={monthKey} style={styles.card}>
                  <View style={styles.sectionHead}>
                    <View style={[styles.sectionIcon, { backgroundColor: "#d1fae5" }]}>
                      <Ionicons name="checkmark-circle" size={18} color="#059669" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sectionTitle}>{monthKey}</Text>
                      <Text style={styles.sectionSub}>
                        {list.length} {list.length === 1 ? "payment" : "payments"}
                      </Text>
                    </View>
                    <View style={styles.monthTotalPill}>
                      <Text style={styles.monthTotalText}>Rs. {monthTotal}</Text>
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
                      <View style={[styles.avatar, { backgroundColor: "#d1fae5" }]}>
                        <Ionicons name="checkmark-circle" size={22} color="#059669" />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.amount}>Rs. {p.amount}</Text>
                        <Text style={styles.meta}>
                          {p.paidDate || "—"}
                          {p.note ? ` • ${p.note}` : ""}
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={() => confirmDeletePayment(p)}
                        style={styles.deleteBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
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
    gap: 10,
    marginBottom: 14,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 12,
    ...shadow,
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  summaryLabel: { fontSize: 11, color: "#64748b", marginBottom: 2 },
  summaryValue: { fontSize: 17, fontWeight: "800" },

  sectionBlock: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#fecaca",
    ...shadow,
  },
  sectionHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },

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
  sectionTitle: { flex: 1, fontSize: 16, fontWeight: "800", color: "#0f172a" },
  sectionSub: { fontSize: 11, color: "#64748b", marginTop: 2 },
  countPill: {
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  countPillText: { fontSize: 12, fontWeight: "800" },
  monthTotalPill: {
    backgroundColor: "#d1fae5",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  monthTotalText: { color: "#059669", fontSize: 12, fontWeight: "800" },

  row: {
    flexDirection: "row",
    alignItems: "flex-start",
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
  amountPending: { fontSize: 15, fontWeight: "800", color: "#dc2626" },
  pendingAmount: {
    fontSize: 12,
    fontWeight: "800",
    color: "#dc2626",
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  meta: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  message: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 17,
    marginTop: 4,
  },
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