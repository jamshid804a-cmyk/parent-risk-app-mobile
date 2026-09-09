const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createPool({
  host: process.env.MYSQLHOST,
  port: process.env.MYSQLPORT,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  ssl: { rejectUnauthorized: false },
}).promise();

// ✅ LOGIN ENDPOINT
app.post("/api/parent/login", async (req, res) => {
  const { phone, password } = req.body;
  try {
    console.log(`🔐 Login attempt for phone: ${phone}`);
    
    const [studentRows] = await db.query("SELECT * FROM students WHERE contact = ?", [phone]);
    if (!studentRows || studentRows.length === 0) {
      return res.status(404).json({ success: false, error: "No student found with this number" });
    }
    
    const [parentRows] = await db.query("SELECT * FROM parents WHERE phone = ?", [phone]);
    let parent;
    if (!parentRows || parentRows.length === 0) {
      const [insertResult] = await db.query(
        "INSERT INTO parents (phone, password, studentId) VALUES (?, ?, ?)",
        [phone, password, studentRows[0].id]
      );
      parent = { id: insertResult.insertId, phone, studentId: studentRows[0].id };
    } else {
      parent = parentRows[0];
      if (parent.password !== password) {
        return res.status(401).json({ success: false, error: "Invalid credentials" });
      }
    }

    // 🔥 FIX: Handle students with no attendance records
    const [atRiskStudents] = await db.query(
      `SELECT 
        s.id, 
        s.name, 
        s.grade, 
        s.gpa, 
        s.cgpa, 
        s.risk,
        COALESCE(
          (
            SELECT ROUND((SUM(CASE WHEN a.present = 1 THEN 1 ELSE 0 END) / NULLIF(COUNT(a.id), 0)) * 100, 0)
            FROM attendance a
            WHERE a.studentId = s.id
          ), 
          100
        ) AS attendancePercent
      FROM students s
      WHERE s.contact = ?
      GROUP BY s.id, s.name, s.grade, s.gpa, s.cgpa, s.risk
      HAVING CAST(s.cgpa AS DECIMAL(4,2)) < 2.55
      ORDER BY s.id DESC`,
      [phone]
    );
    
    console.log(`✅ Found ${atRiskStudents.length} at-risk students for phone ${phone}`);
    console.log(`👤 Student details:`, atRiskStudents.map(s => ({
      id: s.id,
      name: s.name,
      cgpa: s.cgpa,
      attendancePercent: s.attendancePercent
    })));

    return res.json({ 
      success: true, 
      parentId: parent.id, 
      students: atRiskStudents || [], 
      phone 
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 🔥 REFRESH ENDPOINT
app.get("/api/parent/:parentId/students", async (req, res) => {
  const { parentId } = req.params;
  
  try {
    console.log(`📱 Fetching at-risk students for parent ${parentId}`);
    
    const [parentRows] = await db.query(
      "SELECT phone FROM parents WHERE id = ?",
      [parseInt(parentId)]
    );
    
    if (!parentRows || parentRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "Parent not found" 
      });
    }
    
    const phone = parentRows[0].phone;
    console.log(`📱 Parent phone: ${phone}`);
    
    // 🔥 FIX: Handle students with no attendance records
    const [atRiskStudents] = await db.query(
      `SELECT 
        s.id, 
        s.name, 
        s.grade, 
        s.gpa, 
        s.cgpa, 
        s.risk,
        COALESCE(
          (
            SELECT ROUND((SUM(CASE WHEN a.present = 1 THEN 1 ELSE 0 END) / NULLIF(COUNT(a.id), 0)) * 100, 0)
            FROM attendance a
            WHERE a.studentId = s.id
          ), 
          100
        ) AS attendancePercent
      FROM students s
      WHERE s.contact = ?
      GROUP BY s.id, s.name, s.grade, s.gpa, s.cgpa, s.risk
      HAVING CAST(s.cgpa AS DECIMAL(4,2)) < 2.55
      ORDER BY s.id DESC`,
      [phone]
    );
    
    console.log(`✅ Found ${atRiskStudents.length} at-risk students for parent ${parentId}`);
    console.log(`👤 Student details:`, atRiskStudents.map(s => ({
      id: s.id,
      name: s.name,
      cgpa: s.cgpa,
      attendancePercent: s.attendancePercent
    })));

    return res.json({
      success: true,
      parentId: parseInt(parentId),
      students: atRiskStudents || [],
      phone: phone
    });
    
  } catch (err) {
    console.error("❌ Error fetching parent students:", err);
    return res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// Keep all your other endpoints as they are
app.get('/api/parent/student', async (req, res) => {
  const { studentId } = req.query;
  try {
    const [results] = await db.query('SELECT * FROM students WHERE id = ?', [parseInt(studentId, 10)]);
    res.json({ success: true, data: results[0] || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/attendance', async (req, res) => {
  const { studentId } = req.query;
  try {
    const [results] = await db.query('SELECT * FROM attendance WHERE studentId = ?', [parseInt(studentId, 10)]);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/notifications', async (req, res) => {
  const { studentId } = req.query;
  try {
    const [results] = await db.query('SELECT * FROM notifications WHERE studentId = ? ORDER BY id DESC', [parseInt(studentId, 10)]);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/notifications', async (req, res) => {
  const { id } = req.body;
  try {
    await db.query('UPDATE notifications SET read_status = 1 WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/notifications', async (req, res) => {
  const { id } = req.query;
  try {
    await db.query('DELETE FROM notifications WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/test-students', async (req, res) => {
  try {
    const [results] = await db.query('SELECT id, name, contact, cgpa FROM students');
    res.json({ students: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => console.log("Server running on port " + PORT));
module.exports = app;