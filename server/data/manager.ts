import path from 'path';
import crypto from 'crypto';
import { Customer, Booking, SecurityLog, PaymentProof, Receipt } from '../../src/types';
import { supabase, supabaseAdmin } from '../../src/lib/supabaseClient';

export const UPLOADS_DIR = path.join(process.cwd(), 'data', 'uploads');

// Secret salt for password hashing
const HASH_SECRET = process.env.HASH_SECRET || 'mw-adventure-park-secret-salt-2026';

export interface UserRecord extends Customer {
  passwordHash: string;
}

function mapCustomerRow(row: Record<string, unknown>, email = ''): Customer {
  return {
    id: row.id as string,
    fullName: row.full_name as string,
    email,
    phone: row.phone as string,
    dob: row.dob as string,
    address: (row.address as string) || '',
    emergencyContactName: row.emergency_contact_name as string,
    emergencyContactPhone: row.emergency_contact_phone as string,
    createdAt: row.created_at as string
  };
}

export const DB = {
  async isPhoneRegistered(phone: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();

    if (error) {
      console.error('Error checking phone registration:', error);
      return false;
    }

    return !!data;
  },

  async getCustomerById(id: string, email = ''): Promise<Customer | null> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      if (error) console.error('Error fetching customer:', error);
      return null;
    }

    return mapCustomerRow(data, email);
  },

  async createCustomerProfile(profile: {
    id: string;
    fullName: string;
    phone: string;
    dob: string;
    address: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
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
        emergency_contact_phone: profile.emergencyContactPhone
      });

    if (error) {
      console.error('Error creating customer profile:', error);
      return { error: error.message };
    }

    return { error: null };
  },

  async getUsers(): Promise<UserRecord[]> {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*');
      
      if (error) {
        console.error('Error fetching users from Supabase:', error);
        return [];
      }
      
      return (data || []).map(customer => ({
        ...mapCustomerRow(customer),
        passwordHash: ''
      }));
    } catch (e) {
      console.error('Failed to fetch users:', e);
      return [];
    }
  },

  async saveUsers(users: UserRecord[]): Promise<void> {
    try {
      for (const user of users) {
        const { error } = await supabase
          .from('customers')
          .upsert({
            id: user.id,
            full_name: user.fullName,
            phone: user.phone,
            dob: user.dob,
            address: user.address,
            emergency_contact_name: user.emergencyContactName,
            emergency_contact_phone: user.emergencyContactPhone
          });
        
        if (error) {
          console.error('Error saving user to Supabase:', error);
        }
      }
    } catch (e) {
      console.error('Failed to save users:', e);
    }
  },

  async getBookings(): Promise<Booking[]> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          customers:customer_id(full_name, phone, email),
          activities:activity_id(name, adult_rate, child_rate),
          cottages:cottage_id(name, rate_per_day)
        `);
      
      if (error) {
        console.error('Error fetching bookings from Supabase:', error);
        return [];
      }
      
      return (data || []).map(booking => ({
        id: booking.id,
        customerId: booking.customer_id,
        customer: {
          id: booking.customer_id,
          full_name: booking.customers?.full_name || '',
          email: booking.customers?.email || '',
          phone: booking.customers?.phone || ''
        },
        activityId: booking.activity_id,
        activity: booking.activities?.name || '',
        cottageId: booking.cottage_id,
        cottage: booking.cottages?.name || '',
        booking_date: booking.booking_date,
        schedule_time: booking.schedule_time,
        number_of_adults: booking.number_of_adults,
        number_of_children: booking.number_of_children,
        total_amount: booking.total_amount,
        payment_status: booking.payment_status,
        admin_notes: booking.admin_notes,
        created_at: booking.created_at
      }));
    } catch (e) {
      console.error('Failed to fetch bookings:', e);
      return [];
    }
  },

  async saveBookings(bookings: Booking[]): Promise<void> {
    try {
      for (const booking of bookings) {
        const { error } = await supabase
          .from('bookings')
          .upsert({
            id: booking.id,
            customer_id: booking.customerId,
            activity_id: booking.activityId,
            cottage_id: booking.cottageId || null,
            booking_date: booking.booking_date,
            schedule_time: booking.schedule_time,
            number_of_adults: booking.number_of_adults,
            number_of_children: booking.number_of_children,
            total_amount: booking.total_amount,
            payment_status: booking.payment_status,
            admin_notes: booking.admin_notes
          });
        
        if (error) {
          console.error('Error saving booking to Supabase:', error);
        }
      }
    } catch (e) {
      console.error('Failed to save bookings:', e);
    }
  },

  async getLogs(): Promise<SecurityLog[]> {
    try {
      const { data, error } = await supabase
        .from('security_audit_logs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching logs from Supabase:', error);
        return [];
      }
      
      return (data || []).map(log => ({
        id: log.id,
        userId: log.user_id,
        action: log.action_type,
        timestamp: log.created_at,
        ip: log.ip_address,
        success: log.is_success
      }));
    } catch (e) {
      console.error('Failed to fetch logs:', e);
      return [];
    }
  },

  async saveLogs(logs: SecurityLog[]): Promise<void> {
    try {
      for (const log of logs) {
        const { error } = await supabase
          .from('security_audit_logs')
          .insert({
            user_id: log.userId || null,
            action_type: log.action,
            ip_address: log.ip,
            is_success: log.success
          });
        
        if (error) {
          console.error('Error saving log to Supabase:', error);
        }
      }
    } catch (e) {
      console.error('Failed to save logs:', e);
    }
  },

  async getPayments(): Promise<PaymentProof[]> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*');
      
      if (error) {
        console.error('Error fetching payments from Supabase:', error);
        return [];
      }
      
      return (data || []).map(payment => ({
        id: payment.id,
        booking_id: payment.booking_id,
        payment_method: payment.payment_method,
        payment_reference_no: payment.payment_reference_no,
        proof_screenshot_url: payment.proof_screenshot_url,
        amount_paid: payment.amount_paid,
        status: payment.verified_at ? 'verified' : 'pending',
        verified_at: payment.verified_at,
        verified_by: payment.verified_by,
        admin_remarks: payment.admin_remarks,
        created_at: payment.created_at
      }));
    } catch (e) {
      console.error('Failed to fetch payments:', e);
      return [];
    }
  },

  async savePayments(payments: PaymentProof[]): Promise<void> {
    try {
      for (const payment of payments) {
        const { error } = await supabase
          .from('payments')
          .upsert({
            id: payment.id,
            booking_id: payment.booking_id,
            payment_method: payment.payment_method,
            payment_reference_no: payment.payment_reference_no,
            proof_screenshot_url: payment.proof_screenshot_url,
            amount_paid: payment.amount_paid,
            verified_at: payment.verified_at,
            verified_by: payment.verified_by,
            admin_remarks: payment.admin_remarks
          });
        
        if (error) {
          console.error('Error saving payment to Supabase:', error);
        }
      }
    } catch (e) {
      console.error('Failed to save payments:', e);
    }
  },

  async getReceipts(): Promise<Receipt[]> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .not('verified_at', 'is', null);
      
      if (error) {
        console.error('Error fetching receipts from Supabase:', error);
        return [];
      }
      
      return (data || []).map(payment => ({
        id: payment.id,
        bookingId: payment.booking_id,
        amount: payment.amount_paid,
        payment_method: payment.payment_method,
        reference: payment.payment_reference_no,
        verified_at: payment.verified_at,
        created_at: payment.created_at
      }));
    } catch (e) {
      console.error('Failed to fetch receipts:', e);
      return [];
    }
  },

  async saveReceipts(receipts: Receipt[]): Promise<void> {
    try {
      for (const receipt of receipts) {
        const { error } = await supabase
          .from('payments')
          .upsert({
            id: receipt.id,
            booking_id: receipt.bookingId,
            amount_paid: receipt.amount,
            verified_at: receipt.verified_at
          });
        
        if (error) {
          console.error('Error saving receipt to Supabase:', error);
        }
      }
    } catch (e) {
      console.error('Failed to save receipts:', e);
    }
  },

  hashPassword(password: string): string {
    return crypto
      .createHmac('sha256', HASH_SECRET)
      .update(password)
      .digest('hex');
  },

  async logSecurity(userId: string | null, action: string, ip: string, success: boolean): Promise<void> {
    try {
      await supabase
        .from('security_audit_logs')
        .insert({
          user_id: userId,
          action_type: action,
          ip_address: ip,
          is_success: success
        });
    } catch (e) {
      console.error('Failed to log security event:', e);
    }
  }
};
