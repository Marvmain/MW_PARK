import { Router } from 'express';
import { BookingController } from '../controllers/bookingController.js';
import { requireCustomer } from '../lib/middleware.js';

const bookingRouter = Router();

bookingRouter.use(requireCustomer);

bookingRouter.get('/', BookingController.getMyBookings);
bookingRouter.post('/', BookingController.createBooking);
bookingRouter.post('/pay', BookingController.processPayment);
bookingRouter.post('/submit-proof', BookingController.submitProof);
bookingRouter.get('/receipt/:bookingId', BookingController.getReceipt);

export default bookingRouter;