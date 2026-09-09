import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../src/context/AuthContext";

export default function Performance() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const { studentId } = useLocalSearchParams();
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.students) {
      const sid = studentId ? parseInt(studentId as string, 10) : user.students[0]?.id;
      const found = user.students.find((s: any) => s.id === sid);
      setStudent(found || user.students[0]);
      setLoading(false);
    }
  }, [user, studentId]);

  async function onRefresh() {
    setRefreshing(true);
    await refreshUser();
    setRefreshing(false);
  }

  if (authLoading || loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={{ marginTop: 10, color: "#6b7280" }}>Loading...</Text>
      </View>
    );
  }

  if (!student) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
        <Text style={{ color: "#dc2626", fontSize: 16, fontWeight: "700", textAlign: "center" }}>
          No Student Data Found
        </Text>
      </View>
    );
  }

  const isRisk = parseFloat(student.cgpa) < 2.5;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f0f4ff", padding: 15 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4f46e5"]} />}
    >
      {/* TOP BAR */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 40, marginBottom: 10 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="arrow-back" size={22} color="#4f46e5" />
          <Text style={{ color: "#4f46e5", fontWeight: "600" }}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onRefresh} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="refresh" size={22} color="#4f46e5" />
          <Text style={{ color: "#4f46e5", fontWeight: "600" }}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* HEADER */}
      <View style={{ backgroundColor: "#4f46e5", padding: 25, borderRadius: 24, elevation: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Ionicons name="book" size={28} color="white" />
          <Text style={{ fontSize: 24, color: "white", fontWeight: "800" }}>Academic Performance</Text>
        </View>
        <Text style={{ color: "#c7d2fe", marginTop: 6, fontSize: 13 }}>
          {student.name} - {student.grade}
        </Text>
      </View>

      {/* STUDENT INFO */}
      <View style={{ backgroundColor: "white", padding: 20, borderRadius: 20, marginTop: 15, elevation: 3, borderLeftWidth: 5, borderLeftColor: isRisk ? "#dc2626" : "#4f46e5" }}>
        <Text style={{ fontSize: 16, fontWeight: "800", marginBottom: 12, color: "#1e1b4b" }}>Student Information</Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
          <Text style={{ color: "#6b7280", fontSize: 14 }}>Name</Text>
          <Text style={{ fontWeight: "700", color: "#111827" }}>{student.name}</Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
          <Text style={{ color: "#6b7280", fontSize: 14 }}>Roll No</Text>
          <Text style={{ fontWeight: "700", color: "#111827" }}>{student.id}</Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
          <Text style={{ color: "#6b7280", fontSize: 14 }}>Semester</Text>
          <Text style={{ fontWeight: "700", color: "#111827" }}>{student.grade}</Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
          <Text style={{ color: "#6b7280", fontSize: 14 }}>GPA</Text>
          <Text style={{ fontWeight: "700", color: "#111827" }}>{student.gpa}</Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ color: "#6b7280", fontSize: 14 }}>CGPA</Text>
          <Text style={{ fontWeight: "700", color: isRisk ? "#dc2626" : "#111827" }}>
            {student.cgpa} {isRisk ? "⚠️" : "✅"}
          </Text>
        </View>
      </View>

      {/* GPA CARDS */}
      <View style={{ flexDirection: "row", marginTop: 15, gap: 10 }}>
        <View style={{ flex: 1, backgroundColor: "#4f46e5", padding: 20, borderRadius: 20, alignItems: "center", elevation: 4 }}>
          <Ionicons name="trending-up" size={20} color="#c7d2fe" />
          <Text style={{ color: "#c7d2fe", fontSize: 13, marginTop: 4 }}>GPA</Text>
          <Text style={{ color: "white", fontSize: 32, fontWeight: "800" }}>{student.gpa}</Text>
          <Text style={{ color: "#c7d2fe", fontSize: 12 }}>This Semester</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: "#0ea5e9", padding: 20, borderRadius: 20, alignItems: "center", elevation: 4 }}>
          <Ionicons name="school" size={20} color="#e0f2fe" />
          <Text style={{ color: "#e0f2fe", fontSize: 13, marginTop: 4 }}>CGPA</Text>
          <Text style={{ color: "white", fontSize: 32, fontWeight: "800" }}>{student.cgpa}</Text>
          <Text style={{ color: "#e0f2fe", fontSize: 12 }}>Cumulative</Text>
        </View>
      </View>

      {/* RISK MESSAGE */}
      <View style={{
        backgroundColor: isRisk ? "#fef2f2" : "#f0fdf4",
        padding: 20,
        borderRadius: 20,
        marginTop: 15,
        borderLeftWidth: 5,
        borderLeftColor: isRisk ? "#dc2626" : "#16a34a",
        marginBottom: 30,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Ionicons name={isRisk ? "warning" : "checkmark-circle"} size={20} color={isRisk ? "#dc2626" : "#16a34a"} />
          <Text style={{ fontSize: 16, fontWeight: "800", color: isRisk ? "#dc2626" : "#16a34a" }}>
            {isRisk ? "Academic Risk - Action Required" : "Good Performance!"}
          </Text>
        </View>
        <Text style={{ fontSize: 14, color: isRisk ? "#dc2626" : "#16a34a", lineHeight: 22 }}>
          {isRisk
            ? `Dear Parent, your child ${student.name} is academically at risk with a CGPA of ${student.cgpa}. This is below the required 2.5 threshold. Please meet with the academic advisor as soon as possible.`
            : `Dear Parent, your child ${student.name} is performing well with a CGPA of ${student.cgpa}. Keep encouraging them!`}
        </Text>
      </View>
    </ScrollView>
  );
}
