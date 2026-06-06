import { Router } from 'express';
import { AdminController } from '../controllers/adminController';

const adminRouter = Router();

// Retrieve all coupled bookings and client details
adminRouter.get('/bookings', AdminController.getAllBookings);

// Modify booking payment status
adminRouter.put('/bookings/:id', AdminController.updateBookingStatus);

// Permanently expunge single booking record
adminRouter.delete('/bookings/:id', AdminController.deleteBooking);

// Pull corporate security logs audit tracker
adminRouter.get('/logs', AdminController.getSecurityLogs);

// Seed premium analytics datasets
adminRouter.post('/seed', AdminController.seedMockBookings);

// Get all uploaded proof logs
adminRouter.get('/payments', AdminController.getAllPayments);

// Action to approve or reject a proof
adminRouter.post('/payments/:paymentId/verify', AdminController.verifyPayment);

// Modify active GCash QR reference
adminRouter.post('/gcash-qr', AdminController.uploadGcashQr);
adminRouter.get('/gcash-qr', AdminController.getGcashQr);

export default adminRouter;
