import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../db.js';

const router = Router();

const QuoteItemSchema = z.object({
  serviceId: z.string().uuid().optional().nullable(),
  description: z.string().min(1).max(500),
  priceCents: z.number().int().min(0),
});

const QuoteCreateSchema = z.object({
  customerId: z.string().uuid(),
  vehicleId: z.string().uuid().optional().nullable(),
  items: z.array(QuoteItemSchema).min(1),
  notes: z.string().optional().nullable(),
});

async function getQuoteForShop(id, shopId) {
  const [[q]] = await getPool().query(
    'SELECT * FROM quotes WHERE id = ? AND shop_id = ?',
    [id, shopId],
  );
  return q;
}

async function enrichQuote(quote) {
  const pool = getPool();
  const [[customer]] = await pool.query('SELECT id, name, email, phone FROM customers WHERE id = ?', [quote.customer_id]);
  const [items] = await pool.query(
    'SELECT * FROM quote_items WHERE quote_id = ? ORDER BY position ASC',
    [quote.id],
  );
  return { ...quote, customer, items };
}

router.get('/', async (req, res) => {
  const { status, customerId } = req.query;
  let sql = `SELECT q.*, c.name AS customer_name
             FROM quotes q JOIN customers c ON c.id = q.customer_id
             WHERE q.shop_id = ?`;
  const params = [req.user.shopId];
  if (status) { sql += ' AND q.status = ?'; params.push(status); }
  if (customerId) { sql += ' AND q.customer_id = ?'; params.push(customerId); }
  sql += ' ORDER BY q.created_at DESC';
  const [rows] = await getPool().query(sql, params);
  res.json(rows);
});

router.post('/', async (req, res) => {
  const result = QuoteCreateSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: 'Validation error', code: 'VALIDATION_ERROR', details: result.error.flatten() });

  const { customerId, vehicleId, items, notes } = result.data;
  const pool = getPool();

  const [[customer]] = await pool.query('SELECT id FROM customers WHERE id = ? AND shop_id = ?', [customerId, req.user.shopId]);
  if (!customer) return res.status(400).json({ error: 'Customer not found', code: 'NOT_FOUND' });

  const total = items.reduce((sum, i) => sum + i.priceCents, 0);
  const quoteId = uuidv4();

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      'INSERT INTO quotes (id, shop_id, customer_id, vehicle_id, status, total_cents, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [quoteId, req.user.shopId, customerId, vehicleId ?? null, 'draft', total, notes ?? null],
    );
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await conn.query(
        'INSERT INTO quote_items (id, quote_id, service_id, description, price_cents, position) VALUES (?, ?, ?, ?, ?, ?)',
        [uuidv4(), quoteId, item.serviceId ?? null, item.description, item.priceCents, i],
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  const [[quote]] = await pool.query('SELECT * FROM quotes WHERE id = ?', [quoteId]);
  res.status(201).json(await enrichQuote(quote));
});

router.get('/:id', async (req, res) => {
  const quote = await getQuoteForShop(req.params.id, req.user.shopId);
  if (!quote) return res.status(404).json({ error: 'Quote not found', code: 'NOT_FOUND' });
  res.json(await enrichQuote(quote));
});

router.patch('/:id', async (req, res) => {
  const quote = await getQuoteForShop(req.params.id, req.user.shopId);
  if (!quote) return res.status(404).json({ error: 'Quote not found', code: 'NOT_FOUND' });
  if (quote.status !== 'draft') return res.status(409).json({ error: 'Only draft quotes can be edited', code: 'INVALID_STATUS' });

  const schema = z.object({
    vehicleId: z.string().uuid().optional().nullable(),
    items: z.array(QuoteItemSchema).min(1).optional(),
    notes: z.string().optional().nullable(),
  });
  const result = schema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: 'Validation error', code: 'VALIDATION_ERROR', details: result.error.flatten() });

  const { vehicleId, items, notes } = result.data;
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `UPDATE quotes SET vehicle_id = COALESCE(?, vehicle_id), notes = COALESCE(?, notes) WHERE id = ?`,
      [vehicleId ?? null, notes ?? null, req.params.id],
    );
    if (items) {
      await conn.query('DELETE FROM quote_items WHERE quote_id = ?', [req.params.id]);
      const total = items.reduce((sum, i) => sum + i.priceCents, 0);
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await conn.query(
          'INSERT INTO quote_items (id, quote_id, service_id, description, price_cents, position) VALUES (?, ?, ?, ?, ?, ?)',
          [uuidv4(), req.params.id, item.serviceId ?? null, item.description, item.priceCents, i],
        );
      }
      await conn.query('UPDATE quotes SET total_cents = ? WHERE id = ?', [total, req.params.id]);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  const [[updated]] = await pool.query('SELECT * FROM quotes WHERE id = ?', [req.params.id]);
  res.json(await enrichQuote(updated));
});

router.post('/:id/send', async (req, res) => {
  const quote = await getQuoteForShop(req.params.id, req.user.shopId);
  if (!quote) return res.status(404).json({ error: 'Quote not found', code: 'NOT_FOUND' });
  if (quote.status !== 'draft') return res.status(409).json({ error: 'Only draft quotes can be sent', code: 'INVALID_STATUS' });

  await getPool().query("UPDATE quotes SET status = 'sent', sent_at = NOW() WHERE id = ?", [req.params.id]);
  console.log(JSON.stringify({ event: 'quote_sent', quote_id: req.params.id, shop_id: req.user.shopId }));
  const [[updated]] = await getPool().query('SELECT * FROM quotes WHERE id = ?', [req.params.id]);
  res.json(await enrichQuote(updated));
});

router.post('/:id/accept', async (req, res) => {
  const quote = await getQuoteForShop(req.params.id, req.user.shopId);
  if (!quote) return res.status(404).json({ error: 'Quote not found', code: 'NOT_FOUND' });
  if (quote.status !== 'sent') return res.status(409).json({ error: 'Only sent quotes can be accepted', code: 'INVALID_STATUS' });

  const schema = z.object({
    scheduledAt: z.string().optional(),
    vehicleId: z.string().uuid().optional().nullable(),
  }).optional();
  const result = schema.safeParse(req.body || {});
  const { scheduledAt, vehicleId } = result.data || {};

  const pool = getPool();
  const conn = await pool.getConnection();
  let newSession = null;
  try {
    await conn.beginTransaction();
    await conn.query("UPDATE quotes SET status = 'accepted', accepted_at = NOW() WHERE id = ?", [req.params.id]);

    if (scheduledAt) {
      const vid = vehicleId ?? quote.vehicle_id;
      if (!vid) {
        await conn.rollback();
        return res.status(400).json({ error: 'vehicleId required to convert to session', code: 'VALIDATION_ERROR' });
      }
      const [items] = await conn.query('SELECT price_cents FROM quote_items WHERE quote_id = ?', [req.params.id]);
      const total = items.reduce((sum, i) => sum + i.price_cents, 0);
      const sessionId = uuidv4();
      await conn.query(
        `INSERT INTO sessions (id, shop_id, customer_id, vehicle_id, status, scheduled_at, notes, total_price_cents, created_by_user_id)
         VALUES (?, ?, ?, ?, 'booked', ?, ?, ?, ?)`,
        [sessionId, req.user.shopId, quote.customer_id, vid, scheduledAt, quote.notes ?? null, total, req.user.userId],
      );
      [[newSession]] = await conn.query('SELECT * FROM sessions WHERE id = ?', [sessionId]);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  const [[updated]] = await pool.query('SELECT * FROM quotes WHERE id = ?', [req.params.id]);
  res.json({ quote: await enrichQuote(updated), session: newSession });
});

router.post('/:id/decline', async (req, res) => {
  const quote = await getQuoteForShop(req.params.id, req.user.shopId);
  if (!quote) return res.status(404).json({ error: 'Quote not found', code: 'NOT_FOUND' });
  if (!['draft', 'sent'].includes(quote.status)) {
    return res.status(409).json({ error: 'Quote cannot be declined in current status', code: 'INVALID_STATUS' });
  }
  await getPool().query("UPDATE quotes SET status = 'declined' WHERE id = ?", [req.params.id]);
  const [[updated]] = await getPool().query('SELECT * FROM quotes WHERE id = ?', [req.params.id]);
  res.json(await enrichQuote(updated));
});

export default router;
