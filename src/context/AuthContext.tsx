import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

type Student = {
  id: number;
  name: string;
  grade: string;
  gpa: number;
  cgpa: number;
  risk: string;
  attendancePercent: number;
};

type User = {
  parentId: number;
  students: Student[];
  phone: string;
};

type AuthContextType = {
  user: User | null;
  login: (phone: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  loading: boolean;
  addStudentToContext: (newStudent: Student) => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => ({ success: false }),
  logout: async () => {},
  loading: true,
  addStudentToContext: async () => {},
  refreshUser: async () => {},
});

const BASE_URL = "https://parent-risk-app-mobile-production-30bb.up.railway.app";

export const AuthProvider = ({ children }: any) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem("user");
      if (storedUser) setUser(JSON.parse(storedUser));
    } catch (error) {
      console.log("Failed to load user:", error);
    } finally {
      setLoading(false);
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
      if (!res.ok) return { success: false, error: data.error || "Login failed" };

      const newUser: User = {
        parentId: data.parentId,
        students: data.students || [],
        phone,
      };

      setUser(newUser);
      await AsyncStorage.setItem("user", JSON.stringify(newUser));
      return { success: true };
    } catch (error) {
      console.log("Login error:", error);
      return { success: false, error: "Cannot connect to server. Check your WiFi." };
    }
  };

  const logout = async () => {
    setUser(null);
    await AsyncStorage.removeItem("user");
  };

  // ✅ Option A: Instantly add the new student to context (no network call needed)
  // Call this right after your "Add Student" API call succeeds, passing the
  // student object the server returned.
  const addStudentToContext = async (newStudent: Student) => {
    if (!user) return;
    const updatedUser: User = {
      ...user,
      students: [...user.students, newStudent],
    };
    setUser(updatedUser);
    await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
  };

  // ✅ Option B: Refetch the full parent+students list from the server
  // Use this if the "add student" endpoint doesn't return the new student
  // directly, or if you want to be 100% in sync with the backend.
  const refreshUser = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${BASE_URL}/api/parent/${user.parentId}`);
      if (!res.ok) return;
      const data = await res.json();

      const updatedUser: User = {
        parentId: user.parentId,
        students: data.students || [],
        phone: user.phone,
      };

      setUser(updatedUser);
      await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
    } catch (error) {
      console.log("Failed to refresh user:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, login, logout, loading, addStudentToContext, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);