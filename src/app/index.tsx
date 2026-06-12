import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { router } from "expo-router";
import { View, Text } from "react-native";

export default function Home() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
    } else {
      router.replace("/parent");
    }
  }, [user, loading]);

  return (
    <View>
      <Text>Loading...</Text>
    </View>
  );
}