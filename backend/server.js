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
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT || 3306,
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
    // Step 1: Check if a parent account already exists for this number
    const [rows] = await db.query("SELECT * FROM parents WHERE phone = ?", [phone]);

    if (rows.length > 0) {
      const parent = rows[0];

      // Compare password (plain text for now, use bcrypt in production)
      if (parent.password !== password) {
        return res.status(401).json({ success: false, error: "Invalid password" });
      }

      const [studentRows] = await db.query("SELECT * FROM students WHERE contact = ?", [phone]);
      return res.json({ success: true, parentId: parent.id, students: studentRows });
    }

    // Step 2: No parent account yet — check if this number belongs to a student
    const [studentRows] = await db.query("SELECT * FROM students WHERE contact = ?", [phone]);

    if (studentRows.length === 0) {
      return res.status(404).json({ success: false, error: "This number is not registered to any student" });
    }

    // Step 3: First-time login — create the parent account right now with this password
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
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});

module.exports = app;