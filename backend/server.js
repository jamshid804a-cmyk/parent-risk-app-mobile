require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
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

// ✅ Request OTP
app.post("/api/parent/request-otp", async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ success: false, error: "Phone required" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    await db.query("INSERT INTO otps (phone, otp) VALUES (?, ?)", [phone, otp]);
    console.log(`Saved OTP ${otp} for phone ${phone}`);
    res.json({ success: true });
  } catch (err) {
    console.error("REQUEST OTP ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Verify OTP
app.post("/api/parent/verify-otp", async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ success: false, error: "Phone and OTP required" });

  try {
    const [rows] = await db.query(
      "SELECT * FROM otps WHERE phone = ? AND otp = ? AND created_at >= NOW() - INTERVAL 5 MINUTE ORDER BY created_at DESC LIMIT 1",
      [phone, otp]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({ success: false, error: "Invalid or expired OTP" });
    }

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

// ✅ Other routes unchanged...
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
module.exports = app;
