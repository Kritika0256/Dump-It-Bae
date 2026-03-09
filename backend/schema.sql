-- ============================================
-- DumpIt Bae — Full Database Schema
-- Run this in MySQL after creating dumpit_bae
-- ============================================

USE dumpit_bae;

-- ── USERS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(15),
  password_hash VARCHAR(255) NOT NULL,
  address TEXT,
  pincode VARCHAR(10),
  gift_points INT DEFAULT 0,
  streak_days INT DEFAULT 0,
  last_pickup_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── BOOKINGS ───────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  package_type ENUM('15day', 'monthly', 'quarterly') NOT NULL,
  waste_types SET('wet', 'dry', 'bulk', 'ewaste') NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  pickup_time VARCHAR(30) DEFAULT '7:00 AM - 9:00 AM',
  status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── PICKUPS ────────────────────────────────
CREATE TABLE IF NOT EXISTS pickups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  booking_id INT NOT NULL,
  pickup_date DATE NOT NULL,
  waste_type ENUM('wet', 'dry', 'bulk', 'ewaste') NOT NULL,
  weight_kg DECIMAL(5,2) DEFAULT 0,
  points_earned INT DEFAULT 0,
  co2_saved DECIMAL(6,2) DEFAULT 0,
  status ENUM('scheduled', 'completed', 'missed') DEFAULT 'scheduled',
  collector_name VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- ── VOUCHER REDEMPTIONS ────────────────────
CREATE TABLE IF NOT EXISTS redemptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  brand VARCHAR(50) NOT NULL,
  voucher_amount DECIMAL(8,2) NOT NULL,
  points_used INT NOT NULL,
  voucher_code VARCHAR(50),
  status ENUM('pending', 'sent', 'used') DEFAULT 'pending',
  redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── LEADERBOARD ────────────────────────────
CREATE TABLE IF NOT EXISTS leaderboard (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  total_waste_kg DECIMAL(8,2) DEFAULT 0,
  total_pickups INT DEFAULT 0,
  total_co2_saved DECIMAL(8,2) DEFAULT 0,
  total_points INT DEFAULT 0,
  streak_record INT DEFAULT 0,
  score INT DEFAULT 0,
  pincode VARCHAR(10),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── FILE UPLOADS ───────────────────────────
CREATE TABLE IF NOT EXISTS uploads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  pickup_id INT,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type VARCHAR(50),
  file_size INT,
  upload_type ENUM('waste_photo', 'profile_pic', 'document') DEFAULT 'waste_photo',
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── SAMPLE DATA ────────────────────────────
INSERT INTO users (name, email, phone, password_hash, address, pincode, gift_points, streak_days) VALUES
('Rahul Sharma', 'rahul@example.com', '9876543210', '$2a$10$example_hash_here', '12 MG Road, Koramangala', '560034', 1850, 18),
('Priya Mehta', 'priya@example.com', '9876543211', '$2a$10$example_hash_here', '45 Indiranagar', '560038', 4210, 30),
('Arun Kumar', 'arun@example.com', '9876543212', '$2a$10$example_hash_here', '78 Whitefield', '560066', 3890, 25);
