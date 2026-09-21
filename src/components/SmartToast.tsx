import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import {
    Animated,
    Dimensions,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const HEADER_TOP =
  Platform.OS === "android" ? (StatusBar.currentHeight || 24) + 8 : 48;

const WIDTH = Dimensions.get("window").width;

export interface ToastData {
  id: string;
  title: string;
  message: string;
  type: "attendance" | "academic" | "fee" | "info";
  onPress?: () => void;
}

const TYPE_STYLE: Record<
  string,
  { color: string; bg: string; icon: any; label: string }
> = {
  attendance: {
    color: "#2563eb",
    bg: "#dbeafe",
    icon: "calendar",
    label: "Attendance",
  },
  academic: {
    color: "#7c3aed",
    bg: "#ede9fe",
    icon: "document-text",
    label: "Academic",
  },
  fee: {
    color: "#059669",
    bg: "#d1fae5",
    icon: "cash",
    label: "Fee",
  },
  info: {
    color: "#4f46e5",
    bg: "#e0e7ff",
    icon: "information-circle",
    label: "Notification",
  },
};

export function SmartToast({
  toast,
  onDismiss,
}: {
  toast: ToastData | null;
  onDismiss: () => void;
}) {
  const translateY = useRef(new Animated.Value(-200)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!toast) return;

    // ✅ Reset position so the next toast slides in from the top again
    translateY.setValue(-200);
    opacity.setValue(0);

    // Slide in
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-hide in 4.5s
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      hide();
    }, 4500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast?.id]);

  function hide() {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -200,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  }

  if (!toast) return null;

  const style = TYPE_STYLE[toast.type] || TYPE_STYLE.info;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrap, { transform: [{ translateY }], opacity }]}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          toast.onPress?.();
          hide();
        }}
        style={[styles.card, { borderLeftColor: style.color }]}
      >
        <View style={[styles.iconWrap, { backgroundColor: style.bg }]}>
          <Ionicons name={style.icon} size={22} color={style.color} />
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.topRow}>
            <Text style={[styles.tag, { color: style.color }]}>
              {style.label}
            </Text>
            <Text style={styles.time}>now</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {toast.title}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {toast.message}
          </Text>
        </View>

        <TouchableOpacity onPress={hide} style={styles.closeBtn} hitSlop={10}>
          <Ionicons name="close" size={18} color="#94a3b8" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: HEADER_TOP,
    left: 12,
    right: 12,
    zIndex: 9999,
    elevation: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 12,
    paddingRight: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderLeftWidth: 5,
    shadowColor: "#0f172a",
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    minWidth: WIDTH - 24,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  tag: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  time: { fontSize: 10, color: "#94a3b8" },
  title: { fontSize: 14, fontWeight: "800", color: "#0f172a" },
  message: {
    fontSize: 12.5,
    color: "#475569",
    marginTop: 2,
    lineHeight: 17,
  },
  closeBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});