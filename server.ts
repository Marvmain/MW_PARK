import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import authRouter from './server/routes/authRoutes';
import bookingRouter from './server/routes/bookingRoutes';
import adminRouter from './server/routes/adminRoutes';

async function bootstrap() {
  const app = express();
  const PORT = 3000;
  const nodeProcess = (globalThis as any).process || { cwd: () => '', env: {} as Record<string, string | undefined> };

  // Middleware to parse incoming request payloads securely
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Router bindings
  app.use('/api/auth', authRouter);
  app.use('/api/bookings', bookingRouter);
  app.use('/api/admin', adminRouter);

  // Serve uploaded payment proofs statically
  app.use('/uploads', express.static(path.join(nodeProcess.cwd(), 'data', 'uploads')));

  // Health/Diagnostic endpoint for reliability validation
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      system: 'MW Adventure Park Core App',
      timestamp: new Date().toISOString()
    });
  });

  // Serve Frontend assets using Vite Dev Server in Development or Static files in Production
  if (nodeProcess.env.DISABLE_HMR === 'true' || nodeProcess.env.NODE_ENV === 'production') {
    // Production Mode: Serve static build directory
    const distPath = path.join(nodeProcess.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // Development Mode: Connect Hot Module Replacement compatible dev-server
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  // Start the server bound to all adapters on port 3000 (obligatory container routing constraint)
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🟢 MW Adventure Park Server Running - Welcome!`);
    console.log(`🔗 Local Dev Ingress: http://localhost:${PORT}`);
    console.log(`=======================================================`);
  });
}

bootstrap().catch((err) => {
  console.error('🔴 Bootstrap Error: Failed to start fullstack container server', err);
  process.exit(1);
});
