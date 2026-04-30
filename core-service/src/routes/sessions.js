import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../db.js';

const router = Router();

const SessionCreateSchema = z.object({
  customerId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  serviceIds: z.array(z.string().uuid()).min(1),
  scheduledAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)),
  notes: z.string().optional().nullable(),
});

const SessionUpdateSchema = z.object({
  scheduledAt: z.string().optional(),
  notes: z.string().optional().nullable(),
  serviceIds: z.array(z.string().uuid()).optional(),
});

async function getSessionForShop(id, shopId) {
  const [[session]] = await getPool().query(
    'SELECT * FROM sessions WHERE id = ? AND shop_id = ?',
    [id, shopId],
  );
  return session;
}

async function enrichSession(session) {
  const pool = getPool();
  const [[customer]] = await pool.query('SELECT id, name, email, phone FROM customers WHERE id = ?', [session.customer_id]);
  const [[vehicle]] = await pool.query('SELECT * FROM vehicles WHERE id = ?', [session.vehicle_id]);
  const [services] = await pool.query(
    `SELECT s.id, s.name, s.color, ss.price_cents
     FROM session_services ss JOIN services s ON s.id = ss.service_id
     WHERE ss.session_id = ?`,
    [session.id],
  );
  const [notes] = await pool.query(
    `SELECT sn.*, u.name AS user_name FROM session_notes sn JOIN users u ON u.id = sn.user_id
     WHERE sn.session_id = ? ORDER BY sn.created_at ASC`,
    [session.id],
  );
  return { ...session, customer, vehicle, services, session_notes: notes };
}

router.get('/', async (req, res) => {
  const { status, from, to, customerId, vehicleId } = req.query;
  let sql = `SELECT s.*, c.name AS customer_name
             FROM sessions s JOIN customers c ON c.id = s.customer_id
             WHERE s.shop_id = ?`;
  const params = [req.user.shopId];

  if (status) {
    const statuses = status.split(',').filter(s => ['booked','in_progress','completed','cancelled'].includes(s));
    if (statuses.length) {
      sql += ` AND s.status IN (${statuses.map(() => '?').join(',')})`;
      params.push(...statuses);
    }
  }
  if (from) { sql += ' AND s.scheduled_at >= ?'; params.push(from); }
  if (to)   { sql += ' AND s.scheduled_at <= ?'; params.push(to); }
  if (customerId) { sql += ' AND s.customer_id = ?'; params.push(customerId); }
  if (vehicleId)  { sql += ' AND s.vehicle_id = ?';  params.push(vehicleId); }

  if (!status && !from && !to) {
    sql += " AND (s.status = 'booked' OR s.status = 'in_progress')";
  }
  sql += ' ORDER BY s.scheduled_at ASC';

  const [rows] = await getPool().query(sql, params);
  res.json(rows);
});

router.post('/', async (req, res) => {
  const result = SessionCreateSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: 'Validation error', code: 'VALIDATION_ERROR', details: result.error.flatten() });

  const { customerId, vehicleId, serviceIds, scheduledAt, notes } = result.data;
  const pool = getPool();

  // verify customer + vehicle belong to shop
  const [[customer]] = await pool.query('SELECT id FROM customers WHERE id = ? AND shop_id = ?', [customerId, req.user.shopId]);
  if (!customer) return res.status(400).json({ error: 'Customer not found in shop', code: 'NOT_FOUND' });

  const [[vehicle]] = await pool.query(
    'SELECT v.id FROM vehicles v JOIN customers c ON c.id = v.customer_id WHERE v.id = ? AND c.shop_id = ?',
    [vehicleId, req.user.shopId],
  );
  if (!vehicle) return res.status(400).json({ error: 'Vehicle not found in shop', code: 'NOT_FOUND' });

  // fetch service prices
  const placeholders = serviceIds.map(() => '?').join(',');
  const [services] = await pool.query(
    `SELECT id, base_price_cents FROM services WHERE id IN (${placeholders}) AND shop_id = ? AND active = 1`,
    [...serviceIds, req.user.shopId],
  );
  if (services.length !== serviceIds.length) {
    return res.status(400).json({ error: 'One or more services not found or inactive', code: 'INVALID_SERVICES' });
  }

  const totalCents = services.reduce((sum, s) => sum + s.base_price_cents, 0);
  const sessionId = uuidv4();

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `INSERT INTO sessions (id, shop_id, customer_id, vehicle_id, status, scheduled_at, notes, total_price_cents, created_by_user_id)
       VALUES (?, ?, ?, ?, 'booked', ?, ?, ?, ?)`,
      [sessionId, req.user.shopId, customerId, vehicleId, scheduledAt, notes ?? null, totalCents, req.user.userId],
    );
    for (const svc of services) {
      await conn.query(
        'INSERT INTO session_services (session_id, service_id, price_cents) VALUES (?, ?, ?)',
        [sessionId, svc.id, svc.base_price_cents],
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  const [[session]] = await pool.query('SELECT * FROM sessions WHERE id = ?', [sessionId]);
  res.status(201).json(await enrichSession(session));
});

router.get('/:id', async (req, res) => {
  const session = await getSessionForShop(req.params.id, req.user.shopId);
  if (!session) return res.status(404).json({ error: 'Session not found', code: 'NOT_FOUND' });
  res.json(await enrichSession(session));
});

router.patch('/:id', async (req, res) => {
  const session = await getSessionForShop(req.params.id, req.user.shopId);
  if (!session) return res.status(404).json({ error: 'Session not found', code: 'NOT_FOUND' });

  const result = SessionUpdateSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: 'Validation error', code: 'VALIDATION_ERROR', details: result.error.flatten() });

  const { scheduledAt, notes, serviceIds } = result.data;
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `UPDATE sessions SET
        scheduled_at = COALESCE(?, scheduled_at),
        notes        = COALESCE(?, notes)
      WHERE id = ?`,
      [scheduledAt ?? null, notes ?? null, req.params.id],
    );
    if (serviceIds && serviceIds.length > 0) {
      const placeholders = serviceIds.map(() => '?').join(',');
      const [services] = await conn.query(
        `SELECT id, base_price_cents FROM services WHERE id IN (${placeholders}) AND shop_id = ?`,
        [...serviceIds, req.user.shopId],
      );
      if (services.length !== serviceIds.length) {
        await conn.rollback();
        return res.status(400).json({ error: 'One or more services not found', code: 'INVALID_SERVICES' });
      }
      const totalCents = services.reduce((sum, s) => sum + s.base_price_cents, 0);
      await conn.query('DELETE FROM session_services WHERE session_id = ?', [req.params.id]);
      for (const svc of services) {
        await conn.query(
          'INSERT INTO session_services (session_id, service_id, price_cents) VALUES (?, ?, ?)',
          [req.params.id, svc.id, svc.base_price_cents],
        );
      }
      await conn.query('UPDATE sessions SET total_price_cents = ? WHERE id = ?', [totalCents, req.params.id]);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  const [[updated]] = await pool.query('SELECT * FROM sessions WHERE id = ?', [req.params.id]);
  res.json(await enrichSession(updated));
});

router.delete('/:id', async (req, res) => {
  const session = await getSessionForShop(req.params.id, req.user.shopId);
  if (!session) return res.status(404).json({ error: 'Session not found', code: 'NOT_FOUND' });
  if (!['booked', 'cancelled'].includes(session.status)) {
    return res.status(409).json({ error: 'Only booked or cancelled sessions can be deleted', code: 'INVALID_STATUS' });
  }
  await getPool().query('DELETE FROM sessions WHERE id = ?', [req.params.id]);
  res.status(204).end();
});

router.post('/:id/start', async (req, res) => {
  const session = await getSessionForShop(req.params.id, req.user.shopId);
  if (!session) return res.status(404).json({ error: 'Session not found', code: 'NOT_FOUND' });
  if (session.status !== 'booked') {
    return res.status(409).json({ error: 'Session must be in booked status to start', code: 'INVALID_STATUS' });
  }
  await getPool().query(
    "UPDATE sessions SET status = 'in_progress', started_at = NOW() WHERE id = ?",
    [req.params.id],
  );
  const [[updated]] = await getPool().query('SELECT * FROM sessions WHERE id = ?', [req.params.id]);
  res.json(await enrichSession(updated));
});

router.post('/:id/complete', async (req, res) => {
  const session = await getSessionForShop(req.params.id, req.user.shopId);
  if (!session) return res.status(404).json({ error: 'Session not found', code: 'NOT_FOUND' });
  if (session.status !== 'in_progress') {
    return res.status(409).json({ error: 'Session must be in_progress to complete', code: 'INVALID_STATUS' });
  }

  const pool = getPool();
  const invoiceId = uuidv4();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      "UPDATE sessions SET status = 'completed', completed_at = NOW() WHERE id = ?",
      [req.params.id],
    );
    await conn.query(
      `INSERT INTO invoices (id, shop_id, session_id, customer_id, status, total_cents)
       VALUES (?, ?, ?, ?, 'unpaid', ?)`,
      [invoiceId, req.user.shopId, req.params.id, session.customer_id, session.total_price_cents],
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  const [[updated]] = await pool.query('SELECT * FROM sessions WHERE id = ?', [req.params.id]);
  const [[invoice]] = await pool.query('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
  res.json({ session: await enrichSession(updated), invoice });
});

router.post('/:id/cancel', async (req, res) => {
  const session = await getSessionForShop(req.params.id, req.user.shopId);
  if (!session) return res.status(404).json({ error: 'Session not found', code: 'NOT_FOUND' });
  if (['completed', 'cancelled'].includes(session.status)) {
    return res.status(409).json({ error: 'Session cannot be cancelled', code: 'INVALID_STATUS' });
  }
  await getPool().query("UPDATE sessions SET status = 'cancelled' WHERE id = ?", [req.params.id]);
  const [[updated]] = await getPool().query('SELECT * FROM sessions WHERE id = ?', [req.params.id]);
  res.json(await enrichSession(updated));
});

// Session notes
router.get('/:id/notes', async (req, res) => {
  const session = await getSessionForShop(req.params.id, req.user.shopId);
  if (!session) return res.status(404).json({ error: 'Session not found', code: 'NOT_FOUND' });
  const [notes] = await getPool().query(
    `SELECT sn.*, u.name AS user_name FROM session_notes sn JOIN users u ON u.id = sn.user_id
     WHERE sn.session_id = ? ORDER BY sn.created_at ASC`,
    [req.params.id],
  );
  res.json(notes);
});

router.post('/:id/notes', async (req, res) => {
  const session = await getSessionForShop(req.params.id, req.user.shopId);
  if (!session) return res.status(404).json({ error: 'Session not found', code: 'NOT_FOUND' });

  const result = z.object({ body: z.string().min(1) }).safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: 'Validation error', code: 'VALIDATION_ERROR', details: result.error.flatten() });

  const noteId = uuidv4();
  await getPool().query(
    'INSERT INTO session_notes (id, session_id, user_id, body) VALUES (?, ?, ?, ?)',
    [noteId, req.params.id, req.user.userId, result.data.body],
  );
  const [[note]] = await getPool().query(
    `SELECT sn.*, u.name AS user_name FROM session_notes sn JOIN users u ON u.id = sn.user_id WHERE sn.id = ?`,
    [noteId],
  );
  res.status(201).json(note);
});

export default router;
