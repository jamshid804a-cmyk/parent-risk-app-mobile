app.post('/api/parent/login', async (req, res) => {
  const { phone, password } = req.body;

  try {
    console.log("LOGIN:", phone);

    // STEP 1: check parent
    const [parentRows] = await db.query(
      'SELECT * FROM parents WHERE phone = ?',
      [phone]
    );

    let parent = null;

    if (parentRows.length > 0) {
      parent = parentRows[0];

      if (parent.password !== password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
    } else {

      // STEP 2: check student
      const [studentRows] = await db.query(
        'SELECT * FROM students WHERE contact = ?',
        [phone]
      );

      if (studentRows.length === 0) {
        return res.status(404).json({ error: "Student not found" });
      }

      const student = studentRows[0];

      // STEP 3: create parent
      const [insertResult] = await db.query(
        'INSERT INTO parents (phone, password, studentId) VALUES (?, ?, ?)',
        [phone, password, student.id]
      );

      parent = {
        id: insertResult.insertId,
        phone,
        password,
        studentId: student.id
      };
    }

    // STEP 4: fetch student data
    const [studentResults] = await db.query(
      `
      SELECT 
        s.id, s.name, s.grade, s.gpa, s.cgpa, s.risk,
        ROUND(
          COALESCE(SUM(a.present) / NULLIF(COUNT(a.id), 0) * 100, 100),
          0
        ) as attendancePercent
      FROM students s
      LEFT JOIN attendance a ON s.id = a.studentId
      WHERE s.id = ?
      GROUP BY s.id, s.name, s.grade, s.gpa, s.cgpa, s.risk
      `,
      [parent.studentId]
    );

    return res.json({
      success: true,
      parentId: parent.id,
      students: studentResults || [],
      phone
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
});