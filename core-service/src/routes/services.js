import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../db.js';
import { requireOwner } from '../middleware/auth.js';

const router = Router();

const ServiceSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  basePriceCents: z.number().int().min(0),
  durationMinutes: z.number().int().min(1).default(60),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#3B82F6'),
  active: z.boolean().default(true),
});

router.get('/', async (req, res) => {
  const { active } = req.query;
  let sql = 'SELECT * FROM services WHERE shop_id = ?';
  const params = [req.user.shopId];
  if (active === 'true') { sql += ' AND active = 1'; }
  sql += ' ORDER BY name';
  const [rows] = await getPool().query(sql, params);
  res.json(rows);
});

router.post('/', requireOwner, async (req, res) => {
  const result = ServiceSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: 'Validation error', code: 'VALIDATION_ERROR', details: result.error.flatten() });

  const id = uuidv4();
  const { name, description, basePriceCents, durationMinutes, color, active } = result.data;
  await getPool().query(
    'INSERT INTO services (id, shop_id, name, description, base_price_cents, duration_minutes, color, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, req.user.shopId, name, description ?? null, basePriceCents, durationMinutes, color, active ? 1 : 0],
  );
  const [[svc]] = await getPool().query('SELECT * FROM services WHERE id = ?', [id]);
  res.status(201).json(svc);
});

router.patch('/:id', requireOwner, async (req, res) => {
  const [[existing]] = await getPool().query(
    'SELECT id FROM services WHERE id = ? AND shop_id = ?',
    [req.params.id, req.user.shopId],
  );
  if (!existing) return res.status(404).json({ error: 'Service not found', code: 'NOT_FOUND' });

  const result = ServiceSchema.partial().safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: 'Validation error', code: 'VALIDATION_ERROR', details: result.error.flatten() });

  const { name, description, basePriceCents, durationMinutes, color, active } = result.data;
  await getPool().query(
    `UPDATE services SET
      name             = COALESCE(?, name),
      description      = COALESCE(?, description),
      base_price_cents = COALESCE(?, base_price_cents),
      duration_minutes = COALESCE(?, duration_minutes),
      color            = COALESCE(?, color),
      active           = COALESCE(?, active)
    WHERE id = ? AND shop_id = ?`,
    [name ?? null, description ?? null, basePriceCents ?? null, durationMinutes ?? null, color ?? null,
     active !== undefined ? (active ? 1 : 0) : null, req.params.id, req.user.shopId],
  );
  const [[svc]] = await getPool().query('SELECT * FROM services WHERE id = ?', [req.params.id]);
  res.json(svc);
});

router.delete('/:id', requireOwner, async (req, res) => {
  const [[existing]] = await getPool().query(
    'SELECT id FROM services WHERE id = ? AND shop_id = ?',
    [req.params.id, req.user.shopId],
  );
  if (!existing) return res.status(404).json({ error: 'Service not found', code: 'NOT_FOUND' });

  const [[{ cnt }]] = await getPool().query(
    'SELECT COUNT(*) AS cnt FROM session_services WHERE service_id = ?',
    [req.params.id],
  );
  if (cnt > 0) {
    await getPool().query('UPDATE services SET active = 0 WHERE id = ?', [req.params.id]);
    const [[svc]] = await getPool().query('SELECT * FROM services WHERE id = ?', [req.params.id]);
    return res.json({ ...svc, _softDeleted: true });
  }

  await getPool().query('DELETE FROM services WHERE id = ? AND shop_id = ?', [req.params.id, req.user.shopId]);
  res.status(204).end();
});

export default router;
