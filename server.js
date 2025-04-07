import express from "express";
import cors from "cors";
import fs from "fs-extra";
import multer from "multer";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

const DATA_FILE = './data.json';

// โหลดข้อมูลจากไฟล์ JSON
let data = { users: {}, items: [], logs: [] };
const loadData = async () => {
  if (await fs.pathExists(DATA_FILE)) {
    data = await fs.readJson(DATA_FILE);
  }
};
const saveData = async () => {
  await fs.writeJson(DATA_FILE, data, { spaces: 2 });
};
await loadData();

// Multer สำหรับอัปโหลดรูปภาพ
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, './uploads'),
  filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage });

// ====== AUTH ======
app.post("/auth/login", (req, res) => {
  const { username, password } = req.body;
  const user = data.users[username];
  if (!user || user.password !== password) {
    return res.status(401).json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
  }
  res.json({ user: { username, token: user.token, role: user.role } });
});

app.post("/auth/register", async (req, res) => {
  const { username, password } = req.body;
  if (data.users[username]) {
    return res.status(400).json({ error: "มีผู้ใช้นี้อยู่แล้ว" });
  }
  data.users[username] = { password, role: "user", token: 5 };
  await saveData();
  res.json({ success: true });
});

// ====== ADMIN - TOKEN & ITEM MANAGEMENT ======
app.post("/admin/update-token", async (req, res) => {
  const { username, token } = req.body;
  if (!data.users[username]) return res.status(404).json({ error: "ไม่พบผู้ใช้" });
  data.users[username].token = token;
  await saveData();
  res.json({ success: true });
});

app.post("/admin/add-item", upload.single("image"), async (req, res) => {
  const { name, chance } = req.body;
  const image = req.file?.filename || "default.png";
  data.items.push({ name, image, chance: parseFloat(chance) });
  await saveData();
  res.json({ success: true });
});

app.get("/admin/logs", (req, res) => {
  res.json(data.logs);
});

app.get("/admin/items", (req, res) => {
  res.json(data.items);
});

// ====== GACHA ======
app.post("/gacha", async (req, res) => {
  const { username, characterName } = req.body;
  const user = data.users[username];
  if (!user) return res.status(404).json({ error: "ไม่พบผู้ใช้" });
  if (user.token <= 0) return res.status(400).json({ error: "Token ไม่พอ" });

  // คำนวณสุ่มตามอัตรา chance
  const rand = Math.random();
  let total = 0;
  const item = data.items.find(it => {
    total += it.chance;
    return rand <= total;
  }) || data.items[data.items.length - 1];

  user.token -= 1;
  const log = { username, characterName, item: item.name, image: item.image, date: new Date().toISOString() };
  data.logs.push(log);

  await saveData();
  res.json({ item, tokenLeft: user.token });
});

// ตรวจสอบ backend
app.get("/", (req, res) => {
  res.send("✅ WARZONE Backend is running!");
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
