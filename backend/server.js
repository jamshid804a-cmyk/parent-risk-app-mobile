const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();
app.use(cors());
app.use(express.json());

// ✅ RAILWAY DATABASE CONNECTION
const db = mysql.createConnection({
  host: 'acela.proxy.rlwy.net',
  port: 24740,
  user: 'root',
  password: 'zoqaEdIiQnZvgsbggFowIUvGWDZXlRJk',
  database: 'railway',
});

db.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
  } else {
    console.log('✅ Connected to Railway MySQL database');
  }
});

// ✅ LOGIN - RETURNS ALL STUDENTS UNDER THIS PHONE NUMBER
app.post('/api/parent/login', (req, res) => {
  const { phone, password } = req.body;
  
  db.query(
    'SELECT * FROM parents WHERE phone = ? AND password = ?',
    [phone, password],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length > 0) {
        const parent = results[0];
        // ✅ Get ALL students with this phone number
        db.query(
          'SELECT id, name, grade, gpa, cgpa, risk FROM students WHERE phone = ?',
          [phone],
          (err, studentResults) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({
              success: true,
              parentId: parent.id,
              students: studentResults || [],
              phone: phone,
            });
          }
        );
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    }
  );
});

// ✅ GET SINGLE STUDENT (for backward compatibility)
app.get('/api/parent/student', (req, res) => {
  const { studentId } = req.query;
  db.query(
    'SELECT * FROM students WHERE id = ?',
    [studentId],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, data: results[0] || null });
    }
  );
});

// ✅ GET ATTENDANCE
app.get('/api/attendance', (req, res) => {
  const { grade } = req.query;
  db.query(
    'SELECT * FROM attendance WHERE grade = ?',
    [grade],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// ✅ GET NOTIFICATIONS
app.get('/api/notifications', (req, res) => {
  const { studentId } = req.query;
  db.query(
    'SELECT * FROM notifications WHERE studentId = ? ORDER BY id DESC',
    [studentId],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// ✅ UPDATE NOTIFICATION (mark as read)
app.put('/api/notifications', (req, res) => {
  const { id } = req.body;
  db.query(
    'UPDATE notifications SET readStatus = true WHERE id = ?',
    [id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// ✅ DELETE NOTIFICATION
app.delete('/api/notifications', (req, res) => {
  const { id } = req.query;
  db.query(
    'DELETE FROM notifications WHERE id = ?',
    [id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.listen(3000, '0.0.0.0', () => {
  console.log('Backend server running on port 3000');
});

// ✅ For Vercel serverless deployment
module.exports = app;