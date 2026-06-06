import { Router } from 'express';
import { AdminController } from '../controllers/adminController';
import { requireAdmin, requireAdminRole } from '../lib/middleware';

const adminRouter = Router();

// Public: customers need the GCash QR to pay
adminRouter.get('/gcash-qr', AdminController.getGcashQr);

adminRouter.use(requireAdmin);

// Bookings — super admin and staff
adminRouter.get('/bookings', AdminController.getAllBookings);
adminRouter.put('/bookings/:id', AdminController.updateBookingStatus);
adminRouter.delete('/bookings/:id', AdminController.deleteBooking);

// Super-admin only
adminRouter.get('/logs', requireAdminRole('super'), AdminController.getSecurityLogs);
adminRouter.post('/seed', requireAdminRole('super'), AdminController.seedMockBookings);
adminRouter.get('/payments', requireAdminRole('super'), AdminController.getAllPayments);
adminRouter.post('/payments/:paymentId/verify', requireAdminRole('super'), AdminController.verifyPayment);
adminRouter.post('/gcash-qr', requireAdminRole('super'), AdminController.uploadGcashQr);

export default adminRouter;
