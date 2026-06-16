import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

type Student = {
  id: number;
  name: string;
  grade: string;
  gpa: number;
  cgpa: number;
  risk: string;
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
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => ({ success: false }),
  logout: async () => {},
  loading: true,
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
      // ✅ CORRECTED URL: /api/login (not /api/parent/login)
      const res = await fetch(`${BASE_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });

      const data = await res.json();

      if (!res.ok) return { success: false, error: data.error || "Invalid credentials" };

      console.log("Login response:", JSON.stringify(data, null, 2));

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

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
