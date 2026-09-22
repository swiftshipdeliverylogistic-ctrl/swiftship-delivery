const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, nextTrackingNumber } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'swiftship_secret_2026';

app.use(express.json());
app.use(express.static('public'));

function sign(u) {
  return jwt.sign({ id: u.id, role: u.role, email: u.email, name: u.name }, JWT_SECRET, { expiresIn: '7d' });
}

function auth(required = true) {
  return (req, res, next) => {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return required ? res.status(401).json({ error: 'Authentication required' }) : next();
    try { req.user = jwt.verify(token, JWT_SECRET); next(); }
    catch { return required ? res.status(401).json({ error: 'Invalid token' }) : next(); }
  };
}

function role(...r) {
  return (req, res, next) => (!req.user || !r.includes(req.user.role)) ? res.status(403).json({ error: 'Forbidden' }) : next();
}

function isEmail(s) { return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); }

function logStatus(deliveryId, prev, next, user, note) {
  db.prepare('INSERT INTO status_history (delivery_id, previous_status, new_status, changed_by, changed_by_role, note) VALUES (?,?,?,?,?,?)')
    .run(deliveryId, prev, next, user ? (user.name || user.email) : 'system', user ? user.role : 'system', note || null);
}

function estimateZone(a, b) {
  if (!a || !b) return 1;
  const x = a.toLowerCase().trim(), y = b.toLowerCase().trim();
  if (x === y) return 1;
  const sA = new Set(x.split(/[,\s]+/)), sB = new Set(y.split(/[,\s]+/));
  let c = 0; for (const w of sA) if (sB.has(w)) c++;
  return 1 + Math.round((1 - c / Math.max(sA.size, sB.size, 1)) * 2);
}

app.get('/', (req, res) => res.json({ company: 'SwiftShip Delivery', status: 'running' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', company: 'SwiftShip Delivery' }));

app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, phone, password } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, password required' });
    if (!isEmail(email)) return res.status(400).json({ error: 'Invalid email' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be 6+ characters' });
    const exists = db.prepare('SELECT id FROM users WHERE email=?').get(email.toLowerCase());
    if (exists) return res.status(409).json({ error: 'Email already registered' });
    const hash = bcrypt.hashSync(password, 10);
    const info = db.prepare("INSERT INTO users (role,name,email,phone,password_hash) VALUES ('customer',?,?,?,?)")
      .run(name.trim(), email.toLowerCase(), phone || null, hash);
    const user = db.prepare('SELECT id,role,name,email,phone FROM users WHERE id=?').get(info.lastInsertRowid);
    res.json({ token: sign(user), user });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Registration failed' }); }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const u = db.prepare('SELECT * FROM users WHERE email=?').get(email.toLowerCase());
    if (!u || !bcrypt.compareSync(password, u.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
    const { password_hash, ...safe } = u;
    res.json({ token: sign(safe), user: safe });
  } catch (e) { res.status(500).json({ error: 'Login failed' }); }
});

app.get('/api/auth/me', auth(), (req, res) => {
  const u = db.prepare('SELECT id,role,name,email,phone,created_at FROM users WHERE id=?').get(req.user.id);
  if (!u) return res.status(404).json({ error: 'User not found' });
  res.json({ user: u });
});
app.put('/api/auth/profile', auth(), (req, res) => {
  const { name, phone } = req.body || {};
  db.prepare('UPDATE users SET name=COALESCE(?,name), phone=COALESCE(?,phone) WHERE id=?').run(name || null, phone || null, req.user.id);
  res.json({ user: db.prepare('SELECT id,role,name,email,phone FROM users WHERE id=?').get(req.user.id) });
});

app.get('/api/pricing', (req, res) => res.json({ rules: db.prepare('SELECT * FROM pricing_rules WHERE active=1').all() }));

app.put('/api/pricing/:id', auth(), role('admin'), (req, res) => {
  const r = db.prepare('SELECT * FROM pricing_rules WHERE id=?').get(req.params.id);
  if (!r) return res.status(404).json({ error: 'Rule not found' });
  const b = req.body || {};
  db.prepare('UPDATE pricing_rules SET base_fee=?,per_kg=?,per_zone=?,multiplier=?,active=? WHERE id=?')
    .run(b.base_fee ?? r.base_fee, b.per_kg ?? r.per_kg, b.per_zone ?? r.per_zone, b.multiplier ?? r.multiplier, b.active ?? r.active, req.params.id);
  res.json({ rule: db.prepare('SELECT * FROM pricing_rules WHERE id=?').get(req.params.id) });
});

app.post('/api/quote', (req, res) => {
  const { pickup, delivery, weight, delivery_type } = req.body || {};
  if (!pickup || !delivery) return res.status(400).json({ error: 'Pickup and delivery required' });
  const w = Math.max(0.1, Number(weight) || 1);
  const r = db.prepare('SELECT * FROM pricing_rules WHERE name=? AND active=1').get(delivery_type || 'Standard')
         || db.prepare('SELECT * FROM pricing_rules WHERE active=1 LIMIT 1').get();
  const zone = estimateZone(pickup, delivery);
  const cost = (r.base_fee + r.per_kg * w + r.per_zone * zone) * r.multiplier;
  res.json({
    estimated_cost: Math.round(cost * 100) / 100, currency: 'USD', zone_multiplier: zone,
    breakdown: { base_fee: r.base_fee, per_kg: r.per_kg, weight: w, per_zone: r.per_zone, zone, multiplier: r.multiplier, delivery_type: r.name },
    note: 'Estimated Delivery Cost — final price confirmed on pickup.'
  });
});

app.post('/api/deliveries', auth(false), (req, res) => {
  try {
    const b = req.body || {};
    for (const f of ['customer_name','customer_phone','customer_email','pickup_address','delivery_address'])
      if (!b[f]) return res.status(400).json({ error: 'Missing: ' + f });
    if (!isEmail(b.customer_email)) return res.status(400).json({ error: 'Invalid email' });

    const r = db.prepare('SELECT * FROM pricing_rules WHERE name=? AND active=1').get(b.delivery_type || 'Standard')
           || db.prepare('SELECT * FROM pricing_rules WHERE active=1 LIMIT 1').get();
    const w = Math.max(0.1, Number(b.package_weight) || 1);
    const zone = estimateZone(b.pickup_address, b.delivery_address);
    let cost;
if (b.estimated_cost && Number(b.estimated_cost) > 0) cost = Number(b.estimated_cost);
else cost = (r.base_fee + r.per_kg * w + r.per_zone * zone) * r.multiplier;
const tracking = nextTrackingNumber();
    const cid = req.user && req.user.role === 'customer' ? req.user.id : null;

    const info = db.prepare(`INSERT INTO deliveries
      (tracking_number,customer_id,customer_name,customer_phone,customer_email,pickup_address,delivery_address,
       package_description,package_weight,package_type,pickup_date,delivery_date,special_instructions,
       delivery_type,estimated_cost,status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'PENDING')`)
      .run(tracking, cid, b.customer_name, b.customer_phone, b.customer_email, b.pickup_address, b.delivery_address,
           b.package_description || null, w, b.package_type || 'Parcel', b.pickup_date || null, b.delivery_date || null,
           b.special_instructions || null, r.name, Math.round(cost * 100) / 100);

    logStatus(info.lastInsertRowid, null, 'PENDING', req.user, 'Delivery created');
    res.json({ delivery: db.prepare('SELECT * FROM deliveries WHERE id=?').get(info.lastInsertRowid) });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not create delivery' }); }
});

app.get('/api/customers', auth(), role('admin'), (req, res) => {
  res.json({ customers: db.prepare(`SELECT u.id,u.name,u.email,u.phone,u.created_at,
    (SELECT COUNT(*) FROM deliveries d WHERE d.customer_id=u.id) AS delivery_count
    FROM users u WHERE u.role='customer' ORDER BY u.created_at DESC`).all() });
});

app.get('/api/drivers', auth(), role('admin'), (req, res) => {
  res.json({ drivers: db.prepare('SELECT d.*, u.email AS user_email FROM drivers d LEFT JOIN users u ON u.id=d.user_id ORDER BY d.created_at DESC').all() });
});

app.post('/api/drivers', auth(), role('admin'), (req, res) => {
  try {
    const { name, phone, email, vehicle_type, vehicle_reg, password } = req.body || {};
    if (!name || !email) return res.status(400).json({ error: 'Name and email required' });
    if (!isEmail(email)) return res.status(400).json({ error: 'Invalid email' });
    const pwd = password || Math.random().toString(36).slice(2, 10);
    const hash = bcrypt.hashSync(pwd, 10);
    let userId;
    const ex = db.prepare('SELECT id FROM users WHERE email=?').get(email.toLowerCase());
    if (ex) userId = ex.id;
    else userId = db.prepare("INSERT INTO users (role,name,email,phone,password_hash) VALUES ('driver',?,?,?,?)")
      .run(name, email.toLowerCase(), phone || null, hash).lastInsertRowid;
    const info = db.prepare('INSERT INTO drivers (user_id,name,phone,email,vehicle_type,vehicle_reg,active) VALUES (?,?,?,?,?,?,1)')
      .run(userId, name, phone || null, email.toLowerCase(), vehicle_type || null, vehicle_reg || null);
    res.json({ driver: db.prepare('SELECT * FROM drivers WHERE id=?').get(info.lastInsertRowid), temporary_password: pwd });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not create driver' }); }
});

app.put('/api/drivers/:id', auth(), role('admin'), (req, res) => {
  const d = db.prepare('SELECT * FROM drivers WHERE id=?').get(req.params.id);
  if (!d) return res.status(404).json({ error: 'Not found' });
  const b = req.body || {};
  db.prepare(`UPDATE drivers SET name=COALESCE(?,name), phone=COALESCE(?,phone), email=COALESCE(?,email),
    vehicle_type=COALESCE(?,vehicle_type), vehicle_reg=COALESCE(?,vehicle_reg), active=COALESCE(?,active) WHERE id=?`)
    .run(b.name ?? null, b.phone ?? null, b.email ? b.email.toLowerCase() : null, b.vehicle_type ?? null, b.vehicle_reg ?? null,
         b.active === undefined ? null : (b.active ? 1 : 0), req.params.id);
  res.json({ driver: db.prepare('SELECT * FROM drivers WHERE id=?').get(req.params.id) });
});

app.get('/api/driver/me/deliveries', auth(), role('driver'), (req, res) => {
  const dr = db.prepare('SELECT * FROM drivers WHERE user_id=?').get(req.user.id);
  if (!dr) return res.json({ deliveries: [], driver: null });
  res.json({ deliveries: db.prepare('SELECT * FROM deliveries WHERE driver_id=? ORDER BY created_at DESC').all(dr.id), driver: dr });
});

app.get('/api/stats', auth(), role('admin'), (req, res) => {
  const total = db.prepare('SELECT COUNT(*) c FROM deliveries').get().c;
  const byStatus = {};
  for (const s of ['PENDING','CONFIRMED','PICKED UP','IN TRANSIT','OUT FOR DELIVERY','DELIVERED','CANCELLED'])
    byStatus[s] = db.prepare('SELECT COUNT(*) c FROM deliveries WHERE status=?').get(s).c;
  res.json({
    total, byStatus,
    customers: db.prepare("SELECT COUNT(*) c FROM users WHERE role='customer'").get().c,
    drivers: db.prepare('SELECT COUNT(*) c FROM drivers WHERE active=1').get().c,
    revenue: db.prepare("SELECT COALESCE(SUM(estimated_cost),0) s FROM deliveries WHERE status='DELIVERED'").get().s
  });
});

app.post('/api/contact', (req, res) => {
  const { name, email, phone, subject, message } = req.body || {};
  if (!name || !email || !message) return res.status(400).json({ error: 'Name, email, message required' });
  if (!isEmail(email)) return res.status(400).json({ error: 'Invalid email' });
  db.prepare('INSERT INTO contact_messages (name,email,phone,subject,message) VALUES (?,?,?,?,?)')
    .run(name, email.toLowerCase(), phone || null, subject || null, message);
  res.json({ ok: true });
});

app.get('/api/contact', auth(), role('admin'), (req, res) => {
  res.json({ messages: db.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC').all() });
});
// ============================================
app.get('/api/deliveries/:trackingNumber', (req, res) => {
  const d = db.prepare('SELECT d.*, dr.name AS driver_name, dr.phone AS driver_phone, dr.vehicle_type AS driver_vehicle, dr.vehicle_reg AS driver_vehicle_reg FROM deliveries d LEFT JOIN drivers dr ON dr.id=d.driver_id WHERE d.tracking_number=?').get(req.params.trackingNumber);
  if (!d) return res.status(404).json({ error: 'Tracking number not found' });
  const history = db.prepare('SELECT * FROM status_history WHERE delivery_id=? ORDER BY created_at ASC').all(d.id);
  res.json({ delivery: d, history: history });
});
// EMAIL SENDING (uses EmailJS REST API)
// ============================================
app.post('/api/send-booking-email', (req, res) => {
  const d = req.body || {};
  const payload = {
    service_id: "service_gss5ems",
    template_id: "template_hf0vahb",
    user_id: "_iIDm3jmzl0vM8AeB",
    accessToken: "XMY9J-WjBQ5FAomfO2P8x",
    template_params: {
      tracking_number: d.tracking_number || "",
      customer_name: d.customer_name || "",
      customer_phone: d.customer_phone || "",
      customer_email: d.customer_email || "",
      pickup_address: d.pickup_address || "",
      delivery_address: d.delivery_address || "",
      package_type: d.package_type || "",
      package_description: d.package_description || "N/A",
      package_weight: d.package_weight || "1",
      delivery_type: d.delivery_type || "Standard",
      pickup_date: d.pickup_date || "ASAP",
      to_email: "swiftshipdeliverylogistic@gmail.com"
    }
  };

  fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
  .then(function(r) {
    return r.text().then(function(txt) {
      res.status(r.status).json({ ok: r.ok, status: r.status, message: txt });
    });
  })
  .catch(function(err) {
    res.status(500).json({ ok: false, error: err.message });
  });
});
app.listen(PORT, () => {
  console.log('');
  console.log('========================================');
  console.log('  SwiftShip Delivery API is running');
  console.log('========================================');
  console.log('  Server: http://localhost:' + PORT);
  console.log('  Health: http://localhost:' + PORT + '/api/health');
  console.log('');
});