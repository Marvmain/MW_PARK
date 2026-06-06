import { Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { DB } from '../data/manager';
import { Booking, Receipt } from '../../src/types';

export const AdminController = {
  async getAllBookings(req: Request, res: Response): Promise<void> {
    try {
      const [bookings, users] = await Promise.all([DB.getBookings(), DB.getUsers()]);
      const userMap = new Map(users.map(u => [u.id, u]));

      const coupled = bookings.map(b => {
        const u = userMap.get(b.customerId);
        return {
          ...b,
          customer: u
            ? { fullName: u.fullName, email: u.email, phone: u.phone, address: u.address,
                emergencyContactName: u.emergencyContactName, emergencyContactPhone: u.emergencyContactPhone }
            : { fullName: 'Walk-In Guest', email: 'unknown@pandan.gov.ph', phone: 'N/A',
                address: 'Pandan, Antique', emergencyContactName: 'Staff', emergencyContactPhone: 'N/A' },
        };
      });

      res.json({ success: true, bookings: coupled });
    } catch (e: any) {
      console.error('getAllBookings:', e);
      res.status(500).json({ error: 'Failed to retrieve bookings.' });
    }
  },

  async updateBookingStatus(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { paymentStatus, adminNotes } = req.body;

    if (!id || !paymentStatus || !['Pending', 'Paid', 'Cancelled'].includes(paymentStatus)) {
      res.status(400).json({ error: 'Valid booking ID and status (Pending | Paid | Cancelled) required.' });
      return;
    }

    try {
      const updated = await DB.updateBookingFields(id, { paymentStatus, adminNotes });
      if (!updated) { res.status(404).json({ error: 'Booking not found.' }); return; }

      const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') as string;
      await DB.logSecurity('ADMIN_CON', `Updated booking ${id} → ${paymentStatus}`, ip, true);

      res.json({ success: true, message: `Booking #${id} updated to ${paymentStatus}.`, booking: updated });
    } catch (e: any) {
      console.error('updateBookingStatus:', e);
      res.status(500).json({ error: 'Failed to update booking.' });
    }
  },

  async deleteBooking(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    if (!id) { res.status(400).json({ error: 'Booking ID required.' }); return; }

    try {
      const ok = await DB.deleteBookingById(id);
      if (!ok) { res.status(404).json({ error: 'Booking not found.' }); return; }

      const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') as string;
      await DB.logSecurity('ADMIN_CON', `Deleted booking ${id}`, ip, true);

      res.json({ success: true, message: `Booking #${id} permanently deleted.` });
    } catch (e: any) {
      console.error('deleteBooking:', e);
      res.status(500).json({ error: 'Failed to delete booking.' });
    }
  },

  async getSecurityLogs(req: Request, res: Response): Promise<void> {
    try {
      const logs = await DB.getLogs();
      res.json({ success: true, logs });
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch logs.' });
    }
  },

  async seedMockBookings(req: Request, res: Response): Promise<void> {
    try {
      const existing = await DB.getBookings();
      const existingIds = new Set(existing.map(b => b.id));

      const seeds: Booking[] = [
        {
          id: 'MW-ZAP-5142', customerId: 'seed_pilar',
          activityName: 'Dumagat River Trekking', cottageName: 'Riverfront Canopy Cabana',
          bookingDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          scheduleTime: '08:00 AM', numberOfAdults: 4, numberOfChildren: 2,
          totalAmount: 3250, paymentStatus: 'Paid', paymentMethod: 'GCash',
          qrCodeToken: crypto.randomBytes(16).toString('hex'),
          createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
        },
        {
          id: 'MW-VIB-8812', customerId: 'seed_marjun',
          activityName: 'Kayaking & Tubing', cottageName: 'Pandan Bamboo Shelter',
          bookingDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
          scheduleTime: '10:30 AM', numberOfAdults: 5, numberOfChildren: 0,
          totalAmount: 3300, paymentStatus: 'Paid', paymentMethod: 'Maya',
          qrCodeToken: crypto.randomBytes(16).toString('hex'),
          createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        },
        {
          id: 'MW-FLW-2091', customerId: 'seed_sophia',
          activityName: 'Waterpark Day Pass', cottageName: 'Dumagat Stilt Lodge',
          bookingDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
          scheduleTime: '01:30 PM', numberOfAdults: 8, numberOfChildren: 4,
          totalAmount: 5400, paymentStatus: 'Pending',
          qrCodeToken: crypto.randomBytes(16).toString('hex'),
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 'MW-EXT-9311', customerId: 'seed_pilar',
          activityName: 'Extreme Bamboo Rafting', cottageName: 'Forest Canopy Treehouse',
          bookingDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
          scheduleTime: '04:00 PM', numberOfAdults: 3, numberOfChildren: 0,
          totalAmount: 3800, paymentStatus: 'Paid', paymentMethod: 'GCash',
          qrCodeToken: crypto.randomBytes(16).toString('hex'),
          createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        },
        {
          id: 'MW-CAN-1204', customerId: 'seed_marjun',
          activityName: 'Dumagat River Trekking',
          bookingDate: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
          scheduleTime: '10:30 AM', numberOfAdults: 2, numberOfChildren: 1,
          totalAmount: 875, paymentStatus: 'Cancelled',
          qrCodeToken: crypto.randomBytes(16).toString('hex'),
          createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
        },
      ];

      const toInsert = seeds.filter(s => !existingIds.has(s.id));
      await DB.saveBookings(toInsert);

      const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') as string;
      await DB.logSecurity('ADMIN_CON', 'Seeded mock bookings', ip, true);

      res.json({ success: true, message: `Seeded ${toInsert.length} new sample bookings!` });
    } catch (e: any) {
      res.status(500).json({ error: 'Seed failed: ' + e.message });
    }
  },

  async getAllPayments(req: Request, res: Response): Promise<void> {
    try {
      const [payments, bookings, users] = await Promise.all([
        DB.getPayments(), DB.getBookings(), DB.getUsers(),
      ]);
      const bookingMap = new Map(bookings.map(b => [b.id, b]));
      const userMap   = new Map(users.map(u => [u.id, u]));

      const coupled = payments.map(p => {
        const b = bookingMap.get(p.bookingId);
        const u = userMap.get(p.customerId);
        return {
          ...p,
          amountPaid: p.amountPaid || b?.totalAmount || 0,
          activityName: b?.activityName || 'River Activity',
          customerName: u?.fullName || 'Walk-In Guest',
          customerEmail: u?.email || 'unknown@pandan.gov.ph',
          customerPhone: u?.phone || 'N/A',
        };
      });

      res.json({ success: true, payments: coupled });
    } catch (e: any) {
      console.error('getAllPayments:', e);
      res.status(500).json({ error: 'Failed to fetch payments.' });
    }
  },

  async verifyPayment(req: Request, res: Response): Promise<void> {
    const { paymentId } = req.params;
    const { status, adminRemarks } = req.body;

    if (!paymentId || !['Approved', 'Rejected'].includes(status)) {
      res.status(400).json({ error: 'Valid paymentId and status (Approved | Rejected) required.' });
      return;
    }

    try {
      const payments = await DB.getPayments();
      const proof = payments.find(p => p.id === paymentId);
      if (!proof) { res.status(404).json({ error: 'Payment proof not found.' }); return; }

      await DB.updatePaymentStatus(paymentId, status, adminRemarks);

      const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') as string;

      if (status === 'Approved') {
        const updatedBooking = await DB.updateBookingFields(proof.bookingId, {
          paymentStatus: 'Paid', bookingStatus: 'Confirmed',
        });

        const users = await DB.getUsers();
        const user = users.find(u => u.id === proof.customerId);
        const bookings = await DB.getBookings();
        const booking = bookings.find(b => b.id === proof.bookingId);

        const receiptId = 'REC-' + crypto.randomBytes(3).toString('hex').toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);
        const receipt: Receipt = {
          id: receiptId,
          paymentId: proof.id,
          bookingId: proof.bookingId,
          amountPaid: proof.amountPaid,
          paymentMethod: 'GCash',
          issuedAt: new Date().toISOString(),
          activityName: booking?.activityName || '',
          cottageName: booking?.cottageName,
          customerName: user?.fullName || 'Verified Tourist',
          bookingDate: booking?.bookingDate || '',
        };
        await DB.insertReceipt(receipt);

        await DB.logSecurity('ADMIN_CON', `Approved payment ${paymentId} → Receipt ${receiptId}`, ip, true);
        res.json({ success: true, message: `Payment approved! Receipt: ${receiptId}.` });
      } else {
        await DB.updateBookingFields(proof.bookingId, { paymentStatus: 'Rejected', bookingStatus: 'Rejected' });
        await DB.logSecurity('ADMIN_CON', `Rejected payment ${paymentId}. Remarks: ${adminRemarks || 'None'}`, ip, true);
        res.json({ success: true, message: `Payment proof rejected.` });
      }
    } catch (e: any) {
      console.error('verifyPayment:', e);
      res.status(500).json({ error: 'Verification error: ' + e.message });
    }
  },

  async uploadGcashQr(req: Request, res: Response): Promise<void> {
    const { qrImageBase64 } = req.body;
    if (!qrImageBase64) { res.status(400).json({ error: 'QR image data required.' }); return; }

    try {
      const base64Parts = qrImageBase64.split(';base64,');
      const buffer = Buffer.from(base64Parts.length > 1 ? base64Parts[1] : base64Parts[0], 'base64');
      const filePath = path.join(process.cwd(), 'data', 'uploads', 'admin_gcash_qr.png');
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, buffer);

      const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') as string;
      await DB.logSecurity('ADMIN_CON', 'Updated GCash QR code', ip, true);

      res.json({ success: true, message: 'GCash QR updated!', url: '/uploads/admin_gcash_qr.png' });
    } catch (e: any) {
      res.status(500).json({ error: 'Upload failed: ' + e.message });
    }
  },

  async getGcashQr(req: Request, res: Response): Promise<void> {
    const filePath = path.join(process.cwd(), 'data', 'uploads', 'admin_gcash_qr.png');
    const exists = fs.existsSync(filePath);
    res.json({ success: true, hasCustomQr: exists, url: exists ? '/uploads/admin_gcash_qr.png' : null });
  },
};