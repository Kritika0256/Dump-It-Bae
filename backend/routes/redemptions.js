const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Voucher costs in points
const VOUCHER_POINTS = {
  50: 500,
  100: 1000,
  200: 2000,
  500: 5000
};

const VALID_BRANDS = ['zomato', 'swiggy', 'amazon', 'flipkart', 'bookmyshow', 'bigbasket'];

// Generate fake voucher code
function generateCode(brand, amount) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = brand.toUpperCase().substring(0, 3) + amount + '-';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ── REDEEM VOUCHER ────────────────────────
router.post('/redeem', auth, async (req, res) => {
  try {
    const { brand, voucher_amount } = req.body;

    if (!brand || !voucher_amount) {
      return res.status(400).json({ error: 'Brand and voucher amount are required' });
    }

    if (!VALID_BRANDS.includes(brand.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid brand' });
    }

    const points_needed = VOUCHER_POINTS[voucher_amount];
    if (!points_needed) {
      return res.status(400).json({ error: 'Invalid voucher amount. Choose 50, 100, 200 or 500' });
    }

    // Check user points
    const [users] = await db.query('SELECT gift_points FROM users WHERE id = ?', [req.user.id]);
    if (users[0].gift_points < points_needed) {
      return res.status(400).json({
        error: `Not enough points. You need ${points_needed} pts but have ${users[0].gift_points} pts`
      });
    }

    // Deduct points
    await db.query('UPDATE users SET gift_points = gift_points - ? WHERE id = ?', [points_needed, req.user.id]);

    // Generate voucher code
    const voucher_code = generateCode(brand, voucher_amount);

    // Save redemption
    const [result] = await db.query(
      'INSERT INTO redemptions (user_id, brand, voucher_amount, points_used, voucher_code, status) VALUES (?, ?, ?, ?, ?, "sent")',
      [req.user.id, brand, voucher_amount, points_needed, voucher_code]
    );

    res.json({
      message: `🎁 ₹${voucher_amount} ${brand} voucher redeemed!`,
      voucher_code,
      points_used: points_needed,
      redemption_id: result.insertId
    });

  } catch (err) {
    console.error('Redeem error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET MY REDEMPTIONS ────────────────────
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
