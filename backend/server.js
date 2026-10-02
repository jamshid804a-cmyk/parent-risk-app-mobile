const dns = require("node:dns/promises");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = "school_db";

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI not set");
  process.exit(1);
}

let client;
let db;

async function connectDB() {
  if (db) return db;
  client = new MongoClient(MONGODB_URI, { maxPoolSize: 10 });
  await client.connect();
  db = client.db(DB_NAME);
  console.log("✅ Connected to MongoDB");
  return db;
}

const toInt = (v) => {
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
};

function noCache(res) {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.set("Surrogate-Control", "no-store");
}

function normalizePhone(input) {
  if (!input) return "";
  let p = String(input).replace(/[\s\-()]/g, "").trim();
  if (p.startsWith("+92")) p = "0" + p.slice(3);
  else if (p.startsWith("92") && p.length === 12) p = "0" + p.slice(2);
  else if (p.startsWith("0092")) p = "0" + p.slice(4);
  if (p.length === 10 && p.startsWith("3")) p = "0" + p;
  return p;
}

async function getAttendancePercent(studentMongoId) {
  const database = await connectDB();
  const student = await database
    .collection("students")
    .findOne({ _id: studentMongoId });
  if (!student) return 100;

  const records = await database
    .collection("attendance")
    .find({
      studentId: String(student.id),
      schoolId: student.schoolId,
      program: student.program || "school",
    })
    .toArray();
  if (records.length === 0) return 100;
  const present = records.filter((r) => r.status === "P" || r.present === true).length;
  return Math.round((present / records.length) * 100);
}

async function formatStudent(s) {
  return {
    id: s.id,
    _id: s._id.toString(),
    schoolId: s.schoolId || "",
    program: s.program || "school",
    name: s.name,
    fatherName: s.fatherName || "",
    grade: s.grade || "",
    section: s.section || "",
    session: s.session || "",
    year: s.year || "",
    subject: s.subject || "",
    batchNo: s.batchNo || "",
    courseDuration: s.courseDuration || "",
    admissionNo: s.admissionNo || "",
    rollNo: s.rollNo ?? null,
    contact: s.contact || "",
    fee: s.fee ?? s.monthlyFee ?? 0,
    image: s.image || null,
    attendancePercent: await getAttendancePercent(s._id),
  };
}

// =====================================================
// AUTH
// =====================================================

app.post("/api/parent/login", async (req, res) => {
  const { phone, password } = req.body;
  try {
    const normalized = normalizePhone(phone);
    console.log(`🔐 Login for ${phone} (normalized: ${normalized})`);
    const database = await connectDB();

    const query = { $or: [{ contact: normalized }, { contact: phone }] };
    const anyStudent = await database.collection("students").findOne(query);
    if (!anyStudent) {
      return res
        .status(404)
        .json({ success: false, error: "No student found with this number" });
    }

    let parent = await database.collection("parents").findOne({ phone: normalized });
    if (!parent) {
      const r = await database.collection("parents").insertOne({
        phone: normalized,
        password,
        createdAt: new Date(),
      });
      parent = { _id: r.insertedId, phone: normalized, password };
    } else if (parent.password !== password) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    const all = await database.collection("students").find(query).sort({ id: 1 }).toArray();

    const students = [];
    for (const s of all) {
      students.push(await formatStudent(s));
    }

    return res.json({
      success: true,
      parentId: parent._id.toString(),
      students,
      phone: normalized,
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/parent/:parentId/students", async (req, res) => {
  noCache(res);
  const { parentId } = req.params;
  try {
    const database = await connectDB();
    let parent;
    try {
      parent = await database.collection("parents").findOne({ _id: new ObjectId(parentId) });
    } catch {
      parent = await database
        .collection("parents")
        .findOne({ phone: normalizePhone(parentId) });
    }
    if (!parent)
      return res.status(404).json({ success: false, error: "Parent not found" });

    const query = {
      $or: [{ contact: normalizePhone(parent.phone) }, { contact: parent.phone }],
    };
    const all = await database.collection("students").find(query).sort({ id: 1 }).toArray();

    const students = [];
    for (const s of all) {
      students.push(await formatStudent(s));
    }

    return res.json({
      success: true,
      parentId,
      students,
      phone: parent.phone,
    });
  } catch (err) {
    console.error("❌ Refresh error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/parent/student", async (req, res) => {
  noCache(res);
  const { studentId } = req.query;
  try {
    const database = await connectDB();
    const student = await database
      .collection("students")
      .findOne({ id: toInt(studentId) });
    res.json({ success: true, data: student ? [student] : [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================
// STUDENTS
// =====================================================

app.get("/api/students", async (req, res) => {
  noCache(res);
  try {
    const database = await connectDB();
    const students = await database.collection("students").find({}).sort({ id: 1 }).toArray();
    res.json({
      success: true,
      data: students.map((s) => ({ ...s, _id: s._id.toString() })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================
// ATTENDANCE — program + schoolId aware
// =====================================================

app.get("/api/attendance", async (req, res) => {
  noCache(res);
  const { studentId, program, schoolId } = req.query;
  try {
    const database = await connectDB();
    const query = { studentId: String(studentId) };
    if (program) query.program = String(program);
    if (schoolId) query.schoolId = String(schoolId);

    const records = await database.collection("attendance").find(query).toArray();

    res.json(
      records.map((r) => ({ ...r, id: r._id.toString(), _id: undefined }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/attendance/month", async (req, res) => {
  const { studentId, month } = req.query;
  try {
    if (!studentId || !month) {
      return res.status(400).json({ error: "studentId and month are required" });
    }
    const database = await connectDB();
    const result = await database
      .collection("attendance")
      .deleteMany({ studentId: String(studentId), date: String(month) });
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================
// TESTS — program + schoolId aware
// =====================================================

app.get("/api/tests", async (req, res) => {
  noCache(res);
  const { studentId, month, testType, program, schoolId } = req.query;
  try {
    const database = await connectDB();
    const query = {};
    if (studentId) query.studentId = String(studentId);
    if (month) query.month = String(month);
    if (testType) query.testType = String(testType);
    if (program) query.program = String(program);
    if (schoolId) query.schoolId = String(schoolId);

    const records = await database
      .collection("tests")
      .find(query)
      .sort({ updatedAt: -1 })
      .toArray();

    res.json(records.map((r) => ({ ...r, id: r._id.toString(), _id: undefined })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/tests", async (req, res) => {
  const { id } = req.query;
  try {
    if (!id) return res.status(400).json({ error: "id is required" });
    const database = await connectDB();
    const result = await database.collection("tests").deleteOne({ _id: new ObjectId(id) });
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================
// EXAMS — program + schoolId aware
// =====================================================

app.get("/api/exams", async (req, res) => {
  noCache(res);
  const { studentId, month, examType, program, schoolId } = req.query;
  try {
    const database = await connectDB();
    const query = {};
    if (studentId) query.studentId = String(studentId);
    if (month) query.month = String(month);
    if (examType) query.examType = String(examType);
    if (program) query.program = String(program);
    if (schoolId) query.schoolId = String(schoolId);

    const records = await database
      .collection("exams")
      .find(query)
      .sort({ updatedAt: -1 })
      .toArray();

    res.json(records.map((r) => ({ ...r, id: r._id.toString(), _id: undefined })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/exams", async (req, res) => {
  const { id } = req.query;
  try {
    if (!id) return res.status(400).json({ error: "id is required" });
    const database = await connectDB();
    const result = await database.collection("exams").deleteOne({ _id: new ObjectId(id) });
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================
// FEES — program + schoolId aware
// =====================================================

app.get("/api/fees", async (req, res) => {
  noCache(res);
  const { studentId, month, program, schoolId } = req.query;
  try {
    const database = await connectDB();
    const query = {};
    if (studentId) query.studentId = String(studentId);
    if (month) query.month = String(month);
    if (program) query.program = String(program);
    if (schoolId) query.schoolId = String(schoolId);

    const records = await database
      .collection("fees")
      .find(query)
      .sort({ paidAt: -1 })
      .toArray();

    res.json(records.map((r) => ({ ...r, id: r._id.toString(), _id: undefined })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/fees", async (req, res) => {
  const { id } = req.query;
  try {
    if (!id) return res.status(400).json({ error: "id is required" });
    const database = await connectDB();
    const result = await database.collection("fees").deleteOne({ _id: new ObjectId(id) });
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================
// PUSH TOKEN
// =====================================================

app.post("/api/parent/push-token", async (req, res) => {
  const { parentId, pushToken } = req.body;
  try {
    if (!parentId || !pushToken) {
      return res
        .status(400)
        .json({ success: false, error: "parentId and pushToken required" });
    }
    const database = await connectDB();
    await database
      .collection("parents")
      .updateOne({ _id: new ObjectId(parentId) }, { $set: { pushToken } });
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Push token save error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================================================
// NOTIFICATIONS — filter by studentId + program + schoolId
// =====================================================

app.get("/api/notifications", async (req, res) => {
  noCache(res);
  const { studentId, program, schoolId } = req.query;
  try {
    const database = await connectDB();
    const query = {};
    if (studentId) query.studentId = String(studentId);
    if (program) query.program = String(program);
    if (schoolId) query.schoolId = String(schoolId);

    const records = await database
      .collection("notifications")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    // Backfill program for old notifications
    const missingProgram = records.filter((r) => !r.program);
    let programById = {};
    if (missingProgram.length > 0) {
      const ids = [...new Set(missingProgram.map((r) => Number(r.studentId)))];
      const students = await database
        .collection("students")
        .find({ id: { $in: ids } })
        .project({ id: 1, program: 1 })
        .toArray();
      students.forEach((s) => {
        programById[String(s.id)] = s.program || "school";
      });
    }

    res.json(
      records.map((r) => ({
        ...r,
        id: r._id.toString(),
        _id: undefined,
        program: r.program || programById[String(r.studentId)] || "school",
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/notifications", async (req, res) => {
  const { id } = req.body;
  try {
    const database = await connectDB();
    await database
      .collection("notifications")
      .updateOne({ _id: new ObjectId(id) }, { $set: { readStatus: true } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/notifications", async (req, res) => {
  const { id } = req.query;
  try {
    const database = await connectDB();
    await database.collection("notifications").deleteOne({ _id: new ObjectId(id) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================
// DEBUG
// =====================================================

app.get("/test-students", async (req, res) => {
  noCache(res);
  try {
    const database = await connectDB();
    const students = await database
      .collection("students")
      .find({})
      .project({ id: 1, name: 1, contact: 1, grade: 1, program: 1, schoolId: 1 })
      .toArray();
    res.json({ students });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;