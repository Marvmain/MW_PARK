/**
 * Types and interfaces for MW Adventure Park Booking System
 */

export type UserRole = 'customer' | 'admin';
export type AdminRole = 'super' | 'staff';

export interface AdminUser {
  username: string;
  role: AdminRole;
}

export interface Customer {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  dob: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  createdAt: string;
}

export interface UserSession {
  token: string;
  customer: Customer;
  loginTime: string;
  ipAddress: string;
  userAgent: string;
}

export type ActivityName =
  | 'Kawa Spa'
  | 'Fish Spa'
  | 'Kayak'
  | 'Tub Rent'
  | 'Life Vest Rent'
  | 'Spider Web';

/** A single line item in a cart booking */
export interface CartItem {
  activityName: ActivityName;
  primaryQty: number;   // "small kawa" count or "adults" count or "per head" etc.
  secondaryQty: number; // "big kawa" count or "children" count etc.
  lineTotal: number;
}

export interface Booking {
  id: string;
  customerId: string;
  // Legacy single-activity fields (kept for backward-compat with existing DB rows)
  activityName: ActivityName;
  cottageName?: 'Riverfront Canopy Cabana' | 'Dumagat Stilt Lodge' | 'Forest Canopy Treehouse' | 'Pandan Bamboo Shelter' | 'None';
  bookingDate: string;
  scheduleTime: '08:00 AM' | '10:30 AM' | '01:30 PM' | '04:00 PM';
  numberOfAdults: number;
  numberOfChildren: number;
  totalAmount: number;
  paymentStatus: 'Pending' | 'Pending Verification' | 'Paid' | 'Cancelled' | 'Rejected';
  bookingStatus?: 'Pending' | 'Confirmed' | 'Rejected';
  paymentMethod?: 'GCash' | 'Maya';
  qrCodeToken: string;
  createdAt: string;
  // New multi-activity cart fields
  cartItems?: CartItem[];
}

export interface PaymentProof {
  id: string;
  bookingId: string;
  customerId: string;
  amountPaid: number;
  proofFileName: string;
  uploadedAt: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  adminRemarks?: string;
}

export interface Receipt {
  id: string;
  paymentId: string;
  bookingId: string;
  amountPaid: number;
  paymentMethod: string;
  issuedAt: string;
  activityName: string;
  cottageName?: string;
  customerName: string;
  bookingDate: string;
}

export interface SecurityLog {
  id: string;
  userId: string;
  action: string;
  timestamp: string;
  ip: string;
  success: boolean;
}

export interface Activity {
  id: string;
  name: ActivityName;
  tagline: string;
  description: string;
  longDescription: string;
  duration: string;
  difficulty: 'Easy' | 'Moderate' | 'Challenging' | 'Extreme';
  ageRequirement: string;
  adultRate: number;
  childRate: number;
  primaryRateLabel?: string;
  secondaryRateLabel?: string;
  image: string;
  highlights: string[];
  safetyGuidelines: string[];
  equipmentProvided: string[];
  bestTime: string;
  disabled?: boolean;
}

export interface Cottage {
  id: string;
  name: 'Kubo (Big)' | 'Kubo (Small)' | 'Table with Umbrella' | 'Arko';
  type: string;
  tagline: string;
  description: string;
  longDescription: string;
  capacity: string;
  ratePerDay: number;
  image: string;
  amenities: string[];
  ecologicalSpecs: string[];
  builtFrom: string;
  stiltHeight: string;
  disabled?: boolean;
}