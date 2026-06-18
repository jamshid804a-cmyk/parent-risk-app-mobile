import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../src/context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phone) {
      Alert.alert("Error", "Please enter phone number");
      return;
    }

    if (!password) {
      Alert.alert("Error", "Please enter password");
      return;
    }

    setLoading(true);

    // Ask backend to verify phone + password
    const result = await login(phone.trim(), password.trim());

    setLoading(false);

    if (result.success) {
      router.replace("/parent");
    } else {
      Alert.alert("Login Failed", result.error || "Invalid phone number or password");
    }
  };

  return (
    <View style={styles.container}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>🎓</Text>
      </View>

      <Text style={styles.title}>Parent Portal</Text>
      <Text style={styles.subtitle}>
        Monitor your child's academic performance
      </Text>

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

      {/* Login Button (below Password field) */}
      <TouchableOpacity
        style={[styles.loginButton, loading && { opacity: 0.7 }]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.loginButtonText}>Login</Text>
        )}
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
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
  },
  logo: { fontSize: 55 },

  title: {
    marginTop: 35,
    fontSize: 32,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },

  subtitle: {
    marginTop: 12,
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 24,
  },

  input: {
    width: "100%",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    marginTop: 16,
  },

  loginButton: {
    backgroundColor: "#2563eb",
    width: "100%",
    paddingVertical: 18,
    borderRadius: 18,
    marginTop: 24,
    elevation: 6,
  },

  loginButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
});