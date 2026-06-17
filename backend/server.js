const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createPool({
  host: "mysql.railway.internal",
  user: "root",
  password: "zoqaEdIiQnZvgsbggFowIUvGWDZXlRJk",
  database: "railway",
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
}).promise();

// ✅ OTP Request
app.post("/api/parent/request-otp", async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ success: false, error: "Phone required" });

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // TODO: Save OTP in DB/cache and send via SMS/WhatsApp
  console.log(`Generated OTP ${otp} for phone ${phone}`);

  res.json({ success: true });
});

// ✅ OTP Verify
app.post("/api/parent/verify-otp", async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ success: false, error: "Phone and OTP required" });

  // TODO: Validate OTP from DB/cache
  const isValid = true; // Replace with real check
  if (!isValid) return res.status(401).json({ success: false, error: "Invalid OTP" });

  try {
    const [studentRows] = await db.query("SELECT * FROM students WHERE contact = ?", [phone]);
    const students = studentRows || [];

    const [parentRows] = await db.query("SELECT * FROM parents WHERE phone = ?", [phone]);
    let parentId = parentRows.length ? parentRows[0].id : null;

    res.json({ success: true, parentId, students });
  } catch (err) {
    console.error("VERIFY OTP ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Existing login route
app.post("/api/parent/login", async (req, res) => {
  const { phone, password } = req.body;
  try {
    console.log("LOGIN ATTEMPT:", phone);

    const [studentRows] = await db.query("SELECT * FROM students WHERE contact = ?", [phone]);
    if (!studentRows || studentRows.length === 0) {
      return res.status(404).json({ success: false, error: "No student found with this number" });
    }
    const student = studentRows[0];

    const [parentRows] = await db.query("SELECT * FROM parents WHERE phone = ?", [phone]);
    let parent;

    if (!parentRows || parentRows.length === 0) {
      const [insertResult] = await db.query(
        "INSERT INTO parents (phone, password, studentId) VALUES (?, ?, ?)",
        [phone, password, student.id]
      );
      parent = { id: insertResult.insertId, phone, studentId: student.id };
      console.log("AUTO PARENT CREATED:", parent.id);
    } else {
      parent = parentRows[0];
      if (parent.password !== password) {
        return res.status(401).json({ success: false, error: "Invalid credentials" });
      }
    }

    const [studentData] = await db.query(
      `
      SELECT 
        s.id, s.name, s.grade, s.gpa, s.cgpa, s.risk,
        COALESCE(
          ROUND(
            (SUM(CASE WHEN a.present = 1 THEN 1 ELSE 0 END) / NULLIF(COUNT(a.id), 0)) * 100,
            0
          ),
          100
        ) AS attendancePercent
      FROM students s
      LEFT JOIN attendance a ON s.id = a.studentId
      WHERE s.contact = ?
      GROUP BY s.id, s.name, s.grade, s.gpa, s.cgpa, s.risk
      HAVING CAST(s.cgpa AS DECIMAL(4,2)) < 2.5 OR attendancePercent < 75
      `,
      [phone]
    );

    return res.json({ success: true, parentId: parent.id, students: studentData || [], phone });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Other routes remain unchanged
app.get("/api/parent/student", async (req, res) => {
  const { studentId } = req.query;
  try {
    const [results] = await db.query("SELECT * FROM students WHERE id = ?", [parseInt(studentId, 10)]);
    res.json({ success: true, data: results[0] || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/attendance", async (req, res) => {
  const { studentId } = req.query;
  try {
    const [results] = await db.query("SELECT * FROM attendance WHERE studentId = ?", [parseInt(studentId, 10)]);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/notifications", async (req, res) => {
  const { studentId } = req.query;
  try {
    const [results] = await db.query(
      "SELECT * FROM notifications WHERE studentId = ? ORDER BY id DESC",
      [parseInt(studentId, 10)]
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/notifications", async (req, res) => {
  const { id } = req.body;
  try {
    await db.query("UPDATE notifications SET read_status = 1 WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/notifications", async (req, res) => {
  const { id } = req.query;
  try {
    await db.query("DELETE FROM notifications WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
module.exports = app;
