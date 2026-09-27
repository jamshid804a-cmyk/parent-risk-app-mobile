import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useTheme } from "../src/context/ThemeContext";
import {
    getSoundMap,
    isSoundEnabled,
    NOTIF_LABELS,
    NotifType,
    previewSound,
    setSoundEnabled,
    setSoundFor,
    SOUND_LABELS,
    SoundKey,
    SoundMap,
} from "../src/utils/sound";

const HEADER_TOP =
  Platform.OS === "android" ? (StatusBar.currentHeight || 24) + 10 : 54;

const TYPES: NotifType[] = ["attendance", "test", "examination", "fee"];
const SOUNDS: SoundKey[] = ["notification1", "notification2", "notification3"];

export default function SettingsScreen() {
  const { theme, colors, toggleTheme, ready } = useTheme();
  const [soundMap, setSoundMapState] = useState<SoundMap | null>(null);
  const [soundOn, setSoundOnState] = useState(true);

  useEffect(() => {
    (async () => {
      setSoundMapState(await getSoundMap());
      setSoundOnState(await isSoundEnabled());
    })();
  }, []);

  async function pickSound(type: NotifType, key: SoundKey) {
    await setSoundFor(type, key);
    setSoundMapState(await getSoundMap());
    await previewSound(key);
  }

  async function toggleSound(v: boolean) {
    setSoundOnState(v);
    await setSoundEnabled(v);
  }

  if (!ready || !soundMap) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.safe, { backgroundColor: colors.bg }]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.headerBg}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={[
            styles.hero,
            { backgroundColor: colors.headerBg, paddingTop: HEADER_TOP },
          ]}
        >
          <View style={styles.topRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.roundBtn}
            >
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.topTitle}>Settings</Text>
            <View style={{ width: 42 }} />
          </View>
          <Text style={styles.heroName}>Preferences</Text>
          <Text style={styles.heroSub}>
            Theme & notification sound
          </Text>
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: -30 }}>
          {/* THEME CARD */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.line },
            ]}
          >
            <View style={styles.row}>
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: theme === "dark" ? "#1e293b" : "#e0e7ff" },
                ]}
              >
                <Ionicons
                  name={theme === "dark" ? "moon" : "sunny"}
                  size={22}
                  color={colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.ink }]}>
                  {theme === "dark" ? "Dark Mode" : "Light Mode"}
                </Text>
                <Text style={[styles.sub, { color: colors.sub }]}>
                  Tap to switch theme
                </Text>
              </View>
              <Switch
                value={theme === "dark"}
                onValueChange={toggleTheme}
                trackColor={{ false: "#cbd5e1", true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* SOUND ON/OFF CARD */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.line },
            ]}
          >
            <View style={styles.row}>
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: soundOn ? "#d1fae5" : "#fee2e2" },
                ]}
              >
                <Ionicons
                  name={soundOn ? "volume-high" : "volume-mute"}
                  size={22}
                  color={soundOn ? colors.success : colors.danger}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.ink }]}>
                  Notification Sound
                </Text>
                <Text style={[styles.sub, { color: colors.sub }]}>
                  {soundOn ? "Sound is ON" : "Sound is OFF"}
                </Text>
              </View>
              <Switch
                value={soundOn}
                onValueChange={toggleSound}
                trackColor={{ false: "#cbd5e1", true: colors.success }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* PER-TYPE SOUND SECTIONS */}
          <Text
            style={[
              styles.sectionHeading,
              { color: colors.ink, marginTop: 18 },
            ]}
          >
            Sound for each notification
          </Text>

          {TYPES.map((type) => (
            <View
              key={type}
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.line },
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.ink }]}>
                {NOTIF_LABELS[type]}
              </Text>

              <View style={styles.soundRow}>
                {SOUNDS.map((key) => {
                  const selected = soundMap[type] === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => pickSound(type, key)}
                      style={[
                        styles.soundBtn,
                        {
                          backgroundColor: selected
                            ? colors.primary
                            : colors.cardAlt,
                          borderColor: selected
                            ? colors.primary
                            : colors.line,
                        },
                      ]}
                    >
                      <Ionicons
                        name={selected ? "checkmark-circle" : "musical-notes"}
                        size={16}
                        color={selected ? "#fff" : colors.sub}
                      />
                      <Text
                        style={[
                          styles.soundBtnText,
                          { color: selected ? "#fff" : colors.ink },
                        ]}
                      >
                        {SOUND_LABELS[key]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}

          {/* INFO */}
          <View
            style={[
              styles.infoCard,
              { backgroundColor: colors.cardAlt, borderColor: colors.line },
            ]}
          >
            <Ionicons
              name="information-circle"
              size={20}
              color={colors.primary}
            />
            <Text style={[styles.infoText, { color: colors.sub }]}>
              Tap any sound to hear a preview. Your choice is saved
              automatically and used for future notifications.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  hero: {
    paddingHorizontal: 20,
    paddingBottom: 42,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
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
  heroSub: { fontSize: 13, color: "#c7d2fe", marginTop: 6 },

  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 15, fontWeight: "700" },
  sub: { fontSize: 12, marginTop: 2 },

  sectionHeading: {
    fontSize: 14,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  cardTitle: { fontSize: 15, fontWeight: "800", marginBottom: 10 },

  soundRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  soundBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  soundBtnText: { fontSize: 13, fontWeight: "700" },

  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginTop: 6,
  },
  infoText: { flex: 1, fontSize: 12.5, lineHeight: 18 },
});