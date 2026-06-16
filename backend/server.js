const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createPool({
  host: process.env.DB_HOST || 'acela.proxy.rlwy.net',
  port: process.env.DB_PORT || 24740,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'zoqaEdIiQnZvgsbggFowIUvGWDZXlRJk',
  database: process.env.DB_NAME || 'my_project_db',
  waitForConnections: true,
  connectionLimit: 5,
}).promise();

app.post('/api/parent/login', async (req, res) => {
  const { phone, password } = req.body;
  try {
    const [results] = await db.query('SELECT * FROM parents WHERE phone = ? AND password = ?', [phone, password]);
    if (results.length > 0) {
      const parent = results[0];
      const [studentResults] = await db.query('SELECT id, name, grade, gpa, cgpa, risk FROM students WHERE phone = ?', [phone]);
      res.json({ success: true, parentId: parent.id, students: studentResults || [], phone: phone });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/parent/student', async (req, res) => {
  const { studentId } = req.query;
  try {
    const [results] = await db.query('SELECT * FROM students WHERE id = ?', [studentId]);
    res.json({ success: true, data: results[0] || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/attendance', async (req, res) => {
  const { grade } = req.query;
  try {
    const [results] = await db.query('SELECT * FROM attendance WHERE grade = ?', [grade]);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/notifications', async (req, res) => {
  const { studentId } = req.query;
  try {
    const [results] = await db.query('SELECT * FROM notifications WHERE studentId = ? ORDER BY id DESC', [studentId]);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/notifications', async (req, res) => {
  const { id } = req.body;
  try {
    await db.query('UPDATE notifications SET readStatus = true WHERE id = ?', [id]);
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('Backend server running on port ' + PORT);
});

module.exports = app;