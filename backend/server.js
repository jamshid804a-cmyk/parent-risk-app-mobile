const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const parents = [
  { id: 1, parentId: 1, studentId: 1, phone: '03089765421', password: 'test123', name: 'Test Parent' },
  { id: 2, parentId: 2, studentId: 2, phone: '03001234567', password: 'pass123', name: 'Parent 2' },
  { id: 3, parentId: 3, studentId: 3, phone: '03058717008', password: 'pass123', name: 'Parent 3' },
];

const students = [
  { id: 1, parentId: 1, name: 'Test Student', grade: '1st Semester', gpa: 3.5, cgpa: '3.2', attendance: '95%', risk: 'Low' },
  { id: 2, parentId: 2, name: 'Student 2', grade: '2nd Semester', gpa: 2.8, cgpa: '2.3', attendance: '70%', risk: 'High' },
  { id: 3, parentId: 3, name: 'attendance', grade: '1st Semester', gpa: 2.0, cgpa: '2.1', attendance: '65%', risk: 'High' },
];

const notifications = [
  { id: 1, studentId: 1, type: 'academic', message: 'Your child GPA has improved this semester!', readStatus: false },
  { id: 2, studentId: 2, type: 'attendance', message: 'Attendance is below 75%. Please take action.', readStatus: false },
  { id: 3, studentId: 3, type: 'attendance', message: 'Attendance is below 75%. Please take action.', readStatus: false },
  { id: 4, studentId: 3, type: 'academic', message: 'CGPA is below 2.5. Academic performance needs improvement.', readStatus: false },
];

const attendance = [
  { studentId: 1, name: 'Test Student', grade: '1st Semester', day: 1, present: true, date: '2026-06-01' },
  { studentId: 1, name: 'Test Student', grade: '1st Semester', day: 2, present: true, date: '2026-06-02' },
  { studentId: 1, name: 'Test Student', grade: '1st Semester', day: 3, present: false, date: '2026-06-03' },
  { studentId: 3, name: 'attendance', grade: '1st Semester', day: 1, present: true, date: '2026-06-01' },
  { studentId: 3, name: 'attendance', grade: '1st Semester', day: 2, present: false, date: '2026-06-02' },
  { studentId: 3, name: 'attendance', grade: '1st Semester', day: 3, present: true, date: '2026-06-03' },
  { studentId: 3, name: 'attendance', grade: '1st Semester', day: 4, present: false, date: '2026-06-04' },
  { studentId: 3, name: 'attendance', grade: '1st Semester', day: 5, present: true, date: '2026-06-05' },
];

// LOGIN
app.post('/api/parent/login', (req, res) => {
  const { phone, password } = req.body;
  const parent = parents.find(p => p.phone === phone && p.password === password);
  if (parent) {
    const student = students.find(s => s.id === parent.studentId);
    res.json({
      success: true,
      parentId: parent.parentId,
      studentId: parent.studentId,
      studentName: student?.name || '',
      studentGrade: student?.grade || '',
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// GET STUDENT
app.get('/api/parent/student', (req, res) => {
  const { studentId, parentId } = req.query;
  const student = students.find(
    s => s.id == studentId && s.parentId == parentId
  );
  if (student) {
    res.json({ success: true, data: student });
  } else {
    res.status(404).json({ success: false, message: 'Student not found' });
  }
});

// GET ATTENDANCE
app.get('/api/attendance', (req, res) => {
  const { grade, month } = req.query;
  const filtered = attendance.filter(a => a.grade === grade);
  res.json(filtered);
});

// GET NOTIFICATIONS
app.get('/api/notifications', (req, res) => {
  const { studentId } = req.query;
  const filtered = notifications.filter(n => n.studentId == studentId);
  res.json(filtered);
});

// UPDATE NOTIFICATION (mark as read)
app.put('/api/notifications', (req, res) => {
  const { id } = req.body;
  const notif = notifications.find(n => n.id == id);
  if (notif) notif.readStatus = true;
  res.json({ success: true });
});

// DELETE NOTIFICATION
app.delete('/api/notifications', (req, res) => {
  const { id } = req.query;
  const index = notifications.findIndex(n => n.id == id);
  if (index > -1) notifications.splice(index, 1);
  res.json({ success: true });
});

app.listen(3000, '0.0.0.0', () => {
  console.log('Backend server running on port 3000');
});