const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

let users = {
  admin: { password: "admin123", role: "admin", token: 0 },
  player1: { password: "1234", role: "user", token: 5 },
  player2: { password: "5678", role: "user", token: 3 },
};

app.post("/auth/login", (req, res) => {
  const { username, password } = req.body;
  const user = users[username];
  if (!user || user.password !== password) {
    return res.status(401).json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
  }
  res.json({ user: { username, token: user.token } });
});

app.post("/auth/register", (req, res) => {
  const { username, password } = req.body;
  if (users[username]) {
    return res.status(400).json({ error: "มีผู้ใช้นี้อยู่แล้ว" });
  }
  users[username] = { password, role: "user", token: 5 };
  res.json({ success: true });
});

app.post("/gacha", (req, res) => {
  const { username } = req.body;
  const user = users[username];
  if (!user) return res.status(404).json({ error: "ไม่พบผู้ใช้" });
  if (user.token <= 0) return res.status(400).json({ error: "Token ไม่พอ" });

  const items = ["ดาบ", "หมวก", "เกราะ", "รองเท้า", "ยา"];
  const item = items[Math.floor(Math.random() * items.length)];
  user.token -= 1;
  res.json({ item, tokenLeft: user.token });
});

app.get("/", (req, res) => {
  res.send("Nage Gacha Backend - Ready!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server started on port", PORT));