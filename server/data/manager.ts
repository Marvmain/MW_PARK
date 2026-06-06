import path from 'path';
import crypto from 'crypto';
import { Customer, Booking, SecurityLog, PaymentProof, Receipt } from '../../src/types';
import { supabase, supabaseAdmin } from '../../src/lib/supabaseClient';

export const UPLOADS_DIR = path.join(process.cwd(), 'data', 'uploads');

const HASH_SECRET = process.env.HASH_SECRET || 'mw-adventure-park-secret-salt-2026';

export interface UserRecord extends Customer {
  passwordHash: string;
}

function mapCustomerRow(row: Record<string, unknown>, email = ''): Customer {
  return {
    id: row.id as string,
    fullName: row.full_name as string,
    email: (row.email as string) || email,
    phone: row.phone as string,
    dob: row.dob as string,
    address: (row.address as string) || '',
    emergencyContactName: row.emergency_contact_name as string,
    emergencyContactPhone: row.emergency_contact_phone as string,
    createdAt: (row.created_at as string) || new Date().toISOString(),
  };
}

export const DB = {
  async isPhoneRegistered(phone: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();
    if (error) { console.error('isPhoneRegistered error:', error); return false; }
    return !!data;
  },

  async getCustomerById(id: string, email = ''): Promise<Customer | null> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) { if (error) console.error('getCustomerById error:', error); return null; }
    return mapCustomerRow(data, email);
  },

  async createCustomerProfile(profile: {
    id: string; fullName: string; phone: string; dob: string;
    address: string; emergencyContactName: string; emergencyContactPhone: string;
  }): Promise<{ error: string | null }> {
    const { error } = await supabaseAdmin
      .from('customers')
      .insert({
        id: profile.id,
        full_name: profile.fullName,
        phone: profile.phone,
        dob: profile.dob,
        address: profile.address,
        emergency_contact_name: profile.emergencyContactName,
        emergency_contact_phone: profile.emergencyContactPhone,
      });
    if (error) { console.error('createCustomerProfile error:', error); return { error: error.message }; }
    return { error: null };
  },

  // ─── USERS ──────────────────────────────────────────────────────────────────

  async getUsers(): Promise<UserRecord[]> {
    const { data, error } = await supabase.from('customers').select('*');
    if (error) { console.error('getUsers error:', error); return []; }
    return (data || []).map(row => ({ ...mapCustomerRow(row), passwordHash: '' }));
  },

  async saveUsers(_users: UserRecord[]): Promise<void> {
    // No-op: users are managed via Supabase Auth + customers table directly
  },

  // ─── BOOKINGS ───────────────────────────────────────────────────────────────

  async getBookings(): Promise<Booking[]> {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error('getBookings error:', error); return []; }
    return (data || []).map(row => ({
      id: row.id,
      customerId: row.customer_id,
      activityName: row.activity_name,
      cottageName: row.cottage_name || undefined,
      bookingDate: row.booking_date,
      scheduleTime: row.schedule_time,
      numberOfAdults: row.number_of_adults,
      numberOfChildren: row.number_of_children,
      totalAmount: row.total_amount,
      paymentStatus: row.payment_status,
      bookingStatus: row.booking_status || undefined,
      paymentMethod: row.payment_method || undefined,
      qrCodeToken: row.qr_code_token,
      createdAt: row.created_at,
      adminNotes: row.admin_notes || undefined,
    }));
  },

  async saveBookings(bookings: Booking[]): Promise<void> {
    for (const b of bookings) {
      const { error } = await supabase.from('bookings').upsert({
        id: b.id,
        customer_id: b.customerId,
        activity_name: b.activityName,
        cottage_name: b.cottageName || null,
        booking_date: b.bookingDate,
        schedule_time: b.scheduleTime,
        number_of_adults: b.numberOfAdults,
        number_of_children: b.numberOfChildren,
        total_amount: b.totalAmount,
        payment_status: b.paymentStatus,
        booking_status: b.bookingStatus || null,
        payment_method: b.paymentMethod || null,
        qr_code_token: b.qrCodeToken,
        admin_notes: (b as any).adminNotes || null,
      });
      if (error) console.error('saveBookings upsert error:', error);
    }
  },

  async upsertBooking(b: Booking): Promise<void> {
    const { error } = await supabase.from('bookings').upsert({
      id: b.id,
      customer_id: b.customerId,
      activity_name: b.activityName,
      cottage_name: b.cottageName || null,
      booking_date: b.bookingDate,
      schedule_time: b.scheduleTime,
      number_of_adults: b.numberOfAdults,
      number_of_children: b.numberOfChildren,
      total_amount: b.totalAmount,
      payment_status: b.paymentStatus,
      booking_status: b.bookingStatus || null,
      payment_method: b.paymentMethod || null,
      qr_code_token: b.qrCodeToken,
      admin_notes: (b as any).adminNotes || null,
    });
    if (error) console.error('upsertBooking error:', error);
  },

  async deleteBookingById(id: string): Promise<boolean> {
    const { error } = await supabase.from('bookings').delete().eq('id', id);
    if (error) { console.error('deleteBookingById error:', error); return false; }
    return true;
  },

  async updateBookingFields(id: string, fields: Record<string, unknown>): Promise<Booking | null> {
    const dbFields: Record<string, unknown> = {};
    if (fields.paymentStatus !== undefined)   dbFields.payment_status  = fields.paymentStatus;
    if (fields.bookingStatus !== undefined)   dbFields.booking_status  = fields.bookingStatus;
    if (fields.paymentMethod !== undefined)   dbFields.payment_method  = fields.paymentMethod;
    if (fields.adminNotes    !== undefined)   dbFields.admin_notes     = fields.adminNotes;

    const { data, error } = await supabase
      .from('bookings')
      .update(dbFields)
      .eq('id', id)
      .select()
      .single();
    if (error) { console.error('updateBookingFields error:', error); return null; }
    return {
      id: data.id,
      customerId: data.customer_id,
      activityName: data.activity_name,
      cottageName: data.cottage_name || undefined,
      bookingDate: data.booking_date,
      scheduleTime: data.schedule_time,
      numberOfAdults: data.number_of_adults,
      numberOfChildren: data.number_of_children,
      totalAmount: data.total_amount,
      paymentStatus: data.payment_status,
      bookingStatus: data.booking_status || undefined,
      paymentMethod: data.payment_method || undefined,
      qrCodeToken: data.qr_code_token,
      createdAt: data.created_at,
    };
  },

  // ─── LOGS ────────────────────────────────────────────────────────────────────

  async getLogs(): Promise<SecurityLog[]> {
    const { data, error } = await supabase
      .from('security_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) { console.error('getLogs error:', error); return []; }
    return (data || []).map(row => ({
      id: row.id,
      userId: row.user_id || '',
      action: row.action_type,
      timestamp: row.created_at,
      ip: row.ip_address || '127.0.0.1',
      success: row.is_success,
    }));
  },

  async saveLogs(_logs: SecurityLog[]): Promise<void> {
    // No-op: logs are appended via logSecurity()
  },

  async logSecurity(userId: string | null, action: string, ip: string, success: boolean): Promise<void> {
    const { error } = await supabase.from('security_audit_logs').insert({
      user_id: userId || null,
      action_type: action,
      ip_address: ip,
      is_success: success,
    });
    if (error) console.error('logSecurity error:', error);
  },

  // ─── PAYMENTS ────────────────────────────────────────────────────────────────

  async getPayments(): Promise<PaymentProof[]> {
    const { data, error } = await supabase
      .from('payment_proofs')
      .select('*')
      .order('uploaded_at', { ascending: false });
    if (error) { console.error('getPayments error:', error); return []; }
    return (data || []).map(row => ({
      id: row.id,
      bookingId: row.booking_id,
      customerId: row.customer_id,
      amountPaid: row.amount_paid,
      proofFileName: row.proof_file_name,
      uploadedAt: row.uploaded_at,
      status: row.status,
      adminRemarks: row.admin_remarks || undefined,
    }));
  },

  async savePayments(payments: PaymentProof[]): Promise<void> {
    for (const p of payments) {
      const { error } = await supabase.from('payment_proofs').upsert({
        id: p.id,
        booking_id: p.bookingId,
        customer_id: p.customerId,
        amount_paid: p.amountPaid,
        proof_file_name: p.proofFileName,
        uploaded_at: p.uploadedAt,
        status: p.status,
        admin_remarks: p.adminRemarks || null,
      });
      if (error) console.error('savePayments upsert error:', error);
    }
  },

  async upsertPayment(p: PaymentProof): Promise<void> {
    const { error } = await supabase.from('payment_proofs').upsert({
      id: p.id,
      booking_id: p.bookingId,
      customer_id: p.customerId,
      amount_paid: p.amountPaid,
      proof_file_name: p.proofFileName,
      uploaded_at: p.uploadedAt,
      status: p.status,
      admin_remarks: p.adminRemarks || null,
    });
    if (error) console.error('upsertPayment error:', error);
  },

  async updatePaymentStatus(id: string, status: string, adminRemarks?: string): Promise<void> {
    const { error } = await supabase
      .from('payment_proofs')
      .update({ status, admin_remarks: adminRemarks || null })
      .eq('id', id);
    if (error) console.error('updatePaymentStatus error:', error);
  },

  // ─── RECEIPTS ────────────────────────────────────────────────────────────────

  async getReceipts(): Promise<Receipt[]> {
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .order('issued_at', { ascending: false });
    if (error) { console.error('getReceipts error:', error); return []; }
    return (data || []).map(row => ({
      id: row.id,
      paymentId: row.payment_id,
      bookingId: row.booking_id,
      amountPaid: row.amount_paid,
      paymentMethod: row.payment_method,
      issuedAt: row.issued_at,
      activityName: row.activity_name,
      cottageName: row.cottage_name || undefined,
      customerName: row.customer_name,
      bookingDate: row.booking_date,
    }));
  },

  async saveReceipts(receipts: Receipt[]): Promise<void> {
    for (const r of receipts) {
      const { error } = await supabase.from('receipts').upsert({
        id: r.id,
        payment_id: r.paymentId,
        booking_id: r.bookingId,
        amount_paid: r.amountPaid,
        payment_method: r.paymentMethod,
        issued_at: r.issuedAt,
        activity_name: r.activityName,
        cottage_name: r.cottageName || null,
        customer_name: r.customerName,
        booking_date: r.bookingDate,
      });
      if (error) console.error('saveReceipts upsert error:', error);
    }
  },

  async insertReceipt(r: Receipt): Promise<void> {
    const { error } = await supabase.from('receipts').insert({
      id: r.id,
      payment_id: r.paymentId,
      booking_id: r.bookingId,
      amount_paid: r.amountPaid,
      payment_method: r.paymentMethod,
      issued_at: r.issuedAt,
      activity_name: r.activityName,
      cottage_name: r.cottageName || null,
      customer_name: r.customerName,
      booking_date: r.bookingDate,
    });
    if (error) console.error('insertReceipt error:', error);
  },

  // ─── MISC ────────────────────────────────────────────────────────────────────

  hashPassword(password: string): string {
    return crypto.createHmac('sha256', HASH_SECRET).update(password).digest('hex');
  },
};