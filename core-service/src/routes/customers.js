import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../db.js';

const router = Router();

const CustomerSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().optional().or(z.literal('')).transform(v => v || null),
  phone: z.string().max(50).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  notes: z.string().optional().nullable(),
});

router.get('/', async (req, res) => {
  const { q, limit = '50', offset = '0' } = req.query;
  const pool = getPool();
  const lim = Math.min(parseInt(limit, 10) || 50, 200);
  const off = parseInt(offset, 10) || 0;

  let sql = 'SELECT id, shop_id, name, email, phone, address, notes, created_at, updated_at FROM customers WHERE shop_id = ?';
  const params = [req.user.shopId];

  if (q) {
    sql += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  sql += ' ORDER BY name LIMIT ? OFFSET ?';
  params.push(lim, off);

  const [rows] = await pool.query(sql, params);
  const [[{ total }]] = await pool.query(
    'SELECT COUNT(*) AS total FROM customers WHERE shop_id = ?' + (q ? ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)' : ''),
    q ? [req.user.shopId, `%${q}%`, `%${q}%`, `%${q}%`] : [req.user.shopId],
  );
  res.json({ data: rows, total, limit: lim, offset: off });
});

router.post('/', async (req, res) => {
  const result = CustomerSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: 'Validation error', code: 'VALIDATION_ERROR', details: result.error.flatten() });

  const id = uuidv4();
  const { name, email, phone, address, notes } = result.data;
  await getPool().query(
    'INSERT INTO customers (id, shop_id, name, email, phone, address, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, req.user.shopId, name, email ?? null, phone ?? null, address ?? null, notes ?? null],
  );
  const [[customer]] = await getPool().query('SELECT * FROM customers WHERE id = ?', [id]);
  res.status(201).json(customer);
});

router.get('/:id', async (req, res) => {
  const [[customer]] = await getPool().query(
    'SELECT * FROM customers WHERE id = ? AND shop_id = ?',
    [req.params.id, req.user.shopId],
  );
  if (!customer) return res.status(404).json({ error: 'Customer not found', code: 'NOT_FOUND' });
  res.json(customer);
});

router.patch('/:id', async (req, res) => {
  const [[existing]] = await getPool().query(
    'SELECT id FROM customers WHERE id = ? AND shop_id = ?',
    [req.params.id, req.user.shopId],
  );
  if (!existing) return res.status(404).json({ error: 'Customer not found', code: 'NOT_FOUND' });

  const result = CustomerSchema.partial().safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: 'Validation error', code: 'VALIDATION_ERROR', details: result.error.flatten() });

  const { name, email, phone, address, notes } = result.data;
  await getPool().query(
    `UPDATE customers SET
      name    = COALESCE(?, name),
      email   = COALESCE(?, email),
      phone   = COALESCE(?, phone),
      address = COALESCE(?, address),
      notes   = COALESCE(?, notes)
    WHERE id = ? AND shop_id = ?`,
    [name ?? null, email ?? null, phone ?? null, address ?? null, notes ?? null, req.params.id, req.user.shopId],
  );
  const [[customer]] = await getPool().query('SELECT * FROM customers WHERE id = ?', [req.params.id]);
  res.json(customer);
});

router.delete('/:id', async (req, res) => {
  const [[existing]] = await getPool().query(
    'SELECT id FROM customers WHERE id = ? AND shop_id = ?',
    [req.params.id, req.user.shopId],
  );
  if (!existing) return res.status(404).json({ error: 'Customer not found', code: 'NOT_FOUND' });

  const [[{ cnt }]] = await getPool().query(
    'SELECT COUNT(*) AS cnt FROM sessions WHERE customer_id = ?',
    [req.params.id],
  );
  if (cnt > 0) return res.status(409).json({ error: 'Customer has existing sessions and cannot be deleted', code: 'HAS_SESSIONS' });

  await getPool().query('DELETE FROM customers WHERE id = ? AND shop_id = ?', [req.params.id, req.user.shopId]);
  res.status(204).end();
});

export default router;
