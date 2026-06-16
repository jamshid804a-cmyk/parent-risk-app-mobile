const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createPool({
  host: process.env.MYSQLHOST || 'MySQL.railway.internal',
  port: process.env.MYSQLPORT || 3306,
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || 'zoqaEdIiQnZvgsbggFowIUvGWDZXlRJk',
  database: process.env.MYSQLDATABASE || 'railway',
  waitForConnections: true,
  connectionLimit: 5,
}).promise();

// LOGIN - returns only at-risk students
app.post('/api/parent/login', async (req, res) => {
  const { phone, password } = req.body;
  try {
    const [results] = await db.query(
      'SELECT * FROM parents WHERE phone = ? AND password = ?',
      [phone, password]
    );
    if (results.length > 0) {
      const parent = results[0];
      const [studentResults] = await db.query(
        `SELECT id, name, grade, gpa, cgpa, risk FROM students 
         WHERE phone = ? AND (CAST(cgpa AS DECIMAL(4,2)) < 2.5 OR risk = 'at-risk')`,
        [phone]
      );
      res.json({ success: true, parentId: parent.id, students: studentResults || [], phone: phone });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET SINGLE STUDENT
app.get('/api/parent/student', async (req, res) => {
  const { studentId } = req.query;
  try {
    const [results] = await db.query('SELECT * FROM students WHERE id = ?', [parseInt(studentId, 10)]);
    res.json({ success: true, data: results[0] || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET ATTENDANCE - only at-risk attendance (less than 75%)
app.get('/api/attendance', async (req, res) => {
  const { studentId } = req.query;
  try {
    const [results] = await db.query(
      'SELECT * FROM attendance WHERE studentId = ?',
      [parseInt(studentId, 10)]
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET NOTIFICATIONS
app.get('/api/notifications', async (req, res) => {
  const { studentId } = req.query;
  try {
    const [results] = await db.query(
      'SELECT * FROM notifications WHERE studentId = ? ORDER BY id DESC',
      [parseInt(studentId, 10)]
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE NOTIFICATION
app.put('/api/notifications', async (req, res) => {
  const { id } = req.body;
  try {
    await db.query('UPDATE notifications SET read_status = 1 WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE NOTIFICATION
app.delete('/api/notifications', async (req, res) => {
  const { id } = req.query;
  try {
    await db.query('DELETE FROM notifications WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('Backend server running on port ' + PORT);
});

module.exports = app;