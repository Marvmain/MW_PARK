import { Router } from 'express';
import { BookingController } from '../controllers/bookingController';
import { requireCustomer } from '../lib/middleware';

const bookingRouter = Router();

bookingRouter.use(requireCustomer);

// Load bookings for logged-in user
bookingRouter.get('/', BookingController.getMyBookings);

// Draft/create booking reserve
bookingRouter.post('/', BookingController.createBooking);

// Process PayMongo transaction simulation
bookingRouter.post('/pay', BookingController.processPayment);

// Submit custom manual payment proof (screenshots, files with manual admin check)
bookingRouter.post('/submit-proof', BookingController.submitProof);

// Fetch finalized PDF receipt metadata
bookingRouter.get('/receipt/:bookingId', BookingController.getReceipt);

export default bookingRouter;
