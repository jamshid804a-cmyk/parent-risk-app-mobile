require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

// ✅ Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// ✅ Database connection (Railway)
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
}).promise();

// ✅ Parent login with phone + password (auto-creates parent on first login)
app.post("/api/parent/login", async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ success: false, error: "Phone and password required" });
  }

  try {
    const [rows] = await db.query("SELECT * FROM parents WHERE phone = ?", [phone]);

    if (rows.length > 0) {
      const parent = rows[0];

      if (parent.password !== password) {
        return res.status(401).json({ success: false, error: "Invalid password" });
      }

      const [studentRows] = await db.query("SELECT * FROM students WHERE contact = ?", [phone]);
      return res.json({ success: true, parentId: parent.id, students: studentRows });
    }

    const [studentRows] = await db.query("SELECT * FROM students WHERE contact = ?", [phone]);

    if (studentRows.length === 0) {
      return res.status(404).json({ success: false, error: "This number is not registered to any student" });
    }

    const [insertResult] = await db.query(
      "INSERT INTO parents (phone, password, studentId) VALUES (?, ?, ?)",
      [phone, password, studentRows[0].id]
    );

    return res.json({
      success: true,
      parentId: insertResult.insertId,
      students: studentRows,
      firstLogin: true,
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ success: false, error: err.message || "Server error" });
  }
});

// ✅ GET attendance for a student
app.get("/api/attendance/:studentId", async (req, res) => {
  const { studentId } = req.params;
  try {
    const [rows] = await db.query(
      "SELECT * FROM attendance WHERE studentId = ? ORDER BY date DESC",
      [studentId]
    );
    res.json({ success: true, attendance: rows });
  } catch (err) {
    console.error("ATTENDANCE ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ GET notifications for a student
app.get("/api/notifications/:studentId", async (req, res) => {
  const { studentId } = req.params;
  try {
    const [rows] = await db.query(
      "SELECT * FROM notifications WHERE studentId = ? ORDER BY createdAt DESC",
      [studentId]
    );
    res.json({ success: true, notifications: rows });
  } catch (err) {
    console.error("NOTIFICATIONS FETCH ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ POST create a new notification
app.post("/api/notifications", async (req, res) => {
  const { studentId, message, type } = req.body;
  if (!studentId || !message || !type) {
    return res.status(400).json({ success: false, error: "studentId, message, and type are required" });
  }
  try {
    await db.query(
      "INSERT INTO notifications (studentId, message, type) VALUES (?, ?, ?)",
      [studentId, message, type]
    );
    res.json({ success: true, message: "Notification sent" });
  } catch (err) {
    console.error("CREATE NOTIFICATION ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ PUT mark a notification as read
app.put("/api/notifications/:id/read", async (req, res) => {
  const { id } = req.params;
  try {
    await db.query(
      "UPDATE notifications SET read_status = 1 WHERE id = ?",
      [id]
    );
    res.json({ success: true, message: "Marked as read" });
  } catch (err) {
    console.error("MARK READ ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ DELETE a notification
app.delete("/api/notifications/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM notifications WHERE id = ?", [id]);
    res.json({ success: true, message: "Notification deleted" });
  } catch (err) {
    console.error("DELETE NOTIFICATION ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});

module.exports = app;