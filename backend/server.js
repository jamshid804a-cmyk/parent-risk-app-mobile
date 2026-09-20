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

async function getAttendancePercent(studentId) {
  const database = await connectDB();
  const records = await database
    .collection("attendance")
    .find({ studentId: String(studentId) })
    .toArray();
  if (records.length === 0) return 100;
  const present = records.filter((r) => r.status === "P").length;
  return Math.round((present / records.length) * 100);
}

async function isAtRisk(student) {
  const attendance = await getAttendancePercent(student.id);
  return attendance < 75;
}

app.post("/api/parent/login", async (req, res) => {
  const { phone, password } = req.body;
  try {
    console.log(`🔐 Login for ${phone}`);
    const database = await connectDB();

    const student = await database.collection("students").findOne({ contact: phone });
    if (!student) {
      return res.status(404).json({ success: false, error: "No student found with this number" });
    }

    let parent = await database.collection("parents").findOne({ phone });
    if (!parent) {
      const r = await database.collection("parents").insertOne({
        phone, password, studentId: String(student.id), createdAt: new Date(),
      });
      parent = { _id: r.insertedId, phone, password, studentId: String(student.id) };
    } else if (parent.password !== password) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    const all = await database.collection("students").find({ contact: phone }).sort({ id: -1 }).toArray();
    const atRisk = [];
    for (const s of all) {
      if (await isAtRisk(s)) {
        atRisk.push({
          id: s.id, name: s.name, grade: s.grade,
          attendancePercent: await getAttendancePercent(s.id),
        });
      }
    }

    return res.json({
      success: true,
      parentId: parent._id.toString(),
      students: atRisk,
      phone,
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
      parent = await database.collection("parents").findOne({ _id: new ObjectId(parentId) });
    } catch {
      parent = await database.collection("parents").findOne({ phone: parentId });
    }
    if (!parent) return res.status(404).json({ success: false, error: "Parent not found" });

    const all = await database.collection("students").find({ contact: parent.phone }).sort({ id: -1 }).toArray();
    const atRisk = [];
    for (const s of all) {
      if (await isAtRisk(s)) {
        atRisk.push({
          id: s.id, name: s.name, grade: s.grade,
          attendancePercent: await getAttendancePercent(s.id),
        });
      }
    }
    return res.json({ success: true, parentId, students: atRisk, phone: parent.phone });
  } catch (err) {
    console.error("❌ Refresh error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/parent/student", async (req, res) => {
  const { studentId } = req.query;
  try {
    const database = await connectDB();
    const student = await database.collection("students").findOne({ id: toInt(studentId) });
    res.json({ success: true, data: student ? [student] : [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/students", async (req, res) => {
  try {
    const database = await connectDB();
    const students = await database.collection("students").find({}).sort({ id: 1 }).toArray();
    res.json({ success: true, data: students.map((s) => ({ ...s, _id: s._id.toString() })) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/attendance", async (req, res) => {
  const { studentId } = req.query;
  try {
    const database = await connectDB();
    const records = await database.collection("attendance").find({ studentId: String(studentId) }).toArray();
    res.json(records.map((r) => ({ ...r, id: r._id.toString(), _id: undefined })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/notifications", async (req, res) => {
  const { studentId } = req.query;
  try {
    const database = await connectDB();
    const records = await database.collection("notifications")
      .find({ studentId: String(studentId) }).sort({ createdAt: -1 }).toArray();
    res.json(records.map((r) => ({ ...r, id: r._id.toString(), _id: undefined })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/notifications", async (req, res) => {
  const { id } = req.body;
  try {
    const database = await connectDB();
    await database.collection("notifications").updateOne(
      { _id: new ObjectId(id) },
      { $set: { readStatus: true } }
    );
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

app.get("/test-students", async (req, res) => {
  try {
    const database = await connectDB();
    const students = await database.collection("students").find({}).project({ id: 1, name: 1, contact: 1, grade: 1 }).toArray();
    res.json({ students });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Vercel export — NO app.listen()
module.exports = app;