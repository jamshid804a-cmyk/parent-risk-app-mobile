import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState } from "react";
import { AppState } from "react-native";

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
  forceRefresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => ({ success: false }),
  logout: async () => {},
  loading: true,
  addStudentToContext: async () => {},
  refreshUser: async () => {},
  forceRefresh: async () => {},
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
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        console.log("✅ User loaded from storage:", parsedUser);
      }
    } catch (error) {
      console.log("Failed to load user:", error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (phone: string, password: string) => {
    try {
      console.log("🔐 Attempting login for:", phone);
      
      const res = await fetch(`${BASE_URL}/api/parent/login`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-cache"
        },
        body: JSON.stringify({ phone, password }),
      });

      const data = await res.json();
      console.log("📥 Login response:", data);

      if (!res.ok) {
        return { success: false, error: data.error || "Login failed" };
      }

      const newUser: User = {
        parentId: data.parentId,
        students: data.students || [],
        phone: phone,
      };

      console.log("👤 User data:", newUser);
      console.log("📚 Students count:", newUser.students.length);

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
    console.log("🚪 User logged out");
  };

  // ✅ Add student to context instantly
  const addStudentToContext = async (newStudent: Student) => {
    if (!user) {
      console.log("⚠️ No user found, cannot add student");
      return;
    }
    
    console.log("➕ Adding student to context:", newStudent.name);
    
    // Check if student already exists to avoid duplicates
    const studentExists = user.students.some(s => s.id === newStudent.id);
    if (studentExists) {
      console.log("⚠️ Student already exists, skipping...");
      return;
    }

    const updatedUser: User = {
      ...user,
      students: [...user.students, newStudent],
    };

    setUser(updatedUser);
    await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
    console.log("✅ Student added, total:", updatedUser.students.length);
  };

  // ✅ REFRESH USER - Fetch fresh data from server with no cache
  const refreshUser = async () => {
    if (!user) {
      console.log("⚠️ No user to refresh");
      return;
    }

    try {
      console.log("🔄 Refreshing user data from server...");
      console.log("📱 Parent ID:", user.parentId);

      // 🔥 Fetch from server with timestamp to prevent caching
      const res = await fetch(`${BASE_URL}/api/parent/${user.parentId}/students?t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        }
      });

      if (!res.ok) {
        console.log("❌ Refresh failed with status:", res.status);
        
        // 🔥 Fallback: Load from storage if server fails
        console.log("⚠️ Falling back to storage data...");
        const storedUser = await AsyncStorage.getItem("user");
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          console.log("✅ User reloaded from storage:", parsedUser);
          console.log("📚 Students from storage:", parsedUser.students.length);
        }
        return;
      }

      const data = await res.json();
      console.log("📥 Refresh response:", data);

      const updatedUser: User = {
        parentId: user.parentId,
        students: data.students || [],
        phone: user.phone,
      };

      console.log("📚 Students after refresh:", updatedUser.students.length);
      console.log("👤 Student names:", updatedUser.students.map(s => s.name));

      setUser(updatedUser);
      await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
      console.log("✅ User refreshed successfully");
    } catch (error) {
      console.log("❌ Failed to refresh user:", error);
      
      // 🔥 Fallback: Load from storage on error
      try {
        const storedUser = await AsyncStorage.getItem("user");
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          console.log("✅ User reloaded from storage after error");
        }
      } catch (storageError) {
        console.log("❌ Failed to load from storage:", storageError);
      }
    }
  };

  // ✅ FORCE REFRESH - More aggressive refresh
  const forceRefresh = async () => {
    console.log("💪 Force refreshing...");
    await refreshUser();
  };

  // 🔥 Refresh user when app comes back to foreground
  useEffect(() => {
    const refreshOnFocus = async () => {
      if (user) {
        console.log("📱 App focused, refreshing...");
        await refreshUser();
      }
    };

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        refreshOnFocus();
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, [user]);

  return (
    <AuthContext.Provider
      value={{ 
        user, 
        login, 
        logout, 
        loading, 
        addStudentToContext, 
        refreshUser,
        forceRefresh 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);