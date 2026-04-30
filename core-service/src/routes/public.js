import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../db.js';

const router = Router();

router.get('/shops/:slug', async (req, res) => {
  const [[shop]] = await getPool().query(
    'SELECT id, name, slug, address, phone, email FROM shops WHERE slug = ?',
    [req.params.slug],
  );
  if (!shop) return res.status(404).json({ error: 'Shop not found', code: 'NOT_FOUND' });

  const [services] = await getPool().query(
    'SELECT id, name, description, base_price_cents, duration_minutes, color FROM services WHERE shop_id = ? AND active = 1 ORDER BY name',
    [shop.id],
  );
  res.json({ shop, services });
});

router.post('/shops/:slug/bookings', async (req, res) => {
  const [[shop]] = await getPool().query(
    'SELECT id FROM shops WHERE slug = ?',
    [req.params.slug],
  );
  if (!shop) return res.status(404).json({ error: 'Shop not found', code: 'NOT_FOUND' });

  const schema = z.object({
    customerName: z.string().min(1).max(255),
    email: z.string().email(),
    phone: z.string().max(50).optional().nullable(),
    vehicle: z.object({
      year: z.number().int().optional().nullable(),
      make: z.string().max(100).optional().nullable(),
      model: z.string().max(100).optional().nullable(),
      color: z.string().max(100).optional().nullable(),
      licensePlate: z.string().max(50).optional().nullable(),
    }),
    serviceIds: z.array(z.string().uuid()).min(1),
    scheduledAt: z.string(),
    notes: z.string().optional().nullable(),
  });

  const result = schema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: 'Validation error', code: 'VALIDATION_ERROR', details: result.error.flatten() });

  const { customerName, email, phone, vehicle, serviceIds, scheduledAt, notes } = result.data;
  const pool = getPool();

  // find or create customer by email within this shop
  let [[customer]] = await pool.query(
    'SELECT id FROM customers WHERE email = ? AND shop_id = ?',
    [email.toLowerCase(), shop.id],
  );
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (!customer) {
      const customerId = uuidv4();
      await conn.query(
        'INSERT INTO customers (id, shop_id, name, email, phone) VALUES (?, ?, ?, ?, ?)',
        [customerId, shop.id, customerName, email.toLowerCase(), phone ?? null],
      );
      customer = { id: customerId };
    }

    const vehicleId = uuidv4();
    await conn.query(
      'INSERT INTO vehicles (id, customer_id, year, make, model, color, license_plate) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [vehicleId, customer.id, vehicle.year ?? null, vehicle.make ?? null, vehicle.model ?? null,
       vehicle.color ?? null, vehicle.licensePlate ?? null],
    );

    const placeholders = serviceIds.map(() => '?').join(',');
    const [services] = await conn.query(
      `SELECT id, base_price_cents FROM services WHERE id IN (${placeholders}) AND shop_id = ? AND active = 1`,
      [...serviceIds, shop.id],
    );
    if (services.length !== serviceIds.length) {
      await conn.rollback();
      return res.status(400).json({ error: 'One or more services not found', code: 'INVALID_SERVICES' });
    }

    const total = services.reduce((sum, s) => sum + s.base_price_cents, 0);
    const sessionId = uuidv4();
    await conn.query(
      `INSERT INTO sessions (id, shop_id, customer_id, vehicle_id, status, scheduled_at, notes, total_price_cents, created_by_user_id)
       VALUES (?, ?, ?, ?, 'booked', ?, ?, ?, NULL)`,
      [sessionId, shop.id, customer.id, vehicleId, scheduledAt, notes ?? null, total],
    );
    for (const svc of services) {
      await conn.query(
        'INSERT INTO session_services (session_id, service_id, price_cents) VALUES (?, ?, ?)',
        [sessionId, svc.id, svc.base_price_cents],
      );
    }

    await conn.commit();
    res.status(201).json({ sessionId, scheduledAt, totalCents: total });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

export default router;
