import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { requestLogger } from './middleware/logger.js';
import { requireAuth } from './middleware/auth.js';
import { ping } from './db.js';
import customersRouter from './routes/customers.js';
import vehiclesRouter from './routes/vehicles.js';
import vehicleByIdRouter from './routes/vehicleById.js';
import servicesRouter from './routes/services.js';
import sessionsRouter from './routes/sessions.js';
import quotesRouter from './routes/quotes.js';
import invoicesRouter from './routes/invoices.js';
import dashboardRouter from './routes/dashboard.js';
import calendarRouter from './routes/calendar.js';
import publicRouter from './routes/public.js';

const app = express();
const PORT = parseInt(process.env.PORT || '8082', 10);

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);

// Health checks (no auth)
app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', service: 'core-service', version: '0.1.0' });
});

app.get('/readyz', async (_req, res) => {
  try {
    await ping();
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'error', error: 'database unreachable', code: 'DB_UNAVAILABLE' });
  }
});

// Public routes
app.use('/public', publicRouter);

// Authenticated routes
app.use('/customers', requireAuth, customersRouter);
app.use('/customers/:customerId/vehicles', requireAuth, vehiclesRouter);
app.use('/vehicles', requireAuth, vehicleByIdRouter);
app.use('/services', requireAuth, servicesRouter);
app.use('/sessions', requireAuth, sessionsRouter);
app.use('/quotes', requireAuth, quotesRouter);
app.use('/invoices', requireAuth, invoicesRouter);
app.use('/dashboard', requireAuth, dashboardRouter);
app.use('/calendar', requireAuth, calendarRouter);

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(JSON.stringify({ level: 'error', message: err.message, stack: err.stack }));
  res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
});

app.listen(PORT, () => {
  console.log(JSON.stringify({ level: 'info', message: `core-service listening on :${PORT}` }));
});

process.on('unhandledRejection', (reason) => {
  console.error(JSON.stringify({ level: 'error', message: 'unhandled rejection', reason: String(reason) }));
});
