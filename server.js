import express from "express";
import cors from "cors";
import fs from "fs";
import multer from "multer";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/images", express.static("images"));

const upload = multer({ dest: "images/" });

let users = {
  admin: { password: "admin123", role: "admin", token: 0 },
  player1: { password: "1234", role: "user", token: 5 },
  player2: { password: "5678", role: "user", token: 3 },
};

let items = [
  { name: "ดาบ", image: "/images/sword.png", rate: 30 },
  { name: "โล่", image: "/images/shield.png", rate: 30 },
  { name: "หมวก", image: "/images/helmet.png", rate: 20 },
  { name: "ยา", image: "/images/potion.png", rate: 15 },
  { name: "ของแรร์", image: "/images/rare.png", rate: 5 },
];

let gachaLogs = [];

app.post("/auth/login", (req, res) => {
  const { username, password } = req.body;
  const user = users[username];
  if (!user || user.password !== password) {
    return res.status(401).json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
  }
  res.json({ user: { username, role: user.role, token: user.token } });
});

app.post("/auth/register", (req, res) => {
  const { username, password } = req.body;
  if (users[username]) {
    return res.status(400).json({ error: "มีผู้ใช้นี้อยู่แล้ว" });
  }
  users[username] = { password, role: "user", token: 5 };
  res.json({ success: true });
});

app.post("/admin/set-token", (req, res) => {
  const { username, token } = req.body;
  if (!users[username]) return res.status(404).json({ error: "ไม่พบผู้ใช้" });
  users[username].token = token;
  res.json({ success: true });
});

app.post("/admin/update-rate", (req, res) => {
  const { updatedItems } = req.body;
  items = updatedItems;
  res.json({ success: true });
});

app.post("/admin/upload", upload.single("image"), (req, res) => {
  const { itemName, rate } = req.body;
  const image = "/images/" + req.file.filename;
  items.push({ name: itemName, image, rate: parseInt(rate) });
  res.json({ success: true });
});

app.post("/gacha", (req, res) => {
  const { username, characterName } = req.body;
  const user = users[username];
  if (!user) return res.status(404).json({ error: "ไม่พบผู้ใช้" });
  if (user.token <= 0) return res.status(400).json({ error: "Token ไม่พอ" });

  const roll = Math.random() * 100;
  let cumulative = 0;
  let selectedItem = items[0];
  for (let item of items) {
    cumulative += item.rate;
    if (roll <= cumulative) {
      selectedItem = item;
      break;
    }
  }

  user.token -= 1;
  gachaLogs.push({ username, characterName, item: selectedItem.name });

  res.json({ item: selectedItem, tokenLeft: user.token });
});

app.get("/admin/logs", (req, res) => {
  res.json(gachaLogs);
});

app.get("/", (req, res) => {
  res.send("WARZONE Gacha Backend is Running!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server started on port", PORT));
