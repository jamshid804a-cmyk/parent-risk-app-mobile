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
  requestOtp: (phone: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (phone: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  requestOtp: async () => ({ success: false }),
  verifyOtp: async () => ({ success: false }),
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

  // ✅ Request OTP
  const requestOtp = async (phone: string) => {
    try {
      const res = await fetch(`${BASE_URL}/api/parent/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || "Failed to send OTP" };

      return { success: true };
    } catch (error) {
      console.log("Request OTP error:", error);
      return { success: false, error: "Cannot connect to server. Check your WiFi." };
    }
  };

  // ✅ Verify OTP
  const verifyOtp = async (phone: string, otp: string) => {
    try {
      const res = await fetch(`${BASE_URL}/api/parent/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp }),
      });

      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || "Invalid OTP" };

      const newUser: User = {
        parentId: data.parentId,
        students: data.students || [],
        phone,
      };

      setUser(newUser);
      await AsyncStorage.setItem("user", JSON.stringify(newUser));
      return { success: true };
    } catch (error) {
      console.log("Verify OTP error:", error);
      return { success: false, error: "Cannot connect to server. Check your WiFi." };
    }
  };

  const logout = async () => {
    setUser(null);
    await AsyncStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider value={{ user, requestOtp, verifyOtp, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
