require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const QRCode = require('qrcode');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const Scenario = require('./models/Scenario');
const AssignedRole = require('./models/AssignedRole');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mafia';
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// اتصال به پایگاه داده
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// ابزارها
function generateRandomPassword(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function shuffleArray(array) {
  return array
    .map(value => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

function generateGameId() {
  return Math.random().toString(36).substr(2, 8);
}

// API: دریافت لیست سناریوها
app.get('/api/scenarios', async (req, res) => {
  try {
    const scenarios = await Scenario.find({}, 'name');
    res.json(scenarios);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در دریافت سناریوها' });
  }
});

// API: تخصیص نقش‌ها
app.post('/assign', async (req, res) => {
  const { scenario, playerCount } = req.body;

  if (!scenario || !playerCount || playerCount < 10 || playerCount > 15) {
    return res.status(400).json({ error: 'سناریو و تعداد بازیکن بین 10 تا 15 نفر الزامی است.' });
  }

  try {
    const scenarioData = await Scenario.findOne({ name: scenario });
    if (!scenarioData) {
      return res.status(404).json({ error: `سناریو "${scenario}" یافت نشد.` });
    }

    const roles = scenarioData.roles;
    if (roles.length < playerCount) {
      return res.status(400).json({ error: `تعداد نقش‌ها فقط ${roles.length} است.` });
    }

    const shuffledRoles = shuffleArray(roles).slice(0, playerCount);
    const game_id = "active-game";
    const results = [];

    await AssignedRole.deleteMany({ game_id });

    for (let i = 1; i <= playerCount; i++) {
      const password = generateRandomPassword();
      const role = shuffledRoles[i - 1];

      await AssignedRole.create({
        game_id,
        player_number: i,
        role,
        password
      });

      const qrUrl = `${BASE_URL}/player.html?game_id=${game_id}&player=${i}`;
      const qrImage = await QRCode.toDataURL(qrUrl);

      results.push({
        player: i,
        
        password,
        qrImage,
        link: qrUrl
      });

      console.log(`✅ Player ${i}: [${role}] (Password: ${password})`);
    }

    res.json({ game_id, results });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در تخصیص نقش‌ها' });
  }
});

// ✅ API: دریافت نقش بازیکن با بررسی دقیق رمز
app.post('/get-role', async (req, res) => {
  const { game_id, player_id, password } = req.body;

  if (!game_id || !player_id || !password) {
    return res.status(400).json({ error: 'اطلاعات ورود کامل نیست.' });
  }

  const player_number = parseInt(player_id, 10);
  console.log('🔍 بررسی نقش برای:', { game_id, player_number, password });

  try {
    const assigned = await AssignedRole.findOne({
      game_id: game_id,
      player_number: player_number
    });

    if (!assigned) {
      return res.status(404).json({ error: 'بازیکن با این شناسه پیدا نشد.' });
    }

    if (assigned.password !== password.trim()) {
      return res.status(401).json({ error: 'رمز عبور نادرست است.' });
    }

    res.json({ role: assigned.role });

  } catch (err) {
    console.error('❌ خطا در دریافت نقش:', err);
    res.status(500).json({ error: 'خطا در دریافت نقش' });
  }
});

// API: ریست نقش‌های بازی
app.delete('/reset/:game_id', async (req, res) => {
  const { game_id } = req.params;

  try {
    await AssignedRole.deleteMany({ game_id });
    res.json({ message: `نقش‌ها برای بازی ${game_id} حذف شدند.` });
  } catch (err) {
    res.status(500).json({ error: 'خطا در ریست بازی.' });
  }
});
// API: افزودن سناریوی جدید
app.post('/api/scenarios', async (req, res) => {
  const { name, roles } = req.body;

  if (!name || !roles || !Array.isArray(roles) || roles.length === 0) {
    return res.status(400).json({ error: 'نام و نقش‌ها باید وارد شوند.' });
  }

  try {
    const existing = await Scenario.findOne({ name: name.trim() });
    if (existing) {
      return res.status(409).json({ error: 'سناریویی با این نام قبلاً ثبت شده است.' });
    }

    const newScenario = new Scenario({ name: name.trim(), roles });
    await newScenario.save();

    res.status(201).json({ message: 'سناریو با موفقیت افزوده شد.', scenario: newScenario });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در ذخیره‌سازی سناریو' });
  }
});

// شروع سرور
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
