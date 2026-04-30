import { Router } from 'express';
import { getPool } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  const pool = getPool();
  const shopId = req.user.shopId;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const todayStr = today.toISOString().slice(0, 19).replace('T', ' ');
  const todayEndStr = todayEnd.toISOString().slice(0, 19).replace('T', ' ');

  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString().slice(0, 10);
  const firstOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    .toISOString().slice(0, 10);
  const firstOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
    .toISOString().slice(0, 10);

  const [todaysSessions] = await pool.query(
    `SELECT s.*, c.name AS customer_name FROM sessions s JOIN customers c ON c.id = s.customer_id
     WHERE s.shop_id = ? AND s.scheduled_at BETWEEN ? AND ?
     ORDER BY s.scheduled_at ASC`,
    [shopId, todayStr, todayEndStr],
  );

  const [upcomingSessions] = await pool.query(
    `SELECT s.*, c.name AS customer_name FROM sessions s JOIN customers c ON c.id = s.customer_id
     WHERE s.shop_id = ? AND s.scheduled_at > ? AND s.status IN ('booked','in_progress')
     ORDER BY s.scheduled_at ASC LIMIT 10`,
    [shopId, todayEndStr],
  );

  const [[{ rev_this_month }]] = await pool.query(
    `SELECT COALESCE(SUM(total_cents), 0) AS rev_this_month FROM invoices
     WHERE shop_id = ? AND status = 'paid' AND paid_at >= ? AND paid_at < ?`,
    [shopId, firstOfMonth, firstOfNextMonth],
  );

  const [[{ rev_last_month }]] = await pool.query(
    `SELECT COALESCE(SUM(total_cents), 0) AS rev_last_month FROM invoices
     WHERE shop_id = ? AND status = 'paid' AND paid_at >= ? AND paid_at < ?`,
    [shopId, firstOfLastMonth, firstOfMonth],
  );

  const [[{ open_count, open_total }]] = await pool.query(
    `SELECT COUNT(*) AS open_count, COALESCE(SUM(total_cents), 0) AS open_total
     FROM invoices WHERE shop_id = ? AND status = 'unpaid'`,
    [shopId],
  );

  const [recentCustomers] = await pool.query(
    `SELECT id, name, email, phone, created_at FROM customers WHERE shop_id = ?
     ORDER BY created_at DESC LIMIT 5`,
    [shopId],
  );

  res.json({
    todaysSessions,
    upcomingSessions,
    revenueThisMonthCents: rev_this_month,
    revenueLastMonthCents: rev_last_month,
    openInvoiceCount: open_count,
    openInvoiceTotalCents: open_total,
    recentCustomers,
  });
});

router.get('/calendar', async (req, res, next) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'from and to query params required', code: 'VALIDATION_ERROR' });

  try {
    const [sessions] = await getPool().query(
      `SELECT s.id, s.status, s.scheduled_at, s.total_price_cents,
              c.name AS customer_name,
              ANY_VALUE(svc.name)                    AS primary_service_name,
              ANY_VALUE(svc.color)                   AS primary_color,
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
