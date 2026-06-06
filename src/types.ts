/**
 * Types and interfaces for MW Adventure Park Booking System
 */

export interface Customer {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  dob: string; // Date of birth for age restriction verification (crucial for river activities)
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

export interface Booking {
  id: string;
  customerId: string;
  activityName: 'Dumagat River Trekking' | 'Kayaking & Tubing' | 'Waterpark Day Pass' | 'Extreme Bamboo Rafting';
  cottageName?: 'Riverfront Canopy Cabana' | 'Dumagat Stilt Lodge' | 'Forest Canopy Treehouse' | 'Pandan Bamboo Shelter' | 'None';
  bookingDate: string;
  scheduleTime: '08:00 AM' | '10:30 AM' | '01:30 PM' | '04:00 PM';
  numberOfAdults: number;
  numberOfChildren: number;
  totalAmount: number;
  paymentStatus: 'Pending' | 'Pending Verification' | 'Paid' | 'Cancelled' | 'Rejected';
  bookingStatus?: 'Pending' | 'Confirmed' | 'Rejected'; // Live status for validation state
  paymentMethod?: 'GCash' | 'Maya';
  qrCodeToken: string; // Dynamic token for ticket validation
  createdAt: string;
}

export interface PaymentProof {
  id: string; // unique payment reference number (PAY-XXXXXX)
  bookingId: string;
  customerId: string;
  amountPaid: number;
  proofFileName: string; // path or filename stored in data/uploads/
  uploadedAt: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  adminRemarks?: string;
}

export interface Receipt {
  id: string; // unique receipt number (REC-XXXXXX)
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
  name: 'Dumagat River Trekking' | 'Kayaking & Tubing' | 'Waterpark Day Pass' | 'Extreme Bamboo Rafting';
  tagline: string;
  description: string;
  longDescription: string;
  duration: string;
  difficulty: 'Easy' | 'Moderate' | 'Challenging' | 'Extreme';
  ageRequirement: string;
  adultRate: number;
  childRate: number;
  image: string;
  highlights: string[];
  safetyGuidelines: string[];
  equipmentProvided: string[];
  bestTime: string;
  disabled?: boolean;
}

export interface Cottage {
  id: string;
  name: 'Riverfront Canopy Cabana' | 'Dumagat Stilt Lodge' | 'Forest Canopy Treehouse' | 'Pandan Bamboo Shelter';
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


