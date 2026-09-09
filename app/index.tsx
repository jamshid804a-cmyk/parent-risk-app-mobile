import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import { useAuth } from "../src/context/AuthContext";

export default function Home() {
  const { user, loading, refreshUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  // Auto-refresh when user changes
  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
    } else {
      // Check if user has students, if not, try to refresh
      if (user.students && user.students.length === 0) {
        refreshUser?.(); // Refresh user data to get latest students
      }
      router.replace("/parent");
    }
  }, [user, loading]);

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (user) {
      await refreshUser?.();
    }
    setRefreshing(false);
  }, [user, refreshUser]);

  // If loading, show loading indicator
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 10 }}>Loading...</Text>
      </View>
    );
  }

  // If no user, we'll redirect to login
  if (!user) {
    return null;
  }

  return (
    <ScrollView
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={["#2563eb"]}
        />
      }
      contentContainerStyle={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
    >
      <ActivityIndicator size="large" color="#2563eb" />
      <Text style={{ marginTop: 10 }}>Loading...</Text>
    </ScrollView>
  );
}