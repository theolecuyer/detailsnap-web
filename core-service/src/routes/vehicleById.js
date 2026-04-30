import { Router } from 'express';
import { z } from 'zod';
import { getPool } from '../db.js';

const router = Router();

async function getVehicleForShop(vehicleId, shopId) {
  const [[v]] = await getPool().query(
    `SELECT v.* FROM vehicles v
     JOIN customers c ON c.id = v.customer_id
     WHERE v.id = ? AND c.shop_id = ?`,
    [vehicleId, shopId],
  );
  return v;
}

router.get('/:id', async (req, res) => {
  const v = await getVehicleForShop(req.params.id, req.user.shopId);
  if (!v) return res.status(404).json({ error: 'Vehicle not found', code: 'NOT_FOUND' });
  res.json(v);
});

router.patch('/:id', async (req, res) => {
  const existing = await getVehicleForShop(req.params.id, req.user.shopId);
  if (!existing) return res.status(404).json({ error: 'Vehicle not found', code: 'NOT_FOUND' });

  const schema = z.object({
    year: z.number().int().optional().nullable(),
    make: z.string().max(100).optional().nullable(),
    model: z.string().max(100).optional().nullable(),
    color: z.string().max(100).optional().nullable(),
    licensePlate: z.string().max(50).optional().nullable(),
    vin: z.string().max(17).optional().nullable(),
    notes: z.string().optional().nullable(),
  });
  const result = schema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: 'Validation error', code: 'VALIDATION_ERROR', details: result.error.flatten() });

  const { year, make, model, color, licensePlate, vin, notes } = result.data;
  await getPool().query(
    `UPDATE vehicles SET
      year          = COALESCE(?, year),
      make          = COALESCE(?, make),
      model         = COALESCE(?, model),
      color         = COALESCE(?, color),
      license_plate = COALESCE(?, license_plate),
      vin           = COALESCE(?, vin),
      notes         = COALESCE(?, notes)
    WHERE id = ?`,
    [year ?? null, make ?? null, model ?? null, color ?? null, licensePlate ?? null, vin ?? null, notes ?? null, req.params.id],
  );
  const [[v]] = await getPool().query('SELECT * FROM vehicles WHERE id = ?', [req.params.id]);
  res.json(v);
});

router.delete('/:id', async (req, res) => {
  const existing = await getVehicleForShop(req.params.id, req.user.shopId);
  if (!existing) return res.status(404).json({ error: 'Vehicle not found', code: 'NOT_FOUND' });

  await getPool().query('DELETE FROM vehicles WHERE id = ?', [req.params.id]);
  res.status(204).end();
});

export default router;
