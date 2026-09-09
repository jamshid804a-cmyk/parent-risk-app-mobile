const mysql = require('mysql2');
const db = mysql.createConnection({
  host: 'mysql-1744d88b-jamshid804a-2349.b.aivencloud.com',
  port: 24768,
  user: 'avnadmin',
  password: 'AVNS_cgzbwbrcQQnW8MQtAH6',
  database: 'defaultdb',
  ssl: { rejectUnauthorized: false }
});
db.connect(err => {
  if (err) { console.log('ERROR:', err.message); return; }
  console.log('Connected!');
  const tables = [
    "CREATE TABLE IF NOT EXISTS students (id int NOT NULL AUTO_INCREMENT PRIMARY KEY, name varchar(255) NOT NULL, grade varchar(50) NOT NULL, address varchar(255), contact varchar(20), midMarks int DEFAULT 0, finalMarks int DEFAULT 0, gpa varchar(10) DEFAULT '0', cgpa varchar(10) DEFAULT '0', risk varchar(20) DEFAULT 'safe')",
    "CREATE TABLE IF NOT EXISTS parents (id int NOT NULL AUTO_INCREMENT PRIMARY KEY, phone varchar(20) NOT NULL, password varchar(255) NOT NULL, studentId int NOT NULL)",
    "CREATE TABLE IF NOT EXISTS attendance (id int NOT NULL AUTO_INCREMENT PRIMARY KEY, studentId int NOT NULL, present tinyint(1) DEFAULT 0, day int NOT NULL, date varchar(20) NOT NULL)",
    "CREATE TABLE IF NOT EXISTS notifications (id int NOT NULL AUTO_INCREMENT PRIMARY KEY, studentId int NOT NULL, message text, read_status tinyint(1) DEFAULT 0, createdAt datetime DEFAULT CURRENT_TIMESTAMP, block_number int DEFAULT 0, week_start int DEFAULT 0, week_end int DEFAULT 0, type varchar(20) DEFAULT 'academic')",
    "CREATE TABLE IF NOT EXISTS grades (id int NOT NULL AUTO_INCREMENT PRIMARY KEY, studentId int NOT NULL, subject varchar(255), marks int DEFAULT 0)"
  ];
  let i = 0;
  function next() {
    if (i >= tables.length) { console.log('All tables created!'); db.end(); return; }
    db.query(tables[i], err => {
      if (err) console.log('Error:', err.message);
      else console.log('Table ' + (i+1) + ' created');
      i++; next();
    });
  }
  next();
});
