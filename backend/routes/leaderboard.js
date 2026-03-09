const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// ── GET LEADERBOARD ───────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { pincode } = req.query;

    let query = `
      SELECT l.*, u.name, u.pincode
      FROM leaderboard l
      JOIN users u ON l.user_id = u.id
    `;
    const params = [];

    if (pincode) {
      query += ' WHERE u.pincode = ?';
      params.push(pincode);
    }

    query += ' ORDER BY l.score DESC LIMIT 20';

    const [rows] = await db.query(query, params);

    // Add rank number
    const ranked = rows.map((row, i) => ({
      rank: i + 1,
      name: row.name,
      pincode: row.pincode,
      total_pickups: row.total_pickups,
      total_waste_kg: parseFloat(row.total_waste_kg || 0).toFixed(1),
      total_co2_saved: parseFloat(row.total_co2_saved || 0).toFixed(1),
      total_points: row.total_points,
      score: row.score,
      is_you: row.user_id === req.user.id
    }));

    res.json(ranked);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
