const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Package prices
const PRICES = { '15day': 299, 'monthly': 499, 'quarterly': 1199 };
const DURATION_DAYS = { '15day': 15, 'monthly': 30, 'quarterly': 90 };

// ── CREATE BOOKING ────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { package_type, waste_types, start_date, pickup_time } = req.body;

    if (!package_type || !waste_types || !start_date) {
      return res.status(400).json({ error: 'Package type, waste types and start date are required' });
    }

    const amount = PRICES[package_type];
    const days = DURATION_DAYS[package_type];
    const start = new Date(start_date);
    const end = new Date(start);
    end.setDate(end.getDate() + days);

    const waste_str = Array.isArray(waste_types) ? waste_types.join(',') : waste_types;

    const [result] = await db.query(
      'INSERT INTO bookings (user_id, package_type, waste_types, start_date, end_date, pickup_time, amount) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, package_type, waste_str, start_date, end.toISOString().split('T')[0], pickup_time || '7:00 AM - 9:00 AM', amount]
    );

    // Schedule pickups
    await schedulePickups(req.user.id, result.insertId, start, end, waste_str.split(','));

    res.status(201).json({
      message: 'Booking created successfully!',
      booking_id: result.insertId,
      amount,
      end_date: end.toISOString().split('T')[0]
    });

  } catch (err) {
    console.error('Booking error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Schedule daily pickups
async function schedulePickups(user_id, booking_id, start, end, waste_types) {
  const POINTS = { wet: 50, dry: 80, bulk: 120, ewaste: 200 };
  const CO2 = { wet: 0.5, dry: 0.8, bulk: 0.3, ewaste: 2.0 };

  let current = new Date(start);
  while (current <= end) {
    for (const wt of waste_types) {
      const wtype = wt.trim();
      await db.query(
        'INSERT INTO pickups (user_id, booking_id, pickup_date, waste_type, points_earned, co2_saved, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [user_id, booking_id, current.toISOString().split('T')[0], wtype, POINTS[wtype] || 50, CO2[wtype] || 0.5, 'scheduled']
      );
    }
    current.setDate(current.getDate() + 1);
  }
}

// ── GET ALL MY BOOKINGS ───────────────────
router.get('/', auth, async (req, res) => {
  try {
    const [bookings] = await db.query(
      'SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET ONE BOOKING ───────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM bookings WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── CANCEL BOOKING ────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query(
      'UPDATE bookings SET status = "cancelled" WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Booking cancelled' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
