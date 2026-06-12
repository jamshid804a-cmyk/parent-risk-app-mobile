import { useState } from "react";
import {
  StyleSheet, Text, TextInput,
  TouchableOpacity, View, Alert, ActivityIndicator
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert("Error", "Please enter phone and password");
      return;
    }
    setLoading(true);
    const result = await login(phone, password);
    setLoading(false);

    if (result.success) {
      router.replace("/parent");
    } else {
      Alert.alert("Login Failed", result.error || "Invalid credentials");
    }
  };

  return (
    <View style={styles.container}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>🎓</Text>
      </View>

      <Text style={styles.title}>Parent Portal</Text>
      <Text style={styles.subtitle}>Monitor your child's academic performance</Text>

      {/* Phone Input */}
      <TextInput
        style={styles.input}
        placeholder="Phone Number"
        placeholderTextColor="#9ca3af"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      {/* Password Input */}
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#9ca3af"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {/* Login Button */}
      <TouchableOpacity
        style={[styles.loginButton, loading && { opacity: 0.7 }]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="white" />
          : <Text style={styles.loginButtonText}>Login</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
  },
  logoContainer: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: "#2563eb",
    justifyContent: "center", alignItems: "center",
    elevation: 8,
  },
  logo: { fontSize: 55 },
  title: {
    marginTop: 35, fontSize: 32,
    fontWeight: "700", color: "#111827", textAlign: "center",
  },
  subtitle: {
    marginTop: 12, fontSize: 16,
    color: "#6b7280", textAlign: "center", lineHeight: 24,
  },
  input: {
    width: "100%", backgroundColor: "#fff",
    borderWidth: 1, borderColor: "#e5e7eb",
    borderRadius: 14, padding: 16,
    fontSize: 16, color: "#111827", marginTop: 16,
  },
  loginButton: {
    backgroundColor: "#2563eb", width: "100%",
    paddingVertical: 18, borderRadius: 18,
    marginTop: 24, elevation: 6,
  },
  loginButtonText: {
    color: "white", fontSize: 18,
    fontWeight: "700", textAlign: "center",
  },
});