const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, 'swiftship.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL CHECK(role IN ('customer','admin','driver')),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS drivers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  vehicle_type TEXT,
  vehicle_reg TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tracking_number TEXT UNIQUE NOT NULL,
  customer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  pickup_address TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  package_description TEXT,
  package_weight REAL,
  package_type TEXT,
  pickup_date TEXT,
  delivery_date TEXT,
  special_instructions TEXT,
  delivery_type TEXT,
  estimated_cost REAL,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK(status IN ('PENDING','CONFIRMED','PICKED UP','IN TRANSIT','OUT FOR DELIVERY','DELIVERED','CANCELLED')),
  driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  delivery_id INTEGER NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by TEXT,
  changed_by_role TEXT,
  note TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pricing_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  base_fee REAL NOT NULL,
  per_kg REAL NOT NULL,
  per_zone REAL NOT NULL,
  multiplier REAL NOT NULL DEFAULT 1.0,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS counters (
  key TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);
`);

const pricingCount = db.prepare('SELECT COUNT(*) c FROM pricing_rules').get().c;
if (pricingCount === 0) {
  const ins = db.prepare('INSERT INTO pricing_rules (name,base_fee,per_kg,per_zone,multiplier) VALUES (?,?,?,?,?)');
  ins.run('Standard', 5, 1.5, 3, 1.0);
  ins.run('Express', 10, 2.5, 5, 1.6);
  ins.run('Same Day', 20, 4, 8, 2.5);
  ins.run('International', 35, 8, 15, 3.2);
  console.log('Pricing rules seeded');
}

const adminEmail = 'admin@swiftship.com';
const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
if (!adminExists) {
  const hash = bcrypt.hashSync('Admin123!', 10);
  db.prepare('INSERT INTO users (role,name,email,phone,password_hash) VALUES (?,?,?,?,?)')
    .run('admin', 'Administrator', adminEmail, '+10000000000', hash);
  console.log('Admin account seeded:', adminEmail);
}

function nextTrackingNumber() {
  const year = new Date().getFullYear();
  const seqKey = 'tracking_seq_' + year;
  db.prepare('INSERT OR IGNORE INTO counters (key,value) VALUES (?,0)').run(seqKey);
  const tx = db.transaction(() => {
    db.prepare('UPDATE counters SET value = value + 1 WHERE key = ?').run(seqKey);
    return db.prepare('SELECT value FROM counters WHERE key = ?').get(seqKey).value;
  });
  const seq = tx();
  return 'DLV-' + year + '-' + String(seq).padStart(6, '0');
}

module.exports = { db, nextTrackingNumber };