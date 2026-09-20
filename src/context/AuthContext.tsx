import AsyncStorage from "@react-native-async-storage/async-storage";
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
      return { success: true };
    } catch (error) {
      console.log("Login error:", error);
      return { success: false, error: "Cannot connect to server. Check your WiFi." };
    }
  };

  // ✅ Uses ref, so it always has the latest user
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