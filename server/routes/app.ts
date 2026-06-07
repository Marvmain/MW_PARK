import express from 'express';
import path from 'path';

import authRouter from './routes/authRoutes';
import bookingRouter from './routes/bookingRoutes';
import adminRouter from './routes/adminRoutes';

const app = express();

const nodeProcess =
  (globalThis as any).process ||
  { cwd: () => '', env: {} as Record<string, string | undefined> };

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (
      err &&
      typeof err === 'object' &&
      'type' in err &&
      (err as { type?: string }).type === 'entity.too.large'
    ) {
      res.status(413).json({
        error: 'Image file is too large. Please upload an image under 10 MB.',
      });
      return;
    }
    next(err);
  }
);

// Routes
app.use('/api/auth', authRouter);
app.use('/api/bookings', bookingRouter);
app.use('/api/admin', adminRouter);

// Uploads
app.use(
  '/uploads',
  express.static(path.join(nodeProcess.cwd(), 'data', 'uploads'))
);

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    system: 'MW Adventure Park Core App',
    timestamp: new Date().toISOString(),
  });
});

export default app;