const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Points per waste type (C++ engine logic in JS)
const POINTS = { wet: 50, dry: 80, bulk: 120, ewaste: 200 };
const CO2_PER_KG = { wet: 0.5, dry: 0.8, bulk: 0.3, ewaste: 2.0 };

// ── GET MY PICKUPS ────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const [pickups] = await db.query(
      'SELECT * FROM pickups WHERE user_id = ? ORDER BY pickup_date DESC LIMIT 30',
      [req.user.id]
    );
    res.json(pickups);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET UPCOMING PICKUPS ──────────────────
router.get('/upcoming', auth, async (req, res) => {
  try {
    const [pickups] = await db.query(
      'SELECT * FROM pickups WHERE user_id = ? AND status = "scheduled" AND pickup_date >= CURDATE() ORDER BY pickup_date ASC LIMIT 10',
      [req.user.id]
    );
    res.json(pickups);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── COMPLETE A PICKUP ─────────────────────
router.post('/:id/complete', auth, async (req, res) => {
  try {
    const { weight_kg, collector_name, notes } = req.body;
    const wt = parseFloat(weight_kg) || 1.0;

    // Get pickup info
    const [rows] = await db.query(
      'SELECT * FROM pickups WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Pickup not found' });

    const pickup = rows[0];
    const points = POINTS[pickup.waste_type] || 50;
    const co2 = parseFloat((wt * CO2_PER_KG[pickup.waste_type] || 0.5).toFixed(2));

    // Update pickup
    await db.query(
      'UPDATE pickups SET status = "completed", weight_kg = ?, points_earned = ?, co2_saved = ?, collector_name = ?, notes = ? WHERE id = ?',
      [wt, points, co2, collector_name, notes, req.params.id]
    );

    // Add points to user
    await db.query(
      'UPDATE users SET gift_points = gift_points + ?, streak_days = streak_days + 1, last_pickup_date = CURDATE() WHERE id = ?',
      [points, req.user.id]
    );

    // Update leaderboard
    await db.query(
      `INSERT INTO leaderboard (user_id, total_waste_kg, total_pickups, total_co2_saved, total_points, score)
       VALUES (?, ?, 1, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         total_waste_kg = total_waste_kg + ?,
         total_pickups = total_pickups + 1,
         total_co2_saved = total_co2_saved + ?,
         total_points = total_points + ?,
         score = total_waste_kg * 10 + streak_record * 5 + total_pickups * 2 + total_co2_saved * 8`,
      [req.user.id, wt, co2, points, points * 10, wt, co2, points]
    );

    res.json({ message: 'Pickup completed!', points_earned: points, co2_saved: co2 });

  } catch (err) {
    console.error('Complete pickup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET MY STATS ──────────────────────────
router.get('/stats', auth, async (req, res) => {
  try {
    const [user] = await db.query(
      'SELECT gift_points, streak_days FROM users WHERE id = ?',
      [req.user.id]
    );

    const [stats] = await db.query(
      'SELECT SUM(weight_kg) as total_waste, SUM(co2_saved) as total_co2, COUNT(*) as total_pickups FROM pickups WHERE user_id = ? AND status = "completed"',
      [req.user.id]
    );

    const [rank] = await db.query(
      'SELECT COUNT(*) + 1 as rank FROM leaderboard WHERE score > (SELECT score FROM leaderboard WHERE user_id = ?)',
      [req.user.id]
    );

    res.json({
      gift_points: user[0]?.gift_points || 0,
      streak_days: user[0]?.streak_days || 0,
      total_waste_kg: parseFloat(stats[0]?.total_waste || 0).toFixed(1),
      total_co2_saved: parseFloat(stats[0]?.total_co2 || 0).toFixed(1),
      total_pickups: stats[0]?.total_pickups || 0,
      neighbourhood_rank: rank[0]?.rank || 1
    });

  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
