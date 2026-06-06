import { Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { DB } from '../data/manager';
import { getCustomerFromToken } from '../lib/auth';
import { Booking, PaymentProof } from '../../src/types';

// Pricing configuration (Philippine peso Rates)
const PRICING = {
  'Dumagat River Trekking': { adultRate: 350, childRate: 175 },
  'Kayaking & Tubing': { adultRate: 500, childRate: 300 },
  'Waterpark Day Pass': { adultRate: 250, childRate: 150 },
  'Extreme Bamboo Rafting': { adultRate: 600, childRate: 400 }
};

const COTTAGE_PRICING = {
  'Riverfront Canopy Cabana': 1500,
  'Dumagat Stilt Lodge': 2800,
  'Forest Canopy Treehouse': 2000,
  'Pandan Bamboo Shelter': 800,
  'None': 0
};

export const BookingController = {
  /**
   * Helper to validate Supabase JWT and get current customer
   */
  async getCustomerFromSession(req: Request) {
    return getCustomerFromToken(req.headers.authorization);
  },

  /**
   * Fetch bookings belonging to the active customer
   */
  async getMyBookings(req: Request, res: Response): Promise<void> {
    const customer = await BookingController.getCustomerFromSession(req);
    if (!customer) {
      res.status(401).json({ error: 'Unauthorized. Please log in to view your reservations.' });
      return;
    }

    try {
      const allBookings = await DB.getBookings();
      const myBookings = allBookings.filter((b) => b.customerId === customer.id);
      res.status(200).json({ success: true, bookings: myBookings });
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve booking list.' });
    }
  },

  /**
   * Create a prospective reservation (Pending status)
   */
  async createBooking(req: Request, res: Response): Promise<void> {
    const customer = await BookingController.getCustomerFromSession(req);
    if (!customer) {
      res.status(401).json({ error: 'Unauthorized. Authentication required.' });
      return;
    }

    const { activityName, cottageName, bookingDate, scheduleTime, numberOfAdults, numberOfChildren } = req.body;

    if (!activityName || !PRICING[activityName as keyof typeof PRICING]) {
      res.status(400).json({ error: 'Invalid river adventure activity selected.' });
      return;
    }

    if (!bookingDate) {
      res.status(400).json({ error: 'Booking date is required.' });
      return;
    }

    const selectedDate = new Date(bookingDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      res.status(400).json({ error: 'Reservations must be made for today or future dates.' });
      return;
    }

    const adultsCount = parseInt(numberOfAdults, 10) || 0;
    const childrenCount = parseInt(numberOfChildren, 15) || 0;

    if (adultsCount <= 0) {
      res.status(400).json({ error: 'At least one adult is required for waiver registrations and river safety.' });
      return;
    }

    try {
      const activityConfig = PRICING[activityName as keyof typeof PRICING];
      
      const targetCottage = cottageName || 'None';
      const cottageRate = COTTAGE_PRICING[targetCottage as keyof typeof COTTAGE_PRICING] !== undefined
        ? COTTAGE_PRICING[targetCottage as keyof typeof COTTAGE_PRICING]
        : 0;

      const totalAmount = req.body.totalAmount !== undefined
        ? parseInt(req.body.totalAmount, 10)
        : (adultsCount * activityConfig.adultRate) + (childrenCount * activityConfig.childRate) + cottageRate;

      const newBooking: Booking = {
        id: 'MW-' + crypto.randomBytes(3).toString('hex').toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000),
        customerId: customer.id,
        activityName: activityName as any,
        cottageName: (targetCottage !== 'None' ? targetCottage : undefined) as any,
        bookingDate,
        scheduleTime,
        numberOfAdults: adultsCount,
        numberOfChildren: childrenCount,
        totalAmount,
        paymentStatus: 'Pending',
        qrCodeToken: crypto.randomBytes(16).toString('hex'),
        createdAt: new Date().toISOString()
      };

      const bookings = await DB.getBookings();
      bookings.push(newBooking);
      await DB.saveBookings(bookings);

      res.status(201).json({
        success: true,
        message: 'Reservation drafted. Proceed to payment using of our local Pandan gateways.',
        booking: newBooking
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to record reservation. Please contact admin.' });
    }
  },

  /**
   * Simulate GCash/Maya PayMongo payment gateway connection
   */
  async processPayment(req: Request, res: Response): Promise<void> {
    const customer = await BookingController.getCustomerFromSession(req);
    if (!customer) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

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
        res.status(400).json({ error: 'This booking has already been paid and approved.' });
        return;
      }

      // Simulate network request to gateway
      bookings[bookingIdx].paymentStatus = 'Paid';
      bookings[bookingIdx].paymentMethod = paymentMethod as any;
      await DB.saveBookings(bookings);

      const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') as string;
      await DB.logSecurity(customer.id, `Payment Success: ${paymentMethod} (ID: ${bookingId})`, ip, true);

      res.status(200).json({
        success: true,
        message: `Payment authorized via PayMongo ${paymentMethod}! Your QR Ticket is issued.`,
        booking: bookings[bookingIdx]
      });
    } catch (error) {
      res.status(500).json({ error: 'Payment gateway timeout. Please retry.' });
    }
  },

  /**
   * Submit payment proof image (base64)
   */
  async submitProof(req: Request, res: Response): Promise<void> {
    const customer = await BookingController.getCustomerFromSession(req);
    if (!customer) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const { bookingId, proofImageBase64, originalFileName } = req.body;

    if (!bookingId || !proofImageBase64 || !originalFileName) {
      res.status(400).json({ error: 'Please submit booking reference, image proof data, and file metadata.' });
      return;
    }

    // Validate file extensions
    const ext = originalFileName.split('.').pop()?.toLowerCase();
    if (!ext || !['jpg', 'jpeg', 'png'].includes(ext)) {
      res.status(400).json({ error: 'Unsupported file extension. We only accept JPG, JPEG, and PNG images.' });
      return;
    }

    try {
      const bookings = await DB.getBookings();
      const bookingIdx = bookings.findIndex(b => b.id === bookingId && b.customerId === customer.id);

      if (bookingIdx === -1) {
        res.status(404).json({ error: 'Booking registration not found.' });
        return;
      }

      // Safeguard decoded buffer writing
      const base64Parts = proofImageBase64.split(';base64,');
      const base64String = base64Parts.length > 1 ? base64Parts[1] : base64Parts[0];
      const buffer = Buffer.from(base64String, 'base64');

      // Save payment proof to server space disk path
      const fileName = `proof_${bookingId}_${Date.now()}.${ext}`;
      const filePath = path.join(process.cwd(), 'data', 'uploads', fileName);
      fs.writeFileSync(filePath, buffer);

      // Create Payment Proof Record
      const paymentId = 'PAY-' + crypto.randomBytes(3).toString('hex').toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);
      const payments = await DB.getPayments();
      
      const newPayment: PaymentProof = {
        id: paymentId,
        bookingId,
        customerId: customer.id,
        amountPaid: bookings[bookingIdx].totalAmount,
        proofFileName: fileName,
        uploadedAt: new Date().toISOString(),
        status: 'Pending'
      };

      payments.push(newPayment);
      await DB.savePayments(payments);

      // Update Booking Payment and Booking status
      bookings[bookingIdx].paymentStatus = 'Pending Verification';
      bookings[bookingIdx].bookingStatus = 'Pending';
      bookings[bookingIdx].paymentMethod = 'GCash'; // Designated payment route
      await DB.saveBookings(bookings);

      const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') as string;
      await DB.logSecurity(customer.id, `Uploaded Payment Proof for booking ${bookingId} (Proof Ref: ${paymentId})`, ip, true);

      res.status(200).json({
        success: true,
        message: 'Your GCash payment proof has been successfully submitted for manual validation. Please wait for park marshals to check your payment!',
        booking: bookings[bookingIdx],
        payment: newPayment
      });
    } catch (e: any) {
      console.error('Failed to register payment proof:', e);
      res.status(500).json({ error: 'Failed to write payment files or registry listings: ' + e.message });
    }
  },

  /**
   * Fetch approved transaction receipt
   */
  async getReceipt(req: Request, res: Response): Promise<void> {
    const customer = await BookingController.getCustomerFromSession(req);
    if (!customer) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const { bookingId } = req.params;

    if (!bookingId) {
      res.status(400).json({ error: 'Booking reference is required.' });
      return;
    }

    try {
      const receipts = await DB.getReceipts();
      const receipt = receipts.find(r => r.bookingId === bookingId);

      if (!receipt) {
        res.status(404).json({ error: 'Payment receipt has not been generated for this booking yet.' });
        return;
      }

      res.status(200).json({
        success: true,
        receipt
      });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to find corporate transaction receipts.' });
    }
  }
};
