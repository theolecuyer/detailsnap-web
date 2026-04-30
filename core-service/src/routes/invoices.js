import { Router } from 'express';
import { z } from 'zod';
import { getPool } from '../db.js';
import { requireOwner } from '../middleware/auth.js';

const router = Router();

async function getInvoiceForShop(id, shopId) {
  const [[inv]] = await getPool().query(
    'SELECT * FROM invoices WHERE id = ? AND shop_id = ?',
    [id, shopId],
  );
  return inv;
}

router.get('/', async (req, res) => {
  const { status, customerId } = req.query;
  let sql = `SELECT i.*, c.name AS customer_name
             FROM invoices i JOIN customers c ON c.id = i.customer_id
             WHERE i.shop_id = ?`;
  const params = [req.user.shopId];
  if (status) { sql += ' AND i.status = ?'; params.push(status); }
  if (customerId) { sql += ' AND i.customer_id = ?'; params.push(customerId); }
  sql += ' ORDER BY i.created_at DESC';
  const [rows] = await getPool().query(sql, params);
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const inv = await getInvoiceForShop(req.params.id, req.user.shopId);
  if (!inv) return res.status(404).json({ error: 'Invoice not found', code: 'NOT_FOUND' });
  const [[customer]] = await getPool().query('SELECT id, name, email, phone FROM customers WHERE id = ?', [inv.customer_id]);
  res.json({ ...inv, customer });
});

router.post('/:id/pay', async (req, res) => {
  const inv = await getInvoiceForShop(req.params.id, req.user.shopId);
  if (!inv) return res.status(404).json({ error: 'Invoice not found', code: 'NOT_FOUND' });
  if (inv.status !== 'unpaid') return res.status(409).json({ error: 'Invoice is not unpaid', code: 'INVALID_STATUS' });

  const result = z.object({
    method: z.enum(['fake-card', 'cash', 'check']),
  }).safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: 'Validation error', code: 'VALIDATION_ERROR', details: result.error.flatten() });

  await getPool().query(
    "UPDATE invoices SET status = 'paid', paid_at = NOW(), payment_method = ? WHERE id = ?",
    [result.data.method, req.params.id],
  );
  const [[updated]] = await getPool().query('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
  res.json(updated);
});

router.post('/:id/void', requireOwner, async (req, res) => {
  const inv = await getInvoiceForShop(req.params.id, req.user.shopId);
  if (!inv) return res.status(404).json({ error: 'Invoice not found', code: 'NOT_FOUND' });
  if (inv.status === 'void') return res.status(409).json({ error: 'Invoice already voided', code: 'INVALID_STATUS' });

  await getPool().query("UPDATE invoices SET status = 'void' WHERE id = ?", [req.params.id]);
  const [[updated]] = await getPool().query('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
  res.json(updated);
});

export default router;
