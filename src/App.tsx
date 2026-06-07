import React, { useState, useEffect } from 'react';
import { 
  Anchor, 
  Calendar, 
  Users, 
  CreditCard, 
  ArrowRight, 
  Award, 
  QrCode, 
  Phone, 
  MapPin, 
  User, 
  Heart, 
  Info, 
  CheckCircle,
  AlertCircle,
  Compass,
  FileText,
  Upload,
  Clock,
  Printer,
  ZoomIn,
  X
} from 'lucide-react';
import { Customer, Booking, Activity, Cottage, ActivityName } from './types';
import ActivitiesCatalog from './components/ActivitiesCatalog';
import ActivityDetailModal from './components/ActivityDetailModal';
import { COTTAGES_DATA } from './cottagesData';
import { loadActivitiesFromStorage, formatActivityPriceSummary, getPrimaryGuestLabel, getSecondaryGuestLabel } from './activityPricing';
import CottagesCatalog from './components/CottagesCatalog';
import CottageDetailModal from './components/CottageDetailModal';
import { Home, Leaf } from 'lucide-react';
import BookingPanel from './components/BookingPanel';

export default function App() {
  // Dynamic Activities and Cottages Catalog States
  const [activitiesList, setActivitiesList] = useState<Activity[]>(loadActivitiesFromStorage);

  const [cottagesList, setCottagesList] = useState<Cottage[]>(() => {
    const saved = localStorage.getItem('mw_cottages_data');
    return saved ? JSON.parse(saved) : COTTAGES_DATA;
  });

  const handleUpdateActivities = (newActs: Activity[]) => {
    setActivitiesList(newActs);
    localStorage.setItem('mw_activities_data', JSON.stringify(newActs));
    // Also keep forms updated if active product is updated/removed
  };

  const handleUpdateCottages = (newCots: Cottage[]) => {
    setCottagesList(newCots);
    localStorage.setItem('mw_cottages_data', JSON.stringify(newCots));
  };

  // Session State
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('mw_session_token'));
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  // Active activity and cottage detail modal selection
  const [selectedCatalogActivity, setSelectedCatalogActivity] = useState<Activity | null>(null);
  const [selectedCatalogCottage, setSelectedCatalogCottage] = useState<Cottage | null>(null);
  
  // Dashboard view toggle: 'catalog' | 'booking' | 'cottages'
  const [dashboardTab, setDashboardTab] = useState<'catalog' | 'booking' | 'cottages'>('catalog');


  // Authentication Switch: 'login' | 'register'
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');

  // Input States for Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Input States for Registration
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regDob, setRegDob] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regEmergencyName, setRegEmergencyName] = useState('');
  const [regEmergencyPhone, setRegEmergencyPhone] = useState('');
  const [regAcceptTerms, setRegAcceptTerms] = useState(false);

  // Application/Booking States
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  
  // Dynamic Booking Form States
  const [selectedActivity, setSelectedActivity] = useState<ActivityName>('Kawa Spa');
  const [selectedCottage, setSelectedCottage] = useState<'Riverfront Canopy Cabana' | 'Dumagat Stilt Lodge' | 'Forest Canopy Treehouse' | 'Pandan Bamboo Shelter' | 'None'>('None');
  const [bookingDate, setBookingDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState<'08:00 AM' | '10:30 AM' | '01:30 PM' | '04:00 PM'>('08:00 AM');
  const [numberOfAdults, setNumberOfAdults] = useState(1);
  const [numberOfChildren, setNumberOfChildren] = useState(0);

  // Booking details & notification banners
  const [sysMessage, setSysMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [processingPaymentId, setProcessingPaymentId] = useState<string | null>(null);
  
  // GCash Integration user-side states
  const [adminQRPref, setAdminQRPref] = useState<string | null>(null);
  const [qrImageExpanded, setQrImageExpanded] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<any | null>(null);
  const [submittingProofForBookingId, setSubmittingProofForBookingId] = useState<string | null>(null);



  // Calculated Price in Real-time dynamically resolved from state
  const activeActivityObject = activitiesList.find(a => a.name === selectedActivity);
  const activeCottageObject = cottagesList.find(c => c.name === selectedCottage);

  const rates = activeActivityObject || { adultRate: 350, childRate: 175 };

  const currentAdultRate = activeActivityObject ? activeActivityObject.adultRate : 350;
  const currentChildRate = activeActivityObject ? activeActivityObject.childRate : 175;
  const currentCottageRate = activeCottageObject ? activeCottageObject.ratePerDay : 0;

  const calculatedTotal = (numberOfAdults * currentAdultRate) + (numberOfChildren * currentChildRate) + currentCottageRate;

  // Auto-load profile if storage token exists
  useEffect(() => {
    if (token) {
      fetchProfile(token);
    }
  }, [token]);

  // Load custom GCash QR settings for guests
  const fetchAdminGcashQr = async () => {
    try {
      const res = await fetch('/api/admin/gcash-qr');
      const data = await res.json();
      if (res.ok && data.url) {
        setAdminQRPref(data.url);
      }
    } catch (e) {
      console.error('Quietly failed to load custom GCash QR settings:', e);
    }
  };

  useEffect(() => {
    fetchAdminGcashQr();
  }, []);

  const showMsg = (text: string, type: 'success' | 'error') => {
    setSysMessage({ text, type });
    setTimeout(() => {
      setSysMessage(null);
    }, 6000);
  };

  const fetchProfile = async (sessionToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      const data = await res.json();
      if (res.ok && data.customer) {
        setCustomer(data.customer);
        fetchBookings(sessionToken);
      } else {
        // Token is stale or invalid, clean up
        handleLogoutAction();
      }
    } catch (err) {
      console.error('Session validation issue:', err);
    }
  };

  const fetchBookings = async (sessionToken: string) => {
    setIsLoadingBookings(true);
    try {
      const res = await fetch('/api/bookings', {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      const data = await res.json();
      if (res.ok && data.bookings) {
        setBookings(data.bookings);
      }
    } catch (err) {
      console.error('Booking retrieval failure:', err);
    } finally {
      setIsLoadingBookings(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      showMsg('Please complete both email and password input fields.', 'error');
      return;
    }

    setIsAuthenticating(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('mw_session_token', data.token);
        setToken(data.token);
        setCustomer(data.customer);
        showMsg(data.message, 'success');
        fetchBookings(data.token);
      } else {
        showMsg(data.error || 'Authentication failed.', 'error');
      }
    } catch (err) {
      showMsg('Unable to reach secure authentication servers.', 'error');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFullName || !regEmail || !regPassword || !regPhone || !regDob || !regAddress || !regEmergencyName || !regEmergencyPhone) {
      showMsg('Please complete all required fields.', 'error');
      return;
    }

    setIsAuthenticating(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: regFullName,
          email: regEmail,
          password: regPassword,
          phone: regPhone,
          dob: regDob,
          address: regAddress,
          emergencyContactName: regEmergencyName,
          emergencyContactPhone: regEmergencyPhone,
          acceptTerms: regAcceptTerms
        })
      });

      const data = await res.json();
      if (res.ok) {
        showMsg(data.message, 'success');
        // Auto sign-in or shift to login tab with pre-filled fields
        setAuthTab('login');
        setLoginEmail(regEmail);
        setLoginPassword(regPassword);
      } else {
        showMsg(data.error || 'Registration failed.', 'error');
      }
    } catch (err) {
      showMsg('Connection error during registration setup.', 'error');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogoutAction = async () => {
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (e) {
        // Silent fall-through
      }
    }
    localStorage.removeItem('mw_session_token');
    setToken(null);
    setCustomer(null);
    setBookings([]);
    showMsg('Session closed successfully.', 'success');
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!bookingDate) {
      showMsg('Please supply a valid date for your river reservation.', 'error');
      return;
    }

    setIsSubmittingBooking(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          activityName: selectedActivity,
          cottageName: selectedCottage,
          bookingDate,
          scheduleTime,
          numberOfAdults,
          numberOfChildren,
          totalAmount: calculatedTotal
        })
      });

      const data = await res.json();
      if (res.ok) {
        showMsg(data.message, 'success');
        fetchBookings(token);
        // Reset form details safely
        setBookingDate('');
        setSelectedCottage('None');
        setNumberOfChildren(0);
        setNumberOfAdults(1);
      } else {
        showMsg(data.error || 'Failed to submit reservation.', 'error');
      }
    } catch (e) {
      showMsg('Failed to record reservation. Check network service logs.', 'error');
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const handleSimulatedPayment = async (bookingId: string, gateway: 'GCash' | 'Maya') => {
    if (!token) return;
    setProcessingPaymentId(bookingId);

    try {
      const res = await fetch('/api/bookings/pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bookingId, paymentMethod: gateway })
      });

      const data = await res.json();
      if (res.ok) {
        showMsg(data.message, 'success');
        fetchBookings(token);
      } else {
        showMsg(data.error || 'Payment gateway returned error.', 'error');
      }
    } catch (e) {
      showMsg('Payment gateway communication system error.', 'error');
    } finally {
      setProcessingPaymentId(null);
    }
  };

  const handleGuestProofUpload = async (bookingId: string, file: File) => {
    if (!token) return;

    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      showMsg('Invalid file format. Please upload a valid image file (JPG, PNG, or JPEG).', 'error');
      return;
    }

    setSubmittingProofForBookingId(bookingId);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const res = await fetch('/api/bookings/submit-proof', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            bookingId, 
            proofImageBase64: base64,
            originalFileName: file.name
          })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          showMsg(data.message || 'Payment proof submitted for administrative verification!', 'success');
          fetchBookings(token);
        } else {
          showMsg(data.error || `Failed to submit payment proof (${res.status}).`, 'error');
        }
      } catch (err) {
        showMsg('Network error transmitting eco-permit payment proof.', 'error');
      } finally {
        setSubmittingProofForBookingId(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleViewReceipt = async (bookingId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/bookings/receipt/${bookingId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.receipt) {
        setViewingReceipt(data.receipt);
      } else {
        showMsg(data.error || 'Municipal receipt file has not been published yet.', 'error');
      }
    } catch (err) {
      showMsg('Failed to fetch transaction receipt details.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1B3022] selection:bg-[#E8E5DA] selection:text-[#1B3022]">
      
      {/* Dynamic Global System Message Alert (Top Overlay) */}
      {sysMessage && (
        <div className={`fixed top-4 left-1/2 z-50 w-full max-w-md -translate-x-1/2 px-4 transition-all animate-fade-in`}>
          <div className={`flex items-start gap-3 rounded-lg p-4 shadow-xl border ${
            sysMessage.type === 'success' 
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
              : 'bg-red-50 text-red-900 border-red-200'
          }`}>
            {sysMessage.type === 'success' ? (
              <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
            )}
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider">System Notification</p>
              <p className="mt-1 text-sm font-light leading-relaxed">{sysMessage.text}</p>
            </div>
            <button 
              onClick={() => setSysMessage(null)} 
              className="text-xs font-semibold opacity-60 hover:opacity-100"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Elegant Header */}
      <header className="border-b border-[#1B3022]/10 bg-[#FAF9F6] px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-[#1B3022] text-[#FAF9F6]">
              <Anchor className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-serif text-xl font-bold tracking-tight text-[#1B3022]">MW Adventure Park</h1>
              <p className="text-[10px] font-medium tracking-[0.2em] text-[#A67C52] uppercase">Dumagat River • Pandan, Antique</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {customer && (
              <div className="flex items-center space-x-3">
                <span className="hidden text-right md:block">
                  <span className="block text-xs font-bold">{customer.fullName}</span>
                  <span className="block text-[10px] text-gray-500">{customer.email}</span>
                </span>
                <button
                  id="header-signout-btn"
                  onClick={handleLogoutAction}
                  className="rounded bg-[#1B3022] px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#2A4533] transition-colors"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container Content */}
      <main className="mx-auto max-w-7xl">
        {!customer ? (
          /* ======================================================== */
          /* AUTHENTICATION VIEW: Elegant Editorial Split Layout       */
          /* ======================================================== */
          <div className="flex min-h-[calc(100vh-76px)] flex-col lg:flex-row">
            
            {/* Left side: Editorial Brand Magazine showcase */}
            <aside className="relative flex flex-col justify-between bg-[#1B3022] p-8 text-[#FAF9F6] lg:w-7/12 lg:p-16 overflow-hidden">
              {/* Background Image with Low Opacity */}
              <div
                className="absolute inset-0 bg-cover bg-center opacity-7"
                style={{
                  backgroundImage: "url('https://scontent.fcgy2-1.fna.fbcdn.net/v/t39.30808-6/505836933_1038041441801827_2259826248032804033_n.jpg?stp=cp6_dst-jpg_tt6&cstp=mx744x992&ctp=s744x992&_nc_cat=100&ccb=1-7&_nc_sid=127cfc&_nc_eui2=AeGl6_gFAaXziOaLDU0rDQoTG7P6wliLm8obs_rCWIubyoG6ZLqh4Ai3ibsYg8yt0is2IOma-1BG2k2c4ETT5YcN&_nc_ohc=IR3hs-0D0pIQ7kNvwFUStgE&_nc_oc=AdoYSSAoNG3YyJJTPyk6iCAeO4nF9sgjndG2HMVrWPCdM91R8s5gINUEWzBHYFG9O8vH5l-RX9frzrHXfEQW7SG4&_nc_zt=23&_nc_ht=scontent.fcgy2-1.fna&_nc_gid=Rulr9rFJ3RnPwHwhXbe1kw&_nc_ss=7b2a8&oh=00_Af-Mu8ZloTT53IKM1AanQkDs2YZg0BPPqOVaAOQEafp_Vg&oe=6A2A026B')",
                }}
              />
              <div className="relative z-10">
                <span className="text-xs tracking-[0.3em] uppercase opacity-70">Established 2026</span>
                
                <h2 className="font-serif text-6xl lg:text-8xl mt-6 leading-[0.9] tracking-tight">
                  Dumagat<br />
                  <i className="font-light text-[#E8E5DA]">River</i>
                </h2>

                <p className="mt-8 text-base font-light leading-relaxed opacity-80 max-w-lg">
                Experience the beauty and adventure of Pandan, Antique through Dumagat River. Nestled along the crystal-clear waters and breathtaking natural scenery, we offer unforgettable river activities, exciting outdoor experiences, and a relaxing escape into nature. Whether you're looking for adventure, family bonding, or a peaceful getaway, Dumagat River provides a seamless and convenient booking experience to help you create lasting memories.
                </p>

                {/* Aesthetic list of park adventures - Clickable brochures */}
                <div className="mt-12 space-y-5 border-l border-[#FAF9F6]/20 pl-6 text-left">
                  <span className="text-[10px] tracking-widest uppercase text-[#A67C52] font-semibold block mb-2">
                    ✓ Brochure Catalog (Click to browse specs)
                  </span>
                  {activitiesList.map((act, index) => (
                    <button 
                      key={act.id}
                      onClick={() => setSelectedCatalogActivity(act)}
                      className="text-left w-full block group focus:outline-none focus:ring-1 focus:ring-[#A67C52] rounded p-1 -ml-1 transition-all hover:bg-white/5"
                    >
                      <div className="text-xs">
                        <span className="font-serif italic text-[#A67C52] text-sm font-bold block group-hover:text-white transition-colors">
                          0{index + 1}. {act.name}
                        </span>
                        <span className="opacity-60 group-hover:opacity-100 transition-opacity flex items-center justify-between gap-2 mt-0.5">
                          <span className="block truncate max-w-[280px] sm:max-w-md md:max-w-lg lg:max-w-[400px]">{act.description}</span>
                          <ArrowRight className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-[#A67C52]" />
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Park Metadata Footer info */}
              <div className="relative z-10 mt-16 flex flex-wrap items-center gap-8 border-t border-[#FAF9F6]/10 pt-8">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-widest opacity-50">Location</span>
                  <span className="text-xs font-semibold">Pandan, Antique, PH</span>
                </div>
              </div>

              <div className="absolute right-4 bottom-4 select-none pointer-events-none text-right font-serif opacity-5 text-9xl lg:text-[18rem] leading-none">
                MW
              </div>
            </aside>

            {/* Right side: The Dynamic Forms View */}
            <main className="flex flex-col justify-center bg-[#FAF9F6] p-8 lg:w-5/12 lg:p-16">
              <div className="mx-auto w-full max-w-md">
                
                {/* Form Navigation Switch */}
                <div className="mb-10">
                  <h3 className="font-serif text-3xl tracking-tight text-[#1B3022]">
                    {authTab === 'login' ? 'Welcome Back' : 'Create Account'}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    {authTab === 'login' 
                      ? 'Access your saved itineraries, waivers, and QR code tickets.' 
                      : 'Register your details to enable quick check-in and river access privileges.'}
                  </p>

                  <div className="mt-6 flex gap-6 text-xs uppercase tracking-widest font-semibold border-b border-[#1B3022]/10 pb-2">
                    <button 
                      onClick={() => setAuthTab('login')}
                      className={`pb-1 transition-all ${
                        authTab === 'login' 
                          ? 'text-[#1B3022] border-b-2 border-[#1B3022]' 
                          : 'text-gray-400 hover:text-[#1B3022]'
                      }`}
                    >
                      Login Profile
                    </button>
                    <button 
                      onClick={() => setAuthTab('register')}
                      className={`pb-1 transition-all ${
                        authTab === 'register' 
                          ? 'text-[#1B3022] border-b-2 border-[#1B3022]' 
                          : 'text-gray-400 hover:text-[#1B3022]'
                      }`}
                    >
                      New user
                    </button>
                  </div>
                </div>

                {/* LOGIN FORM OBJECT */}
                {authTab === 'login' ? (
                  <form onSubmit={handleLoginSubmit} className="space-y-6">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold block">Email Address</label>
                      <input 
                        type="email" 
                        required 
                        placeholder="e.g. maria.santos@gmail.com" 
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="w-full py-2 bg-transparent border-b border-[#1B3022]/20 font-light text-sm focus:outline-none focus:border-[#A67C52] text-[#1B3022]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold block">Security Password</label>
                      <input 
                        type="password" 
                        required 
                        placeholder="••••••••" 
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full py-2 bg-transparent border-b border-[#1B3022]/20 font-light text-sm focus:outline-none focus:border-[#A67C52] text-[#1B3022]"
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="accent-[#1B3022] rounded" />
                        <span>Remember my credentials</span>
                      </label>
                      <a href="#forgot" onClick={(e) => { e.preventDefault(); showMsg('Password assistance feature requires registered email validation. Contact park systems helpdesk.', 'error'); }} className="underline hover:text-[#1B3022]">Forgot secret key?</a>
                    </div>

                    <button 
                      type="submit" 
                      disabled={isAuthenticating}
                      className="w-full bg-[#1B3022] hover:bg-[#2A4533] text-white py-3.5 text-xs uppercase tracking-[0.2em] font-semibold transition-colors mt-6 shadow-md flex items-center justify-center space-x-2"
                    >
                      {isAuthenticating ? (
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                      ) : (
                        <>
                          <span>Sign in</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  /* REGISTRATION FORM OBJECT */
                  <form onSubmit={handleRegisterSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    
                    <div className="bg-emerald-50/50 p-3 border border-[#1B3022]/10 mb-2">
                      <p className="text-[10px] text-emerald-800 leading-relaxed font-medium">
                        🛡️ <strong>SECURE WAIVER SYSTEM:</strong> Under Philippine tourist welfare standards, accurate primary details and emergency contacts are vital for Dumagat River safety.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold block">Full Name</label>
                        <input 
                          type="text" 
                          required 
                          placeholder="e.g. Maria Santos" 
                          value={regFullName}
                          onChange={(e) => setRegFullName(e.target.value)}
                          className="w-full py-1.5 bg-transparent border-b border-[#1B3022]/20 font-light text-sm focus:outline-none focus:border-[#A67C52] text-[#1B3022]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold block">Email Address</label>
                        <input 
                          type="email" 
                          required 
                          placeholder="maria@gmail.com" 
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          className="w-full py-1.5 bg-transparent border-b border-[#1B3022]/20 font-light text-sm focus:outline-none focus:border-[#A67C52] text-[#1B3022]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold block">Password</label>
                        <input 
                          type="password" 
                          required 
                          placeholder="Min 8 chars, 1 uppercase, 1 digit" 
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          className="w-full py-1.5 bg-transparent border-b border-[#1B3022]/40 font-light text-xs focus:outline-none focus:border-[#A67C52] text-[#1B3022]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold block">Mobile Number (PH)</label>
                        <input 
                          type="text" 
                          required 
                          placeholder="09171234567" 
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          className="w-full py-1.5 bg-transparent border-b border-[#1B3022]/20 font-light text-sm focus:outline-none focus:border-[#A67C52] text-[#1B3022]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold block">Date of Birth</label>
                        <input 
                          type="date" 
                          required 
                          value={regDob}
                          onChange={(e) => setRegDob(e.target.value)}
                          className="w-full py-1.5 bg-transparent border-b border-[#1B3022]/20 font-light text-sm focus:outline-none focus:border-[#A67C52] text-[#1B3022]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold block">Residential Address</label>
                        <input 
                          type="text" 
                          required 
                          placeholder="Street, City, Province" 
                          value={regAddress}
                          onChange={(e) => setRegAddress(e.target.value)}
                          className="w-full py-1.5 bg-transparent border-b border-[#1B3022]/20 font-light text-[13px] focus:outline-none focus:border-[#A67C52] text-[#1B3022]"
                        />
                      </div>
                    </div>

                    <div className="bg-stone-100/50 p-3 border border-[#1B3022]/10 space-y-3">
                      <span className="text-[10px] uppercase tracking-widest text-emerald-800 font-bold block">🚨 Emergency contact system</span>
                      
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase text-gray-500 block">Contact Full Name</label>
                          <input 
                            type="text" 
                            required 
                            placeholder="Primary Kin Name" 
                            value={regEmergencyName}
                            onChange={(e) => setRegEmergencyName(e.target.value)}
                            className="w-full py-1 bg-transparent border-b border-[#1B3022]/20 text-xs focus:outline-none focus:border-[#A67C52]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] uppercase text-gray-500 block">Kin Mobile (PH)</label>
                          <input 
                            type="text" 
                            required 
                            placeholder="09179998877" 
                            value={regEmergencyPhone}
                            onChange={(e) => setRegEmergencyPhone(e.target.value)}
                            className="w-full py-1 bg-transparent border-b border-[#1B3022]/20 text-xs focus:outline-none focus:border-[#A67C52]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mt-2">
                      <label className="flex items-start gap-2.5 cursor-pointer text-xs leading-relaxed text-gray-600">
                        <input 
                          type="checkbox" 
                          required 
                          checked={regAcceptTerms}
                          onChange={(e) => setRegAcceptTerms(e.target.checked)}
                          className="mt-0.5 accent-[#1B3022] rounded shrink-0" 
                        />
                        <span>
                          I acknowledge that river activities contain inherent risks. I authorize MW Adventure Park to register my details for emergency security protocols and medical verification.
                        </span>
                      </label>
                    </div>

                    <button 
                      type="submit" 
                      disabled={isAuthenticating}
                      className="w-full bg-[#1B3022] hover:bg-[#2A4533] text-white py-3.5 text-xs uppercase tracking-[0.2em] font-semibold transition-colors mt-4 shadow-md flex items-center justify-center"
                    >
                      {isAuthenticating ? (
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                      ) : (
                        'Submit Verification & Register'
                      )}
                    </button>
                  </form>
                )}

              </div>
            </main>
          </div>
        ) : (
          /* ======================================================== */
          /* LOGGED IN VIEW: Elegant Magazine Dashboard Grid          */
          /* ======================================================== */
          <div className="p-4 sm:p-6 lg:p-8 space-y-8 animate-fade-in">
            
            {/* Quick Greeting & Park News Banner */}
            <div className="relative overflow-hidden bg-[#1B3022] p-6 text-white md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="z-10 space-y-2">
                <span className="text-[10px] uppercase tracking-[0.3em] text-[#E8E5DA] opacity-80">Online Guest</span>
                <h3 className="font-serif text-3xl md:text-4xl tracking-tight">
                  Hello, {customer.fullName}!
                </h3>
                <p className="text-xs font-light text-[#FAF9F6] opacity-75 max-w-2xl">
                Explore and reserve your preferred Dumagat River experiences below. Enjoy a seamless and secure booking process designed for your convenience.
                </p>
              </div>
              <div className="z-10 shrink-0 flex items-center gap-3">
                <div className="bg-[#FAF9F6]/10 p-3 rounded text-center">
                  <span className="block text-xl font-bold font-serif text-[#A67C52]">{bookings.length}</span>
                  <span className="text-[9px] uppercase tracking-wider text-slate-300">Total Bookings</span>
                </div>
                <div className="bg-[#FAF9F6]/10 p-3 rounded text-center">
                  <span className="block text-xl font-bold font-serif text-[#A67C52]">
                    ₱{bookings.reduce((sum, b) => b.paymentStatus === 'Paid' ? sum + b.totalAmount : sum, 0).toLocaleString()}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-slate-300">Paid River Activities</span>
                </div>
              </div>
              {/* Abs decoration backdrop symbol */}
              <div className="absolute right-[-2%] bottom-[-20%] text-[12rem] serif opacity-5 pointer-events-none select-none">
                UA
              </div>
            </div>

            {/* HIGH-CRAFT EDITORIAL SUB-TAB BAR */}
            <div className="flex border-b border-[#1B3022]/15 pb-2 justify-start items-center gap-8 text-xs uppercase tracking-[0.15em] font-bold">
              <button 
                onClick={() => setDashboardTab('catalog')}
                className={`pb-2.5 transition-all flex items-center gap-2 focus:outline-none cursor-pointer ${
                  dashboardTab === 'catalog' 
                    ? 'text-[#1B3022] border-b-2 border-[#1B3022]' 
                    : 'text-gray-400 hover:text-[#1B3022]'
                }`}
              >
                <Compass className="h-4 w-4" />
                <span>Activities Catalog</span>
              </button>

              <button 
                onClick={() => setDashboardTab('cottages')}
                className={`pb-2.5 transition-all flex items-center gap-2 focus:outline-none cursor-pointer ${
                  dashboardTab === 'cottages' 
                    ? 'text-[#1B3022] border-b-2 border-[#1B3022]' 
                    : 'text-gray-400 hover:text-[#1B3022]'
                }`}
              >
                <Home className="h-4 w-4" />
                <span>Cottages Catalog</span>
              </button>

              <button 
                onClick={() => setDashboardTab('booking')}
                className={`pb-2.5 transition-all flex items-center gap-2 focus:outline-none cursor-pointer ${
                  dashboardTab === 'booking' 
                    ? 'text-[#1B3022] border-b-2 border-[#1B3022]' 
                    : 'text-gray-400 hover:text-[#1B3022]'
                }`}
              >
                <Calendar className="h-4 w-4" />
                <span>Bookings & QR Tickets</span>
                {bookings.length > 0 && (
                  <span className="ml-1 bg-[#1B3022] text-[#FAF9F6] font-mono text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center">
                    {bookings.length}
                  </span>
                )}
              </button>
            </div>

            {/* Core Capstone Tri-Grid layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* COLUMN 1: Profile & Emergency Waivers Dashboard (Width: 3/12) */}
              <div className="lg:col-span-3 space-y-6">
                <div className="border border-[#1B3022]/10 bg-white p-5 space-y-5">
                  <h4 className="font-serif text-lg border-b border-[#1B3022]/10 pb-2">Verified Profile</h4>
                  
                  <div className="space-y-4 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase text-gray-400 block font-semibold">Full Name</span>
                      <span className="font-medium text-[#1B3022] flex items-center gap-1.5">
                        <User className="h-3 w-3 text-[#A67C52]" />
                        {customer.fullName}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase text-gray-400 block font-semibold">Secure Identifiers</span>
                      <span className="font-mono text-gray-600 block text-[10px] truncate" title={customer.id}>
                        UID: {customer.id.substring(0, 18)}...
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase text-gray-400 block font-semibold">Contact Email</span>
                      <span className="text-gray-700">{customer.email}</span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase text-gray-400 block font-semibold">Mobile Connection</span>
                      <span className="text-gray-700 flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-[#A67C52]" />
                        {customer.phone}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase text-gray-400 block font-semibold">Date Of Birth</span>
                      <span className="text-gray-700">{new Date(customer.dob).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase text-gray-400 block font-semibold">Address Details</span>
                      <span className="text-gray-700 flex items-start gap-1">
                        <MapPin className="h-3 w-3 mt-0.5 text-[#A67C52] shrink-0" />
                        <span>{customer.address}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border border-[#1B3022]/10 bg-[#1B3022]/5 p-5 space-y-4">
                  <h4 className="font-serif text-lg text-emerald-950 flex items-center gap-2">
                    <Heart className="h-4.5 w-4.5 text-[#A67C52]" />
                    <span>Adventure Waiver</span>
                  </h4>

                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    Under executive park protocols, registered emergency data will immediately match response systems if extreme rafting or rescue is activated on high-flow days.
                  </p>

                  <div className="space-y-3 pt-2 text-xs border-t border-[#1B3022]/10">
                    <div className="space-y-0.5">
                      <span className="text-[9px] uppercase text-gray-500 font-semibold block">Designated Kin Contact</span>
                      <span className="font-bold text-[#1B3022]">{customer.emergencyContactName}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] uppercase text-gray-500 font-semibold block">Kin Phone Link</span>
                      <span className="font-medium text-gray-700">{customer.emergencyContactPhone}</span>
                    </div>
                  </div>

                  <div className="rounded bg-emerald-100/50 p-2 text-[10px] text-emerald-900 border border-emerald-200">
                    <span>✓ Dynamic Active Waiver Agreement verified by client signature.</span>
                  </div>
                </div>
              </div>

              {/* Conditional Catalog vs Booking vs Cottages view contents */}
              {dashboardTab === 'catalog' ? (
                <div className="lg:col-span-9 space-y-6">
                  <div className="border border-[#1B3022]/10 bg-white p-6 space-y-4">
                    <div className="border-b border-[#1B3022]/10 pb-3">
                      <h3 className="font-serif text-xl text-[#1B3022]">Pandan River Adventure Packages</h3>
                      <p className="text-xs text-gray-500">
                        Explore our world-class guided river itineraries. Select any activity to inspect municipal safety guidelines, rate metrics, and equipment profiles.
                      </p>
                    </div>
                    <ActivitiesCatalog
                      onSelectActivity={setSelectedCatalogActivity}
                      isLoggedIn={true}
                      onInstantBook={(name) => {
                        setSelectedActivity(name);
                        setDashboardTab('booking');
                      }}
                      activities={activitiesList}
                    />
                  </div>
                </div>
              ) : dashboardTab === 'cottages' ? (
                <div className="lg:col-span-9 space-y-6">
                  <div className="border border-[#1B3022]/10 bg-white p-6 space-y-4">
                    <div className="border-b border-[#1B3022]/10 pb-3">
                      <h3 className="font-serif text-xl text-[#1B3022]">Pandan Riverside Stilt Cottages</h3>
                      <p className="text-xs text-gray-500">
                        Browse our award-winning bio-diverse eco-lodges and over-the-water stilt cabanas. Select speculative designs to inspect architectural frameworks, stilt elevations, and amenities.
                      </p>
                    </div>
                    <CottagesCatalog
                      onSelectCottage={setSelectedCatalogCottage}
                      isLoggedIn={customer !== null}
                      onInstantBook={(cottageName) => {
                        setSelectedCottage(cottageName);
                        setDashboardTab('booking');
                        showMsg(`Selected "${cottageName}". We have added this cottage rental to your reservation total. Complete your date and occupant quantities!`, 'success');
                      }}
                      cottages={cottagesList}
                    />
                  </div>
                </div>
              ) : (
                <>
                  {/* COLUMN 2: Interactive River Booking Form & Rate Calculator (Width: 4/12) */}
                  <div className="lg:col-span-4">
                    <BookingPanel
                      activitiesList={activitiesList}
                      cottagesList={cottagesList}
                      isSubmitting={isSubmittingBooking}
                      onBrowseCottages={() => setDashboardTab('cottages')}
                      onSubmit={async (payload) => {
                        setIsSubmittingBooking(true);
                        try {
                          const res = await fetch('/api/bookings', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify(payload),
                          });

                          const data = await res.json();

                          if (res.ok) {
                            showMsg(data.message, 'success');
                            fetchBookings(token!);
                          } else {
                            showMsg(data.error || 'Failed to submit reservation.', 'error');
                          }
                        } catch {
                          showMsg(
                            'Failed to record reservation. Check network service logs.',
                            'error'
                          );
                        } finally {
                          setIsSubmittingBooking(false);
                        }
                      }}
                    />
                  </div>

              {/* COLUMN 3: Active Bookings, PayMongo Gateways, and QR E-tickets (Width: 5/12) */}
              <div className="lg:col-span-5 space-y-6">
                <div className="border border-[#1B3022]/10 bg-white p-6 space-y-6">
                  
                  <div className="flex items-center justify-between border-b border-[#1B3022]/10 pb-2">
                    <div>
                      <h4 className="font-serif text-xl text-[#1B3022]">
                         Payments
                      </h4>
                    </div>
                    <span className="inline-block font-mono text-[10px] bg-slate-100 rounded-full py-0.5 px-2 font-bold text-gray-600">
                      LIVE NODES
                    </span>
                  </div>

                  {isLoadingBookings ? (
                    <div className="py-12 text-center text-xs text-gray-400">
                      <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-[#1B3022] mb-2"></span>
                      <p>Sourcing registered itineraries from park database...</p>
                    </div>
                  ) : bookings.length === 0 ? (
                    <div className="py-12 text-center border border-dashed border-[#1B3022]/10 rounded bg-[#FAF9F6] text-gray-500 space-y-3">
                      <Calendar className="h-8 w-8 text-slate-300 mx-auto" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold">No Bookings Recorded Yet</p>
                        <p className="text-[10px] text-gray-400 max-w-xs mx-auto">
                          You haven't requested any river adventure permits yet. Customize guests on the left and submit to authorize.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-1">
                      {bookings.map((item) => {
                        const isPaid = item.paymentStatus === 'Paid';
                        return (
                          <div 
                            key={item.id} 
                            className={`border relative p-5 transition-all ${
                              isPaid 
                                ? 'bg-white border-emerald-300 shadow-md ring-1 ring-emerald-100' 
                                : 'bg-[#FAF9F6] border-amber-200'
                            }`}
                          >
                            {/* Header Badge */}
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <div>
                                <span className="font-mono text-[10px] text-gray-400 uppercase tracking-widest block">ITINERARY ID</span>
                                <span className="font-mono font-bold text-xs text-[#1B3022]">{item.id}</span>
                              </div>
                              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                isPaid 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${isPaid ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                                {item.paymentStatus}
                              </span>
                            </div>

                            {/* Details layout */}
                            {item.cartItems && item.cartItems.length > 0 ? (
                              <div className="space-y-0.5 mb-1">
                                {item.cartItems.map((ci, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between text-xs"
                                  >
                                    <span className="font-serif font-bold text-[#1B3022]">
                                      {ci.activityName}
                                    </span>
                                    <span className="font-mono text-[10px] text-gray-500">
                                      {ci.primaryQty > 0 && `${ci.primaryQty}×P`}
                                      {ci.secondaryQty > 0 && ` ${ci.secondaryQty}×S`}
                                      {' '}— ₱{ci.lineTotal.toLocaleString()}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="font-serif text-base font-bold text-[#1B3022] mb-0.5">
                                {item.activityName}
                              </div>
                            )}
                            {item.cottageName && item.cottageName !== 'None' && (
                              <div className="text-[10px] font-bold text-[#A67C52] font-mono uppercase tracking-wider mb-2 flex items-center gap-1">
                                <span>⛺ Cottage Add-on: {item.cottageName}</span>
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-x-2 gap-y-3 pt-2 text-xs border-t border-dashed border-gray-100">
                              <div>
                                <span className="text-[9px] text-gray-400 block font-sans">SCHEDULE DATE</span>
                                <span className="font-medium text-gray-700">
                                  {new Date(item.bookingDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                              </div>

                              <div>
                                <span className="text-[9px] text-gray-400 block font-sans">BOARDING TIME</span>
                                <span className="font-medium text-gray-700">{item.scheduleTime}</span>
                              </div>

                              <div>
                                <span className="text-[9px] text-gray-400 block font-sans">GUEST REGISTER</span>
                                <span className="text-gray-700">
                                  {item.numberOfAdults} Ad{item.numberOfChildren > 0 ? `, ${item.numberOfChildren} Ch` : ''}
                                </span>
                              </div>

                              <div>
                                <span className="text-[9px] text-gray-400 block font-sans">GRAND TOTAL</span>
                                <span className="font-bold text-emerald-800">₱{item.totalAmount.toLocaleString()}</span>
                              </div>
                            </div>

                            {/* GCash Payment Mode Integration */}
                            {item.paymentStatus === 'Paid' ? (
                               <div className="mt-4 pt-4 border-t border-emerald-200 bg-emerald-50/40 p-4 space-y-4">
                                 <div className="flex gap-4 items-center">
                                   <div className="border border-emerald-300 p-1.5 bg-white rounded shrink-0">
                                     <QrCode className="h-16 w-16 text-[#1B3022]" />
                                   </div>
                                   <div className="space-y-1 overflow-hidden">
                                     <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[8px] font-bold text-emerald-800 uppercase tracking-wider">
                                       ✓ Active Admission Ticket
                                     </span>
                                     <p className="text-[10px] font-bold text-[#1B3022] truncate">QR TOKEN: {item.qrCodeToken.substring(0, 16)}...</p>
                                     <p className="text-[9px] text-[#A67C52] leading-tight">
                                       Please present this QR ticket on your device upon arrival at MW Adventure Park terminal in Pandan for instant hardware scanning.
                                     </p>
                                   </div>
                                 </div>
                                 <div className="pt-2 border-t border-emerald-100 flex justify-end">
                                   <button
                                     id={`view-receipt-btn-${item.id}`}
                                     onClick={() => handleViewReceipt(item.id)}
                                     className="px-3 py-1.5 bg-[#1B3022] hover:bg-[#A67C52] text-white text-[10px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer flex items-center gap-1.5"
                                   >
                                     <FileText className="h-3.5 w-3.5" />
                                     <span>View Official Receipt</span>
                                   </button>
                                 </div>
                               </div>
                             ) : item.paymentStatus === 'Pending Verification' ? (
                               /* CASE 2: SCREENSHOT SUBMITTED AND PENDING REVIEW */
                               <div className="mt-4 pt-4 border-t border-amber-200/50 bg-amber-50/50 p-4 rounded space-y-2 text-center">
                                 <Clock className="h-8 w-8 text-amber-500 mx-auto animate-pulse" />
                                 <div className="space-y-1">
                                   <span className="text-[10px] font-extrabold text-amber-900 uppercase tracking-widest block">
                                     ⏰ Pending Verification
                                   </span>
                                   <p className="text-[10px] text-amber-700 leading-relaxed max-w-xs mx-auto">
                                     Your GCash payment proof is being audited by the municipal park marshals. Once confirmed, your scanner ticket and receipt will be issued here instantly.
                                   </p>
                                 </div>
                               </div>
                             ) : (
                               /* CASE 3: PENDING PAYMENT OR REJECTED PROOF */
                               <div className="mt-4 pt-4 border-t border-stone-200 space-y-3">
                                 {item.paymentStatus === 'Rejected' && (
                                   <div className="bg-red-50 border border-red-200 text-red-900 p-3 rounded text-center space-y-1">
                                     <span className="text-[10px] font-extrabold uppercase tracking-widest text-red-700 block">
                                       ❌ Payment Proof Rejected
                                     </span>
                                     <p className="text-[10px] text-red-800 leading-relaxed font-light">
                                       Please upload a new payment proof screenshot. Ensure that the GCash reference number is readable and matches the grand total.
                                     </p>
                                   </div>
                                 )}

                                 {/* Manual GCash Checkout instructions and uploader */}
                                 <div className="bg-amber-50/30 border border-amber-100 rounded p-4 space-y-3">
                                   <div className="flex justify-between items-center border-b border-amber-200/40 pb-2">
                                     <span className="text-[10px] font-bold text-[#A67C52] uppercase tracking-wider flex items-center gap-1">
                                       🛡️ GCash Eco-Permit Gateway
                                     </span>
                                     <span className="text-[10px] font-mono font-bold text-gray-500">
                                       Amount Due: <span className="text-[#1B3022]">₱{item.totalAmount.toLocaleString()}</span>
                                     </span>
                                   </div>

                                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                                     {/* 1. Admin QR code display */}
                                     <div className="flex flex-col items-center justify-center p-2 bg-white border rounded">
                                       <span className="text-[8px] text-gray-400 font-extrabold uppercase tracking-widest mb-1 block">1. Scan QR to pay</span>
                                       {adminQRPref ? (
                                         <button
                                           type="button"
                                           onClick={() => setQrImageExpanded(true)}
                                           className="relative group w-20 h-20 bg-white p-1 shadow-xs border rounded cursor-zoom-in transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#A67C52]/50"
                                           aria-label="Enlarge GCash QR code"
                                         >
                                           <img
                                             src={adminQRPref}
                                             alt="Admin GCash Merchant Config"
                                             referrerPolicy="no-referrer"
                                             className="w-full h-full object-contain"
                                           />
                                           <span className="absolute inset-0 flex items-center justify-center rounded bg-[#1B3022]/0 group-hover:bg-[#1B3022]/40 transition-colors">
                                             <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                                           </span>
                                         </button>
                                       ) : (
                                         // Default Mock QR representation
                                         <div className="p-2 bg-blue-50 rounded text-center border border-blue-100 flex flex-col items-center justify-center w-20 h-20">
                                           <QrCode className="h-6 w-6 text-blue-600 mb-1" />
                                           <span className="text-[8px] text-blue-700 leading-tight block">GCash Sandbox QR</span>
                                         </div>
                                       )}
                                       <span className="text-[8px] text-gray-400 mt-1 uppercase font-medium">MW Merchant Code</span>
                                       {adminQRPref && (
                                         <span className="text-[7px] text-[#A67C52] mt-0.5">Tap to enlarge</span>
                                       )}
                                     </div>

                                     {/* 2. File proof uploader */}
                                     <div className="space-y-2">
                                       <span className="text-[8px] text-gray-400 font-extrabold uppercase tracking-widest block">2. Upload Proof</span>
                                       
                                       <div className="space-y-1">
                                         <input
                                           type="file"
                                           accept="image/png, image/jpeg, image/jpg"
                                           id={`proof-upload-${item.id}`}
                                           onChange={(e) => {
                                             const file = e.target.files?.[0];
                                             if (file) handleGuestProofUpload(item.id, file);
                                           }}
                                           className="hidden"
                                         />
                                         
                                         <button
                                           onClick={() => document.getElementById(`proof-upload-${item.id}`)?.click()}
                                           disabled={submittingProofForBookingId === item.id}
                                           className="w-full py-2 bg-[#1B3022] hover:bg-[#A67C52] text-white font-sans font-bold text-[10px] uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                                         >
                                           {submittingProofForBookingId === item.id ? (
                                             <>
                                               <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent inline-block"></span>
                                               <span>Uploading...</span>
                                             </>
                                           ) : (
                                             <>
                                               <Upload className="h-3.5 w-3.5 shrink-0" />
                                               <span>Upload Screenshot</span>
                                             </>
                                           )}
                                         </button>
                                         <p className="text-[8px] text-gray-400 leading-tight text-center">
                                           Supported: JPG, JPEG, PNG only.
                                         </p>
                                       </div>
                                     </div>
                                   </div>
                                 </div>
                               </div>
                             )}

                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="border-t border-slate-100 pt-3">
                    <p className="text-[10px] text-gray-400 leading-tight">
                      * Refund and cancellation requested are subjected to a municipal surcharge. Activities are highly dependent on Dumagat River safety telemetry reports.
                    </p>
                  </div>

                </div>
              </div>

                </>
              )}

            </div>

          </div>
        )}
      </main>



      {/* Clean Footer */}
      <footer className="border-t border-[#1B3022]/10 bg-white/50 text-[#1b3022]/60 px-6 py-10 mt-16 text-center">
        <div className="mx-auto max-w-7xl space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em]">MW adventure park booking system</p>
          <p className="text-[11px] font-light max-w-xl mx-auto leading-relaxed">
            Discover the charm of the river, connect with nature, and enjoy authentic Filipino hospitality—all in one destination. 🌿🏞️✨
          </p>
        </div>
      </footer>

      {/* Activity detailed spec sheet modal overlay */}
      {selectedCatalogActivity && (
        <ActivityDetailModal
          activity={selectedCatalogActivity}
          isOpen={selectedCatalogActivity !== null}
          onClose={() => setSelectedCatalogActivity(null)}
          isLoggedIn={customer !== null}
          onSelectForBooking={(activityName) => {
            setSelectedActivity(activityName);
            if (!customer) {
              setAuthTab('register');
              showMsg(`Selected "${activityName}". Complete your verified tourist details below to finalize the river permit!`, 'success');
              // Smooth scroll to the register layout
              window.scrollTo({ top: 150, behavior: 'smooth' });
            } else {
              setDashboardTab('booking');
              showMsg(`Set "${activityName}" on your active desk. Customize dates and guest heads!`, 'success');
            }
          }}
        />
      )}

      {/* Cottage detailed specs modal overlay */}
      {selectedCatalogCottage && (
        <CottageDetailModal
          cottage={selectedCatalogCottage}
          isOpen={selectedCatalogCottage !== null}
          onClose={() => setSelectedCatalogCottage(null)}
          isLoggedIn={customer !== null}
          onSelectForBooking={(cottageName) => {
            setSelectedCottage(cottageName);
            if (!customer) {
              setAuthTab('register');
              showMsg(`Selected cottage "${cottageName}". Complete your verified tourist registration below to reservation-lock your riverside cabin!`, 'success');
              window.scrollTo({ top: 150, behavior: 'smooth' });
            } else {
              setDashboardTab('booking');
              showMsg(`Applied cottage "${cottageName}" to your active booking workspace. Plan your dates!`, 'success');
            }
          }}
        />
      )}

      {/* GCash QR fullscreen lightbox */}
      {qrImageExpanded && adminQRPref && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1B3022]/80 p-4 backdrop-blur-sm"
          onClick={() => setQrImageExpanded(false)}
        >
          <div
            className="relative max-h-[90vh] max-w-lg w-full animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setQrImageExpanded(false)}
              className="absolute -top-3 -right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#1B3022] shadow-lg hover:bg-stone-100"
              aria-label="Close enlarged QR code"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="overflow-hidden rounded-lg border-2 border-white bg-white p-3 shadow-2xl">
              <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-widest text-gray-500">
                Scan to pay · MW Merchant Code
              </p>
              <img
                src={adminQRPref}
                alt="GCash QR code enlarged"
                referrerPolicy="no-referrer"
                className="mx-auto max-h-[75vh] w-full object-contain"
              />
            </div>
            <p className="mt-3 text-center text-xs text-white/80">Tap outside or press ✕ to close</p>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* PRINTABLE OFFICIAL MUNICIPAL ECO-TOURISM TAX RECEIPT MODAL OVERLAY      */}
      {/* ---------------------------------------------------------------------- */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-50 bg-[#1B3022]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-md shadow-2xl max-w-lg w-full overflow-hidden border-2 border-[#1B3022] flex flex-col font-sans text-stone-800 animate-fade-in">
            
            {/* Modal header (Non-printable) */}
            <div className="bg-[#1B3022] text-[#FAF9F6] px-6 py-4 flex justify-between items-center print:hidden">
              <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
                <FileText className="h-4 w-4" />
                <span>Municipal Tax Receipt Issued</span>
              </span>
              <button
                onClick={() => setViewingReceipt(null)}
                className="text-stone-300 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Printable Receipt Paper container */}
            <div className="p-8 space-y-6 bg-white overflow-y-auto max-h-[75vh]" id="printable-receipt-card">
              
              {/* Receipt Header details */}
              <div className="text-center border-b pb-4 space-y-1">
                <span className="text-[10px] uppercase tracking-[0.25em] font-extrabold text-[#A67C52] block">
                  Republic of the Philippines
                </span>
                <h4 className="font-serif text-[#1B3022] text-lg font-black tracking-tight leading-tight">
                  Pandan Watershed & Ecotourism Bureau
                </h4>
                <p className="text-[9px] text-gray-400 font-mono">
                  Municipal Port Terminal Wharf, Antique District 5712
                </p>
              </div>

              {/* Serials & references matrix */}
              <div className="border-b border-dashed pb-4 grid grid-cols-2 gap-y-2 gap-x-4 text-xs font-mono">
                <div>
                  <span className="text-[9px] text-gray-400 block uppercase">Official Receipt #</span>
                  <span className="font-bold text-[#A67C52]">{viewingReceipt.id}</span>
                </div>
                <div>
                  <span className="text-[9px] text-gray-400 block uppercase">Issue Date</span>
                  <span className="font-semibold">{new Date(viewingReceipt.issuedAt).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[9px] text-gray-400 block uppercase">Payment Method</span>
                  <span className="font-bold">{viewingReceipt.paymentMethod}</span>
                </div>
                <div>
                  <span className="text-[9px] text-gray-400 block uppercase">Payment Ref #</span>
                  <span className="font-semibold text-gray-500">{viewingReceipt.paymentId}</span>
                </div>
              </div>

              {/* Payer Guest name metadata */}
              <div className="bg-stone-50 border p-3 rounded text-xs space-y-1">
                <span className="text-[9px] text-gray-400 uppercase tracking-wider block font-bold">Registered Payee Tourist</span>
                <span className="font-serif text-sm font-bold text-[#1B3022] block">{viewingReceipt.customerName}</span>
                <p className="text-[9px] text-gray-400 leading-tight">
                  This transaction represents authorized municipal landing fees and ecological clearances for the Pandan River Basin.
                </p>
              </div>

              {/* Items / booking fees break downs list */}
              <div className="space-y-2">
                <span className="text-[9px] text-gray-400 uppercase font-black tracking-widest block">Permit Ledger Breakdown</span>
                
                <div className="border border-stone-100 rounded divide-y text-xs">
                  <div className="p-2.5 flex justify-between items-center bg-stone-50/50">
                    <div>
                      <span className="font-semibold block text-[#1B3022]">{viewingReceipt.activityName}</span>
                      <span className="text-[9px] text-gray-400 block">Planned Date: {new Date(viewingReceipt.bookingDate).toLocaleDateString()}</span>
                    </div>
                    <span className="font-mono text-gray-600 font-semibold">Included</span>
                  </div>

                  {viewingReceipt.cottageName && viewingReceipt.cottageName !== 'None' && (
                    <div className="p-2.5 flex justify-between items-center bg-stone-50/50">
                      <div>
                        <span className="font-semibold block text-[#1B3022]">Cottage: {viewingReceipt.cottageName}</span>
                        <span className="text-[9px] text-gray-400 block">Riverside Cabin Reservation</span>
                      </div>
                      <span className="font-mono text-gray-600 font-semibold">Included</span>
                    </div>
                  )}

                  {/* Grand total highlight */}
                  <div className="p-3 flex justify-between items-center bg-[#1B3022]/5 text-[#1B3022] font-bold">
                    <span className="uppercase text-[10px] tracking-wider">Total Received (PHP)</span>
                    <span className="font-mono font-black text-sm">₱{viewingReceipt.amountPaid.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Government Stamp Graphic & message block */}
              <div className="text-center space-y-2 pt-2">
                <div className="border border-emerald-300 bg-emerald-50 text-emerald-800 rounded p-2.5 inline-block text-xs font-bold uppercase tracking-wider">
                  ✓ Eco-Fee Fully Settled & Cleared
                </div>
                <p className="text-[9px] text-gray-400 leading-relaxed italic max-w-sm mx-auto">
                  Disclaimer: This document is issued as digital proof-of-payment. Local ecological permit ordinances are protected by municipal resolutions. Present on terminal boarding.
                </p>
              </div>

            </div>

            {/* Print and Close controls (Non-printable) */}
            <div className="bg-stone-50 border-t p-4 flex gap-2 justify-end print:hidden">
              <button
                onClick={() => setViewingReceipt(null)}
                className="px-4 py-2 text-stone-500 hover:text-stone-800 text-xs font-bold uppercase tracking-wide rounded hover:bg-stone-100 transition-colors cursor-pointer"
              >
                Close Receipt
              </button>

              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-[#1B3022] hover:bg-[#A67C52] text-[#FAF9F6] text-xs font-bold uppercase tracking-wide rounded transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Print Copy</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
