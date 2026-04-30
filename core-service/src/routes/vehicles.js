import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../db.js';

const router = Router({ mergeParams: true });

const VehicleSchema = z.object({
  year: z.number().int().min(1886).max(2100).optional().nullable(),
  make: z.string().max(100).optional().nullable(),
  model: z.string().max(100).optional().nullable(),
  color: z.string().max(100).optional().nullable(),
  licensePlate: z.string().max(50).optional().nullable(),
  vin: z.string().max(17).optional().nullable(),
  notes: z.string().optional().nullable(),
});

// GET /customers/:customerId/vehicles
router.get('/', async (req, res) => {
  // verify customer belongs to shop
  const [[customer]] = await getPool().query(
    'SELECT id FROM customers WHERE id = ? AND shop_id = ?',
    [req.params.customerId, req.user.shopId],
  );
  if (!customer) return res.status(404).json({ error: 'Customer not found', code: 'NOT_FOUND' });

  const [vehicles] = await getPool().query(
    'SELECT * FROM vehicles WHERE customer_id = ? ORDER BY created_at DESC',
    [req.params.customerId],
  );
  res.json(vehicles);
});

// POST /customers/:customerId/vehicles
router.post('/', async (req, res) => {
  const [[customer]] = await getPool().query(
    'SELECT id FROM customers WHERE id = ? AND shop_id = ?',
    [req.params.customerId, req.user.shopId],
  );
  if (!customer) return res.status(404).json({ error: 'Customer not found', code: 'NOT_FOUND' });

  const result = VehicleSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: 'Validation error', code: 'VALIDATION_ERROR', details: result.error.flatten() });

  const id = uuidv4();
  const { year, make, model, color, licensePlate, vin, notes } = result.data;
  await getPool().query(
    'INSERT INTO vehicles (id, customer_id, year, make, model, color, license_plate, vin, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, req.params.customerId, year ?? null, make ?? null, model ?? null, color ?? null, licensePlate ?? null, vin ?? null, notes ?? null],
  );
  const [[vehicle]] = await getPool().query('SELECT * FROM vehicles WHERE id = ?', [id]);
  res.status(201).json(vehicle);
});

export default router;
