import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";

const BASE_URL = "https://parentriskapp-backend.vercel.app";

export default function Performance() {
  const { user } = useAuth();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStudent = async () => {
    try {
      console.log("LOGGED IN USER:", JSON.stringify(user));

      const response = await fetch(
        `${BASE_URL}/api/parent/student?studentId=${user?.studentId}&parentId=${user?.parentId}`
      );

      const data = await response.json();
      console.log("API DATA:", JSON.stringify(data));

      if (data && data.success && data.data) {
        const myChild = data.data;
        setStudent({
          name: myChild.name,
          rollNo: myChild.id,
          semester: myChild.grade,
          gpa: myChild.gpa,
          cgpa: parseFloat(myChild.cgpa),
          risk: parseFloat(myChild.cgpa) < 2.5 ? "at-risk" : "good",
        });
      }
    } catch (error) {
      console.log("Fetch Error:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchStudent();
    else setLoading(false);
  }, [user]);

  if (loading) {
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
        <Text style={{ color: "#6b7280", fontSize: 13, marginTop: 8, textAlign: "center" }}>
          studentId: {String(user?.studentId)} {"\n"}
          parentId: {String(user?.parentId)}
        </Text>
      </View>
    );
  }

  const isRisk = student.cgpa < 2.5;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f0f4ff", padding: 15 }}>
      <View style={{
        backgroundColor: "#4f46e5",
        padding: 25,
        borderRadius: 24,
        marginTop: 40,
        elevation: 6,
      }}>
        <Text style={{ fontSize: 24, color: "white", fontWeight: "800" }}>
          📘 Academic Performance
        </Text>
        <Text style={{ color: "#c7d2fe", marginTop: 6, fontSize: 13 }}>
          Student Report Card Overview
        </Text>
      </View>

      <View style={{
        backgroundColor: "white",
        padding: 20,
        borderRadius: 20,
        marginTop: 15,
        elevation: 3,
        borderLeftWidth: 5,
        borderLeftColor: "#4f46e5",
      }}>
        <Text style={{ fontSize: 16, fontWeight: "800", marginBottom: 12, color: "#1e1b4b" }}>
          👤 Student Information
        </Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
          <Text style={{ color: "#6b7280", fontSize: 14 }}>Name</Text>
          <Text style={{ fontWeight: "700", color: "#111827" }}>{student.name}</Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
          <Text style={{ color: "#6b7280", fontSize: 14 }}>Roll No</Text>
          <Text style={{ fontWeight: "700", color: "#111827" }}>{student.rollNo}</Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ color: "#6b7280", fontSize: 14 }}>Semester</Text>
          <Text style={{ fontWeight: "700", color: "#111827" }}>{student.semester}</Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", marginTop: 15, gap: 10 }}>
        <View style={{
          flex: 1,
          backgroundColor: "#4f46e5",
          padding: 20,
          borderRadius: 20,
          alignItems: "center",
          elevation: 4,
        }}>
          <Text style={{ color: "#c7d2fe", fontSize: 13 }}>GPA</Text>
          <Text style={{ color: "white", fontSize: 32, fontWeight: "800" }}>{student.gpa}</Text>
          <Text style={{ color: "#c7d2fe", fontSize: 12 }}>This Semester</Text>
        </View>
        <View style={{
          flex: 1,
          backgroundColor: "#0ea5e9",
          padding: 20,
          borderRadius: 20,
          alignItems: "center",
          elevation: 4,
        }}>
          <Text style={{ color: "#e0f2fe", fontSize: 13 }}>CGPA</Text>
          <Text style={{ color: "white", fontSize: 32, fontWeight: "800" }}>{student.cgpa}</Text>
          <Text style={{ color: "#e0f2fe", fontSize: 12 }}>Cumulative</Text>
        </View>
      </View>

      <View style={{
        backgroundColor: isRisk ? "#fef2f2" : "#f0fdf4",
        padding: 20,
        borderRadius: 20,
        marginTop: 15,
        elevation: 2,
        borderLeftWidth: 5,
        borderLeftColor: isRisk ? "#dc2626" : "#16a34a",
        marginBottom: 30,
      }}>
        <Text style={{
          fontSize: 16,
          fontWeight: "800",
          color: isRisk ? "#dc2626" : "#16a34a",
          marginBottom: 8,
        }}>
          {isRisk ? "⚠️ At Risk - Needs Improvement" : "🌟 Excellent Performance!"}
        </Text>
        <Text style={{
          fontSize: 14,
          color: isRisk ? "#dc2626" : "#16a34a",
          lineHeight: 22,
        }}>
          {isRisk
            ? "CGPA is below 2.5. Please contact your academic advisor immediately."
            : "Keep up the great work! Study daily and continue improving."}
        </Text>
      </View>
    </ScrollView>
  );
}