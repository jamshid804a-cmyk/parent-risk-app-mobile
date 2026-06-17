const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

const app = express();

// =========================
// MIDDLEWARE
// =========================
app.use(cors());
app.use(express.json());

// =========================
// DATABASE (RAILWAY SAFE)
// =========================
const db = mysql.createPool({
  host: process.env.MYSQLHOST || "MySQL.railway.internal",
  port: process.env.MYSQLPORT || 3306,
  user: process.env.MYSQLUSER || "root",
  password: process.env.MYSQLPASSWORD || "password",
  database: process.env.MYSQLDATABASE || "railway",
  waitForConnections: true,
  connectionLimit: 10,
}).promise();

// =========================
// LOGIN API (MAIN LOGIC)
// =========================
app.post("/api/parent/login", async (req, res) => {
  const { phone, password } = req.body;

  try {
    console.log("LOGIN ATTEMPT:", phone);

    // 1. FIND STUDENT BY CONTACT
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

    // 2. CHECK IF PARENT EXISTS
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

      // PASSWORD CHECK ONLY IF EXISTING PARENT
      if (parent.password !== password) {
        return res.status(401).json({
          success: false,
          error: "Invalid credentials",
        });
      }
    }

    // 3. GET STUDENT DATA (SAFE VERSION)
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

    // 4. RESPONSE
    return res.json({
      success: true,
      parentId: parent.id,
      student: studentData?.[0] || null,
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
// START SERVER
// =========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});

module.exports = app;