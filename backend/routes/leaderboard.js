const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// ── GET LEADERBOARD ───────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        u.id          as user_id,
        u.name,
        u.gift_points as total_points,
        u.streak_days,
        COALESCE(l.total_waste_kg,  0) as total_waste_kg,
        COALESCE(l.total_pickups,   0) as total_pickups,
        COALESCE(l.total_co2_saved, 0) as total_co2_saved
      FROM users u
      LEFT JOIN leaderboard l ON u.id = l.user_id
      WHERE u.gift_points > 0
      ORDER BY u.gift_points DESC, u.streak_days DESC
      LIMIT 20
    `);

    // Always include current user even if 0 pts
    const currentUserId = req.user.id;
    const alreadyIncluded = rows.some(r => r.user_id === currentUserId);

    if (!alreadyIncluded) {
      const [me] = await db.query(
        'SELECT id as user_id, name, gift_points as total_points, streak_days FROM users WHERE id = ?',
        [currentUserId]
      );
      if (me[0]) rows.push({ ...me[0], total_waste_kg: 0, total_pickups: 0, total_co2_saved: 0 });
    }

    const ranked = rows.map((row, i) => ({
      rank:            i + 1,
      user_id:         row.user_id,
      name:            row.name,
      total_points:    row.total_points    || 0,
      total_pickups:   row.total_pickups   || 0,
      total_waste_kg:  parseFloat(row.total_waste_kg  || 0).toFixed(1),
      total_co2_saved: parseFloat(row.total_co2_saved || 0).toFixed(1),
      streak_days:     row.streak_days     || 0,
      is_you:          row.user_id === currentUserId
    }));

    res.json(ranked);
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
