const BASE_URL = "https://student-academic-performance-system.vercel.app";

export const getStudentData = async (studentId: number, parentId: number) => {
  try {
    const res = await fetch(
      `${BASE_URL}/api/parent/student?studentId=${studentId}&parentId=${parentId}`
    );
    return await res.json();
  } catch (error) {
    console.log("Error fetching student data:", error);
    return null;
  }
};