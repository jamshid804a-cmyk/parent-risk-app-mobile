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

// ✅ Normalize any phone format to 03XXXXXXXXX
function normalizePhone(input) {
  if (!input) return "";
  let p = String(input).replace(/[\s\-()]/g, "").trim();
  if (p.startsWith("+92")) p = "0" + p.slice(3);
  else if (p.startsWith("92") && p.length === 12) p = "0" + p.slice(2);
  else if (p.startsWith("0092")) p = "0" + p.slice(4);
  if (p.length === 10 && p.startsWith("3")) p = "0" + p;
  return p;
}

async function getAttendancePercent(studentId) {
  const database = await connectDB();
  const records = await database
    .collection("attendance")
    .find({ studentId: String(studentId) })
    .toArray();
  if (records.length === 0) return 100;
  const present = records.filter(
    (r) => r.status === "P" || r.present === true
  ).length;
  return Math.round((present / records.length) * 100);
}

// ✅ Format a student document the way the mobile app expects it
async function formatStudent(s) {
  return {
    id: s.id,
    name: s.name,
    fatherName: s.fatherName || "",
    grade: s.grade || "",
    section: s.section || "",
    session: s.session || "",
    admissionNo: s.admissionNo || "",
    rollNo: s.rollNo ?? null,
    contact: s.contact || "",
    attendancePercent: await getAttendancePercent(s.id),
  };
}

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

    let parent = await database
      .collection("parents")
      .findOne({ phone: normalized });
    if (!parent) {
      const r = await database.collection("parents").insertOne({
        phone: normalized,
        password,
        createdAt: new Date(),
      });
      parent = { _id: r.insertedId, phone: normalized, password };
    } else if (parent.password !== password) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid credentials" });
    }

    const all = await database
      .collection("students")
      .find(query)
      .sort({ id: 1 })
      .toArray();

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
  const { parentId } = req.params;
  try {
    const database = await connectDB();
    let parent;
    try {
      parent = await database
        .collection("parents")
        .findOne({ _id: new ObjectId(parentId) });
    } catch {
      parent = await database
        .collection("parents")
        .findOne({ phone: normalizePhone(parentId) });
    }
    if (!parent)
      return res
        .status(404)
        .json({ success: false, error: "Parent not found" });

    const query = {
      $or: [{ contact: normalizePhone(parent.phone) }, { contact: parent.phone }],
    };
    const all = await database
      .collection("students")
      .find(query)
      .sort({ id: 1 })
      .toArray();

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

app.get("/api/students", async (req, res) => {
  try {
    const database = await connectDB();
    const students = await database
      .collection("students")
      .find({})
      .sort({ id: 1 })
      .toArray();
    res.json({
      success: true,
      data: students.map((s) => ({ ...s, _id: s._id.toString() })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/attendance", async (req, res) => {
  const { studentId } = req.query;
  try {
    const database = await connectDB();
    const records = await database
      .collection("attendance")
      .find({ studentId: String(studentId) })
      .toArray();
    res.json(
      records.map((r) => ({ ...r, id: r._id.toString(), _id: undefined }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET all tests for a student (mobile app)
app.get("/api/tests", async (req, res) => {
  const { studentId, month, testType } = req.query;
  try {
    const database = await connectDB();
    const query = {};
    if (studentId) query.studentId = String(studentId);
    if (month) query.month = String(month);
    if (testType) query.testType = String(testType);

    const records = await database
      .collection("tests")
      .find(query)
      .sort({ updatedAt: -1 })
      .toArray();

    res.json(
      records.map((r) => ({ ...r, id: r._id.toString(), _id: undefined }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE one test by its Mongo _id
app.delete("/api/tests", async (req, res) => {
  const { id } = req.query;
  try {
    if (!id) return res.status(400).json({ error: "id is required" });
    const database = await connectDB();
    const result = await database
      .collection("tests")
      .deleteOne({ _id: new ObjectId(id) });
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/notifications", async (req, res) => {
  const { studentId } = req.query;
  try {
    const database = await connectDB();
    const records = await database
      .collection("notifications")
      .find({ studentId: String(studentId) })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(
      records.map((r) => ({ ...r, id: r._id.toString(), _id: undefined }))
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
    await database
      .collection("notifications")
      .deleteOne({ _id: new ObjectId(id) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/test-students", async (req, res) => {
  try {
    const database = await connectDB();
    const students = await database
      .collection("students")
      .find({})
      .project({ id: 1, name: 1, contact: 1, grade: 1 })
      .toArray();
    res.json({ students });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;