import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/images", express.static("images"));

const upload = multer({ dest: "images/" });

let users = {
  admin: { password: "admin123", role: "admin", token: 0 },
  player1: { password: "1234", role: "user", token: 5 }
};

let itemRates = {
  sword: { name: "ดาบ", rate: 40, image: "sword.png" },
  armor: { name: "เกราะ", rate: 30, image: "armor.png" },
  helmet: { name: "หมวก", rate: 20, image: "helmet.png" },
  boots: { name: "รองเท้า", rate: 10, image: "boots.png" }
};

let gachaLogs = [];

app.post("/auth/login", (req, res) => {
  const { username, password } = req.body;
  const user = users[username];
  if (!user || user.password !== password) return res.status(401).json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
  res.json({ user: { username, token: user.token, role: user.role } });
});

app.post("/auth/register", (req, res) => {
  const { username, password } = req.body;
  if (users[username]) return res.status(400).json({ error: "มีผู้ใช้นี้อยู่แล้ว" });
  users[username] = { password, role: "user", token: 5 };
  res.json({ success: true });
});

app.post("/gacha", (req, res) => {
  const { username, character } = req.body;
  const user = users[username];
  if (!user) return res.status(404).json({ error: "ไม่พบผู้ใช้" });
  if (user.token <= 0) return res.status(400).json({ error: "Token ไม่พอ" });

  const total = Object.values(itemRates).reduce((sum, i) => sum + i.rate, 0);
  const rand = Math.random() * total;
  let cumulative = 0;
  let selectedItem = null;
  for (const [key, item] of Object.entries(itemRates)) {
    cumulative += item.rate;
    if (rand < cumulative) {
      selectedItem = { id: key, ...item };
      break;
    }
  }

  user.token -= 1;
  gachaLogs.push({
    username,
    character,
    item: selectedItem.name,
    image: selectedItem.image,
    timestamp: new Date().toISOString()
  });

  res.json({ item: selectedItem, tokenLeft: user.token });
});

app.post("/admin/token", (req, res) => {
  const { adminUser, targetUser, amount } = req.body;
  if (!users[adminUser] || users[adminUser].role !== "admin") return res.status(403).json({ error: "ไม่ใช่แอดมิน" });
  if (!users[targetUser]) return res.status(404).json({ error: "ไม่พบผู้ใช้" });
  users[targetUser].token += amount;
  res.json({ success: true });
});

app.post("/admin/rates", (req, res) => {
  const { adminUser, rates } = req.body;
  if (!users[adminUser] || users[adminUser].role !== "admin") return res.status(403).json({ error: "ไม่ใช่แอดมิน" });

  for (const [key, value] of Object.entries(rates)) {
    if (itemRates[key]) itemRates[key].rate = value;
  }

  res.json({ success: true });
});

app.post("/admin/upload", upload.single("image"), (req, res) => {
  const { itemId } = req.body;
  if (!itemRates[itemId]) return res.status(400).json({ error: "ไม่พบไอเท็มนี้" });

  const ext = req.file.originalname.split(".").pop();
  const newFilename = `${itemId}.${ext}`;
  fs.renameSync(req.file.path, "images/" + newFilename);
  itemRates[itemId].image = newFilename;
  res.json({ success: true });
});

app.get("/admin/logs", (req, res) => {
  const { adminUser } = req.query;
  if (!users[adminUser] || users[adminUser].role !== "admin") return res.status(403).json({ error: "ไม่ใช่แอดมิน" });
  res.json({ logs: gachaLogs });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server started on port", PORT));
