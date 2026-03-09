const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../db');
const auth = require('../middleware/auth');

// ── MULTER CONFIG ─────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|pdf/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) cb(null, true);
  else cb(new Error('Only images and PDFs are allowed'));
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter
});

// ── UPLOAD FILE ───────────────────────────
router.post('/', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { pickup_id, upload_type } = req.body;

    const [result] = await db.query(
      'INSERT INTO uploads (user_id, pickup_id, file_name, file_path, file_type, file_size, upload_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        req.user.id,
        pickup_id || null,
        req.file.originalname,
        req.file.path,
        req.file.mimetype,
        req.file.size,
        upload_type || 'waste_photo'
      ]
    );

    res.status(201).json({
      message: 'File uploaded successfully!',
      file_id: result.insertId,
      file_name: req.file.originalname,
      file_path: `/uploads/${req.file.filename}`,
      file_size: req.file.size
    });

  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

// ── GET MY UPLOADS ────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const [files] = await db.query(
      'SELECT * FROM uploads WHERE user_id = ? ORDER BY uploaded_at DESC',
      [req.user.id]
    );
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── DELETE FILE ───────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM uploads WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'File not found' });

    await db.query('DELETE FROM uploads WHERE id = ?', [req.params.id]);
    res.json({ message: 'File deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
