import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { createContext, useContext, useEffect, useRef, useState } from "react";

type Student = {
  id: number;
  name: string;
  fatherName?: string;
  grade?: string;
  section?: string;
  session?: string;
  admissionNo?: string;
  rollNo?: number | null;
  contact?: string;
  attendancePercent?: number;
};

type User = {
  parentId: string;
  students: Student[];
  phone: string;
  password: string;
};

type AuthContextType = {
  user: User | null;
  login: (phone: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  loading: boolean;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => ({ success: false }),
  logout: async () => {},
  loading: true,
  refreshUser: async () => {},
});

const BASE_URL = "https://parentriskapp-backend.vercel.app";

// Detect if running inside Expo Go — expo-notifications is unsupported there.
function isExpoGo(): boolean {
  return (
    Constants.appOwnership === "expo" ||
    Constants.executionEnvironment === "storeClient"
  );
}

// Lazy-load expo-notifications so it never crashes Expo Go at boot.
let NotificationsModule: any = null;
function loadNotifications(): any {
  if (NotificationsModule) return NotificationsModule;
  if (isExpoGo()) return null;
  try {
    NotificationsModule = require("expo-notifications");
    return NotificationsModule;
  } catch (e) {
    console.log("[push] module not available:", e);
    return null;
  }
}

async function registerPushToken(parentId: string) {
  const N = loadNotifications();
  if (!N) {
    console.log("[push] skipping — Expo Go or module missing");
    return;
  }

  try {
    const { status: existingStatus } = await N.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await N.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return;

    const projectId = Constants?.expoConfig?.extra?.eas?.projectId;
    const tokenData = await N.getExpoPushTokenAsync({ projectId });
    const pushToken = tokenData.data;

    await fetch(`${BASE_URL}/api/parent/push-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId, pushToken }),
    });
  } catch (e) {
    console.log("Push token registration failed:", e);
  }
}

export const AuthProvider = ({ children }: any) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<User | null>(null);
  userRef.current = user;

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem("user");
      if (storedUser) {
        const parsed: User = JSON.parse(storedUser);
        setUser(parsed);
        userRef.current = parsed;
        await refreshFromServer(parsed.phone, parsed.password);
        await registerPushToken(parsed.parentId);
      }
    } catch (error) {
      console.log("Failed to load user:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshFromServer = async (phone: string, password: string) => {
    try {
      const res = await fetch(`${BASE_URL}/api/parent/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (data.success) {
        const updatedUser: User = {
          parentId: data.parentId,
          students: data.students || [],
          phone: data.phone || phone,
          password,
        };
        setUser(updatedUser);
        userRef.current = updatedUser;
        await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.log("Failed to refresh from server:", error);
    }
  };

  const login = async (phone: string, password: string) => {
    try {
      const res = await fetch(`${BASE_URL}/api/parent/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Login failed" };
      }

      const newUser: User = {
        parentId: data.parentId,
        students: data.students || [],
        phone: data.phone || phone,
        password,
      };

      setUser(newUser);
      userRef.current = newUser;
      await AsyncStorage.setItem("user", JSON.stringify(newUser));
      await registerPushToken(newUser.parentId);
      return { success: true };
    } catch (error) {
      console.log("Login error:", error);
      return { success: false, error: "Cannot connect to server. Check your WiFi." };
    }
  };

  const refreshUser = async () => {
    const current = userRef.current;
    if (!current) return;
    await refreshFromServer(current.phone, current.password);
  };

  const logout = async () => {
    setUser(null);
    userRef.current = null;
    await AsyncStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);