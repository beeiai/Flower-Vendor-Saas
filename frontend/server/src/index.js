const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const { z } = require('zod');
const { db } = require('./db');

const app = express();

// Security Middleware
// 1. Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
}));

// 2. Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

app.use(limiter);

// 3. Compression
app.use(compression());

// 4. CORS with security restrictions
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] // Restrict in production
    : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// 5. Body parser with limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// --- Security Validation Helper ---
const validateId = (id) => {
  const numId = Number(id);
  if (!Number.isFinite(numId) || numId <= 0) {
    throw new Error('Invalid ID');
  }
  return numId;
};

const sanitizeString = (str, maxLength = 255) => {
  if (typeof str !== 'string') return '';
  return str.trim().substring(0, maxLength).replace(/[<>]/g, '');
};

// --- Groups ---
app.get('/api/groups', (req, res) => {
  try {
    const rows = db.prepare('SELECT id, name FROM groups ORDER BY name').all();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

app.post('/api/groups', (req, res) => {
  const schema = z.object({ 
    name: z.string().trim().min(1).max(100) 
  });
  
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ 
      error: 'Invalid input', 
      details: parsed.error.flatten() 
    });
  }

  try {
    // Sanitize input
    const sanitizedName = sanitizeString(parsed.data.name, 100);
    
    const info = db.prepare('INSERT INTO groups (name) VALUES (?)').run(sanitizedName);
    res.status(201).json({ id: info.lastInsertRowid, name: sanitizedName });
  } catch (e) {
    if (String(e).includes('UNIQUE')) {
      return res.status(409).json({ error: 'Group already exists' });
    }
    console.error('Error creating group:', e);
    return res.status(500).json({ error: 'Failed to create group' });
  }
});

app.delete('/api/groups/:id', (req, res) => {
  try {
    const id = validateId(req.params.id);

    const inUse = db.prepare('SELECT COUNT(1) AS cnt FROM customers WHERE group_id = ?').get(id);
    if (inUse?.cnt > 0) {
      return res.status(409).json({ error: 'Group has customers; remove them first' });
    }

    const info = db.prepare('DELETE FROM groups WHERE id = ?').run(id);
    res.json({ deleted: info.changes });
  } catch (error) {
    if (error.message === 'Invalid ID') {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    console.error('Error deleting group:', error);
    return res.status(500).json({ error: 'Failed to delete group' });
  }
});

// --- Customers ---
app.get('/api/customers', (req, res) => {
  const rows = db.prepare(`
    SELECT c.id, c.name, c.contact, c.address, g.id AS groupId, g.name AS groupName
    FROM customers c
    LEFT JOIN groups g ON g.id = c.group_id
    ORDER BY c.name
  `).all();
  res.json(rows);
});

app.post('/api/customers', (req, res) => {
  const schema = z.object({
    name: z.string().trim().min(1),
    groupId: z.number().int().positive().optional(),
    contact: z.string().trim().optional().default(''),
    address: z.string().trim().optional().default(''),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });

  const { name, groupId, contact, address } = parsed.data;
  try {
    const info = db.prepare('INSERT INTO customers (name, group_id, contact, address) VALUES (?,?,?,?)').run(name, groupId ?? null, contact, address);
    res.status(201).json({ id: info.lastInsertRowid, name, groupId: groupId ?? null, contact, address });
  } catch (e) {
    if (String(e).includes('UNIQUE')) return res.status(409).json({ error: 'Customer already exists' });
    return res.status(500).json({ error: 'Failed to create customer' });
  }
});

app.delete('/api/customers/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
  const info = db.prepare('DELETE FROM customers WHERE id = ?').run(id);
  res.json({ deleted: info.changes });
});

// --- Catalog ---
app.get('/api/catalog', (req, res) => {
  const rows = db.prepare('SELECT id, itemCode, itemName, rate FROM catalog ORDER BY itemName').all();
  res.json(rows);
});

app.post('/api/catalog', (req, res) => {
  const schema = z.object({
    itemCode: z.string().trim().min(1),
    itemName: z.string().trim().min(1),
    rate: z.coerce.number().nonnegative().default(0),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });

  try {
    const info = db.prepare('INSERT INTO catalog (itemCode, itemName, rate) VALUES (?,?,?)').run(parsed.data.itemCode, parsed.data.itemName, parsed.data.rate);
    res.status(201).json({ id: info.lastInsertRowid, ...parsed.data });
  } catch (e) {
    if (String(e).includes('UNIQUE')) return res.status(409).json({ error: 'Item code already exists' });
    return res.status(500).json({ error: 'Failed to create item' });
  }
});

// --- Vehicles ---
app.get('/api/vehicles', (req, res) => {
  const rows = db.prepare('SELECT id, name FROM vehicles ORDER BY name').all();
  res.json(rows);
});

app.post('/api/vehicles', (req, res) => {
  const schema = z.object({ name: z.string().trim().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });

  try {
    const info = db.prepare('INSERT INTO vehicles (name) VALUES (?)').run(parsed.data.name);
    res.status(201).json({ id: info.lastInsertRowid, name: parsed.data.name });
  } catch (e) {
    if (String(e).includes('UNIQUE')) return res.status(409).json({ error: 'Vehicle already exists' });
    return res.status(500).json({ error: 'Failed to create vehicle' });
  }
});

app.delete('/api/vehicles/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
  const info = db.prepare('DELETE FROM vehicles WHERE id = ?').run(id);
  res.json({ deleted: info.changes });
});

// --- Transactions ---
app.get('/api/customers/:customerId/transactions', (req, res) => {
  const customerId = Number(req.params.customerId);
  if (!Number.isFinite(customerId)) return res.status(400).json({ error: 'Invalid customerId' });

  const rows = db.prepare(`
    SELECT id, date, vehicle, itemCode, itemName, qty, rate, laguage, coolie, paidAmt, remarks
    FROM transactions
    WHERE customer_id = ?
    ORDER BY date ASC, id ASC
  `).all(customerId);
  res.json(rows);
});

app.post('/api/customers/:customerId/transactions', (req, res) => {
  const customerId = Number(req.params.customerId);
  if (!Number.isFinite(customerId)) return res.status(400).json({ error: 'Invalid customerId' });

  const schema = z.object({
    date: z.string().trim().min(1),
    vehicle: z.string().trim().optional().default(''),
    itemCode: z.string().trim().optional().default(''),
    itemName: z.string().trim().min(1),
    qty: z.coerce.number().nonnegative().default(0),
    rate: z.coerce.number().nonnegative().default(0),
    laguage: z.coerce.number().nonnegative().default(0),
    coolie: z.coerce.number().nonnegative().default(0),
    paidAmt: z.coerce.number().nonnegative().default(0),
    remarks: z.string().trim().optional().default(''),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });

  const t = parsed.data;
  const info = db.prepare(`
    INSERT INTO transactions (customer_id, date, vehicle, itemCode, itemName, qty, rate, laguage, coolie, paidAmt, remarks)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `).run(customerId, t.date, t.vehicle, t.itemCode, t.itemName, t.qty, t.rate, t.laguage, t.coolie, t.paidAmt, t.remarks);

  res.status(201).json({ id: info.lastInsertRowid, ...t });
});

app.put('/api/customers/:customerId/transactions/replace', (req, res) => {
  const customerId = Number(req.params.customerId);
  if (!Number.isFinite(customerId)) return res.status(400).json({ error: 'Invalid customerId' });

  const rowSchema = z.object({
    date: z.string().trim().min(1),
    vehicle: z.string().trim().optional().default(''),
    itemCode: z.string().trim().optional().default(''),
    itemName: z.string().trim().min(1),
    qty: z.coerce.number().nonnegative().default(0),
    rate: z.coerce.number().nonnegative().default(0),
    laguage: z.coerce.number().nonnegative().default(0),
    coolie: z.coerce.number().nonnegative().default(0),
    paidAmt: z.coerce.number().nonnegative().default(0),
    remarks: z.string().trim().optional().default(''),
  });

  const schema = z.object({ rows: z.array(rowSchema) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM transactions WHERE customer_id = ?').run(customerId);
    const insert = db.prepare(`
      INSERT INTO transactions (customer_id, date, vehicle, itemCode, itemName, qty, rate, laguage, coolie, paidAmt, remarks)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `);
    for (const r of parsed.data.rows) {
      insert.run(customerId, r.date, r.vehicle, r.itemCode, r.itemName, r.qty, r.rate, r.laguage, r.coolie, r.paidAmt, r.remarks);
    }
  });

  tx();
  res.json({ replaced: parsed.data.rows.length });
});

app.put('/api/transactions/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });

  const schema = z.object({
    date: z.string().trim().min(1),
    vehicle: z.string().trim().optional().default(''),
    itemCode: z.string().trim().optional().default(''),
    itemName: z.string().trim().min(1),
    qty: z.coerce.number().nonnegative().default(0),
    rate: z.coerce.number().nonnegative().default(0),
    laguage: z.coerce.number().nonnegative().default(0),
    coolie: z.coerce.number().nonnegative().default(0),
    paidAmt: z.coerce.number().nonnegative().default(0),
    remarks: z.string().trim().optional().default(''),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });

  const t = parsed.data;
  const info = db.prepare(`
    UPDATE transactions
    SET date = ?, vehicle = ?, itemCode = ?, itemName = ?, qty = ?, rate = ?, laguage = ?, coolie = ?, paidAmt = ?, remarks = ?
    WHERE id = ?
  `).run(t.date, t.vehicle, t.itemCode, t.itemName, t.qty, t.rate, t.laguage, t.coolie, t.paidAmt, t.remarks, id);

  res.json({ updated: info.changes });
});

app.delete('/api/transactions/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
  const info = db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
  res.json({ deleted: info.changes });
});

// --- Advances ---
app.get('/api/customers/:customerId/advances', (req, res) => {
  const customerId = Number(req.params.customerId);
  if (!Number.isFinite(customerId)) return res.status(400).json({ error: 'Invalid customerId' });

  const logs = db.prepare(`
    SELECT id, type, val, date, remarks
    FROM advances
    WHERE customer_id = ?
    ORDER BY date ASC, id ASC
  `).all(customerId);

  const summary = logs.reduce((acc, l) => {
    if (l.type === 'give') acc.given += Number(l.val || 0);
    if (l.type === 'deduct') acc.deducted += Number(l.val || 0);
    return acc;
  }, { given: 0, deducted: 0 });

  res.json({ ...summary, balance: summary.given - summary.deducted, logs });
});

app.post('/api/customers/:customerId/advances', (req, res) => {
  const customerId = Number(req.params.customerId);
  if (!Number.isFinite(customerId)) return res.status(400).json({ error: 'Invalid customerId' });

  const schema = z.object({
    type: z.enum(['give', 'deduct']),
    val: z.coerce.number().positive(),
    date: z.string().trim().min(1),
    remarks: z.string().trim().optional().default(''),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });

  const info = db.prepare('INSERT INTO advances (customer_id, type, val, date, remarks) VALUES (?,?,?,?,?)').run(customerId, parsed.data.type, parsed.data.val, parsed.data.date, parsed.data.remarks);
  res.status(201).json({ id: info.lastInsertRowid, ...parsed.data });
});

// =============================================================================
// SAALA MODULE APIs
// =============================================================================

// --- SAALA Customers ---
app.get('/api/saala/customers', (req, res) => {
  const rows = db.prepare('SELECT id, name, contact, address FROM saala_customers ORDER BY name').all();
  res.json(rows);
});

app.post('/api/saala/customers', (req, res) => {
  const schema = z.object({
    name: z.string().trim().min(1),
    contact: z.string().trim().optional().default(''),
    address: z.string().trim().optional().default(''),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });

  const { name, contact, address } = parsed.data;
  try {
    const info = db.prepare('INSERT INTO saala_customers (name, contact, address) VALUES (?,?,?)').run(name, contact, address);
    res.status(201).json({ id: info.lastInsertRowid, name, contact, address });
  } catch (e) {
    if (String(e).includes('UNIQUE')) return res.status(409).json({ error: 'SAALA customer already exists' });
    return res.status(500).json({ error: 'Failed to create SAALA customer' });
  }
});

app.put('/api/saala/customers/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });

  const schema = z.object({
    name: z.string().trim().min(1).optional(),
    contact: z.string().trim().optional(),
    address: z.string().trim().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });

  const updates = [];
  const values = [];
  if (parsed.data.name !== undefined) { updates.push('name = ?'); values.push(parsed.data.name); }
  if (parsed.data.contact !== undefined) { updates.push('contact = ?'); values.push(parsed.data.contact); }
  if (parsed.data.address !== undefined) { updates.push('address = ?'); values.push(parsed.data.address); }

  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

  values.push(id);
  try {
    const info = db.prepare(`UPDATE saala_customers SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    res.json({ updated: info.changes });
  } catch (e) {
    if (String(e).includes('UNIQUE')) return res.status(409).json({ error: 'Customer name already exists' });
    return res.status(500).json({ error: 'Failed to update SAALA customer' });
  }
});

app.delete('/api/saala/customers/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
  const info = db.prepare('DELETE FROM saala_customers WHERE id = ?').run(id);
  res.json({ deleted: info.changes });
});

// --- SAALA Transactions ---
app.get('/api/saala/customers/:customerId/transactions', (req, res) => {
  const customerId = Number(req.params.customerId);
  if (!Number.isFinite(customerId)) return res.status(400).json({ error: 'Invalid customerId' });

  const rows = db.prepare(`
    SELECT id, date, itemCode, itemName, qty, rate, totalAmount, paidAmount, remarks
    FROM saala_transactions
    WHERE customer_id = ?
    ORDER BY date DESC, id DESC
  `).all(customerId);
  res.json(rows);
});

app.post('/api/saala/customers/:customerId/transactions', (req, res) => {
  const customerId = Number(req.params.customerId);
  if (!Number.isFinite(customerId)) return res.status(400).json({ error: 'Invalid customerId' });

  const schema = z.object({
    date: z.string().trim().min(1),
    itemCode: z.string().trim().optional().default(''),
    itemName: z.string().trim().min(1),
    qty: z.coerce.number().nonnegative().default(0),
    rate: z.coerce.number().nonnegative().default(0),
    totalAmount: z.coerce.number().nonnegative().default(0),
    paidAmount: z.coerce.number().nonnegative().default(0),
    remarks: z.string().trim().optional().default(''),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });

  const t = parsed.data;
  const totalAmount = t.totalAmount || (t.qty * t.rate);
  
  const info = db.prepare(`
    INSERT INTO saala_transactions (customer_id, date, itemCode, itemName, qty, rate, totalAmount, paidAmount, remarks)
    VALUES (?,?,?,?,?,?,?,?,?)
  `).run(customerId, t.date, t.itemCode, t.itemName, t.qty, t.rate, totalAmount, t.paidAmount, t.remarks);

  res.status(201).json({ id: info.lastInsertRowid, ...t, totalAmount });
});

app.put('/api/saala/transactions/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });

  const schema = z.object({
    date: z.string().trim().min(1),
    itemCode: z.string().trim().optional().default(''),
    itemName: z.string().trim().min(1),
    qty: z.coerce.number().nonnegative().default(0),
    rate: z.coerce.number().nonnegative().default(0),
    totalAmount: z.coerce.number().nonnegative().default(0),
    paidAmount: z.coerce.number().nonnegative().default(0),
    remarks: z.string().trim().optional().default(''),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });

  const t = parsed.data;
  const totalAmount = t.totalAmount || (t.qty * t.rate);
  
  const info = db.prepare(`
    UPDATE saala_transactions
    SET date = ?, itemCode = ?, itemName = ?, qty = ?, rate = ?, totalAmount = ?, paidAmount = ?, remarks = ?
    WHERE id = ?
  `).run(t.date, t.itemCode, t.itemName, t.qty, t.rate, totalAmount, t.paidAmount, t.remarks, id);

  res.json({ updated: info.changes });
});

app.delete('/api/saala/transactions/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
  const info = db.prepare('DELETE FROM saala_transactions WHERE id = ?').run(id);
  res.json({ deleted: info.changes });
});

// Get SAALA customer summary (total credit, paid, balance)
app.get('/api/saala/customers/:customerId/summary', (req, res) => {
  const customerId = Number(req.params.customerId);
  if (!Number.isFinite(customerId)) return res.status(400).json({ error: 'Invalid customerId' });

  const result = db.prepare(`
    SELECT 
      COALESCE(SUM(totalAmount), 0) as totalCredit,
      COALESCE(SUM(paidAmount), 0) as totalPaid
    FROM saala_transactions
    WHERE customer_id = ?
  `).get(customerId);

  const totalCredit = result?.totalCredit || 0;
  const totalPaid = result?.totalPaid || 0;
  const balance = totalCredit - totalPaid;

  res.json({ totalCredit, totalPaid, balance });
});

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API running on http://localhost:${port}`);
});
