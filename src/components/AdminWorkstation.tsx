import React, { useState, useEffect } from 'react';
import { 
  Users, 
  DollarSign, 
  Compass, 
  Calendar, 
  ShieldAlert, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Search, 
  RotateCcw, 
  Coins, 
  Anchor, 
  Home, 
  Sparkles, 
  Activity, 
  ExternalLink,
  Lock,
  RefreshCw,
  Clock,
  Printer,
  ChevronDown,
  CreditCard,
  FileText,
  Plus,
  SlidersHorizontal,
  Check,
  Eye,
  ShieldCheck,
  Edit3
} from 'lucide-react';
import { Booking, Customer, Cottage, Activity as ActivityType } from '../types';

interface CoupledBooking extends Booking {
  customer: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
  };
  cancellationReason?: string;
  adminNotes?: string;
}

interface SecurityLog {
  id: string;
  userId: string;
  action: string;
  timestamp: string;
  ip: string;
  success: boolean;
}

interface AdminWorkstationProps {
  onClose: () => void;
  showMsg: (text: string, type: 'success' | 'error') => void;
  token: string | null;
  activities: ActivityType[];
  onUpdateActivities: (acts: ActivityType[]) => void;
  cottages: Cottage[];
  onUpdateCottages: (cots: Cottage[]) => void;
}

export default function AdminWorkstation({ 
  onClose, 
  showMsg, 
  token,
  activities,
  onUpdateActivities,
  cottages,
  onUpdateCottages
}: AdminWorkstationProps) {
  // Authentication & Access Control States
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => sessionStorage.getItem('mw_admin_logged') === 'true');
  const [adminRole, setAdminRole] = useState<'super' | 'staff' | null>(() => sessionStorage.getItem('mw_admin_role') as any);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Primary Data lists
  const [bookings, setBookings] = useState<CoupledBooking[]>([]);
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [adminQRPref, setAdminQRPref] = useState<string | null>(null);
  
  // UI Loading States
  const [isLoading, setIsLoading] = useState(false);
  const [isLancingSeed, setIsLancingSeed] = useState(false);
  
  // Bookings Tab Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activityFilter, setActivityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [cottageFilter, setCottageFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  
  // Payments Screen Filters
  const [paymentsFilter, setPaymentsFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'bookings' | 'payments' | 'catalogs' | 'customers' | 'logs'>('overview');
  
  // Selected Detail Modal states
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<CoupledBooking | null>(null);
  const [selectedProofForReview, setSelectedProofForReview] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Cancellation Note Modal states
  const [bookingToCancel, setBookingToCancel] = useState<CoupledBooking | null>(null);
  const [cancelReasonNote, setCancelReasonNote] = useState('');

  // Customers Tab Detail State
  const [selectedCustomerEmailForHistory, setSelectedCustomerEmailForHistory] = useState<string | null>(null);

  // Manage Catalogs Editor States
  const [catalogEditorTab, setCatalogEditorTab] = useState<'activities' | 'cottages'>('activities');
  const [editingActivity, setEditingActivity] = useState<Partial<ActivityType> | null>(null);
  const [editingCottage, setEditingCottage] = useState<Partial<Cottage> | null>(null);
  
  // Create New Catalog Item States
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [isAddingCottage, setIsAddingCottage] = useState(false);
  
  // Form input defaults
  const [newActForm, setNewActForm] = useState<Partial<ActivityType>>({
    name: 'Dumagat River Trekking',
    tagline: '',
    description: '',
    longDescription: '',
    duration: 'Full Day (6 hours)',
    difficulty: 'Moderate',
    ageRequirement: 'Min Age: 12+',
    adultRate: 350,
    childRate: 175,
    image: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&q=80&w=600',
    highlights: [],
    safetyGuidelines: [],
    equipmentProvided: [],
    bestTime: 'October to May'
  });

  const [newCotForm, setNewCotForm] = useState<Partial<Cottage>>({
    name: 'Riverfront Canopy Cabana',
    type: 'Open Air Bamboo Pavilion',
    tagline: '',
    description: '',
    longDescription: '',
    capacity: 'Up to 6 guests',
    ratePerDay: 1500,
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=600',
    amenities: [],
    ecologicalSpecs: [],
    builtFrom: 'Native Thatch & Split Bamboo',
    stiltHeight: '3 meters above bed elevation'
  });

  // Handle Dynamic Login Logic (Secured in Component Space)
  const handleAdminSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    const sanitisedUser = adminUsername.trim().toLowerCase();
    const sanitisedPass = adminPassword.trim();

    if (sanitisedUser === 'admin' && sanitisedPass === 'AdminPassword55!') {
      setIsAdminLoggedIn(true);
      setAdminRole('super');
      sessionStorage.setItem('mw_admin_logged', 'true');
      sessionStorage.setItem('mw_admin_role', 'super');
      showMsg('Super Admin authenticated successfully. Clearing ledger indices...', 'success');
      setAdminUsername('');
      setAdminPassword('');
    } else if (sanitisedUser === 'staff' && sanitisedPass === 'StaffPassword55!') {
      setIsAdminLoggedIn(true);
      setAdminRole('staff');
      sessionStorage.setItem('mw_admin_logged', 'true');
      sessionStorage.setItem('mw_admin_role', 'staff');
      showMsg('Staff role unlocked. Accessible tabs: Bookings & Catalogs.', 'success');
      setAdminUsername('');
      setAdminPassword('');
      setActiveSubTab('bookings'); // Staff lands directly on bookings tab
    } else {
      showMsg('Access denied. Invalid keys or matching credential tokens.', 'error');
    }
  };

  const handleAdminSignOut = () => {
    setIsAdminLoggedIn(false);
    setAdminRole(null);
    sessionStorage.removeItem('mw_admin_logged');
    sessionStorage.removeItem('mw_admin_role');
    showMsg('Admin session closed safely.', 'success');
  };

  // Load all system registers from the mock APIs
  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const headersValue = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      const bookRes = await fetch('/api/admin/bookings', { headers: headersValue });
      const bookData = await bookRes.json();
      if (bookRes.ok && bookData.bookings) {
        setBookings(bookData.bookings);
      }

      const payRes = await fetch('/api/admin/payments', { headers: headersValue });
      const payData = await payRes.json();
      if (payRes.ok && payData.payments) {
        setPayments(payData.payments);
      }

      const qrRes = await fetch('/api/admin/gcash-qr', { headers: headersValue });
      const qrData = await qrRes.json();
      if (qrRes.ok && qrData.url) {
        setAdminQRPref(qrData.url);
      }

      const logRes = await fetch('/api/admin/logs', { headers: headersValue });
      const logData = await logRes.json();
      if (logRes.ok && logData.logs) {
        setLogs(logData.logs);
      }
    } catch (e: any) {
      console.error('Failed to query administrative registers:', e);
      showMsg('Connection offline. Ensure development port services are functional.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminLoggedIn) {
      loadAdminData();
    }
  }, [token, isAdminLoggedIn]);

  // Seeding simulated entries
  const handleSeedCommand = async () => {
    setIsLancingSeed(true);
    try {
      const res = await fetch('/api/admin/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok) {
        showMsg(data.message || 'Seeding successful! Added multiple customer timelines.', 'success');
        loadAdminData();
      } else {
        showMsg(data.error || 'Failed to complete db seeding.', 'error');
      }
    } catch (e) {
      showMsg('Failed to fetch seeding API.', 'error');
    } finally {
      setIsLancingSeed(false);
    }
  };

  // Modify payment authorization status with support for explicit cancellations
  const handleStatusReconciliation = async (bookingId: string, newStatus: 'Paid' | 'Cancelled' | 'Pending', reasonNotes?: string) => {
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ 
          paymentStatus: newStatus,
          adminNotes: reasonNotes || undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        showMsg(`Permit #${bookingId} successfully synchronized to "${newStatus}" status.`, 'success');
        
        // update list locally immediately to avoid network stutter
        setBookings(prev => prev.map(b => b.id === bookingId ? { 
          ...b, 
          paymentStatus: newStatus,
          adminNotes: reasonNotes || b.adminNotes 
        } : b));
        
        if (selectedBookingForReview?.id === bookingId) {
          setSelectedBookingForReview(prev => prev ? { 
            ...prev, 
            paymentStatus: newStatus,
            adminNotes: reasonNotes || prev.adminNotes
          } : null);
        }
      } else {
        showMsg(data.error || 'Amendment failed.', 'error');
      }
    } catch (e) {
      showMsg('Failed to transmit update payload.', 'error');
    }
  };

  const submitCancellationWithNotes = () => {
    if (!bookingToCancel) return;
    handleStatusReconciliation(bookingToCancel.id, 'Cancelled', cancelReasonNote || 'Cancelled via Operator Workstation');
    setBookingToCancel(null);
    setCancelReasonNote('');
  };

  // Permanently delete a record
  const handleDeleteBooking = async (bookingId: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete and wipe booking permit #${bookingId}? This action is irreversible after environmental logging.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'DELETE',
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      const data = await res.json();
      if (res.ok) {
        showMsg(`Booking #${bookingId} successfully expunged.`, 'success');
        setBookings(prev => prev.filter(b => b.id !== bookingId));
        if (selectedBookingForReview?.id === bookingId) {
          setSelectedBookingForReview(null);
        }
      } else {
        showMsg(data.error || 'Deletion failed.', 'error');
      }
    } catch (e) {
      showMsg('Failed to reach administrative gateway.', 'error');
    }
  };

  // Verify custom GCash pay proof
  const handleVerifyPayment = async (paymentId: string, status: 'Approved' | 'Rejected') => {
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          status,
          adminRemarks: status === 'Rejected' ? rejectionReason : undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        showMsg(data.message || `Payment proof has been ${status.toLowerCase()}`, 'success');
        setRejectionReason('');
        setSelectedProofForReview(null);
        loadAdminData();
      } else {
        showMsg(data.error || 'Failed to submit verification action.', 'error');
      }
    } catch (err) {
      showMsg('Network error writing verification logs.', 'error');
    }
  };

  // Super Admin GCash merchant QR replacement
  const handleAdminQRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      showMsg('Please upload a valid image file (PNG, JPG, or JPEG).', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const res = await fetch('/api/admin/gcash-qr', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify({ qrImageBase64: base64 })
        });
        const data = await res.json();
        if (res.ok) {
          showMsg(data.message || 'GCash QR Code updated successfully!', 'success');
          setAdminQRPref(data.url);
          loadAdminData();
        } else {
          showMsg(data.error || 'Failed to align QR code.', 'error');
        }
      } catch (err) {
        showMsg('Error uploading configuration QR code.', 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  // CSV Exporter Helper Function
  const handleExportReservationsCSV = () => {
    if (bookings.length === 0) {
      showMsg('Bookings database is empty. No records to export.', 'error');
      return;
    }

    const headers = ["Permit ID", "Customer Name", "Email", "Phone", "Activity", "Cottage Add-on", "Date", "Schedule", "AdultsCount", "ChildrenCount", "Ledge Total", "Payment Status", "Reservation Age Status"];
    const rows = bookings.map(b => {
      const birthYear = new Date(b.customer.dob).getFullYear();
      const currentYear = new Date().getFullYear();
      const roughAge = isNaN(birthYear) ? 'Unknown' : currentYear - birthYear;
      
      return [
        b.id,
        b.customer.fullName,
        b.customer.email,
        b.customer.phone,
        b.activityName,
        b.cottageName || "None",
        b.bookingDate,
        b.scheduleTime,
        b.numberOfAdults,
        b.numberOfChildren,
        b.totalAmount,
        b.paymentStatus,
        `Age Bracket: ${roughAge}`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" // Add UTF-8 BOM
      + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `MW_Pandan_Reservations_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showMsg('Financial ledger CSV report downloaded successfully.', 'success');
  };

  // Filtered dataset for primary bookings ledger
  const filteredBookings = bookings.filter(b => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = b.id.toLowerCase().includes(term) || 
                          b.customer.fullName.toLowerCase().includes(term) ||
                          b.customer.email.toLowerCase().includes(term) ||
                          b.customer.phone.includes(term);
    
    const matchesActivity = activityFilter === 'All' || b.activityName === activityFilter;
    const matchesStatus = statusFilter === 'All' || b.paymentStatus === statusFilter;
    const matchesDate = !dateFilter || b.bookingDate === dateFilter;
    
    const matchesCottage = cottageFilter === 'All' || 
                           (cottageFilter === 'With Cottage' && b.cottageName && b.cottageName !== 'None') ||
                           (cottageFilter === 'No Cottage' && (!b.cottageName || b.cottageName === 'None'));

    return matchesSearch && matchesActivity && matchesStatus && matchesCottage && matchesDate;
  });

  // Extract unique customers logically for our profiles directory
  const uniqueCustomers = Array.from(new Map(bookings.map(b => [b.customer.email, b.customer])).values());

  // Calculations for Admin Stats indicators
  const totalRevenue = bookings
    .filter(b => b.paymentStatus === 'Paid')
    .reduce((sum, b) => sum + b.totalAmount, 0);

  const pendingRevenue = bookings
    .filter(b => b.paymentStatus === 'Pending' || b.paymentStatus === 'Pending Verification')
    .reduce((sum, b) => sum + b.totalAmount, 0);

  const cancelledRevenue = bookings
    .filter(b => b.paymentStatus === 'Cancelled')
    .reduce((sum, b) => sum + b.totalAmount, 0);

  const totalAdultsServed = bookings
    .filter(b => b.paymentStatus === 'Paid')
    .reduce((sum, b) => sum + b.numberOfAdults, 0);

  const totalChildrenServed = bookings
    .filter(b => b.paymentStatus === 'Paid')
    .reduce((sum, b) => sum + b.numberOfChildren, 0);

  const activityCounts = {
    'Dumagat River Trekking': 0,
    'Kayaking & Tubing': 0,
    'Waterpark Day Pass': 0,
    'Extreme Bamboo Rafting': 0
  };
  bookings.forEach(b => {
    if (activityCounts[b.activityName as keyof typeof activityCounts] !== undefined) {
      activityCounts[b.activityName as keyof typeof activityCounts]++;
    }
  });

  const cottageCounts = {
    'Riverfront Canopy Cabana': 0,
    'Dumagat Stilt Lodge': 0,
    'Forest Canopy Treehouse': 0,
    'Pandan Bamboo Shelter': 0,
    'None': 0
  };
  bookings.forEach(b => {
    const key = b.cottageName || 'None';
    if (cottageCounts[key as keyof typeof cottageCounts] !== undefined) {
      cottageCounts[key as keyof typeof cottageCounts]++;
    }
  });

  // Toggle item availability
  const toggleActivityAvailability = (actId: string) => {
    const updated = activities.map(act => act.id === actId ? { ...act, disabled: !act.disabled } : act);
    onUpdateActivities(updated);
    showMsg('River activity weather safety state revised.', 'success');
  };

  const toggleCottageAvailability = (cotId: string) => {
    const updated = cottages.map(cot => cot.id === cotId ? { ...cot, disabled: !cot.disabled } : cot);
    onUpdateCottages(updated);
    showMsg('Riverside cottage maintenance reservation state updated.', 'success');
  };

  // Modify Rates per activity
  const handleSaveActivityEdit = () => {
    if (!editingActivity) return;
    const updated = activities.map(act => act.id === editingActivity.id ? { ...act, ...editingActivity } : act) as ActivityType[];
    onUpdateActivities(updated);
    setEditingActivity(null);
    showMsg('Activity pricing catalog record refreshed.', 'success');
  };

  const handleSaveCottageEdit = () => {
    if (!editingCottage) return;
    const updated = cottages.map(cot => cot.id === editingCottage.id ? { ...cot, ...editingCottage } : cot) as Cottage[];
    onUpdateCottages(updated);
    setEditingCottage(null);
    showMsg('Cottage rate specifications modified.', 'success');
  };

  // Add Dynamic Activity
  const saveNewActivity = () => {
    if (!newActForm.name || !newActForm.adultRate) {
      showMsg('Please supply a name and adult rate for the activity.', 'error');
      return;
    }
    const newId = 'act_' + Date.now();
    const newRecord: ActivityType = {
      ...(newActForm as ActivityType),
      id: newId,
      disabled: false
    };
    onUpdateActivities([...activities, newRecord]);
    setIsAddingActivity(false);
    // Reset Form
    setNewActForm({
      name: 'Dumagat River Trekking',
      tagline: '',
      description: '',
      longDescription: '',
      duration: 'Full Day (6 hours)',
      difficulty: 'Moderate',
      ageRequirement: 'Min Age: 12+',
      adultRate: 350,
      childRate: 175,
      image: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&q=80&w=600',
      highlights: [],
      safetyGuidelines: [],
      equipmentProvided: [],
      bestTime: 'October to May'
    });
    showMsg('Successfully entered a new river activity in catalogue schedules!', 'success');
  };

  // Add Dynamic Cottage
  const saveNewCottage = () => {
    if (!newCotForm.name || !newCotForm.ratePerDay) {
      showMsg('Please supply a name and rate specification for the cottage.', 'error');
      return;
    }
    const newId = 'cot_' + Date.now();
    const newRecord: Cottage = {
      ...(newCotForm as Cottage),
      id: newId,
      disabled: false
    };
    onUpdateCottages([...cottages, newRecord]);
    setIsAddingCottage(false);
    setNewCotForm({
      name: 'Riverfront Canopy Cabana',
      type: 'Open Air Bamboo Pavilion',
      tagline: '',
      description: '',
      longDescription: '',
      capacity: 'Up to 6 guests',
      ratePerDay: 1500,
      image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=600',
      amenities: [],
      ecologicalSpecs: [],
      builtFrom: 'Native Thatch & Split Bamboo',
      stiltHeight: '3 meters above bed elevation'
    });
    showMsg('Riverside stilt structure added to catalog.', 'success');
  };

  // Delete Item permanently from lists
  const deleteActivityFromCatalog = (actId: string) => {
    if (activities.length <= 1) {
      showMsg('Cannot delete last remain catalog activity to preserve forms.', 'error');
      return;
    }
    if (window.confirm('Delete this river adventure permanently from municipal catalogs?')) {
      const filtered = activities.filter(act => act.id !== actId);
      onUpdateActivities(filtered);
      showMsg('Activity catalog entry deleted.', 'success');
    }
  };

  const deleteCottageFromCatalog = (cotId: string) => {
    if (window.confirm('Delete this stilt cottage catalog item? This will clear its reservation capacity rules.')) {
      const filtered = cottages.filter(c => c.id !== cotId);
      onUpdateCottages(filtered);
      showMsg('Cottage option deleted.', 'success');
    }
  };

  /* ======================================================== */
  /* UN-AUTHENTICATED ADMIN LOGIN FORM OVERLAY               */
  /* ======================================================== */
  if (!isAdminLoggedIn) {
    return (
      <div className="min-h-screen bg-[#1B3022] flex items-center justify-center p-4">
        <form 
          onSubmit={handleAdminSignIn}
          className="bg-white border border-[#1B3022]/10 max-w-md w-full p-8 rounded shadow-2xl space-y-6 animate-fade-in"
        >
          <div className="text-center space-y-2">
            <div className="h-12 w-12 bg-[#1B3022]/10 text-[#1B3022] rounded-full mx-auto flex items-center justify-center">
              <Lock className="h-6 w-6 text-[#A67C52]" />
            </div>
            <span className="text-[10px] uppercase tracking-[0.25em] font-extrabold text-[#A67C52] block">
              Municipal Riverway Ingress Node
            </span>
            <h3 className="font-serif text-2xl font-bold text-[#1B3022]">Administrative Entrance</h3>
            <p className="text-[11px] text-gray-400">
              Supply administrative username and security tokens to coordinate ecoforest checklists.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Staff / Admin Username
              </label>
              <input
                type="text"
                placeholder="Enter 'admin' or 'staff'"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                required
                className="w-full text-xs p-2.5 bg-stone-50 border border-gray-200 focus:outline-none focus:border-[#A67C52] rounded text-[#1B3022]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Security Password Token
              </label>
              <input
                type="password"
                placeholder="Enter password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
                className="w-full text-xs p-2.5 bg-stone-50 border border-gray-200 focus:outline-none focus:border-[#A67C52] rounded text-[#1B3022]"
              />
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 text-[10px] rounded leading-relaxed text-amber-900 space-y-1">
            <p><strong>SIMULATED REGISTER CREDENTIALS:</strong></p>
            <p>● Super Admin: User: <code className="font-mono font-bold bg-amber-100 px-1 py-0.2 rounded">admin</code> | Pass: <code className="font-mono font-bold bg-amber-100 px-1 py-0.2 rounded">AdminPassword55!</code></p>
            <p>● Staff Operator: User: <code className="font-mono font-bold bg-amber-100 px-1 py-0.2 rounded">staff</code> | Pass: <code className="font-mono font-bold bg-amber-100 px-1 py-0.2 rounded">StaffPassword55!</code></p>
          </div>

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold uppercase py-3 rounded transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-[#1B3022] hover:bg-[#A67C52] text-white text-xs font-bold uppercase py-3 rounded transition-all shadow cursor-pointer"
            >
              Login
            </button>
          </div>
        </form>
      </div>
    );
  }

  /* ======================================================== */
  /* SECURE ROLE ACCESS GATE PASS SHIELD BACKGROUND          */
  /* ======================================================== */
  const subTabs = [
    { id: 'overview' as const, name: 'Analytics Monitor', icon: Activity, roles: ['super'] },
    { id: 'bookings' as const, name: 'Manage Permits Directory', count: bookings.length, icon: Calendar, roles: ['super', 'staff'] },
    { id: 'payments' as const, name: 'Verify GCash Payments', count: payments.filter(p => p.status === 'Pending').length, icon: CreditCard, roles: ['super'] },
    { id: 'catalogs' as const, name: 'Manage Catalogs & Schedules', icon: Compass, roles: ['super', 'staff'] },
    { id: 'customers' as const, name: 'Customers Directory', count: uniqueCustomers.length, icon: Users, roles: ['super'] },
    { id: 'logs' as const, name: 'Security & Action Audit Logs', count: logs.length, icon: ShieldAlert, roles: ['super'] },
  ];

  const currentTabAllowed = subTabs.find(tab => tab.id === activeSubTab)?.roles.includes(adminRole || '');

  return (
    <div className="bg-[#FAF9F6] text-[#1B3022] min-h-screen border border-[#1B3022]/10 p-4 sm:p-6 lg:p-8 space-y-8 animate-fade-in">
      
      {/* Top Admin banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#1B3022]/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.3em] font-extrabold text-[#A67C52] block">
              Government Control Panel • Municipal Waterways Node
            </span>
            <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded border ${
              adminRole === 'super' 
                ? 'bg-emerald-50 text-emerald-850 border-emerald-300' 
                : 'bg-indigo-50 text-indigo-800 border-indigo-200'
            }`}>
              {adminRole === 'super' ? '🛡️ Super Admin Access' : '📋 Staff Operator Access'}
            </span>
          </div>
          <h2 className="font-serif text-3xl md:text-4xl tracking-tight text-[#1B3022] flex items-center gap-2 mt-1">
            <Lock className="h-6 w-6 text-[#A67C52]" />
            <span>Pandan River Admin Workstation</span>
          </h2>
          <p className="text-xs font-light text-gray-500 mt-1 max-w-2xl">
            Audit high-security software nodes, issue ecological waivers, reconcile pay proofs, and customize catalogue pricing.
          </p>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={loadAdminData}
            title="Reload register indices"
            className="p-2.5 bg-white border border-[#1B3022]/15 hover:bg-stone-50 transition-colors rounded text-[#1B3022] flex items-center justify-center cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleSeedCommand}
            disabled={isLancingSeed}
            className="flex-1 md:flex-initial bg-[#A67C52] hover:bg-[#1B3022] text-[#FAF9F6] text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            <span>{isLancingSeed ? 'Seeding Registries...' : 'Seed Sandbox Data'}</span>
          </button>

          <button
            onClick={handleAdminSignOut}
            className="bg-red-700 hover:bg-red-800 text-[#FAF9F6] text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded transition-all text-center cursor-pointer"
          >
            Exit Workspace
          </button>
        </div>
      </div>

      {/* Sub-tab selection row */}
      <div className="flex border-b border-[#1B3022]/10 pb-1 justify-start gap-4 text-xs uppercase tracking-[0.12em] font-bold overflow-x-auto whitespace-nowrap scrollbar-none">
        {subTabs.map((tab) => {
          const isSelected = activeSubTab === tab.id;
          const isAllowed = tab.roles.includes(adminRole || '');
          const TabIcon = tab.icon;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`pb-3 border-b-2 transition-all flex items-center gap-1.5 px-1 cursor-pointer ${
                isSelected 
                  ? 'border-[#1B3022] text-[#1B3022] font-extrabold' 
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              } ${!isAllowed ? 'opacity-40' : ''}`}
            >
              <TabIcon className="h-4 w-4" />
              <span>{tab.name}</span>
              {tab.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${isSelected ? 'bg-[#1B3022] text-white' : 'bg-gray-150 text-gray-500'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* SHIELD OVERLAY SCREEN FOR REJECTED CLEARENCE ROLES (RBAC)               */}
      {/* ---------------------------------------------------------------------- */}
      {!currentTabAllowed ? (
        <div className="bg-white border border-red-200 p-12 text-center rounded max-w-lg mx-auto shadow-sm space-y-4">
          <ShieldAlert className="h-16 w-16 text-red-600 mx-auto animate-bounce" />
          <h3 className="font-serif text-xl font-bold text-red-950">Super Admin Clearance Required</h3>
          <p className="text-gray-500 text-xs leading-relaxed">
            Staff directory roles are restricted strictly to managing admissions, calendars, and boat capacities. Financial dashboards, payment auditing pipelines, visitor histories, and security logs require <strong>Super Admin</strong> authorization.
          </p>
          <button
            onClick={() => setActiveSubTab('bookings')}
            className="px-4 py-2 bg-[#1B3022] hover:bg-[#A67C52] text-white text-xs font-bold uppercase rounded transition-colors cursor-pointer"
          >
            Access My Authorized Bookings Desk
          </button>
        </div>
      ) : (
        /* Render Active allowed views */
        <>
          {/* TAB 1: ANALYTICS OVERVIEW MONITOR */}
          {activeSubTab === 'overview' && (
            <div className="space-y-8">
              
              {/* Financial Stats Bar deck */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white border border-stone-200 p-6 rounded shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-[#A67C52] uppercase tracking-wider block">Audited Revenue</span>
                    <h3 className="text-3xl font-serif text-[#1B3022] font-black mt-1">₱{totalRevenue.toLocaleString()}</h3>
                  </div>
                  <span className="text-[10px] text-gray-400 mt-4 block">Reconciled Eco-Tourism proceeds</span>
                </div>

                <div className="bg-white border border-stone-200 p-6 rounded shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Pending / Float Cash</span>
                    <h3 className="text-3xl font-serif text-amber-700 font-black mt-1">₱{pendingRevenue.toLocaleString()}</h3>
                  </div>
                  <span className="text-[10px] text-gray-400 mt-4 block">Awaiting payment verification</span>
                </div>

                <div className="bg-white border border-stone-200 p-6 rounded shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider block">Cancelled Reversals</span>
                    <h3 className="text-3xl font-serif text-red-800 font-black mt-1">₱{cancelledRevenue.toLocaleString()}</h3>
                  </div>
                  <span className="text-[10px] text-gray-400 mt-4 block">Refunded cancelled vouchers</span>
                </div>

                <div className="bg-white border border-stone-200 p-6 rounded shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Total Visitors</span>
                    <h3 className="text-3xl font-serif text-[#1B3022] font-black mt-1">{totalAdultsServed + totalChildrenServed}</h3>
                  </div>
                  <span className="text-[10px] text-gray-400 mt-4 block">{totalAdultsServed} Adults vs {totalChildrenServed} Children admitted</span>
                </div>
              </div>

              {/* Administrative Export Deck & CSV triggers */}
              <div className="bg-stone-50 border border-dashed border-[#1B3022]/15 p-6 rounded flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <h4 className="font-serif text-lg font-bold">Environmental Data Export Deck</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Generate daily accounting worksheets containing visitor histories, rough ages, and waiver logs.</p>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={handleExportReservationsCSV}
                    className="px-4 py-2.5 bg-[#1B3022] hover:bg-[#A67C52] text-white text-xs font-bold uppercase tracking-wider rounded flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Export Excel / CSV Ledger</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2.5 bg-white border border-[#1B3022]/15 hover:bg-stone-50 text-stone-700 text-xs font-bold uppercase tracking-wider rounded flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Print Ledger (PDF)</span>
                  </button>
                </div>
              </div>

              {/* Bento Allocation Diagrams */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Popularity Metrics: River Adventures */}
                <div className="bg-white border border-stone-200 p-6 rounded shadow-sm space-y-4">
                  <div className="border-b border-stone-100 pb-3">
                    <h4 className="font-serif text-base font-bold">Adventure Allocation Demand</h4>
                    <p className="text-[11px] text-gray-400">Total registered slots compiled across the system</p>
                  </div>

                  <div className="space-y-3">
                    {Object.entries(activityCounts).map(([name, count]) => {
                      const totalBookingsCount = bookings.length || 1;
                      const percentage = Math.round((count / totalBookingsCount) * 100);
                      
                      return (
                        <div key={name} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-slate-700">{name}</span>
                            <span className="font-medium text-gray-500 font-mono">{count} permits ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-stone-100 h-2.5 rounded overflow-hidden">
                            <div 
                              className="bg-[#1B3022] h-full transition-all"
                              style={{ width: `${Math.max(percentage, 5)}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Popularity Metrics: Cottage Add-ons */}
                <div className="bg-white border border-stone-200 p-6 rounded shadow-sm space-y-4">
                  <div className="border-b border-stone-100 pb-3">
                    <h4 className="font-serif text-base font-bold">Cottage Add-on Preferences</h4>
                    <p className="text-[11px] text-gray-400">Stilt structures preferences selected during check-in</p>
                  </div>

                  <div className="space-y-3">
                    {Object.entries(cottageCounts).map(([name, count]) => {
                      const totalCottagesSum = Object.values(cottageCounts).reduce((as, c) => as + c, 0) || 1;
                      const percentage = Math.round((count / totalCottagesSum) * 100);
                      
                      return (
                        <div key={name} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-slate-700">{name}</span>
                            <span className="font-medium text-gray-500 font-mono">{count} days booked ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-stone-100 h-2.5 rounded overflow-hidden">
                            <div 
                              className="bg-[#A67C52] h-full transition-all"
                              style={{ width: `${Math.max(percentage, 5)}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: MANAGE PERMITS DIRECTORY */}
          {activeSubTab === 'bookings' && (
            <div className="space-y-6">
              
              {/* Filter deck */}
              <div className="bg-white border border-stone-200 p-5 rounded shadow-sm space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  
                  {/* Search bar */}
                  <div className="relative sm:col-span-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input 
                      type="text"
                      placeholder="Query by Permit ID, Guest Name or Email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-stone-200 text-xs rounded focus:outline-none focus:border-[#A67C52] text-[#1B3022]"
                    />
                  </div>

                  {/* Date Filter */}
                  <div>
                    <input 
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="w-full p-2 border border-stone-200 text-xs rounded focus:outline-none focus:border-[#A67C52] text-slate-600"
                    />
                  </div>

                  {/* Activity Filter */}
                  <div>
                    <select
                      value={activityFilter}
                      onChange={(e) => setActivityFilter(e.target.value)}
                      className="w-full py-2 px-3 border border-stone-200 text-xs rounded focus:outline-none focus:border-[#A67C52] text-[#1B3022]"
                    >
                      <option value="All">All Activities</option>
                      {activities.map(a => (
                        <option key={a.id} value={a.name}>{a.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Cottage Dropdowns */}
                  <div>
                    <select
                      value={cottageFilter}
                      onChange={(e) => setCottageFilter(e.target.value)}
                      className="w-full py-2 px-3 border border-stone-200 text-xs rounded focus:outline-none focus:border-[#A67C52] text-[#1B3022]"
                    >
                      <option value="All">All Cottages</option>
                      <option value="With Cottage">With Cottage Add-on</option>
                      <option value="No Cottage">Plain Admission ticket</option>
                    </select>
                  </div>

                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-3">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
                    <span>Payment Status:</span>
                    {['All', 'Paid', 'Pending', 'Pending Verification', 'Cancelled', 'Rejected'].map((status) => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-3 py-1 rounded-full text-[10px] transition-all font-semibold ${
                          statusFilter === status 
                            ? 'bg-[#1B3022] text-[#FAF9F6]' 
                            : 'bg-stone-100 text-gray-500 hover:bg-stone-200'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setActivityFilter('All');
                      setStatusFilter('All');
                      setCottageFilter('All');
                      setDateFilter('');
                    }}
                    className="text-[#A67C52] hover:underline flex items-center gap-1 text-xs focus:outline-none"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset All Queries</span>
                  </button>
                </div>
              </div>

              {/* Bookings directory table */}
              <div className="bg-white border border-stone-200 rounded shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px] tracking-wider">
                        <th className="p-4">Reference ID</th>
                        <th className="p-4">Tourist Profile</th>
                        <th className="p-4">Activity & Cabin Details</th>
                        <th className="p-4">Reservation Date</th>
                        <th className="p-4 text-center">Pax</th>
                        <th className="p-4 text-right">Ledge Fee</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4 text-right">Administrative Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {filteredBookings.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-12 text-center text-gray-400">
                            <Calendar className="h-10 w-10 mx-auto opacity-30 mb-2" />
                            <h6 className="font-serif text-sm font-bold">No Environmental Handled Permits Match Filter</h6>
                            <p className="text-[11px] text-gray-500 mt-1">Please update criteria, or inject mock sandbox payloads.</p>
                          </td>
                        </tr>
                      ) : (
                        filteredBookings.map((b) => (
                          <tr key={b.id} className="hover:bg-amber-50/10 transition-colors">
                            <td className="p-4 font-mono font-bold text-[#1B3022]">
                              {b.id}
                            </td>
                            <td className="p-4">
                              <span className="block font-semibold">{b.customer.fullName}</span>
                              <span className="block text-[10px] text-gray-400">{b.customer.email}</span>
                            </td>
                            <td className="p-4 space-y-0.5">
                              <span className="block font-medium">{b.activityName}</span>
                              {b.cottageName && b.cottageName !== 'None' ? (
                                <span className="inline-block bg-teal-50 border border-teal-200 text-teal-800 text-[9px] font-bold px-1.5 py-0.5 uppercase tracking-wide rounded">
                                  ⛺ {b.cottageName}
                                </span>
                              ) : (
                                <span className="text-[10px] text-gray-400">No cottage add-on</span>
                              )}
                            </td>
                            <td className="p-4">
                              <span className="font-medium block">{b.bookingDate}</span>
                              <span className="font-mono text-[10px] text-gray-450 block">{b.scheduleTime}</span>
                            </td>
                            <td className="p-4 text-center font-mono font-bold">
                              {b.numberOfAdults}A {b.numberOfChildren > 0 && `+ ${b.numberOfChildren}C`}
                            </td>
                            <td className="p-4 text-right font-mono font-semibold">
                              ₱{b.totalAmount.toLocaleString()}
                            </td>
                            <td className="p-4 text-center">
                              <span className={`inline-block px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded border ${
                                b.paymentStatus === 'Paid' 
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                  : b.paymentStatus === 'Cancelled' 
                                  ? 'bg-red-50 text-red-900 border-red-200' 
                                  : b.paymentStatus === 'Pending Verification'
                                  ? 'bg-blue-50 text-blue-900 border-blue-200'
                                  : b.paymentStatus === 'Rejected'
                                  ? 'bg-purple-50 text-purple-900 border-purple-200'
                                  : 'bg-amber-50 text-amber-900 border-amber-200'
                              }`}>
                                {b.paymentStatus === 'Pending Verification' ? 'Under Review' : b.paymentStatus}
                              </span>
                            </td>
                            <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                              
                              <button
                                onClick={() => setSelectedBookingForReview(b)}
                                className="px-2 py-1 bg-stone-100 hover:bg-[#1B3022] hover:text-[#FAF9F6] text-[10px] font-bold uppercase rounded transition-colors cursor-pointer"
                                title="Inspect permit waiver specification sheet"
                              >
                                Permit Spec
                              </button>

                              {b.paymentStatus !== 'Paid' && (
                                <button
                                  onClick={() => handleStatusReconciliation(b.id, 'Paid')}
                                  className="text-emerald-700 hover:bg-emerald-50 border border-emerald-100 hover:border-emerald-300 p-1.5 rounded transition-colors cursor-pointer"
                                  title="Approve payments"
                                >
                                  <CheckCircle className="h-4 w-4 inline-block" />
                                </button>
                              )}

                              {b.paymentStatus !== 'Cancelled' ? (
                                <button
                                  onClick={() => setBookingToCancel(b)}
                                  className="text-red-700 hover:bg-red-50 border border-red-100 hover:border-red-300 p-1.5 rounded transition-colors cursor-pointer"
                                  title="Mark Reservation Cancelled"
                                >
                                  <XCircle className="h-4 w-4 inline-block" />
                                </button>
                              ) : (
                                b.adminNotes && (
                                  <span className="text-[10px] text-gray-400 italic block mt-0.5 max-w-[140px] truncate" title={b.adminNotes}>
                                    Note: {b.adminNotes}
                                  </span>
                                )
                              )}

                              <button
                                onClick={() => handleDeleteBooking(b.id)}
                                className="text-gray-300 hover:text-red-700 p-1.5 rounded transition-colors cursor-pointer"
                                title="Delete permanently"
                              >
                                <Trash2 className="h-4 w-4 inline-block" />
                              </button>

                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: VERIFY GCASH PAYMENTS LEDGER */}
          {activeSubTab === 'payments' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              
              {/* Primary list */}
              <div className="lg:col-span-3 bg-white border border-stone-200 p-6 rounded shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-100 pb-4">
                  <div>
                    <h3 className="font-serif text-lg font-bold">GCash / Maya Payment Proofs Reconcile Ledger</h3>
                    <p className="text-[11px] text-gray-400">Review visitor payment screenshots and update reservation states.</p>
                  </div>
                  
                  <div className="flex gap-1">
                    {['All', 'Pending', 'Approved', 'Rejected'].map((status) => (
                      <button
                        key={status}
                        onClick={() => setPaymentsFilter(status as any)}
                        className={`px-3 py-1.5 rounded text-[10px] font-semibold border capitalize transition-all cursor-pointer ${
                          paymentsFilter === status
                            ? 'bg-[#1B3022] text-white border-[#1B3022]'
                            : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-stone-50 text-stone-500 font-bold uppercase text-[10px] tracking-wider border-b border-stone-200">
                        <th className="p-3">Reference No</th>
                        <th className="p-3">Booking ID</th>
                        <th className="p-3">Guest Profile</th>
                        <th className="p-3">Activity / Uploaded Date</th>
                        <th className="p-3 text-right">Amount</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-right">Administrative Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {payments.filter(p => paymentsFilter === 'All' || p.status === paymentsFilter).length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-gray-400 italic">
                            No uploaded eco-tourism transaction screenshot matched this filter.
                          </td>
                        </tr>
                      ) : (
                        payments
                          .filter(p => paymentsFilter === 'All' || p.status === paymentsFilter)
                          .map((p) => (
                            <tr key={p.id} className="hover:bg-amber-50/10 transition-colors">
                              <td className="p-3 font-mono font-bold text-[#A67C52]">
                                {p.id}
                              </td>
                              <td className="p-3 font-mono text-gray-600">
                                {p.bookingId}
                              </td>
                              <td className="p-3">
                                <span className="font-semibold block">{p.customerName || 'Sandbox User'}</span>
                                <span className="text-[10px] text-gray-400 block">{p.customerEmail || 'unknown@guest.com'}</span>
                              </td>
                              <td className="p-3">
                                <span className="font-medium block">{p.activityName}</span>
                                <span className="text-[10px] text-gray-400 block font-light">Uploaded: {new Date(p.uploadedAt).toLocaleDateString()}</span>
                              </td>
                              <td className="p-3 text-right font-mono font-semibold text-[#1B3022]">
                                ₱{p.amountPaid.toLocaleString()}
                              </td>
                              <td className="p-3 text-center">
                                <span className={`inline-block px-2.5 py-0.5 rounded text-[9px] font-bold uppercase border ${
                                  p.status === 'Approved'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : p.status === 'Rejected'
                                    ? 'bg-red-50 text-red-800 border-red-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse'
                                }`}>
                                  {p.status}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => setSelectedProofForReview(p)}
                                  className="px-3 py-1.5 bg-[#1B3022] hover:bg-[#A67C52] text-white text-[10px] font-semibold uppercase tracking-wider rounded transition-colors cursor-pointer"
                                >
                                  Review Proof
                                </button>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* QR CONFIG Sidebar */}
              <div className="bg-white border border-stone-200 p-6 rounded shadow-sm space-y-4 h-fit">
                <h3 className="font-serif text-lg font-bold border-b border-stone-100 pb-3">GCash QR Merchant Config</h3>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Provide your official or personal GCash Merchant QR Code image so client-side checkout terminals display it in real time.
                </p>

                <div className="bg-stone-50 border border-dashed border-stone-200 rounded p-4 flex flex-col items-center justify-center space-y-3">
                  {adminQRPref ? (
                    <div className="relative group w-32 h-32 bg-white p-1.5 shadow border rounded">
                      <img
                        src={adminQRPref}
                        alt="Active Admin GCash QR"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] uppercase tracking-widest font-black rounded text-center p-1">
                        Active Upload Code
                      </div>
                    </div>
                  ) : (
                    <div className="w-32 h-32 bg-stone-100 flex flex-col items-center justify-center rounded border border-stone-200 text-center p-2 text-stone-400">
                      <CreditCard className="h-8 w-8 text-stone-300 mb-1" />
                      <span className="text-[10px] leading-tight font-medium text-stone-500">Default Eco-Terminal Code Active</span>
                    </div>
                  )}
                  
                  <span className="text-[10px] text-gray-400 uppercase tracking-widest block font-bold text-center">
                    {adminQRPref ? 'Custom Merchant QR' : 'Default Preset QR'}
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-[#1B3022]">
                    Upload replacement (JPG, PNG)
                  </label>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={handleAdminQRUpload}
                    className="w-full text-xs text-stone-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-[10px] file:font-semibold file:uppercase file:tracking-wider file:bg-[#1B3022]/10 file:text-[#1B3022] hover:file:bg-[#1B3022]/20 file:cursor-pointer"
                  />
                  <span className="text-[9px] text-gray-400 leading-tight block">
                    Uploading instantly replaces the QR overlay rendered on client checkout screens. File validation ensures safe formats.
                  </span>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: MANAGE CATALOGS & WEATHER SCHEDULES */}
          {activeSubTab === 'catalogs' && (
            <div className="space-y-6">
              
              {/* Catalogs Subtabs */}
              <div className="flex border-b border-stone-100 pb-1 justify-start gap-4 text-xs font-bold uppercase">
                <button
                  onClick={() => setCatalogEditorTab('activities')}
                  className={`pb-2 border-b-2 transition-all cursor-pointer ${catalogEditorTab === 'activities' ? 'border-[#A67C52] text-[#A67C52]' : 'border-transparent text-gray-400'}`}
                >
                  River Adventure Packages catalogue
                </button>
                <button
                  onClick={() => setCatalogEditorTab('cottages')}
                  className={`pb-2 border-b-2 transition-all cursor-pointer ${catalogEditorTab === 'cottages' ? 'border-[#A67C52] text-[#A67C52]' : 'border-transparent text-gray-400'}`}
                >
                  Riverside Cottage cabins
                </button>
              </div>

              {/* CATALOG EDITOR VIEW: ACTIVITIES */}
              {catalogEditorTab === 'activities' ? (
                <div className="space-y-6">
                  
                  {/* Top Bar actions */}
                  <div className="flex justify-between items-center bg-white p-4 border border-stone-200 rounded shadow-sm">
                    <div>
                      <h4 className="font-serif text-md font-bold">Activities Directory</h4>
                      <p className="text-[11px] text-gray-450 mt-0.5">Toggle weather suspensions, update pricing rates, and add custom adventure packages.</p>
                    </div>
                    <button
                      onClick={() => setIsAddingActivity(true)}
                      className="px-4 py-2 bg-[#1B3022] hover:bg-[#A67C52] text-white text-xs font-bold uppercase rounded flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Activity Entry</span>
                    </button>
                  </div>

                  {/* Listings Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {activities.map((act) => (
                      <div key={act.id} className={`bg-white border rounded shadow-sm p-5 space-y-4 flex flex-col justify-between ${act.disabled ? 'border-red-200 bg-red-50/10' : 'border-stone-200'}`}>
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[9px] uppercase tracking-widest text-[#A67C52] font-semibold">{act.difficulty} • {act.duration}</span>
                              <h4 className="font-serif text-lg font-bold text-[#1B3022] flex items-center gap-1.5 leading-tight">
                                <span>{act.name}</span>
                                {act.disabled && <span className="text-[9px] uppercase tracking-wide bg-red-100 text-red-800 border border-red-300 px-1.5 py-0.5 rounded font-bold">Weather Closed</span>}
                              </h4>
                            </div>
                            
                            <span className="text-sm font-semibold font-mono text-[#1B3022] bg-stone-50 px-2.5 py-1 border border-stone-200 rounded">
                              ₱{act.adultRate} / ₱{act.childRate}
                            </span>
                          </div>

                          <p className="text-xs text-gray-500 leading-relaxed font-light line-clamp-3">{act.description}</p>
                        </div>

                        {/* Control buttons */}
                        <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                          
                          <button
                            onClick={() => toggleActivityAvailability(act.id)}
                            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer ${
                              act.disabled 
                                ? 'bg-[#1B3022] text-[#FAF9F6] hover:bg-[#A67C52]' 
                                : 'bg-red-50 text-red-700 hover:bg-red-650 hover:text-white border border-red-200'
                            }`}
                          >
                            {act.disabled ? '☀️ Open Activity (Good Weather)' : '⚠️ Toggle Weather Closure'}
                          </button>

                          <div className="flex gap-1">
                            <button
                              onClick={() => setEditingActivity(act)}
                              className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded transition-colors cursor-pointer"
                              title="Edit specifications"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteActivityFromCatalog(act.id)}
                              className="p-1.5 text-stone-300 hover:text-red-700 rounded transition-colors cursor-pointer"
                              title="Delete from catalog"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              ) : (
                <div className="space-y-6">
                  
                  {/* Cottage Header Actions */}
                  <div className="flex justify-between items-center bg-white p-4 border border-stone-200 rounded shadow-sm">
                    <div>
                      <h4 className="font-serif text-md font-bold">Eco-Lodge Structure Directory</h4>
                      <p className="text-[11px] text-gray-450 mt-0.5">Toggle maintenance states, change rates, and construct custom bamboo stilt structures.</p>
                    </div>
                    <button
                      onClick={() => setIsAddingCottage(true)}
                      className="px-4 py-2 bg-[#1B3022] hover:bg-[#A67C52] text-white text-xs font-bold uppercase rounded flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Stilt Cottage</span>
                    </button>
                  </div>

                  {/* Cottage Lists Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {cottages.map((cot) => (
                      <div key={cot.id} className={`bg-white border rounded shadow-sm p-5 space-y-4 flex flex-col justify-between ${cot.disabled ? 'border-red-200 bg-red-50/15' : 'border-stone-200'}`}>
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[9px] uppercase tracking-widest text-[#A67C52] font-semibold">{cot.type} • {cot.capacity}</span>
                              <h4 className="font-serif text-lg font-bold text-[#1B3022] flex items-center gap-1.5 leading-tight">
                                <span>{cot.name}</span>
                                {cot.disabled && <span className="text-[9px] uppercase tracking-wide bg-red-100 text-red-800 border border-red-300 px-1.5 py-0.5 rounded font-bold">Suspended</span>}
                              </h4>
                            </div>
                            
                            <span className="text-sm font-semibold font-mono text-[#1B3022] bg-teal-50 px-2.5 py-1 border border-teal-200 rounded">
                              ₱{cot.ratePerDay} / Day
                            </span>
                          </div>

                          <p className="text-xs text-gray-500 leading-relaxed font-light line-clamp-3">{cot.description}</p>
                        </div>

                        {/* Actions */}
                        <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                          
                          <button
                            onClick={() => toggleCottageAvailability(cot.id)}
                            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer ${
                              cot.disabled 
                                ? 'bg-[#1B3022] text-[#FAF9F6] hover:bg-[#A67C52]' 
                                : 'bg-red-50 text-red-700 hover:bg-red-650 hover:text-white border border-red-200'
                            }`}
                          >
                            {cot.disabled ? '☀️ Open Cottage for bookings' : '⚠️ Lock (Maintenance)'}
                          </button>

                          <div className="flex gap-1">
                            <button
                              onClick={() => setEditingCottage(cot)}
                              className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded transition-colors cursor-pointer"
                              title="Edit pricing structures"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteCottageFromCatalog(cot.id)}
                              className="p-1.5 text-stone-300 hover:text-red-700 rounded transition-colors cursor-pointer"
                              title="Delete Cottage"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              )}

            </div>
          )}

          {/* TAB 5: CUSTOMERS REGISTERED DIRECTORY */}
          {activeSubTab === 'customers' && (
            <div className="space-y-6">
              <div className="bg-white border border-stone-200 p-6 rounded shadow-sm">
                <div className="border-b border-stone-100 pb-3 flex justify-between items-center mb-6">
                  <div>
                    <h4 className="font-serif text-lg font-bold">Ecoforrest Tourist Registration Directory</h4>
                    <p className="text-xs text-gray-400">View customer list, verified emergency contacts, and deep booking histories.</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px] tracking-wider">
                        <th className="p-4">Customer ID</th>
                        <th className="p-4">Full Tourist Name</th>
                        <th className="p-4">Contact Email</th>
                        <th className="p-4">Phone Coordinates</th>
                        <th className="p-4">Emergency Contacts Profile</th>
                        <th className="p-4 text-center">Waiver Age Bracket</th>
                        <th className="p-4 text-right">Ledger History</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {uniqueCustomers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-gray-400 italic">
                            No guests found. Generate test data or book sessions to build registrations logs.
                          </td>
                        </tr>
                      ) : (
                        uniqueCustomers.map((user: any) => {
                          const birthYear = new Date(user.dob).getFullYear();
                          const currentYear = new Date().getFullYear();
                          const roughAge = isNaN(birthYear) ? 0 : currentYear - birthYear;
                          const ageLabel = roughAge === 0 ? 'Unknown' : roughAge.toString();
                          
                          // Collect customer bookings
                          const clientBookings = bookings.filter(b => b.customer.email === user.email);
                          const totalContribution = clientBookings.filter(b => b.paymentStatus==='Paid').reduce((s,b)=> s+b.totalAmount, 0);

                          return (
                            <tr key={user.id} className="hover:bg-amber-50/10 transition-colors">
                              <td className="p-4 font-mono font-bold text-slate-800">
                                {user.id || 'CUST-MEM-' + Math.floor(1000 + Math.random()*9000)}
                              </td>
                              <td className="p-4">
                                <span className="block font-semibold">{user.fullName}</span>
                                <span className="block text-[10px] text-gray-400">Address: {user.address || 'Unlisted'}</span>
                              </td>
                              <td className="p-4 text-gray-600">
                                {user.email}
                              </td>
                              <td className="p-4 font-mono font-medium text-slate-700">
                                {user.phone}
                              </td>
                              <td className="p-4 space-y-0.5">
                                <span className="block text-stone-800 font-semibold">{user.emergencyContactName}</span>
                                <span className="block text-[10px] text-red-700 font-mono">📱 {user.emergencyContactPhone}</span>
                              </td>
                              <td className="p-4 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${roughAge >= 18 ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
                                  Age: {ageLabel} {roughAge >= 18 ? '(Waiver Signed)' : roughAge > 0 ? '(Minor)' : '(N/A)'}
                                </span>
                              </td>
                              <td className="p-4 text-right space-y-1">
                                <button
                                  onClick={() => setSelectedCustomerEmailForHistory(user.email)}
                                  className="px-2.5 py-1 bg-stone-100 hover:bg-[#1B3022] hover:text-white rounded border border-stone-200 text-[10px] font-bold uppercase transition-colors cursor-pointer"
                                >
                                  Book Timeline ({clientBookings.length})
                                </button>
                                <span className="block text-[10px] font-mono font-black text-[#A67C52]">₱{totalContribution.toLocaleString()} paid</span>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SECURITY INCIDENTS & ACTIONS AUDIT LOGS */}
          {activeSubTab === 'logs' && (
            <div className="bg-white border border-stone-200 p-6 rounded shadow-sm space-y-4">
              <div className="border-b border-stone-100 pb-3 flex justify-between items-center">
                <div>
                  <h4 className="font-serif text-lg font-bold">Dynamic Security Incidents Register Traces</h4>
                  <p className="text-[11px] text-gray-400">Chronological immutable audit stream tracking logins, checks, and waiver signatures.</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-stone-50 text-stone-500 font-bold uppercase text-[10px] tracking-wider border-b border-stone-200">
                      <th className="p-3">Incident Token</th>
                      <th className="p-3">ISO Timestamp</th>
                      <th className="p-3">Account Reference</th>
                      <th className="p-3">Operation Description</th>
                      <th className="p-3">IP Addresses Node</th>
                      <th className="p-3 text-center">Operation Gate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-mono text-[11px] text-[#1B3022]">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-gray-400">
                          Empty system traces register. Conduct check-ins or login cycles to record audit trails.
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <tr key={log.id} className="hover:bg-stone-50">
                          <td className="p-3 font-semibold text-gray-400 text-[10px]">{log.id}</td>
                          <td className="p-3 text-slate-400">{log.timestamp}</td>
                          <td className="p-3 font-sans text-gray-600">{log.userId === 'ADMIN_CON' ? '🔐 service_root' : log.userId}</td>
                          <td className="p-3 font-sans font-semibold text-[#1B3022]">{log.action}</td>
                          <td className="p-3">{log.ip}</td>
                          <td className="p-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase ${log.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                              {log.success ? 'Success' : 'Aborted'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* DIALOG A: DETAILED PAYMENT EVIDENCE REVIEW PANEL                        */}
      {/* ---------------------------------------------------------------------- */}
      {selectedProofForReview && (
        <div className="fixed inset-0 z-50 bg-[#1B3022]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded border border-[#1B3022]/20 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
            
            <div className="bg-[#1B3022] text-white px-6 py-4 flex justify-between items-center shrink-0">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#A67C52] block tracking-widest">ECO-COMMUNITY RECONCILE GATEWAY</span>
                <h4 className="font-serif text-lg font-bold">Auditing Payment Proof Reference: {selectedProofForReview.id}</h4>
              </div>
              <button
                onClick={() => {
                  setSelectedProofForReview(null);
                  setRejectionReason('');
                }}
                className="text-white opacity-70 hover:opacity-100 text-xl font-bold font-sans cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Information panel */}
                <div className="space-y-4 text-xs">
                  <div className="border-b border-stone-200 pb-2">
                    <span className="text-gray-400 block tracking-widest text-[9px] uppercase">PANDAN VISITOR PATHWAY</span>
                    <span className="text-sm font-bold block">{selectedProofForReview.customerName || 'Admitted Guest'}</span>
                    <span className="text-slate-500 block">{selectedProofForReview.customerEmail || 'no-email'}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-400 block text-[9px] uppercase">Admissions Segment</span>
                      <span className="font-semibold block">{selectedProofForReview.activityName}</span>
                    </div>

                    <div>
                      <span className="text-gray-400 block text-[9px] uppercase">Reconcile Ledger Fee</span>
                      <span className="font-bold block text-emerald-800">₱{selectedProofForReview.amountPaid?.toLocaleString()}</span>
                    </div>

                    <div>
                      <span className="text-gray-400 block text-[9px] uppercase">Waterways Permit ID</span>
                      <span className="font-mono font-black block text-slate-800">{selectedProofForReview.bookingId}</span>
                    </div>

                    <div>
                      <span className="text-gray-400 block text-[9px] uppercase">Timestamp Uploaded</span>
                      <span className="font-mono block">{new Date(selectedProofForReview.uploadedAt).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Rejection input controls */}
                  <div className="p-4 bg-stone-50 border border-stone-200 rounded space-y-3">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-600">Reconcile Auditing Action</span>
                    <p className="text-[10px] text-gray-500 font-sans leading-relaxed">
                      Verify that the uploaded screenshot contains matching GCash reference keys, dates, and Pandan fee amount. If falsified, input a rejection remark.
                    </p>
                    
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-500">Rejection Remark Note</label>
                      <input 
                        type="text"
                        placeholder="Incomplete screenshot / reference mismatched..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="w-full p-2 border border-stone-200 bg-white rounded text-xs text-[#1B3022] focus:outline-none focus:border-[#A67C52]"
                      />
                    </div>
                  </div>

                </div>

                {/* Proof screenshot panel */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center block">Visitor Evidence Receipt Screenshot</span>
                  
                  <div className="border border-stone-200 rounded bg-stone-50 p-2 max-h-[300px] overflow-hidden flex items-center justify-center relative group">
                    <img
                      src={selectedProofForReview.proofFileName}
                      alt="Uploaded Reconcile Document"
                      referrerPolicy="no-referrer"
                      className="max-h-[280px] md:max-h-[320px] object-contain shadow-sm rounded transition-transform group-hover:scale-105"
                    />
                  </div>
                </div>

              </div>

            </div>

            {/* Footer triggers */}
            <div className="p-4 bg-stone-50 border-t border-stone-200 flex justify-between items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  if (!rejectionReason.trim()) {
                    showMsg('Rejection remark note required to reject payment.', 'error');
                    return;
                  }
                  handleVerifyPayment(selectedProofForReview.id, 'Rejected');
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold uppercase cursor-pointer"
              >
                Reject Evidence Proof
              </button>

              <button
                onClick={() => handleVerifyPayment(selectedProofForReview.id, 'Approved')}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold uppercase cursor-pointer"
              >
                Approve Payment Receipt
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* DIALOG B: WAIVER & PERMITS BLUEPRINT (CRAFT HIGHLIGHT)                 */}
      {/* ---------------------------------------------------------------------- */}
      {selectedBookingForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in text-slate-800">
          <div className="relative w-full max-w-xl bg-white text-[#1B3022] shadow-2xl border-4 border-[#1B3022] p-6 sm:p-8 rounded overflow-y-auto max-h-[90vh] space-y-6">
            
            {/* License header */}
            <div className="text-center border-b border-[#1B3022]/25 pb-4 space-y-1">
              <span className="font-mono text-[9px] block uppercase tracking-[0.25em] font-bold text-[#A67C52]">
                Republic of the Philippines • Province of Antique
              </span>
              <h3 className="font-serif text-xl font-bold uppercase tracking-tight text-[#1B3022]">
                MUNICIPAL WATERS RENTAL PERMIT & WAIVER
              </h3>
              <p className="text-[10px] font-mono uppercase text-gray-500">
                AUTHORIZED PERMIT REFERENCE CODE: <span className="font-bold underline text-slate-900">{selectedBookingForReview.id}</span>
              </p>
            </div>

            {/* Registration state badge block */}
            <div className="bg-[#1B3022]/5 p-4 border border-[#1B3022]/10 flex justify-between items-center text-xs">
              <div>
                <span className="block uppercase text-[8px] font-bold tracking-widest text-[#1B3022]">Registry Status</span>
                <span className={`text-sm font-extrabold font-serif ${
                  selectedBookingForReview.paymentStatus === 'Paid' 
                    ? 'text-emerald-800' 
                    : selectedBookingForReview.paymentStatus === 'Cancelled'
                    ? 'text-red-800'
                    : 'text-amber-700'
                }`}>
                  ● {selectedBookingForReview.paymentStatus.toUpperCase()}
                </span>
              </div>
              <div className="text-right">
                <span className="block uppercase text-[8px] font-bold tracking-widest text-[#1B3022]">Pax Counts</span>
                <span className="font-bold">{selectedBookingForReview.numberOfAdults} Adults {selectedBookingForReview.numberOfChildren > 0 && `, ${selectedBookingForReview.numberOfChildren} Children`}</span>
              </div>
            </div>

            {/* Profile Section */}
            <div className="space-y-3">
              <div className="border-b border-[#1B3022]/15 pb-1 flex justify-between items-center">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#1B3022]">Section I: Inductee Profile Info</span>
                <span className="font-mono text-[8px] text-gray-400">ecological clearance</span>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <span className="text-gray-400 uppercase text-[9px] block">Registrant Full Name</span>
                  <span className="font-semibold">{selectedBookingForReview.customer.fullName}</span>
                </div>
                <div>
                  <span className="text-gray-400 uppercase text-[9px] block">Contact Phone Number</span>
                  <span className="font-mono">{selectedBookingForReview.customer.phone}</span>
                </div>
                <div>
                  <span className="text-gray-400 uppercase text-[9px] block">Emergency Contact Name</span>
                  <span className="font-semibold">{selectedBookingForReview.customer.emergencyContactName} ({selectedBookingForReview.customer.emergencyContactPhone})</span>
                </div>
                <div>
                  <span className="text-gray-400 uppercase text-[9px] block">Ingress Date & Time</span>
                  <span className="font-bold">{selectedBookingForReview.bookingDate} @ {selectedBookingForReview.scheduleTime}</span>
                </div>
              </div>
            </div>

            {/* Itinerary Specs */}
            <div className="space-y-3">
              <div className="border-b border-[#1B3022]/15 pb-1 flex justify-between items-center">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#1B3022]">Section II: River Adventure Specs</span>
                <span className="font-mono text-[8px] text-gray-400">stilt cabins specs</span>
              </div>

              <div className="text-xs bg-stone-50 border border-[#1B3022]/5 p-3 space-y-2">
                <div className="flex justify-between items-center font-bold text-slate-800">
                  <span>{selectedBookingForReview.activityName}</span>
                  <span className="font-mono">Checked Admissions</span>
                </div>

                {selectedBookingForReview.cottageName && selectedBookingForReview.cottageName !== 'None' && (
                  <div className="flex justify-between items-center border-t border-dashed border-[#1B3022]/10 pt-1.5 text-[11px]">
                    <span className="text-teal-800 font-semibold uppercase">⛺ Dedicated Cottage: {selectedBookingForReview.cottageName}</span>
                    <span className="text-teal-905 font-mono font-semibold">Allocated</span>
                  </div>
                )}

                {selectedBookingForReview.adminNotes && (
                  <div className="bg-red-50/50 p-2 border border-red-200/50 rounded text-[11px] text-slate-600 font-light italic mt-1 leading-normal">
                    <strong>Admin Annotation Remark:</strong> {selectedBookingForReview.adminNotes}
                  </div>
                )}
                
                <div className="flex justify-between items-center border-t border-stone-200 pt-2 font-black text-sm text-slate-900">
                  <span>Authorized Fee Ledger Paid</span>
                  <span className="font-mono text-[#A67C52]">₱{selectedBookingForReview.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-gray-500 font-light leading-relaxed bg-[#FAF9F6] p-3 border border-stone-100 rounded">
              ⚠️ <strong>MUNICIPAL WILDLIFE WAIVER STATUS:</strong> Registrant {selectedBookingForReview.customer.fullName} has agreed to follow Antique forest warnings, wear mandatory life jackets, pack out all plastic, and limit stilt cabin utilization to designated channels.
            </div>

            <div className="border-t border-[#1B3022]/20 pt-4 flex justify-between items-center gap-2 flex-wrap sm:flex-nowrap">
              <div className="flex gap-1.5 w-full sm:w-auto">
                {selectedBookingForReview.paymentStatus !== 'Paid' && (
                  <button
                    onClick={() => handleStatusReconciliation(selectedBookingForReview.id, 'Paid')}
                    className="flex-1 sm:flex-initial bg-emerald-700 hover:bg-emerald-850 text-white text-[11px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded transition-colors cursor-pointer"
                  >
                    Confirm Payment
                  </button>
                )}

                {selectedBookingForReview.paymentStatus !== 'Cancelled' && (
                  <button
                    onClick={() => {
                      setBookingToCancel(selectedBookingForReview);
                      setSelectedBookingForReview(null);
                    }}
                    className="flex-1 sm:flex-initial bg-red-50 text-red-750 hover:bg-red-600 hover:text-white text-[11px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded transition-all border border-red-200 cursor-pointer"
                  >
                    Cancel Permit
                  </button>
                )}
              </div>

              <div className="flex gap-1.5 w-full sm:w-auto sm:ml-auto">
                <button
                  onClick={() => window.print()}
                  className="bg-stone-100 text-stone-800 hover:bg-stone-200 p-1.5 rounded transition-colors cursor-pointer"
                  title="Print paper license voucher"
                >
                  <Printer className="h-4 w-4" />
                </button>

                <button
                  onClick={() => setSelectedBookingForReview(null)}
                  className="bg-[#1B3022] hover:bg-[#A67C52] text-[#FAF9F6] text-xs font-bold uppercase px-4 py-2 rounded transition-colors cursor-pointer"
                >
                  Close Specification
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* DIALOG C: ENTER CANCELLATION EXPLICIT NOTES NOTE                       */}
      {/* ---------------------------------------------------------------------- */}
      {bookingToCancel && (
        <div className="fixed inset-0 z-50 bg-[#1B3022]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in text-slate-800">
          <div className="bg-white rounded border border-stone-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <h4 className="font-serif text-lg font-bold text-red-900 flex items-center gap-1.5">
                <ShieldAlert className="h-5 w-5" />
                <span>Environmental Cancellation Deck</span>
              </h4>
              <button onClick={() => setBookingToCancel(null)} className="text-gray-400 hover:text-gray-700 font-sans cursor-pointer">✕</button>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              You are flagging booking reference permit <strong>{bookingToCancel.id}</strong> as cancelled. Input the custom rejection reasoning note below (e.g. "Customer cancellation", "Weather suspension", "Reversal complete"):
            </p>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold uppercase text-gray-500">Cancellation Reason Remark</label>
              <textarea
                placeholder="Enter cancellation notes to log into database..."
                value={cancelReasonNote}
                onChange={(e) => setCancelReasonNote(e.target.value)}
                required
                className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded text-[#1B3022] focus:outline-none focus:border-red-500 h-24"
              />
            </div>

            <div className="flex justify-end gap-2 text-xs uppercase font-bold pt-2">
              <button
                onClick={() => setBookingToCancel(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded transition-colors cursor-pointer"
              >
                No, Back
              </button>
              <button
                onClick={submitCancellationWithNotes}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors cursor-pointer"
              >
                Submit Cancellation Notes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* DIALOG D: CUSTOMER DISPATCH HISTORY TIMELINE                           */}
      {/* ---------------------------------------------------------------------- */}
      {selectedCustomerEmailForHistory && (
        <div className="fixed inset-0 z-50 bg-[#1B3022]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in text-slate-800">
          <div className="bg-white rounded border border-stone-200 shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto flex flex-col">
            
            <div className="bg-[#1B3022] text-white px-6 py-4 flex justify-between items-center shrink-0">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#A67C52] block">HISTORIC INGRESS REGISTRY</span>
                <h4 className="font-serif text-lg font-bold">Booking History for: {selectedCustomerEmailForHistory}</h4>
              </div>
              <button onClick={() => setSelectedCustomerEmailForHistory(null)} className="text-white opacity-75 hover:opacity-100 font-sans cursor-pointer">✕</button>
            </div>

            {/* List timelines */}
            <div className="p-6 space-y-4">
              <div className="space-y-3">
                {bookings.filter(b => b.customer.email === selectedCustomerEmailForHistory).length === 0 ? (
                  <p className="text-center italic text-xs text-gray-500 py-6">No historic reservations compiled for this guest index.</p>
                ) : (
                  bookings
                    .filter(b => b.customer.email === selectedCustomerEmailForHistory)
                    .map((item) => (
                      <div key={item.id} className="border border-stone-200 p-4 rounded bg-stone-50 space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-bold text-slate-800">Permit ID: {item.id}</span>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${
                            item.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>{item.paymentStatus}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600">
                          <div><strong>Selected Adventure:</strong> {item.activityName}</div>
                          <div><strong>Cottage Cabin:</strong> {item.cottageName || 'None'}</div>
                          <div><strong>Booking Ingress Date:</strong> {item.bookingDate} @ {item.scheduleTime}</div>
                          <div><strong>Registration total:</strong> ₱{item.totalAmount.toLocaleString()}</div>
                          <div><strong>Occupant details:</strong> Adults: {item.numberOfAdults} | Minors: {item.numberOfChildren}</div>
                        </div>

                        {item.adminNotes && (
                          <div className="text-[10px] text-gray-405 font-light leading-relaxed border-t border-dashed border-stone-200 pt-1">
                            <strong>Audit note:</strong> {item.adminNotes}
                          </div>
                        )}
                      </div>
                    ))
                )}
              </div>
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-200 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedCustomerEmailForHistory(null)}
                className="px-4 py-2 bg-[#1B3022] hover:bg-[#A67C52] text-white text-xs font-bold uppercase rounded transition-colors cursor-pointer"
              >
                Close History Desk
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* DIALOG E: ACTIVITY CATALOG ADD/EDIT MODAL                               */}
      {/* ---------------------------------------------------------------------- */}
      {editingActivity && (
        <div className="fixed inset-0 z-50 bg-[#1B3022]/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in text-slate-800">
          <div className="bg-white rounded shadow-2xl p-6 border border-stone-200 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4">
            <h4 className="font-serif text-lg font-bold text-[#1B3022] border-b border-stone-150 pb-2">
              Edit Activity Specifications: {editingActivity.name}
            </h4>
            
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-gray-500 uppercase">Adult Admission Fee Rates (₱)</label>
                  <input
                    type="number"
                    value={editingActivity.adultRate || 0}
                    onChange={(e) => setEditingActivity({ ...editingActivity, adultRate: parseInt(e.target.value, 10) })}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-gray-500 uppercase">Child Entry Rates Fee (₱)</label>
                  <input
                    type="number"
                    value={editingActivity.childRate || 0}
                    onChange={(e) => setEditingActivity({ ...editingActivity, childRate: parseInt(e.target.value, 10) })}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-500 uppercase">Tagline Summary</label>
                <input
                  type="text"
                  value={editingActivity.tagline || ''}
                  onChange={(e) => setEditingActivity({ ...editingActivity, tagline: e.target.value })}
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-500 uppercase">Short Description</label>
                <textarea
                  value={editingActivity.description || ''}
                  onChange={(e) => setEditingActivity({ ...editingActivity, description: e.target.value })}
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded h-16"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-gray-500 uppercase">Duration Time</label>
                  <input
                    type="text"
                    value={editingActivity.duration || ''}
                    onChange={(e) => setEditingActivity({ ...editingActivity, duration: e.target.value })}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-gray-500 uppercase">Age Restrictions</label>
                  <input
                    type="text"
                    value={editingActivity.ageRequirement || ''}
                    onChange={(e) => setEditingActivity({ ...editingActivity, ageRequirement: e.target.value })}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs uppercase font-bold pt-2">
              <button
                onClick={() => setEditingActivity(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-250 text-stone-700 rounded transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveActivityEdit}
                className="px-4 py-2 bg-[#1B3022] hover:bg-[#A67C52] text-white rounded transition-colors cursor-pointer"
              >
                Save Edits
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* DIALOG F: COTTAGE CATALOG EDIT MODAL                                    */}
      {/* ---------------------------------------------------------------------- */}
      {editingCottage && (
        <div className="fixed inset-0 z-50 bg-[#1B3022]/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in text-slate-800">
          <div className="bg-white rounded shadow-2xl p-6 border border-stone-200 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4">
            <h4 className="font-serif text-lg font-bold text-[#1B3022] border-b border-stone-150 pb-2">
              Edit Cottage Structure Rates: {editingCottage.name}
            </h4>
            
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-gray-500 uppercase">Cabin Rental Rates Per Day (₱)</label>
                  <input
                    type="number"
                    value={editingCottage.ratePerDay || 0}
                    onChange={(e) => setEditingCottage({ ...editingCottage, ratePerDay: parseInt(e.target.value, 10) })}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-gray-500 uppercase">Total Capacity limits</label>
                  <input
                    type="text"
                    value={editingCottage.capacity || ''}
                    onChange={(e) => setEditingCottage({ ...editingCottage, capacity: e.target.value })}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-500 uppercase">Tagline Summary</label>
                <input
                  type="text"
                  value={editingCottage.tagline || ''}
                  onChange={(e) => setEditingCottage({ ...editingCottage, tagline: e.target.value })}
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-500 uppercase">Short Description</label>
                <textarea
                  value={editingCottage.description || ''}
                  onChange={(e) => setEditingCottage({ ...editingCottage, description: e.target.value })}
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded h-16"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs uppercase font-bold pt-2">
              <button
                onClick={() => setEditingCottage(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-250 text-stone-700 rounded transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCottageEdit}
                className="px-4 py-2 bg-[#1B3022] hover:bg-[#A67C52] text-white rounded transition-colors cursor-pointer"
              >
                Save Edits
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* DIALOG G: CATALOG REGISTER CREATE NEW ACTIVITY MODAL                    */}
      {/* ---------------------------------------------------------------------- */}
      {isAddingActivity && (
        <div className="fixed inset-0 z-50 bg-[#1B3022]/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in text-slate-800">
          <div className="bg-white rounded p-6 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4">
            <h4 className="font-serif text-lg font-bold text-[#1B3022] border-b border-slate-150 pb-2 flex items-center gap-1.5">
              <Plus className="h-5 w-5 text-[#A67C52]" />
              <span>Register New River Activity Package</span>
            </h4>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-extrabold text-gray-500 uppercase">New Activity Selection</label>
                <select
                  value={newActForm.name as any}
                  onChange={(e) => setNewActForm({ ...newActForm, name: e.target.value as any })}
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded text-[#1B3022]"
                >
                  <option value="Dumagat River Trekking">Dumagat River Trekking</option>
                  <option value="Kayaking & Tubing">Kayaking & Tubing</option>
                  <option value="Waterpark Day Pass">Waterpark Day Pass</option>
                  <option value="Extreme Bamboo Rafting">Extreme Bamboo Rafting</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-500 uppercase">Tagline Highlights</label>
                <input
                  type="text"
                  placeholder="E.g. Extreme adventure of 4km river navigation"
                  value={newActForm.tagline}
                  onChange={(e) => setNewActForm({ ...newActForm, tagline: e.target.value })}
                  className="w-full p-2 bg-white border border-stone-200 rounded"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-500 uppercase">Short Description</label>
                <textarea
                  placeholder="Eco forest guided river adventure outline details..."
                  value={newActForm.description}
                  onChange={(e) => setNewActForm({ ...newActForm, description: e.target.value })}
                  className="w-full p-2 bg-white border border-stone-200 rounded h-16"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-gray-500 uppercase">Adult Fee (₱)</label>
                  <input
                    type="number"
                    value={newActForm.adultRate}
                    onChange={(e) => setNewActForm({ ...newActForm, adultRate: parseInt(e.target.value, 10) || 0 })}
                    className="w-full p-2 bg-white border border-stone-200 rounded font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-gray-500 uppercase">Children Fee (₱)</label>
                  <input
                    type="number"
                    value={newActForm.childRate}
                    onChange={(e) => setNewActForm({ ...newActForm, childRate: parseInt(e.target.value, 10) || 0 })}
                    className="w-full p-2 bg-white border border-stone-200 rounded font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-gray-500 uppercase">Adventure Difficulty</label>
                  <select
                    value={newActForm.difficulty}
                    onChange={(e) => setNewActForm({ ...newActForm, difficulty: e.target.value as any })}
                    className="w-full p-2 bg-white border border-stone-200 rounded text-[#1B3022]"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Challenging">Challenging</option>
                    <option value="Extreme">Extreme</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-gray-500 uppercase">Duration Description</label>
                  <input
                    type="text"
                    value={newActForm.duration}
                    onChange={(e) => setNewActForm({ ...newActForm, duration: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-200 rounded"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs uppercase font-bold pt-2">
              <button
                onClick={() => setIsAddingActivity(false)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-750 rounded transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={saveNewActivity}
                className="px-4 py-2 bg-[#1B3022] hover:bg-[#A67C52] text-white rounded transition-colors cursor-pointer"
              >
                Register Activity
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* DIALOG H: CATALOG REGISTER CREATE NEW COTTAGE MODAL                     */}
      {/* ---------------------------------------------------------------------- */}
      {isAddingCottage && (
        <div className="fixed inset-0 z-50 bg-[#1B3022]/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in text-slate-800">
          <div className="bg-white rounded p-6 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4">
            <h4 className="font-serif text-lg font-bold text-[#1B3022] border-b border-slate-150 pb-2 flex items-center gap-1.5">
              <Plus className="h-5 w-5 text-[#A67C52]" />
              <span>Erect New Stilt Cottage Registry</span>
            </h4>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-extrabold text-gray-500 uppercase">New structure Template</label>
                <select
                  value={newCotForm.name as any}
                  onChange={(e) => setNewCotForm({ ...newCotForm, name: e.target.value as any })}
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded text-[#1B3022]"
                >
                  <option value="Riverfront Canopy Cabana">Riverfront Canopy Cabana</option>
                  <option value="Dumagat Stilt Lodge">Dumagat Stilt Lodge</option>
                  <option value="Forest Canopy Treehouse">Forest Canopy Treehouse</option>
                  <option value="Pandan Bamboo Shelter">Pandan Bamboo Shelter</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-500 uppercase">Cottage Architecture Type Tag Description</label>
                <input
                  type="text"
                  placeholder="E.g. Triplex Bamboo Loft with rapids overhang"
                  value={newCotForm.type}
                  onChange={(e) => setNewCotForm({ ...newCotForm, type: e.target.value })}
                  className="w-full p-2 bg-white border border-stone-200 rounded"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-500 uppercase">Short Description</label>
                <textarea
                  placeholder="Outline construction, built elevation, bamboo materials details..."
                  value={newCotForm.description}
                  onChange={(e) => setNewCotForm({ ...newCotForm, description: e.target.value })}
                  className="w-full p-2 bg-white border border-stone-200 rounded h-16"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-gray-500 uppercase">Rental rate Per Day (₱)</label>
                  <input
                    type="number"
                    value={newCotForm.ratePerDay}
                    onChange={(e) => setNewCotForm({ ...newCotForm, ratePerDay: parseInt(e.target.value, 10) || 0 })}
                    className="w-full p-2 bg-white border border-stone-200 rounded font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-gray-500 uppercase">Cabin Guest Capacity Limit</label>
                  <input
                    type="text"
                    placeholder="E.g. Up to 8 guests maximum"
                    value={newCotForm.capacity}
                    onChange={(e) => setNewCotForm({ ...newCotForm, capacity: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-200 rounded"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs uppercase font-bold pt-2">
              <button
                onClick={() => setIsAddingCottage(false)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-750 rounded transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={saveNewCottage}
                className="px-4 py-2 bg-[#1B3022] hover:bg-[#A67C52] text-white rounded transition-colors cursor-pointer"
              >
                Erect Cottage Option
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
