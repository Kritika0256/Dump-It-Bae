const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: __dirname + '/.env' });

const app = express();

// ── CREATE UPLOADS FOLDER ─────────────────
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// ── MIDDLEWARE ────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend files
app.use(express.static(path.join(__dirname, '../')));

// ── ROUTES ────────────────────────────────
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/bookings',    require('./routes/bookings'));
app.use('/api/pickups',     require('./routes/pickups'));
app.use('/api/redemptions', require('./routes/redemptions'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/uploads',     require('./routes/uploads'));

// ── CALCULATOR (C++ engine logic) ─────────
app.post('/api/calculator', (req, res) => {
  const { wet_kg, dry_kg, bulk_kg, ewaste_kg, household_size, frequency } = req.body;

  const CO2 = { wet: 0.5, dry: 0.8, bulk: 0.3, ewaste: 2.0 };
  const PTS = { wet: 10, dry: 25, bulk: 8, ewaste: 50 };
  const FREQ = { daily: 1, alternate: 0.5, weekly: 1/7 };
  const SIZE = { 1: 1.0, 2: 1.6, 3: 2.2, 4: 3.0 };

  const freq = FREQ[frequency] || 1;
  const size = SIZE[household_size] || 1.0;

  const wet = parseFloat(wet_kg || 0);
  const dry = parseFloat(dry_kg || 0);
  const bulk = parseFloat(bulk_kg || 0);
  const ewaste = parseFloat(ewaste_kg || 0);

  const total_daily = (wet + dry + bulk + ewaste) * size * freq;
  const co2_saved = (wet * CO2.wet + dry * CO2.dry + bulk * CO2.bulk + ewaste * CO2.ewaste) * size * freq;
  const monthly_pts = Math.round((wet * PTS.wet + dry * PTS.dry + bulk * PTS.bulk + ewaste * PTS.ewaste) * size * 30 * freq);

  let recommended_plan = 'monthly';
  if (total_daily < 0.5) recommended_plan = '15day';
  else if (total_daily >= 1.5) recommended_plan = 'quarterly';

  res.json({
    total_daily_kg: parseFloat(total_daily.toFixed(2)),
    co2_saved_monthly: parseFloat((co2_saved * 30).toFixed(2)),
    monthly_gift_points: monthly_pts,
    recommended_plan,
    breakdown: { wet, dry, bulk, ewaste }
  });
});

// ── HEALTH CHECK ──────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'DumpIt Bae backend is running! 🚀', time: new Date() });
});

// ── START SERVER ──────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════╗
  ║   🗑️  DumpIt Bae Backend           ║
  ║   Running on http://localhost:${PORT}  ║
  ║   MySQL: port ${process.env.DB_PORT}              ║
  ╚════════════════════════════════════╝
  `);
});
