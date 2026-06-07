import { Router } from 'express';
import { AdminController } from '../controllers/adminController.js';
import { requireAdmin, requireAdminRole } from '../lib/middleware.js';

const adminRouter = Router();

adminRouter.get('/gcash-qr', AdminController.getGcashQr);

adminRouter.use(requireAdmin);

adminRouter.get('/bookings', AdminController.getAllBookings);
adminRouter.put('/bookings/:id', AdminController.updateBookingStatus);
adminRouter.delete('/bookings/:id', AdminController.deleteBooking);

adminRouter.get('/logs', requireAdminRole('super'), AdminController.getSecurityLogs);
adminRouter.post('/seed', requireAdminRole('super'), AdminController.seedMockBookings);
adminRouter.get('/payments', requireAdminRole('super'), AdminController.getAllPayments);
adminRouter.post('/payments/:paymentId/verify', requireAdminRole('super'), AdminController.verifyPayment);
adminRouter.post('/gcash-qr', requireAdminRole('super'), AdminController.uploadGcashQr);

export default adminRouter;