import { router } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { useAuth } from "../src/context/AuthContext";

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