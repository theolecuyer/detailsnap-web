import { Router } from 'express';
import { getPool } from '../db.js';

const router = Router();

router.get('/', async (req, res, next) => {
  const { from, to } = req.query;
  if (!from || !to) {
    return res.status(400).json({ error: 'from and to query params required', code: 'VALIDATION_ERROR' });
  }

  try {
    const [sessions] = await getPool().query(
      `SELECT s.id, s.status, s.scheduled_at, s.total_price_cents,
              c.name AS customer_name,
              ANY_VALUE(svc.name)             AS primary_service_name,
              ANY_VALUE(svc.color)            AS primary_color,
              SUM(COALESCE(svc.duration_minutes, 0)) AS duration_minutes
       FROM sessions s
       JOIN customers c ON c.id = s.customer_id
       LEFT JOIN session_services ss ON ss.session_id = s.id
       LEFT JOIN services svc ON svc.id = ss.service_id
       WHERE s.shop_id = ? AND s.scheduled_at BETWEEN ? AND ?
       GROUP BY s.id
       ORDER BY s.scheduled_at ASC`,
      [req.user.shopId, from, to],
    );

    const events = sessions.map(s => {
      const start = new Date(s.scheduled_at);
      const end = new Date(start.getTime() + (s.duration_minutes || 60) * 60 * 1000);
      return {
        id: s.id,
        title: `${s.customer_name} — ${s.primary_service_name || 'Detail'}`,
        start: start.toISOString(),
        end: end.toISOString(),
        color: s.primary_color || '#3B82F6',
        status: s.status,
      };
    });
    res.json(events);
  } catch (err) {
    next(err);
  }
});

export default router;
