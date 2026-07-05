import { Request, Response } from 'express';
import crypto from 'crypto';
import { DB, uploadPaymentProofToStorage } from '../data/manager.js';
import { Booking, PaymentProof, CartItem } from '../../src/types.js';
import { ACTIVITIES_DATA } from '../../src/activitiesData.js';

const PRICING = Object.fromEntries(
  ACTIVITIES_DATA.map((activity) => [
    activity.name,
    { adultRate: activity.adultRate, childRate: activity.childRate },
  ])
) as Record<string, { adultRate: number; childRate: number }>;

const COTTAGE_PRICING: Record<string, number> = {
  'Riverfront Canopy Cabana': 1500,
  'Dumagat Stilt Lodge': 2800,
  'Forest Canopy Treehouse': 2000,
  'Pandan Bamboo Shelter': 800,
  'None': 0,
};

/** Fraction of the total fare required as a down payment to confirm a reservation */
const DOWN_PAYMENT_RATE = 0.2;

export const BookingController = {
  async getMyBookings(req: Request, res: Response): Promise<void> {
    const customer = req.customer!;
    try {
      const allBookings = await DB.getBookings();
      const myBookings = allBookings.filter((b) => b.customerId === customer.id);
      res.status(200).json({ success: true, bookings: myBookings });
    } catch {
      res.status(500).json({ error: 'Failed to retrieve booking list.' });
    }
  },

  async createBooking(req: Request, res: Response): Promise<void> {
    const customer = req.customer!;

    const {
      // New cart-based payload
      cartItems,
      // Legacy single-activity fields (fallback)
      activityName,
      cottageName,
      bookingDate,
      scheduleTime,
      numberOfAdults,
      numberOfChildren,
      rulesAccepted,
    } = req.body;

    if (!bookingDate) {
      res.status(400).json({ error: 'Booking date is required.' });
      return;
    }

    if (!rulesAccepted) {
      res.status(400).json({ error: 'You must agree to the Rules & Regulations waiver before confirming check-in.' });
      return;
    }

    const selectedDate = new Date(bookingDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      res.status(400).json({ error: 'Reservations must be made for today or future dates.' });
      return;
    }

    // Validate cart items if provided
    if (cartItems && Array.isArray(cartItems) && cartItems.length > 0) {
      for (const item of cartItems as CartItem[]) {
        if (!item.activityName || !PRICING[item.activityName]) {
          res.status(400).json({ error: `Invalid activity: ${item.activityName}` });
          return;
        }
      }
    } else {
      // Legacy path: single activity
      if (!activityName || !PRICING[activityName]) {
        res.status(400).json({ error: 'Invalid river adventure activity selected.' });
        return;
      }
      const adultsCount = parseInt(numberOfAdults, 10) || 0;
      if (adultsCount <= 0) {
        res.status(400).json({ error: 'At least one adult is required.' });
        return;
      }
    }

    try {
      const targetCottage = cottageName || 'None';
      const cottageRate = COTTAGE_PRICING[targetCottage] ?? 0;

      let computedTotal = 0;
      let resolvedCartItems: CartItem[] | undefined;
      let primaryActivityName: string;
      let resolvedAdults: number;
      let resolvedChildren: number;

      if (cartItems && Array.isArray(cartItems) && cartItems.length > 0) {
        resolvedCartItems = cartItems as CartItem[];
        const activitiesTotal = resolvedCartItems.reduce((sum, item) => {
          const rates = PRICING[item.activityName];
          return sum + (item.primaryQty * rates.adultRate) + (item.secondaryQty * rates.childRate);
        }, 0);
        computedTotal = activitiesTotal + cottageRate;
        primaryActivityName = resolvedCartItems[0].activityName;
        resolvedAdults = resolvedCartItems.reduce((s, i) => s + i.primaryQty, 0);
        resolvedChildren = resolvedCartItems.reduce((s, i) => s + i.secondaryQty, 0);
      } else {
        // Legacy single-activity
        const adultsCount = parseInt(numberOfAdults, 10) || 1;
        const childrenCount = parseInt(numberOfChildren, 10) || 0;
        const activityConfig = PRICING[activityName];
        computedTotal = (adultsCount * activityConfig.adultRate) + (childrenCount * activityConfig.childRate) + cottageRate;
        primaryActivityName = activityName;
        resolvedAdults = adultsCount;
        resolvedChildren = childrenCount;
      }

      // Server is the source of truth for the down payment split — never trust client-supplied amounts.
      const downPaymentAmount = Math.ceil(computedTotal * DOWN_PAYMENT_RATE);
      const balanceDueAmount = computedTotal - downPaymentAmount;

      const newBooking: Booking = {
        id: 'MW-' + crypto.randomBytes(3).toString('hex').toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000),
        customerId: customer.id,
        activityName: primaryActivityName as any,
        cottageName: (targetCottage !== 'None' ? targetCottage : undefined) as any,
        bookingDate,
        scheduleTime,
        numberOfAdults: resolvedAdults,
        numberOfChildren: resolvedChildren,
        totalAmount: computedTotal,
        downPaymentAmount,
        balanceDueAmount,
        rulesAccepted: true,
        paymentStatus: 'Pending',
        bookingStatus: 'Pending',
        qrCodeToken: crypto.randomBytes(16).toString('hex'),
        createdAt: new Date().toISOString(),
        cartItems: resolvedCartItems,
      };

      const bookings = await DB.getBookings();
      bookings.push(newBooking);
      await DB.saveBookings(bookings);

      const cartSummary = resolvedCartItems
        ? resolvedCartItems.map((i) => i.activityName).join(', ')
        : primaryActivityName;

      res.status(201).json({
        success: true,
        message: `Reservation drafted for: ${cartSummary}. A 20% down payment of ₱${downPaymentAmount.toLocaleString()} is required to confirm your check-in.`,
        booking: newBooking,
      });
    } catch (error) {
      console.error('createBooking error:', error);
      res.status(500).json({ error: 'Failed to record reservation. Please contact admin.' });
    }
  },

  async processPayment(req: Request, res: Response): Promise<void> {
    const customer = req.customer!;
    const { bookingId, paymentMethod } = req.body;

    if (!bookingId || !paymentMethod || !['GCash', 'Maya'].includes(paymentMethod)) {
      res.status(400).json({ error: 'A booking ID and supported payment gateway (GCash/Maya) is required.' });
      return;
    }

    try {
      const bookings = await DB.getBookings();
      const bookingIdx = bookings.findIndex((b) => b.id === bookingId && b.customerId === customer.id);

      if (bookingIdx === -1) {
        res.status(404).json({ error: 'Booking record not found.' });
        return;
      }

      if (bookings[bookingIdx].paymentStatus === 'Paid') {
        res.status(400).json({ error: 'The down payment for this booking has already been settled.' });
        return;
      }

      bookings[bookingIdx].paymentStatus = 'Paid';
      bookings[bookingIdx].bookingStatus = 'Confirmed';
      bookings[bookingIdx].paymentMethod = paymentMethod as any;
      await DB.saveBookings(bookings);

      const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') as string;
      await DB.logSecurity(customer.id, `Down Payment Success: ${paymentMethod} (ID: ${bookingId})`, ip, true);

      res.status(200).json({
        success: true,
        message: `Down payment authorized via ${paymentMethod}! Your booking is confirmed and your QR Ticket is issued.`,
        booking: bookings[bookingIdx],
      });
    } catch {
      res.status(500).json({ error: 'Payment gateway timeout. Please retry.' });
    }
  },

  async submitProof(req: Request, res: Response): Promise<void> {
    const customer = req.customer!;
    const { bookingId, proofImageBase64, originalFileName } = req.body;

    if (!bookingId || !proofImageBase64 || !originalFileName) {
      res.status(400).json({ error: 'Please submit booking reference, image proof data, and file metadata.' });
      return;
    }

    const ext = originalFileName.split('.').pop()?.toLowerCase();
    if (!ext || !['jpg', 'jpeg', 'png'].includes(ext)) {
      res.status(400).json({ error: 'Unsupported file extension. We only accept JPG, JPEG, and PNG images.' });
      return;
    }

    try {
      const bookings = await DB.getBookings();
      const bookingIdx = bookings.findIndex((b) => b.id === bookingId && b.customerId === customer.id);

      if (bookingIdx === -1) {
        res.status(404).json({ error: 'Booking registration not found.' });
        return;
      }

      const booking = bookings[bookingIdx];
      // The amount collected up-front is the 20% down payment, not the full fare.
      const amountDueNow = booking.downPaymentAmount ?? Math.ceil(booking.totalAmount * DOWN_PAYMENT_RATE);

      const base64Parts = proofImageBase64.split(';base64,');
      const base64String = base64Parts.length > 1 ? base64Parts[1] : base64Parts[0];
      const buffer = Buffer.from(base64String, 'base64');
      const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
      const storagePath = `${customer.id}/${bookingId}/proof_${Date.now()}.${ext}`;
      const proofFileUrl = await uploadPaymentProofToStorage(buffer, storagePath, contentType);

      const paymentId = 'PAY-' + crypto.randomBytes(3).toString('hex').toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);

      const newPayment: PaymentProof = {
        id: paymentId,
        bookingId,
        customerId: customer.id,
        amountPaid: amountDueNow,
        proofFileName: proofFileUrl,
        uploadedAt: new Date().toISOString(),
        status: 'Pending',
      };

      await DB.upsertPayment(newPayment);

      bookings[bookingIdx].paymentStatus = 'Pending Verification';
      bookings[bookingIdx].bookingStatus = 'Pending';
      bookings[bookingIdx].paymentMethod = 'GCash';
      await DB.upsertBooking(bookings[bookingIdx]);

      const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') as string;
      await DB.logSecurity(customer.id, `Uploaded Down Payment Proof for booking ${bookingId} (Proof Ref: ${paymentId})`, ip, true);

      res.status(200).json({
        success: true,
        message: 'Your 20% down payment proof has been submitted for verification. Please wait for park marshals to confirm your check-in!',
        booking: bookings[bookingIdx],
        payment: newPayment,
      });
    } catch (e: any) {
      console.error('submitProof error:', e);
      res.status(500).json({ error: 'Failed to write payment files: ' + e.message });
    }
  },

  async getReceipt(req: Request, res: Response): Promise<void> {
    const customer = req.customer!;
    const { bookingId } = req.params;

    if (!bookingId) {
      res.status(400).json({ error: 'Booking reference is required.' });
      return;
    }

    try {
      const bookings = await DB.getBookings();
      const booking = bookings.find((b) => b.id === bookingId && b.customerId === customer.id);
      if (!booking) {
        res.status(404).json({ error: 'Booking not found.' });
        return;
      }

      const receipts = await DB.getReceipts();
      const receipt = receipts.find((r) => r.bookingId === bookingId);

      if (!receipt) {
        res.status(404).json({ error: 'Payment receipt has not been generated for this booking yet.' });
        return;
      }

      res.status(200).json({ success: true, receipt });
    } catch {
      res.status(500).json({ error: 'Failed to find transaction receipts.' });
    }
  },
};