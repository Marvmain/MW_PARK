import { Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { DB, UserRecord } from '../data/manager';
import { Booking, Customer, PaymentProof, Receipt } from '../../src/types';

export const AdminController = {
  /**
   * Fetch all bookings coupled with their associated customer data for easy searching and display
   */
  async getAllBookings(req: Request, res: Response): Promise<void> {
    try {
      const bookings = DB.getBookings();
      const users = DB.getUsers();

      // Create a map of user records by ID
      const userMap = new Map<string, UserRecord>();
      users.forEach((u) => {
        userMap.set(u.id, u);
      });

      // Join bookings with customer data
      const coupledBookings = bookings.map((b) => {
        const user = userMap.get(b.customerId);
        return {
          ...b,
          customer: user ? {
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            address: user.address,
            emergencyContactName: user.emergencyContactName,
            emergencyContactPhone: user.emergencyContactPhone
          } : {
            fullName: 'Walk-In Guest / Retired Profile',
            email: 'unknown@pandan.gov.ph',
            phone: 'N/A',
            address: 'Pandan, Antique',
            emergencyContactName: 'Staff',
            emergencyContactPhone: 'N/A'
          }
        };
      });

      // Sort coupledBookings by booking date / created at descending
      coupledBookings.sort((a, b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime());

      res.status(200).json({
        success: true,
        bookings: coupledBookings
      });
    } catch (e: any) {
      console.error('Failed to retrieve administrative bookings:', e);
      res.status(500).json({ error: 'Failed to retrieve administrative bookings directory.' });
    }
  },

  /**
   * Update booking payment or general status
   */
  async updateBookingStatus(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { paymentStatus } = req.body;

    if (!id || !paymentStatus || !['Pending', 'Paid', 'Cancelled'].includes(paymentStatus)) {
      res.status(400).json({ error: 'Please supply a valid booking ID and status (Pending | Paid | Cancelled).' });
      return;
    }

    try {
      const bookings = DB.getBookings();
      const idx = bookings.findIndex((b) => b.id === id);

      if (idx === -1) {
        res.status(404).json({ error: 'No booking found matching requested registration reference.' });
        return;
      }

      const oldStatus = bookings[idx].paymentStatus;
      bookings[idx].paymentStatus = paymentStatus as any;
      DB.saveBookings(bookings);

      const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') as string;
      DB.logSecurity(
        'ADMIN_CON',
        `Admin Updated Booking Status for ID: ${id} from ${oldStatus} to ${paymentStatus}`,
        ip,
        true
      );

      res.status(200).json({
        success: true,
        message: `Booking registration #${id} successfully updated to ${paymentStatus}.`,
        booking: bookings[idx]
      });
    } catch (e: any) {
      console.error('Failed to update booking status:', e);
      res.status(500).json({ error: 'System error occurred while saving status change.' });
    }
  },

  /**
   * Delete flat reservation
   */
  async deleteBooking(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: 'Booking ID parameter is required.' });
      return;
    }

    try {
      const bookings = DB.getBookings();
      const filtered = bookings.filter((b) => b.id !== id);

      if (filtered.length === bookings.length) {
        res.status(404).json({ error: 'Booking registration reference not found.' });
        return;
      }

      DB.saveBookings(filtered);

      const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') as string;
      DB.logSecurity('ADMIN_CON', `Admin Deleted Booking record matching ID: ${id}`, ip, true);

      res.status(200).json({
        success: true,
        message: `Booking #${id} has been permanently expunged from database logs.`
      });
    } catch (e: any) {
      console.error('Failed to expunge booking:', e);
      res.status(500).json({ error: 'Internal system error while performing delete operations.' });
    }
  },

  /**
   * Get secure security tracking logs
   */
  async getSecurityLogs(req: Request, res: Response): Promise<void> {
    try {
      const logs = DB.getLogs();
      // Sort newest actions first
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      res.status(200).json({
        success: true,
        logs: logs.slice(0, 500) // limit to recent 500 events
      });
    } catch (e) {
      res.status(500).json({ error: 'Failed to access security database catalog.' });
    }
  },

  /**
   * Seed authentic mock data to demonstrate rich multi-pax dashboard graphs instantly
   */
  async seedMockBookings(req: Request, res: Response): Promise<void> {
    try {
      const currentBookings = DB.getBookings();
      const currentUsers = DB.getUsers();

      // Check if we already have mock users, if not, create simple template ones
      const seedUsers: UserRecord[] = [
        {
          id: 'u_pilar',
          fullName: 'Pilar Valenzuela',
          email: 'pilar.valenzuela@gmail.com',
          phone: '09172345678',
          dob: '1988-04-12',
          address: 'Tibiao, Antique',
          emergencyContactName: 'Carlos Valenzuela',
          emergencyContactPhone: '09172345679',
          createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
          passwordHash: DB.hashPassword('Pilar123!')
        },
        {
          id: 'u_marjun',
          fullName: 'Marjun Delos Santos',
          email: 'marjun.ds@yahoo.com',
          phone: '09189998822',
          dob: '1995-10-23',
          address: 'Pandan, Antique',
          emergencyContactName: 'Aicelle Santos',
          emergencyContactPhone: '09189998821',
          createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
          passwordHash: DB.hashPassword('Marjun123!')
        },
        {
          id: 'u_sophia',
          fullName: 'Sophia Marie Golez',
          email: 'sophia.golez@outlook.com',
          phone: '09228811776',
          dob: '2001-07-05',
          address: 'Culasi, Antique',
          emergencyContactName: 'Gregorio Golez',
          emergencyContactPhone: '09228811770',
          createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
          passwordHash: DB.hashPassword('Sophia123!')
        }
      ];

      // Insert users if they don't exist
      const existingUserIds = new Set(currentUsers.map(u => u.id));
      const usersToAppend = seedUsers.filter(u => !existingUserIds.has(u.id));
      if (usersToAppend.length > 0) {
        currentUsers.push(...usersToAppend);
        DB.saveUsers(currentUsers);
      }

      // Generate pristine seed bookings
      const seedBookings: Booking[] = [
        {
          id: 'MW-ZAP-5142',
          customerId: 'u_pilar',
          activityName: 'Dumagat River Trekking',
          cottageName: 'Riverfront Canopy Cabana',
          bookingDate: new Date(Date.now() + 1 * 24 * 3600 * 1000).toISOString().split('T')[0],
          scheduleTime: '08:00 AM',
          numberOfAdults: 4,
          numberOfChildren: 2,
          totalAmount: (4 * 350) + (2 * 175) + 1500, // 3250
          paymentStatus: 'Paid',
          paymentMethod: 'GCash',
          qrCodeToken: crypto.randomBytes(16).toString('hex'),
          createdAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString()
        },
        {
          id: 'MW-VIB-8812',
          customerId: 'u_marjun',
          activityName: 'Kayaking & Tubing',
          cottageName: 'Pandan Bamboo Shelter',
          bookingDate: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split('T')[0],
          scheduleTime: '10:30 AM',
          numberOfAdults: 5,
          numberOfChildren: 0,
          totalAmount: (5 * 500) + 800, // 3300
          paymentStatus: 'Paid',
          paymentMethod: 'Maya',
          qrCodeToken: crypto.randomBytes(16).toString('hex'),
          createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
        },
        {
          id: 'MW-FLW-2091',
          customerId: 'u_sophia',
          activityName: 'Waterpark Day Pass',
          cottageName: 'Dumagat Stilt Lodge',
          bookingDate: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().split('T')[0],
          scheduleTime: '01:30 PM',
          numberOfAdults: 8,
          numberOfChildren: 4,
          totalAmount: (8 * 250) + (4 * 150) + 2800, // 5400
          paymentStatus: 'Pending',
          qrCodeToken: crypto.randomBytes(16).toString('hex'),
          createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString()
        },
        {
          id: 'MW-EXT-9311',
          customerId: 'u_pilar',
          activityName: 'Extreme Bamboo Rafting',
          cottageName: 'Forest Canopy Treehouse',
          bookingDate: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().split('T')[0],
          scheduleTime: '04:00 PM',
          numberOfAdults: 3,
          numberOfChildren: 0,
          totalAmount: (3 * 600) + 2000, // 3800
          paymentStatus: 'Paid',
          paymentMethod: 'GCash',
          qrCodeToken: crypto.randomBytes(16).toString('hex'),
          createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()
        },
        {
          id: 'MW-CAN-1204',
          customerId: 'u_marjun',
          activityName: 'Dumagat River Trekking',
          cottageName: 'None',
          bookingDate: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString().split('T')[0],
          scheduleTime: '10:30 AM',
          numberOfAdults: 2,
          numberOfChildren: 1,
          totalAmount: (2 * 350) + (1 * 175) + 0, // 875
          paymentStatus: 'Cancelled',
          qrCodeToken: crypto.randomBytes(16).toString('hex'),
          createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString()
        }
      ];

      // Prevent duplicate ids
      const existingIds = new Set(currentBookings.map((b) => b.id));
      const bookingsToAppend = seedBookings.filter((b) => !existingIds.has(b.id));

      if (bookingsToAppend.length > 0) {
        currentBookings.push(...bookingsToAppend);
        DB.saveBookings(currentBookings);
      }

      const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') as string;
      DB.logSecurity('ADMIN_CON', 'Database seeded with multi-user mock bookings successfully', ip, true);

      res.status(200).json({
        success: true,
        message: 'Successfully seeded database with historic sample river permits & eco-dwelling booking sets!'
      });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to properly seed environmental logs: ' + e.message });
    }
  },

  /**
   * Fetch all uploaded payment proofs
   */
  async getAllPayments(req: Request, res: Response): Promise<void> {
    try {
      const payments = DB.getPayments();
      const bookings = DB.getBookings();
      const users = DB.getUsers();

      const userMap = new Map<string, UserRecord>();
      users.forEach(u => userMap.set(u.id, u));

      const bookingMap = new Map<string, Booking>();
      bookings.forEach(b => bookingMap.set(b.id, b));

      const coupledPayments = payments.map((p) => {
        const booking = bookingMap.get(p.bookingId);
        const user = userMap.get(p.customerId);

        return {
          ...p,
          totalAmount: booking ? booking.totalAmount : 0,
          activityName: booking ? booking.activityName : 'River Activity',
          customerName: user ? user.fullName : 'Walk-In Guest',
          customerEmail: user ? user.email : 'unknown@pandan.gov.ph',
          customerPhone: user ? user.phone : 'N/A'
        };
      });

      // Sort with newest uploads first
      coupledPayments.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

      res.status(200).json({
        success: true,
        payments: coupledPayments
      });
    } catch (e: any) {
      console.error('Failed to retrieve payment lists:', e);
      res.status(500).json({ error: 'System error: ' + e.message });
    }
  },

  /**
   * Action to Approve or Reject user payment proofs
   */
  async verifyPayment(req: Request, res: Response): Promise<void> {
    const { paymentId } = req.params;
    const { status, adminRemarks } = req.body;

    if (!paymentId || !status || !['Approved', 'Rejected'].includes(status)) {
      res.status(400).json({ error: 'Valid payment reference and action (Approved | Rejected) is required.' });
      return;
    }

    try {
      const payments = DB.getPayments();
      const paymentIdx = payments.findIndex(p => p.id === paymentId);

      if (paymentIdx === -1) {
        res.status(404).json({ error: 'Payment proof reference record not found.' });
        return;
      }

      const pProof = payments[paymentIdx];
      const bookings = DB.getBookings();
      const bookingIdx = bookings.findIndex(b => b.id === pProof.bookingId);

      if (bookingIdx === -1) {
        res.status(404).json({ error: 'Linked booking registration was not found in active registries.' });
        return;
      }

      // Update payment proof registry status
      payments[paymentIdx].status = status as any;
      if (adminRemarks) {
        payments[paymentIdx].adminRemarks = adminRemarks;
      }
      DB.savePayments(payments);

      // Perform state updates according to approvals
      if (status === 'Approved') {
        bookings[bookingIdx].paymentStatus = 'Paid';
        bookings[bookingIdx].bookingStatus = 'Confirmed';

        // Generate Receipts record
        const receipts = DB.getReceipts();
        const users = DB.getUsers();
        const user = users.find(u => u.id === pProof.customerId);
        
        const receiptId = 'REC-' + crypto.randomBytes(3).toString('hex').toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);
        
        const newReceipt: Receipt = {
          id: receiptId,
          paymentId: pProof.id,
          bookingId: pProof.bookingId,
          amountPaid: pProof.amountPaid,
          paymentMethod: 'GCash',
          issuedAt: new Date().toISOString(),
          activityName: bookings[bookingIdx].activityName,
          cottageName: bookings[bookingIdx].cottageName,
          customerName: user ? user.fullName : 'Verified Tourist',
          bookingDate: bookings[bookingIdx].bookingDate
        };

        receipts.push(newReceipt);
        DB.saveReceipts(receipts);

        const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') as string;
        DB.logSecurity('ADMIN_CON', `Approved Payment Proof #${paymentId} -> Issued Receipt #${receiptId}`, ip, true);

        res.status(200).json({
          success: true,
          message: `Payment successfully Approved! Issued Tax Receipt: ${receiptId}.`,
          booking: bookings[bookingIdx],
          payment: payments[paymentIdx]
        });
      } else {
        // Rejected State
        bookings[bookingIdx].paymentStatus = 'Rejected';
        bookings[bookingIdx].bookingStatus = 'Rejected';

        // Log transaction rejection
        const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') as string;
        DB.logSecurity('ADMIN_CON', `Rejected Payment Proof Ref: ${paymentId}. Remarks: ${adminRemarks || 'None'}`, ip, true);

        res.status(200).json({
          success: true,
          message: `Booking/Payment proof #${paymentId} has been Rejected. User can upload a replacement.`,
          booking: bookings[bookingIdx],
          payment: payments[paymentIdx]
        });
      }

      DB.saveBookings(bookings);
    } catch (e: any) {
      console.error('Failed to update status on admin verification:', e);
      res.status(500).json({ error: 'Administrative system verification error: ' + e.message });
    }
  },

  /**
   * Upload or change the active GCash QR Code screenshot
   */
  async uploadGcashQr(req: Request, res: Response): Promise<void> {
    const { qrImageBase64 } = req.body;

    if (!qrImageBase64) {
      res.status(400).json({ error: 'QR Code base64 image data is required.' });
      return;
    }

    try {
      const base64Parts = qrImageBase64.split(';base64,');
      const base64String = base64Parts.length > 1 ? base64Parts[1] : base64Parts[0];
      const buffer = Buffer.from(base64String, 'base64');

      const fileName = 'admin_gcash_qr.png';
      const filePath = path.join(process.cwd(), 'data', 'uploads', fileName);
      fs.writeFileSync(filePath, buffer);

      const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') as string;
      DB.logSecurity('ADMIN_CON', `Admin updated GCash QR Core Code Asset`, ip, true);

      res.status(200).json({
        success: true,
        message: 'GCash verification QR successfully updated and aligned to active guest desks!',
        url: '/uploads/admin_gcash_qr.png'
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Upload system failed write assets: ' + error.message });
    }
  },

  /**
   * Get active GCash configuration
   */
  async getGcashQr(req: Request, res: Response): Promise<void> {
    try {
      const filePath = path.join(process.cwd(), 'data', 'uploads', 'admin_gcash_qr.png');
      const exist = fs.existsSync(filePath);

      res.status(200).json({
        success: true,
        hasCustomQr: exist,
        url: exist ? '/uploads/admin_gcash_qr.png' : null
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed check QR code status' });
    }
  }
};
