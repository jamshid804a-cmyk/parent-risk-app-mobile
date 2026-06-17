const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

const app = express();

app.use(cors());
app.use(express.json());

// =========================
// MYSQL CONNECTION (FIXED)
// =========================
const db = mysql.createPool({
  MYSQLHOST: "mysql.railway.internal",
  MYSQLUSER: "root",
  MYSQLPASSWORD: "zoqaEdIiQnZvgsbggFowIUvGWDZXlRJk",
  MYSQLDATABASE: "railway",
  MYSQLPORT: 3306,
  waitForConnections: true,
  connectionLimit: 10,
}).promise();

// =========================
// LOGIN API
// =========================
app.post("/api/parent/login", async (req, res) => {
  const { phone, password } = req.body;

  try {
    console.log("LOGIN ATTEMPT:", phone);

    // 1. CHECK STUDENT FIRST
    const [studentRows] = await db.query(
      "SELECT * FROM students WHERE contact = ?",
      [phone]
    );

    if (!studentRows || studentRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No student found with this number",
      });
    }

    const student = studentRows[0];

    // 2. CHECK PARENT
    const [parentRows] = await db.query(
      "SELECT * FROM parents WHERE phone = ?",
      [phone]
    );

    let parent;

    if (!parentRows || parentRows.length === 0) {
      // AUTO CREATE PARENT
      const [insertResult] = await db.query(
        "INSERT INTO parents (phone, password, studentId) VALUES (?, ?, ?)",
        [phone, password || "123456", student.id]
      );

      parent = {
        id: insertResult.insertId,
        phone,
        studentId: student.id,
      };

      console.log("AUTO PARENT CREATED:", parent.id);
    } else {
      parent = parentRows[0];

      // password check
      if (parent.password !== password) {
        return res.status(401).json({
          success: false,
          error: "Invalid credentials",
        });
      }
    }

    // 3. GET STUDENT DATA (SAFE)
    const [studentData] = await db.query(
      `
      SELECT 
        s.id,
        s.name,
        s.grade,
        s.gpa,
        s.cgpa,
        s.risk,
        COALESCE(
          ROUND(
            (SUM(CASE WHEN a.present = 1 THEN 1 ELSE 0 END) / NULLIF(COUNT(a.id), 0)) * 100,
            0
          ),
          100
        ) AS attendancePercent
      FROM students s
      LEFT JOIN attendance a ON s.id = a.studentId
      WHERE s.id = ?
      GROUP BY s.id, s.name, s.grade, s.gpa, s.cgpa, s.risk
      `,
      [student.id]
    );

    // RESPONSE
    return res.json({
      success: true,
      parentId: parent.id,
      students: studentData || [],
      phone,
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// =========================
// SERVER START
// =========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});

module.exports = app;