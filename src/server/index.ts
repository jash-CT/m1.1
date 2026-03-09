import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { config } from '../config/index.js';
import { authMiddleware } from '../core/auth.js';
import { tenantMiddleware, requireTenantMiddleware, errorHandler } from '../core/middleware.js';
import onboardingRoutes from '../modules/onboarding/routes.js';
import orderRoutes from '../modules/orders/routes.js';
import analyticsRoutes from '../modules/analytics/routes.js';
import dashboardRoutes from '../modules/dashboards/routes.js';
import integrationRoutes from '../modules/integrations/routes.js';
import { logger } from '../core/logger.js';

const app = express();

app.use(helmet());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || config.allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Forbidden'));
  },
  optionsSuccessStatus: 200,
}));
app.use(compression());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.use(tenantMiddleware);

// Authenticated API (Bearer token + tenant required)
app.use('/api', (req, res, next) => {
  authMiddleware(req, res, (err?: Error) => {
    if (err) return res.status(401).json({ error: err.message });
    next();
  });
});
app.use('/api', requireTenantMiddleware);

app.use('/api/onboarding', onboardingRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/dashboards', dashboardRoutes);

// Integrations: use raw body for incoming webhook (signature verification)
app.use('/api/integrations', (req: express.Request & { rawBody?: Buffer }, res, next) => {
  if (req.path === '/webhooks/incoming' && req.method === 'POST') {
    return express.raw({ type: 'application/json', limit: '256kb' })(req, res, (err?: Error) => {
      if (err) return next(err);
      req.rawBody = req.body as Buffer;
      try {
        req.body = req.rawBody ? JSON.parse(req.rawBody.toString()) : {};
      } catch {
        req.body = {};
      }
      next();
    });
  }
  next();
});
app.use('/api/integrations', integrationRoutes);

app.use(errorHandler);

const server = app.listen(config.port, () => {
  logger.info({ port: config.port }, 'Server listening');
});

function shutdown(): void {
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;
