import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";

export default function Performance() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    if (user?.students) {
      setStudents(user.students);
      setLoading(false);
    }
  }, [user]);

  if (authLoading || loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={{ marginTop: 10, color: "#6b7280" }}>Loading...</Text>
      </View>
    );
  }

  if (!students || students.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
        <Text style={{ color: "#dc2626", fontSize: 16, fontWeight: "700", textAlign: "center" }}>
          No Student Data Found
        </Text>
      </View>
    );
  }

  // Filter only at-risk students for warning
  const atRiskStudents = students.filter(s => (s.cgpa || 0) < 2.5);

  const renderStudent = ({ item: student }: { item: any }) => {
    const isRisk = (student.cgpa || 0) < 2.5;
    return (
      <View style={{
        backgroundColor: "white",
        padding: 20,
        borderRadius: 20,
        marginTop: 15,
        elevation: 3,
        borderLeftWidth: 5,
        borderLeftColor: isRisk ? "#dc2626" : "#4f46e5",
      }}>
        <Text style={{ fontSize: 16, fontWeight: "800", marginBottom: 12, color: "#1e1b4b" }}>
          👤 {student.name}
        </Text>
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
            {student.cgpa} {isRisk && "⚠️"}
          </Text>
        </View>
      </View>
    );
  };

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
          {students.length} Student{students.length > 1 ? 's' : ''} • {atRiskStudents.length} At Risk
        </Text>
      </View>

      {atRiskStudents.length > 0 && (
        <View style={{
          backgroundColor: "#fef2f2",
          padding: 20,
          borderRadius: 20,
          marginTop: 15,
          borderLeftWidth: 5,
          borderLeftColor: "#dc2626",
        }}>
          <Text style={{ fontSize: 16, fontWeight: "800", color: "#dc2626", marginBottom: 8 }}>
            ⚠️ {atRiskStudents.length} Student{atRiskStudents.length > 1 ? 's' : ''} Need Attention
          </Text>
          <Text style={{ fontSize: 14, color: "#dc2626", lineHeight: 22 }}>
            CGPA is below 2.5. Please contact academic advisor.
          </Text>
        </View>
      )}

      <FlatList
        data={students}
        renderItem={renderStudent}
        keyExtractor={(item) => item.id.toString()}
        scrollEnabled={false}
      />
    </ScrollView>
  );
}