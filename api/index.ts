import express from 'express';
import path from 'path';
import authRouter from '../server/routes/authRoutes';
import bookingRouter from '../server/routes/bookingRoutes';
import adminRouter from '../server/routes/adminRoutes';

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/auth', authRouter);
app.use('/api/bookings', bookingRouter);
app.use('/api/admin', adminRouter);


app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    system: 'MW Adventure Park Core App',
    timestamp: new Date().toISOString(),
  });
});

export default app;