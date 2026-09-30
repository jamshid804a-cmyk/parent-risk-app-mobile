import { Ionicons } from "@expo/vector-icons"
import { router, useFocusEffect } from "expo-router"
import { useCallback, useRef, useState } from "react"
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
} from "react-native"
import { useAuth } from "../src/context/AuthContext"

const BASE_URL = "https://parentriskapp-backend.vercel.app"
const HEADER_TOP =
  Platform.OS === "android" ? (StatusBar.currentHeight || 24) + 10 : 54

// ─── Color + label map ───
const KIND_STYLE = {
  attendance: { color: "#2563eb", bg: "#dbeafe", label: "Attendance" },
  test: { color: "#0891b2", bg: "#cffafe", label: "Test" },
  examination: { color: "#7c3aed", bg: "#ede9fe", label: "Examination" },
  fee: { color: "#059669", bg: "#d1fae5", label: "Fee" },
  info: { color: "#4f46e5", bg: "#e0e7ff", label: "Notification" },
} as const

type Kind = keyof typeof KIND_STYLE

function getKind(n: any): Kind {
  const t = String(n?.type || "").toLowerCase()
  const msg = String(n?.message || "").toLowerCase()

  if (t === "fee") return "fee"
  if (t === "attendance") return "attendance"
  if (t === "test") return "test"
  if (t === "examination" || t === "exam") return "examination"

  // Legacy "academic" fallback
  if (t === "academic") {
    if (msg.includes("exam")) return "examination"
    return "test"
  }
  return "info"
}

export default function NotificationScreen() {
  const { user } = useAuth()
  const students = user?.students || []

  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const busyRef = useRef(false)

  // ─── Fetch all notifications for every student ───
  const fetchAll = useCallback(async () => {
    if (busyRef.current) return
    busyRef.current = true
    try {
      if (students.length === 0) {
        setNotifications([])
        setLoading(false)
        return
      }

      const all: any[] = []
      for (const s of students) {
        try {
          const res = await fetch(
            `${BASE_URL}/api/notifications?studentId=${s.id}`
          )
          if (!res.ok) continue
          const data = await res.json()
          if (Array.isArray(data)) {
            data.forEach((n) => {
              n._studentName = s.name
              n._studentId = s.id
            })
            all.push(...data)
          }
        } catch (e) {
          console.log("Fetch error for student", s.id, e)
        }
      }

      // Newest first
      all.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      setNotifications(all)
    } catch (e) {
      console.log("Fetch all error:", e)
    } finally {
      setLoading(false)
      busyRef.current = false
    }
  }, [students])

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      fetchAll()
    }, [fetchAll])
  )

  async function onRefresh() {
    setRefreshing(true)
    await fetchAll()
    setRefreshing(false)
  }

  // ─── Mark one as read ───
  async function markAsRead(id: string) {
    try {
      await fetch(`${BASE_URL}/api/notifications`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
    } catch (e) {
      console.log("markAsRead error:", e)
    }
  }

  // ─── Delete one ───
  function confirmDelete(id: string) {
    Alert.alert("Delete Notification", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await fetch(`${BASE_URL}/api/notifications?id=${id}`, {
              method: "DELETE",
            })
            setNotifications((prev) => prev.filter((n) => n.id !== id))
            setSelectedIds((prev) => {
              const next = new Set(prev)
              next.delete(id)
              return next
            })
          } catch (e) {
            console.log("Delete error:", e)
          }
        },
      },
    ])
  }

  // ─── Bulk delete ───
  function confirmBulkDelete() {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    Alert.alert(
      "Delete Notifications",
      `Delete ${ids.length} notification${ids.length === 1 ? "" : "s"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            for (const id of ids) {
              try {
                await fetch(`${BASE_URL}/api/notifications?id=${id}`, {
                  method: "DELETE",
                })
              } catch (e) {
                console.log("Bulk delete error:", e)
              }
            }
            setNotifications((prev) =>
              prev.filter((n) => !selectedIds.has(String(n.id)))
            )
            setSelectedIds(new Set())
            setSelectMode(false)
          },
        },
      ]
    )
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ─── Tap handler — opens the correct screen ───
  function handleTap(n: any) {
    if (selectMode) {
      toggleSelect(String(n.id))
      return
    }

    markAsRead(n.id)
    setNotifications((prev) =>
      prev.map((x) => (x.id === n.id ? { ...x, readStatus: true } : x))
    )

    const studentId = n._studentId
    const kind = getKind(n)

    if (kind === "attendance") {
      router.push({ pathname: "/attendance", params: { studentId } })
    } else if (kind === "test") {
      router.push({ pathname: "/testing", params: { studentId } })
    } else if (kind === "examination") {
      router.push({ pathname: "/examination", params: { studentId } })
    } else if (kind === "fee") {
      router.push({ pathname: "/fee", params: { studentId } })
    }
  }

  const unreadCount = notifications.filter(
    (n) => n.readStatus === false || n.readStatus === 0
  ).length

  // ─── Style helpers ───
  function getBadgeStyle(kind: Kind) {
    const s = KIND_STYLE[kind]
    return { backgroundColor: s.bg, color: s.color }
  }
  function getBorderStyle(kind: Kind) {
    return { borderLeftColor: KIND_STYLE[kind].color }
  }

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#1e1b4b" />

      {/* TOP BAR */}
      <View style={styles.topBar}>
        {selectMode ? (
          <>
            <TouchableOpacity
              onPress={() => {
                setSelectMode(false)
                setSelectedIds(new Set())
              }}
              style={styles.iconBtn}
            >
              <Ionicons name="close" size={22} color="#2563eb" />
            </TouchableOpacity>
            <Text style={styles.title}>
              {selectedIds.size} selected
            </Text>
            {selectedIds.size > 0 && (
              <TouchableOpacity
                onPress={confirmBulkDelete}
                style={styles.iconBtn}
              >
                <Ionicons name="trash" size={20} color="#ef4444" />
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.iconBtn}
            >
              <Ionicons name="arrow-back" size={22} color="#2563eb" />
            </TouchableOpacity>
            <Text style={styles.title}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{unreadCount}</Text>
              </View>
            )}
            {notifications.length > 0 && (
              <TouchableOpacity
                onPress={() => setSelectMode(true)}
                style={styles.iconBtn}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={22}
                  color="#2563eb"
                />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* BODY */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <Ionicons
            name="notifications-off-outline"
            size={48}
            color="#cbd5e1"
          />
          <Text style={styles.emptyText}>No notifications yet.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#2563eb"]}
            />
          }
        >
          {notifications.map((n) => {
            const kind = getKind(n)
            const isUnread = n.readStatus === false || n.readStatus === 0
            const isSelected = selectedIds.has(String(n.id))
            const style = KIND_STYLE[kind]

            return (
              <TouchableOpacity
                key={n.id}
                onPress={() => handleTap(n)}
                onLongPress={() => {
                  if (!selectMode) {
                    setSelectMode(true)
                    toggleSelect(String(n.id))
                  }
                }}
                activeOpacity={0.75}
                style={[
                  styles.card,
                  isUnread && !selectMode && styles.unreadCard,
                  getBorderStyle(kind),
                  selectMode && isSelected && styles.selectedCard,
                ]}
              >
                <View style={styles.cardTop}>
                  <View style={styles.cardTopLeft}>
                    {selectMode && (
                      <View
                        style={[
                          styles.checkbox,
                          isSelected && styles.checkboxChecked,
                        ]}
                      >
                        {isSelected && (
                          <Ionicons name="checkmark" size={14} color="#fff" />
                        )}
                      </View>
                    )}
                    <Text style={[styles.badge, getBadgeStyle(kind)]}>
                      {style.label}
                    </Text>
                    {isUnread && !selectMode && (
                      <View style={styles.unreadDot} />
                    )}
                    {n._studentName && (
                      <Text style={styles.studentTag}>{n._studentName}</Text>
                    )}
                  </View>
                  {!selectMode && (
                    <TouchableOpacity
                      onPress={() => confirmDelete(n.id)}
                      style={styles.deleteBtn}
                      hitSlop={8}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color="#ef4444"
                      />
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.message}>{n.message}</Text>

                <Text style={styles.time}>
                  {new Date(n.createdAt).toLocaleString()}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f4f6f8" },
  topBar: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: HEADER_TOP,
    paddingBottom: 16,
    elevation: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: "700", color: "#1e293b", flex: 1 },
  countBadge: {
    backgroundColor: "#ef4444",
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 3,
    minWidth: 24,
    alignItems: "center",
  },
  countBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },
  loadingText: { color: "#64748b", marginTop: 8 },
  emptyText: { fontSize: 15, color: "#94a3b8" },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderLeftWidth: 4,
  },
  unreadCard: { backgroundColor: "#fff" },
  selectedCard: {
    backgroundColor: "#eff6ff",
    borderColor: "#60a5fa",
    borderWidth: 1.5,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardTopLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  badge: {
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    overflow: "hidden",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
  },
  studentTag: { fontSize: 11, color: "#64748b", marginLeft: 2 },
  deleteBtn: { padding: 4 },
  message: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 20,
    marginBottom: 8,
  },
  time: { fontSize: 11, color: "#94a3b8" },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
})