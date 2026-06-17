app.post("/api/parent/login", async (req, res) => {
  const { phone, password } = req.body;

  try {
    console.log("LOGIN ATTEMPT:", phone);

    // =========================
    // 1. CHECK IF PARENT EXISTS
    // =========================
    const [parentRows] = await db.query(
      "SELECT * FROM parents WHERE phone = ?",
      [phone]
    );

    let parent = parentRows[0] || null;

    if (parent) {
      // password check
      if (parent.password !== password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
    }

    // =========================
    // 2. IF PARENT NOT EXISTS → FIND STUDENT
    // =========================
    if (!parent) {
      const [studentRows] = await db.query(
        "SELECT * FROM students WHERE contact = ?",
        [phone]
      );

      if (!studentRows.length) {
        return res.status(404).json({
          error: "No student found with this number",
        });
      }

      const student = studentRows[0];

      // =========================
      // 3. CREATE PARENT AUTOMATICALLY
      // =========================
      const [insertResult] = await db.query(
        "INSERT INTO parents (phone, password, studentId) VALUES (?, ?, ?)",
        [phone, password, student.id]
      );

      parent = {
        id: insertResult.insertId,
        phone,
        password,
        studentId: student.id,
      };
    }

    // =========================
    // 4. SAFETY CHECK (IMPORTANT)
    // =========================
    if (!parent.studentId) {
      return res.status(500).json({
        error: "Parent not linked to student properly",
      });
    }

    // =========================
    // 5. GET STUDENT DATA
    // =========================
    const [studentData] = await db.query(
      `
      SELECT 
        s.id, s.name, s.grade, s.gpa, s.cgpa, s.risk,
        ROUND(
          COALESCE(SUM(a.present) / NULLIF(COUNT(a.id), 0) * 100, 100),
          0
        ) AS attendancePercent
      FROM students s
      LEFT JOIN attendance a ON s.id = a.studentId
      WHERE s.id = ?
      GROUP BY s.id, s.name, s.grade, s.gpa, s.cgpa, s.risk
      `,
      [parent.studentId]
    );

    // =========================
    // RESPONSE
    // =========================
    return res.json({
      success: true,
      parentId: parent.id,
      student: studentData[0] || null,
      phone,
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
});