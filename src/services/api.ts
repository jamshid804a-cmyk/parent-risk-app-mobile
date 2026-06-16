// ✅ Use your MOBILE BACKEND URL, not the website URL
const BASE_URL = "https://parent-risk-app-mobile-production-30bb.up.railway.app";

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
