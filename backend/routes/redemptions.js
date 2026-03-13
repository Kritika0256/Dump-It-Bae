const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Generate voucher code
function generateCode(brand, amount) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const prefix = brand.replace(/[^a-zA-Z]/g, '').toUpperCase().substring(0, 4);
  let code = prefix + amount + '-';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ── REDEEM VOUCHER ────────────────────────
router.post('/redeem', auth, async (req, res) => {
  try {
    const { brand, points_used, voucher_amount } = req.body;

    if (!brand || !points_used) {
      return res.status(400).json({ error: 'Brand and points_used are required' });
    }

    const pointsNeeded = parseInt(points_used);
    if (isNaN(pointsNeeded) || pointsNeeded <= 0) {
      return res.status(400).json({ error: 'Invalid points amount' });
    }

    // Check user has enough points
    const [users] = await db.query(
      'SELECT gift_points FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!users[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (users[0].gift_points < pointsNeeded) {
      return res.status(400).json({
        error: `Not enough points! You need ${pointsNeeded} pts but have ${users[0].gift_points} pts`
      });
    }

    // Deduct points from user
    await db.query(
      'UPDATE users SET gift_points = gift_points - ? WHERE id = ?',
      [pointsNeeded, req.user.id]
    );

    // Generate voucher code
    const voucher_code = generateCode(brand, voucher_amount || pointsNeeded);

    // Save redemption record
    const [result] = await db.query(
      'INSERT INTO redemptions (user_id, brand, voucher_amount, points_used, voucher_code, status) VALUES (?, ?, ?, ?, ?, "sent")',
      [req.user.id, brand, voucher_amount || 0, pointsNeeded, voucher_code]
    );

    // Get updated points
    const [updated] = await db.query(
      'SELECT gift_points FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json({
      message: `🎁 ${brand} redeemed successfully!`,
      voucher_code,
      points_used: pointsNeeded,
      remaining_points: updated[0].gift_points,
      redemption_id: result.insertId
    });

  } catch (err) {
    console.error('Redeem error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET MY REDEMPTION HISTORY ─────────────
router.get('/', auth, async (req, res) => {
  try {
    const [redemptions] = await db.query(
      'SELECT * FROM redemptions WHERE user_id = ? ORDER BY redeemed_at DESC',
      [req.user.id]
    );
    res.json(redemptions);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
