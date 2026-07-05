import React, { useState, useCallback, useMemo } from 'react';
import {
  X, Plus, Trash2, ChevronDown, ArrowRight, ArrowLeft,
  CheckCircle, Calendar, Clock, ShoppingCart, Home, QrCode,
  UserPlus, ShieldCheck, ZoomIn, Upload, FileText, Check, Download,
} from 'lucide-react';
import QRCode from 'qrcode';
import { Activity, Cottage, ActivityName, CartItem, Customer, Booking } from '../types';
import { getPrimaryGuestLabel, getSecondaryGuestLabel, formatActivityPriceSummary } from '../activityPricing';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface BookingModalProps {
  activitiesList: Activity[];
  cottagesList: Cottage[];
  /** Currently signed-in guest, if any. When null, the modal collects check-in details itself. */
  customer: Customer | null;
  token: string | null;
  /** Called once a new guest successfully checks in, so the parent app can persist the session. */
  onAuthenticated: (token: string, customer: Customer) => void;
  onSuccess: () => void;                         // refresh bookings after submit
  showMsg: (text: string, type: 'success' | 'error') => void;
  onClose: () => void;
  /** Optional custom GCash merchant QR set by admin */
  adminQRPref?: string | null;
  /** Optional: pre-select an activity when opened via "Instant Book" */
  preSelectedActivity?: ActivityName;
  /** Optional: pre-select a cottage when opened via "Add Cottage" */
  preSelectedCottage?: string;
}

type StepKey = 'checkin' | 'activities' | 'cottages' | 'confirm' | 'rules' | 'payment';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const COTTAGE_RATES: Record<string, number> = {
  'Riverfront Canopy Cabana': 1500,
  'Dumagat Stilt Lodge': 2800,
  'Forest Canopy Treehouse': 2000,
  'Pandan Bamboo Shelter': 800,
  None: 0,
};

const TIME_SLOTS = ['08:00 AM', '10:30 AM', '01:30 PM', '04:00 PM'] as const;
const DOWN_PAYMENT_RATE = 0.2;

const STEP_META: Record<StepKey, string> = {
  checkin: 'Check-In',
  activities: 'Activities',
  cottages: 'Cottages',
  confirm: 'Confirm',
  rules: 'Rules',
  payment: 'Payment',
};

function calcLine(act: Activity, primary: number, secondary: number): number {
  return primary * act.adultRate + secondary * act.childRate;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: open/close from outside
// ─────────────────────────────────────────────────────────────────────────────

export function useBookingModal() {
  const [open, setOpen] = useState(false);
  const [preAct, setPreAct] = useState<ActivityName | undefined>();
  const [preCot, setPreCot] = useState<string | undefined>();

  const openModal = (actName?: ActivityName, cotName?: string) => {
    setPreAct(actName);
    setPreCot(cotName);
    setOpen(true);
  };
  const closeModal = () => setOpen(false);

  return { open, openModal, closeModal, preAct, preCot };
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function BookingModal({
    activitiesList,
    cottagesList,
    customer,
    token,
    onAuthenticated,
    onSuccess,
    showMsg,
    onClose,
    adminQRPref,
    preSelectedActivity,
    preSelectedCottage,
}: BookingModalProps) {
  const available = activitiesList.filter((a) => !a.disabled);

  // ── Step plan (frozen at modal-open time so it can't shift mid-flow) ────
  // Captured once via lazy useState init — this reflects whether the guest
  // was logged in when the modal first opened, and never changes again for
  // the lifetime of this modal instance (even after onAuthenticated updates
  // the parent's `customer` state mid-flow, e.g. right after registration).
  const [needsCheckIn] = useState(() => customer === null);
  const steps: StepKey[] = useMemo(
    () => (needsCheckIn
      ? ['checkin', 'activities', 'cottages', 'confirm', 'rules', 'payment']
      : ['activities', 'cottages', 'confirm', 'rules', 'payment']),
    [needsCheckIn]
  );
  const [stepIdx, setStepIdx] = useState(0);
  const currentStep = steps[stepIdx];

  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  // ── Session (may be created mid-flow via Check-In) ──────────────────────
  const [sessionToken, setSessionToken] = useState<string | null>(token);
  const [sessionCustomer, setSessionCustomer] = useState<Customer | null>(customer);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  // ── Step: Guest Check-In form state ─────────────────────────────────────
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regDob, setRegDob] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regEmergencyName, setRegEmergencyName] = useState('');
  const [regEmergencyPhone, setRegEmergencyPhone] = useState('');
  const [regAcceptTerms, setRegAcceptTerms] = useState(false);

  // ── Step: Activities (checkbox / tag-style multi-select) ─────────────────
  const [cart, setCart] = useState<{ activityId: string; primaryQty: number; secondaryQty: number }[]>(() => {
    if (preSelectedActivity) {
      const act = available.find((a) => a.name === preSelectedActivity);
      if (act) return [{ activityId: act.id, primaryQty: 1, secondaryQty: 0 }];
    }
    return [];
  });

  // Tap-to-toggle: selecting a card adds it to the cart with a default qty of 1
  // primary guest; tapping again removes it entirely from the cart.
  const toggleActivitySelect = (act: Activity) => {
    setCart((prev) => {
      const exists = prev.find((c) => c.activityId === act.id);
      if (exists) return prev.filter((c) => c.activityId !== act.id);
      return [...prev, { activityId: act.id, primaryQty: 1, secondaryQty: 0 }];
    });
  };

  // ── Step: Cottages ────────────────────────────────────────────────────────
  const [cottageName, setCottageName] = useState(preSelectedCottage ?? 'None');

  // ── Step: Confirm Check-In (schedule) ───────────────────────────────────
  const [bookingDate, setBookingDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState<typeof TIME_SLOTS[number]>('08:00 AM');
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);

  // ── Step: Rules & Regulations ────────────────────────────────────────────
  const [rulesAgreed, setRulesAgreed] = useState(false);

  // ── Step: Payment ─────────────────────────────────────────────────────────
  const [qrExpanded, setQrExpanded] = useState(false);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [isDownloadingTicket, setIsDownloadingTicket] = useState(false);

  // ── Derived totals ──────────────────────────────────────────────────────
  const activitiesTotal = cart.reduce((sum, c) => {
    const act = activitiesList.find((a) => a.id === c.activityId);
    return act ? sum + calcLine(act, c.primaryQty, c.secondaryQty) : sum;
  }, 0);

  const cottageRate = COTTAGE_RATES[cottageName] ?? 0;
  const grandTotal = activitiesTotal + cottageRate;
  const estimatedDownPayment = Math.ceil(grandTotal * DOWN_PAYMENT_RATE);
  const estimatedBalance = grandTotal - estimatedDownPayment;

  const downPaymentDue = createdBooking?.downPaymentAmount ?? estimatedDownPayment;
  const balanceDue = createdBooking?.balanceDueAmount ?? estimatedBalance;

  const today = new Date().toISOString().split('T')[0];

  // ── Cart qty helpers (used once a card is selected) ─────────────────────
  const removeFromCart = (actId: string) =>
    setCart((prev) => prev.filter((c) => c.activityId !== actId));

  const updateQty = (actId: string, field: 'primaryQty' | 'secondaryQty', delta: number) =>
    setCart((prev) =>
      prev
        .map((c) => c.activityId !== actId ? c : { ...c, [field]: Math.max(0, c[field] + delta) })
        .filter((c) => c.primaryQty > 0 || c.secondaryQty > 0)
    );

  // ── Step: Guest Check-In submit ──────────────────────────────────────────
  const handleCheckIn = async () => {
    setInlineError(null);

    if (!regFullName || !regEmail || !regPhone || !regDob || !regAddress || !regEmergencyName || !regEmergencyPhone) {
      setInlineError('Please complete all required check-in fields above.');
      return;
    }
    if (!regAcceptTerms) {
      setInlineError('Please check the authorization box before continuing.');
      return;
    }

    setIsCheckingIn(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: regFullName,
          email: regEmail,
          phone: regPhone,
          dob: regDob,
          address: regAddress,
          emergencyContactName: regEmergencyName,
          emergencyContactPhone: regEmergencyPhone,
          acceptTerms: regAcceptTerms,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.token && data.customer) {
        setSessionToken(data.token);
        setSessionCustomer(data.customer);
        onAuthenticated(data.token, data.customer);
        showMsg(data.message || 'Guest check-in successful!', 'success');
        setStepIdx((i) => i + 1);
      } else {
        setInlineError(data.error || `Check-in failed (${res.status}). Please review your details and try again.`);
      }
    } catch (e) {
      console.error('Check-in request failed:', e);
      setInlineError('Connection error during guest check-in. Please check your internet connection and try again.');
    } finally {
      setIsCheckingIn(false);
    }
  };

  // ── Step: Confirm Check-In → create the booking record ──────────────────
  const handleConfirmCheckIn = async () => {
    setInlineError(null);
    if (!sessionToken) {
      setInlineError('Your session expired — please close this modal and try checking in again.');
      return;
    }
    if (cart.length === 0 || !bookingDate) return;

    setIsCreatingBooking(true);
    const cartItems: CartItem[] = cart.map((c) => {
      const act = activitiesList.find((a) => a.id === c.activityId)!;
      return {
        activityName: act.name,
        primaryQty: c.primaryQty,
        secondaryQty: c.secondaryQty,
        lineTotal: calcLine(act, c.primaryQty, c.secondaryQty),
      };
    });
    const firstAct = activitiesList.find((a) => a.id === cart[0].activityId)!;
    const totalAdults = cart.reduce((s, c) => s + c.primaryQty, 0);
    const totalChildren = cart.reduce((s, c) => s + c.secondaryQty, 0);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify({
          cartItems,
          cottageName,
          bookingDate,
          scheduleTime,
          activityName: firstAct.name,
          numberOfAdults: totalAdults,
          numberOfChildren: totalChildren,
          // rulesAccepted is confirmed on the next step; the server double-checks this flag
          // before persisting, so we only send it once the guest has actually agreed.
          rulesAccepted: rulesAgreed,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.booking) {
        setCreatedBooking(data.booking);
        setStepIdx((i) => i + 1);
      } else {
        setInlineError(data.error || `Failed to confirm check-in (${res.status}).`);
      }
    } catch (e) {
      console.error('Confirm check-in request failed:', e);
      setInlineError('Network error while confirming check-in. Please try again.');
    } finally {
      setIsCreatingBooking(false);
    }
  };

  // ── Step: Rules & Regulations → re-submit booking now that rules are agreed ──
  const handleAgreeRules = async () => {
    setInlineError(null);
    if (!rulesAgreed) {
      setInlineError('You must check the agreement box to continue.');
      return;
    }
    if (createdBooking) {
      // Booking already exists (e.g. guest navigated back and forth) — just proceed.
      setStepIdx((i) => i + 1);
      return;
    }
    await handleConfirmCheckIn();
  };

  // ── Step: Payment → upload down-payment proof ────────────────────────────
  const handleProofUpload = (file: File) => {
    setInlineError(null);
    if (!sessionToken || !createdBooking) {
      setInlineError('Missing booking session — please close this modal and start check-in again.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      setInlineError('Please upload a valid image file (JPG, PNG, or JPEG).');
      return;
    }

    setIsUploadingProof(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const res = await fetch('/api/bookings/submit-proof', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` },
          body: JSON.stringify({
            bookingId: createdBooking.id,
            proofImageBase64: base64,
            originalFileName: file.name,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          showMsg(data.message || 'Down payment proof submitted for verification!', 'success');
          setSubmitted(true);
          onSuccess();
        } else {
          setInlineError(data.error || `Failed to submit down payment proof (${res.status}).`);
        }
      } catch (e) {
        console.error('Proof upload failed:', e);
        setInlineError('Network error transmitting down payment proof. Please try again.');
      } finally {
        setIsUploadingProof(false);
      }
    };
    reader.onerror = () => {
      setInlineError('Could not read the selected image file. Please try a different file.');
      setIsUploadingProof(false);
    };
    reader.readAsDataURL(file);
  };

  // ── Step: Success → download a presentable e-ticket (QR + details) as PNG ──
  const handleDownloadTicket = async () => {
    if (!createdBooking) return;
    setIsDownloadingTicket(true);
    try {
      const qrDataUrl = await QRCode.toDataURL(
        JSON.stringify({
          bookingId: createdBooking.id,
          token: createdBooking.qrCodeToken,
          issued: new Date().toISOString(),
        }),
        { width: 240, margin: 1, color: { dark: '#1B3022', light: '#FFFFFF' } }
      );

      const canvas = document.createElement('canvas');
      canvas.width = 500;
      canvas.height = 660;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Background
      ctx.fillStyle = '#FAF9F6';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Header band
      ctx.fillStyle = '#1B3022';
      ctx.fillRect(0, 0, canvas.width, 86);
      ctx.fillStyle = '#A67C52';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('MW ADVENTURE PARK — DUMAGAT RIVER', 24, 32);
      ctx.fillStyle = '#FAF9F6';
      ctx.font = 'bold 19px serif';
      ctx.fillText('Reservation E-Ticket', 24, 60);

      // QR code, centered
      const qrImg = new Image();
      await new Promise<void>((resolve, reject) => {
        qrImg.onload = () => resolve();
        qrImg.onerror = () => reject(new Error('QR image failed to load'));
        qrImg.src = qrDataUrl;
      });
      const qrSize = 200;
      ctx.drawImage(qrImg, (canvas.width - qrSize) / 2, 106, qrSize, qrSize);

      // Detail lines
      let y = 340;
      const line = (label: string, value: string) => {
        ctx.fillStyle = '#999';
        ctx.font = '10px sans-serif';
        ctx.fillText(label.toUpperCase(), 24, y);
        ctx.fillStyle = '#1B3022';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(value, 24, y + 16);
        y += 38;
      };

      const activityNames = cart
        .map((c) => activitiesList.find((a) => a.id === c.activityId)?.name)
        .filter(Boolean)
        .join(', ') || createdBooking.activityName;

      line('Booking ID', createdBooking.id);
      line('Guest', sessionCustomer?.fullName || '');
      line('Activities', activityNames);
      if (cottageName !== 'None') line('Cottage', cottageName);
      line('Visit Date', `${bookingDate}  ·  ${scheduleTime}`);
      line('Grand Total', `₱${grandTotal.toLocaleString()}`);
      line('Down Payment Paid', `₱${downPaymentDue.toLocaleString()}`);
      line('Balance Due On-Site', `₱${balanceDue.toLocaleString()}`);

      ctx.fillStyle = '#A67C52';
      ctx.font = 'italic 10px sans-serif';
      ctx.fillText('Present this ticket (screen or print) at Dumagat Resort on arrival.', 24, canvas.height - 20);

      const link = document.createElement('a');
      link.download = `MW-Ticket-${createdBooking.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error('Ticket download failed:', e);
      showMsg('Could not generate the ticket image. Please try again.', 'error');
    } finally {
      setIsDownloadingTicket(false);
    }
  };

  // ── Navigation guards ─────────────────────────────────────────────────────

  const goNext = async () => {
    setInlineError(null);
    if (currentStep === 'checkin') return handleCheckIn();

    if (currentStep === 'activities') {
      if (cart.length === 0) {
        setInlineError('Please select at least one activity before continuing.');
        return;
      }
      setStepIdx((i) => i + 1);
      return;
    }

    if (currentStep === 'confirm') {
      if (!bookingDate) {
        setInlineError('Please select a visit date before continuing.');
        return;
      }
      setStepIdx((i) => i + 1);
      return;
    }

    if (currentStep === 'rules') return handleAgreeRules();

    setStepIdx((i) => Math.min(i + 1, steps.length - 1));
  };

  const goBack = () => {
    setInlineError(null);
    if (stepIdx === 0) { onClose(); return; }
    setStepIdx((i) => i - 1);
  };

  const stepBusy = isCheckingIn || isCreatingBooking || isSubmitting;

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(27,48,34,0.75)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        animation: 'bm-fadein 0.22s ease',
      }}
    >
      <style>{`
        @keyframes bm-fadein  { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
        @keyframes bm-slidein { from { opacity:0; transform:translateX(16px) } to { opacity:1; transform:translateX(0) } }
        @keyframes bm-spin    { to   { transform: rotate(360deg) } }
        .bm-step { animation: bm-slidein 0.26s ease; }
        .bm-input { width:100%; border:1.5px solid rgba(27,48,34,0.16); border-radius:5px; padding:9px 11px;
                    font-size:12px; color:#1B3022; background:#FAF9F6; font-family:inherit; outline:none;
                    box-sizing:border-box; transition:border-color .15s; }
        .bm-input:focus { border-color:#A67C52; }
        .bm-label { font-size:9px; font-weight:800; letter-spacing:.14em; color:#888; text-transform:uppercase; margin-bottom:6px; display:block; }
        .bm-qty  { width:28px; height:28px; border:1.5px solid rgba(27,48,34,0.18); border-radius:4px; background:#fff;
                   display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:14px;
                   font-weight:800; color:#1B3022; transition:all .15s; flex-shrink:0; }
        .bm-qty:hover { background:#1B3022; color:#FAF9F6; border-color:#1B3022; }
        .bm-timeslot { border:1.5px solid rgba(27,48,34,0.14); border-radius:5px; padding:9px 0;
                       font-size:11px; font-weight:700; text-align:center; cursor:pointer;
                       color:#777; letter-spacing:.05em; transition:all .15s; }
        .bm-timeslot.active { background:#1B3022; color:#FAF9F6; border-color:#1B3022; }
        .bm-timeslot:not(.active):hover { border-color:#A67C52; color:#A67C52; }
        .bm-cot { border:1.5px solid rgba(27,48,34,0.12); border-radius:6px; padding:11px 14px;
                  cursor:pointer; transition:all .15s; }
        .bm-cot:hover:not(.selected) { border-color:#A67C52; }
        .bm-cot.selected { border-color:#1B3022; background:#1B3022; color:#FAF9F6; }
        .bm-cot.selected .bm-cot-rate { color:#A67C52; }
        .bm-act-card { border:1.5px solid rgba(27,48,34,0.12); border-radius:7px; padding:12px 14px;
                       cursor:pointer; transition:all .15s; background:#fff; }
        .bm-act-card:hover { border-color:#A67C52; }
        .bm-act-card.selected { border-color:#1B3022; background:rgba(27,48,34,0.03); }
        .bm-checkbox { width:20px; height:20px; border-radius:5px; border:1.8px solid rgba(27,48,34,0.25);
                       display:flex; align-items:center; justify-content:center; flex-shrink:0;
                       margin-top:1px; transition:all .15s; background:#fff; }
        .bm-checkbox.checked { background:#1B3022; border-color:#1B3022; }
        .bm-primary-btn { background:#1B3022; color:#FAF9F6; border:none; border-radius:5px;
                          padding:10px 20px; font-size:11px; font-weight:800; letter-spacing:.14em;
                          text-transform:uppercase; cursor:pointer; display:flex; align-items:center;
                          gap:6px; transition:background .15s; font-family:inherit; }
        .bm-primary-btn:hover:not(:disabled) { background:#A67C52; }
        .bm-primary-btn:disabled { opacity:.4; cursor:not-allowed; }
        .bm-ghost-btn  { background:transparent; border:1.5px solid rgba(27,48,34,0.2); color:#666;
                         border-radius:5px; padding:10px 18px; font-size:11px; font-weight:700;
                         letter-spacing:.12em; text-transform:uppercase; cursor:pointer;
                         display:flex; align-items:center; gap:5px; transition:all .15s; font-family:inherit; }
        .bm-ghost-btn:hover { border-color:#1B3022; color:#1B3022; }
        .bm-ghost-btn:disabled { opacity:.5; cursor:not-allowed; }
        .bm-confirm-btn { background:#A67C52; color:#FAF9F6; border:none; border-radius:5px;
                          padding:10px 22px; font-size:11px; font-weight:800; letter-spacing:.14em;
                          text-transform:uppercase; cursor:pointer; display:flex; align-items:center;
                          gap:7px; transition:background .15s; font-family:inherit; }
        .bm-confirm-btn:hover:not(:disabled) { background:#8a6440; }
        .bm-confirm-btn:disabled { opacity:.65; cursor:not-allowed; }
        .bm-scroll::-webkit-scrollbar { width:3px; }
        .bm-scroll::-webkit-scrollbar-thumb { background:#ddd; border-radius:4px; }
        .bm-add-btn { width:100%; background:#1B3022; color:#FAF9F6; border:none; border-radius:4px;
                      padding:10px 0; font-size:11px; font-weight:800; letter-spacing:.14em;
                      text-transform:uppercase; cursor:pointer; display:flex; align-items:center;
                      justify-content:center; gap:6px; transition:background .15s; font-family:inherit; }
        .bm-add-btn:hover:not(:disabled) { background:#A67C52; }
        .bm-add-btn:disabled { opacity:.38; cursor:not-allowed; }
      `}</style>

      {/* ── Card ──────────────────────────────────────────────────────────── */}
      <div style={{
        background: '#FAF9F6', borderRadius: 10, width: '100%', maxWidth: 580,
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 40px 100px rgba(27,48,34,0.35)', overflow: 'hidden',
        fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif",
      }}>

        {/* ── Modal header ────────────────────────────────────────────────── */}
        <div style={{ background: '#1B3022', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', color: '#A67C52', textTransform: 'uppercase', marginBottom: 3 }}>
              {submitted ? 'Down Payment Submitted' : `Step ${stepIdx + 1} of ${steps.length}`}
            </div>
            <div style={{ fontFamily: "'Playfair Display', 'Georgia', serif", fontSize: 18, fontWeight: 700, color: '#FAF9F6', lineHeight: 1.2 }}>
              {submitted
                ? '🎉 Check-In Almost Complete!'
                : currentStep === 'checkin' ? 'Guest Check-In'
                : currentStep === 'activities' ? 'Select Activities'
                : currentStep === 'cottages' ? 'Add a Cottage (Optional)'
                : currentStep === 'confirm' ? 'Confirm Check-In'
                : currentStep === 'rules' ? 'Rules & Regulations'
                : 'Down Payment (20%)'}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FAF9F6', flexShrink: 0, marginTop: 2, transition: 'background .15s' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.24)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Progress bar ─────────────────────────────────────────────────── */}
        {!submitted && (
          <div style={{ background: '#fff', borderBottom: '1px solid rgba(27,48,34,0.07)', padding: '12px 22px', display: 'flex', flexShrink: 0, overflowX: 'auto' }}>
            {steps.map((s, i) => (
              <div key={s} style={{ flex: 1, display: 'flex', alignItems: 'center', minWidth: 54 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 800,
                    background: stepIdx > i ? '#1B3022' : stepIdx === i ? '#A67C52' : 'transparent',
                    color: stepIdx >= i ? '#FAF9F6' : '#ccc',
                    border: stepIdx < i ? '2px solid #ddd' : 'none',
                    transition: 'all .22s',
                  }}>
                    {stepIdx > i ? <CheckCircle size={12} /> : i + 1}
                  </div>
                  <div style={{ fontSize: 8, fontWeight: 700, marginTop: 4, letterSpacing: '0.06em', textTransform: 'uppercase', color: stepIdx === i ? '#A67C52' : stepIdx > i ? '#1B3022' : '#ccc', transition: 'color .22s', whiteSpace: 'nowrap' }}>
                    {STEP_META[s]}
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div style={{ height: 2, flex: 1, background: stepIdx > i ? '#1B3022' : '#e8e8e8', marginBottom: 16, transition: 'background .22s' }} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Scrollable body ───────────────────────────────────────────────── */}
        <div className="bm-scroll" style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>

          {/* ── Inline error banner (always visible, never hidden behind other UI) ── */}
          {!submitted && inlineError && (
            <div style={{
              background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B',
              borderRadius: 6, padding: '10px 13px', fontSize: 11.5, lineHeight: 1.6,
              marginBottom: 14, display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <span style={{ fontWeight: 800, flexShrink: 0 }}>⚠</span>
              <span>{inlineError}</span>
            </div>
          )}

          {/* ── SUCCESS ─────────────────────────────────────────────────────── */}
          {submitted && (
            <div className="bm-step" style={{ textAlign: 'center', padding: '12px 0 6px' }}>
              <div style={{ width: 68, height: 68, background: 'rgba(27,48,34,0.08)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <CheckCircle size={34} color="#1B3022" />
              </div>
              <p style={{ fontSize: 12, color: '#888', lineHeight: 1.75, maxWidth: 360, margin: '0 auto 18px' }}>
                Your 20% down payment proof has been submitted. Once park marshals verify it, your booking is
                confirmed and your QR entry ticket will appear under <strong>Bookings &amp; QR Tickets</strong>.
                The remaining balance of <strong>₱{balanceDue.toLocaleString()}</strong> is payable on-site.
              </p>

              <div style={{ background: '#fff', border: '1px solid rgba(27,48,34,0.1)', borderRadius: 7, padding: '14px 16px', marginBottom: 6, textAlign: 'left' }}>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.18em', color: '#A67C52', textTransform: 'uppercase', marginBottom: 10 }}>Booking Summary</div>
                {cart.map((c) => {
                  const act = activitiesList.find((a) => a.id === c.activityId);
                  if (!act) return null;
                  return (
                    <div key={c.activityId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5, color: '#444' }}>
                      <span>{act.name} — {c.primaryQty > 0 && `${c.primaryQty}×${getPrimaryGuestLabel(act)}`}{c.secondaryQty > 0 && `, ${c.secondaryQty}×${getSecondaryGuestLabel(act)}`}</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1B3022' }}>₱{calcLine(act, c.primaryQty, c.secondaryQty).toLocaleString()}</span>
                    </div>
                  );
                })}
                {cottageName !== 'None' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5, color: '#444' }}>
                    <span>⛺ {cottageName}</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1B3022' }}>₱{cottageRate.toLocaleString()}</span>
                  </div>
                )}
                <div style={{ borderTop: '1px dashed #ddd', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 13, color: '#1B3022' }}>
                  <span>Grand Total</span>
                  <span style={{ fontFamily: 'monospace', color: '#A67C52' }}>₱{grandTotal.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 6, color: '#1B3022', fontWeight: 700 }}>
                  <span>Down Payment (20%) — Submitted</span>
                  <span style={{ fontFamily: 'monospace' }}>₱{downPaymentDue.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 3, color: '#999' }}>
                  <span>Balance Due On-Site</span>
                  <span style={{ fontFamily: 'monospace' }}>₱{balanceDue.toLocaleString()}</span>
                </div>
                <div style={{ marginTop: 8, fontSize: 11, color: '#999' }}>
                  📅 {bookingDate} &nbsp;·&nbsp; ⏰ {scheduleTime}
                </div>
                {createdBooking && (
                  <div style={{ marginTop: 6, fontSize: 10, color: '#bbb', fontFamily: 'monospace' }}>
                    ID: {createdBooking.id}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 14, flexWrap: 'wrap' }}>
                <button className="bm-ghost-btn" onClick={handleDownloadTicket} disabled={isDownloadingTicket}>
                  {isDownloadingTicket ? (
                    <>
                      <span style={{ width: 12, height: 12, border: '2px solid rgba(27,48,34,0.25)', borderTop: '2px solid #1B3022', borderRadius: '50%', display: 'inline-block', animation: 'bm-spin 0.75s linear infinite' }} />
                      Preparing…
                    </>
                  ) : (
                    <><Download size={13} /> Download Ticket</>
                  )}
                </button>
                <button className="bm-primary-btn" onClick={onClose}>
                  <QrCode size={13} /> Done
                </button>
              </div>
              <p style={{ fontSize: 9.5, color: '#bbb', marginTop: 10, lineHeight: 1.6 }}>
                Save or print this ticket to present at Dumagat Resort upon arrival, then return here anytime to check your booking status.
              </p>
            </div>
          )}

          {/* ── STEP: Guest Check-In ─────────────────────────────────────────── */}
          {!submitted && currentStep === 'checkin' && (
            <div className="bm-step">
              <p style={{ fontSize: 11, color: '#999', lineHeight: 1.7, marginBottom: 14 }}>
                Complete your visitor info to start booking. Philippine river safety guidelines require accurate
                names and emergency contact links. No password needed.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label className="bm-label">Full Name</label>
                  <input className="bm-input" type="text" placeholder="e.g. Maria Santos" value={regFullName} onChange={(e) => setRegFullName(e.target.value)} />
                </div>
                <div>
                  <label className="bm-label">Email Address</label>
                  <input className="bm-input" type="email" placeholder="maria.santos@gmail.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="bm-label">Mobile Number (PH)</label>
                    <input className="bm-input" type="text" placeholder="09171234567" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} />
                  </div>
                  <div>
                    <label className="bm-label">Date of Birth</label>
                    <input className="bm-input" type="date" value={regDob} onChange={(e) => setRegDob(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="bm-label">Residential Address</label>
                  <input className="bm-input" type="text" placeholder="Street, City, Province" value={regAddress} onChange={(e) => setRegAddress(e.target.value)} />
                </div>

                <div style={{ background: 'rgba(27,48,34,0.05)', border: '1px solid rgba(27,48,34,0.1)', borderRadius: 6, padding: 12 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#1B3022', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                    🚨 Emergency Contact
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input className="bm-input" type="text" placeholder="Primary Kin Name" value={regEmergencyName} onChange={(e) => setRegEmergencyName(e.target.value)} />
                    <input className="bm-input" type="text" placeholder="09179998877" value={regEmergencyPhone} onChange={(e) => setRegEmergencyPhone(e.target.value)} />
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 9, cursor: 'pointer', fontSize: 10.5, lineHeight: 1.6, color: '#666' }}>
                  <input type="checkbox" checked={regAcceptTerms} onChange={(e) => setRegAcceptTerms(e.target.checked)} style={{ marginTop: 2, accentColor: '#1B3022', flexShrink: 0 }} />
                  <span>I authorize MW Adventure Park to register my details for safety protocols &amp; river waivers.</span>
                </label>
              </div>
            </div>
          )}

          {/* ── STEP: Activities (checkbox / tag-style multi-select) ─────────── */}
          {!submitted && currentStep === 'activities' && (
            <div className="bm-step">
              <p style={{ fontSize: 11, color: '#999', lineHeight: 1.7, marginBottom: 14 }}>
                Tap an activity to select it, then adjust guest counts. Select as many as you like.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                {available.map((act) => {
                  const inCart = cart.find((c) => c.activityId === act.id);
                  const isSelected = !!inCart;
                  return (
                    <div
                      key={act.id}
                      className={`bm-act-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleActivitySelect(act)}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div className={`bm-checkbox ${isSelected ? 'checked' : ''}`}>
                          {isSelected && <Check size={12} color="#fff" />}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? '#1B3022' : '#333' }}>
                              {act.name}
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#A67C52', fontFamily: 'monospace', flexShrink: 0 }}>
                              {formatActivityPriceSummary(act)}
                            </span>
                          </div>
                          <div style={{ fontSize: 10.5, color: '#999', marginTop: 2 }}>{act.tagline}</div>

                          {isSelected && inCart && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', background: '#fff', border: '1px solid rgba(27,48,34,0.08)', borderRadius: 6, padding: 10 }}
                            >
                              <div>
                                <div style={{ fontSize: 9, fontWeight: 700, color: '#A67C52', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
                                  {getPrimaryGuestLabel(act)}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                  <button className="bm-qty" style={{ width: 24, height: 24 }} onClick={() => updateQty(act.id, 'primaryQty', -1)}>−</button>
                                  <span style={{ fontSize: 13, fontWeight: 800, width: 18, textAlign: 'center' }}>{inCart.primaryQty}</span>
                                  <button className="bm-qty" style={{ width: 24, height: 24 }} onClick={() => updateQty(act.id, 'primaryQty', 1)}>+</button>
                                </div>
                              </div>

                              {act.childRate > 0 && (
                                <div>
                                  <div style={{ fontSize: 9, fontWeight: 700, color: '#A67C52', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
                                    {getSecondaryGuestLabel(act)}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                    <button className="bm-qty" style={{ width: 24, height: 24 }} onClick={() => updateQty(act.id, 'secondaryQty', -1)}>−</button>
                                    <span style={{ fontSize: 13, fontWeight: 800, width: 18, textAlign: 'center' }}>{inCart.secondaryQty}</span>
                                    <button className="bm-qty" style={{ width: 24, height: 24 }} onClick={() => updateQty(act.id, 'secondaryQty', 1)}>+</button>
                                  </div>
                                </div>
                              )}

                              <div style={{ marginLeft: 'auto', fontFamily: 'monospace', fontWeight: 800, fontSize: 13, color: '#1B3022' }}>
                                ₱{calcLine(act, inCart.primaryQty, inCart.secondaryQty).toLocaleString()}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {cart.length > 0 ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 2px 0', fontSize: 13, fontWeight: 800, color: '#1B3022', borderTop: '1px dashed #ddd' }}>
                  <span>Activities Subtotal ({cart.length} selected)</span>
                  <span style={{ fontFamily: 'monospace' }}>₱{activitiesTotal.toLocaleString()}</span>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '22px 0', color: '#ccc', fontSize: 12 }}>
                  <ShoppingCart size={30} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.5 }} />
                  Select at least one activity to continue
                </div>
              )}
            </div>
          )}

          {/* ── STEP: Cottages ──────────────────────────────────────────────── */}
          {!submitted && currentStep === 'cottages' && (
            <div className="bm-step">
              <p style={{ fontSize: 11, color: '#999', lineHeight: 1.7, marginBottom: 14 }}>
                Add a riverside cottage to your booking, or skip to continue with activities only.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className={`bm-cot ${cottageName === 'None' ? 'selected' : ''}`} onClick={() => setCottageName('None')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>No Cottage</div>
                      <div style={{ fontSize: 11, marginTop: 2, opacity: 0.65 }}>Activities only — no cabin add-on</div>
                    </div>
                    {cottageName === 'None' && <CheckCircle size={16} color="#A67C52" />}
                  </div>
                </div>

                {cottagesList.filter((c) => !c.disabled).map((c) => (
                  <div key={c.id} className={`bm-cot ${cottageName === c.name ? 'selected' : ''}`} onClick={() => setCottageName(c.name)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Home size={12} style={{ opacity: 0.6 }} />
                          <span style={{ fontSize: 13, fontWeight: 700 }}>{c.name}</span>
                        </div>
                        <div style={{ fontSize: 11, marginTop: 2, opacity: 0.6 }}>{c.capacity ?? ''}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                        <div className="bm-cot-rate" style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 800, color: cottageName === c.name ? '#A67C52' : '#1B3022' }}>
                          ₱{c.ratePerDay.toLocaleString()}
                        </div>
                        <div style={{ fontSize: 9, opacity: 0.55 }}>/ day</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {cottageName !== 'None' && (
                <div style={{ marginTop: 12, padding: '9px 13px', background: 'rgba(166,124,82,0.08)', border: '1px solid rgba(166,124,82,0.2)', borderRadius: 5, fontSize: 11, color: '#A67C52', fontWeight: 600 }}>
                  ⛺ +₱{cottageRate.toLocaleString()} added — new total ₱{grandTotal.toLocaleString()}
                </div>
              )}
            </div>
          )}

          {/* ── STEP: Confirm Check-In ───────────────────────────────────────── */}
          {!submitted && currentStep === 'confirm' && (
            <div className="bm-step">
              <p style={{ fontSize: 11, color: '#999', lineHeight: 1.7, marginBottom: 16 }}>
                Choose your visit date and boarding time, then confirm your check-in details below.
              </p>

              <div style={{ marginBottom: 16 }}>
                <label className="bm-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Calendar size={10} /> Visit Date</label>
                <input className="bm-input" type="date" required min={today} value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label className="bm-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Clock size={10} /> Boarding Time</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {TIME_SLOTS.map((slot) => (
                    <div key={slot} className={`bm-timeslot ${scheduleTime === slot ? 'active' : ''}`} onClick={() => setScheduleTime(slot)}>
                      {slot}
                    </div>
                  ))}
                </div>
              </div>

              {/* Review summary */}
              <div style={{ background: '#fff', border: '1px solid rgba(27,48,34,0.09)', borderRadius: 7, padding: '12px 14px', marginBottom: 10 }}>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.15em', color: '#A67C52', textTransform: 'uppercase', marginBottom: 9 }}>Guest</div>
                <div style={{ fontSize: 12, color: '#444', marginBottom: 3 }}>{sessionCustomer?.fullName}</div>
                <div style={{ fontSize: 11, color: '#999' }}>{sessionCustomer?.email} · {sessionCustomer?.phone}</div>
              </div>

              <div style={{ background: '#fff', border: '1px solid rgba(27,48,34,0.09)', borderRadius: 7, padding: '12px 14px', marginBottom: 10 }}>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.15em', color: '#A67C52', textTransform: 'uppercase', marginBottom: 9 }}>Reservation</div>
                {cart.map((c) => {
                  const act = activitiesList.find((a) => a.id === c.activityId);
                  if (!act) return null;
                  return (
                    <div key={c.activityId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6, color: '#444' }}>
                      <span>{act.name}</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1B3022' }}>₱{calcLine(act, c.primaryQty, c.secondaryQty).toLocaleString()}</span>
                    </div>
                  );
                })}
                {cottageName !== 'None' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#444' }}>
                    <span>⛺ {cottageName}</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1B3022' }}>₱{cottageRate.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div style={{ background: '#1B3022', borderRadius: 7, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase' }}>Grand Total</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 700, color: '#fff' }}>₱{grandTotal.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#A67C52', textTransform: 'uppercase' }}>Due Now (20% Down Payment)</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 800, color: '#A67C52' }}>₱{estimatedDownPayment.toLocaleString()}</span>
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', marginTop: 6 }}>
                  Balance of ₱{estimatedBalance.toLocaleString()} is payable on-site upon arrival.
                </div>
              </div>
            </div>
          )}

          {/* ── STEP: Rules & Regulations ────────────────────────────────────── */}
          {!submitted && currentStep === 'rules' && (
            <div className="bm-step">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <ShieldCheck size={18} color="#1B3022" />
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: '#1B3022' }}>
                  MW Adventure Park — Rules &amp; Regulations
                </span>
              </div>

              <div style={{ background: '#fff', border: '1px solid rgba(27,48,34,0.1)', borderRadius: 7, padding: '16px 18px', maxHeight: 240, overflowY: 'auto', fontSize: 11.5, color: '#555', lineHeight: 1.85 }}>
                <ol style={{ paddingLeft: 18, margin: 0 }}>
                  <li>Life vests are mandatory for all water-based activities (kayaking, tubing) at all times.</li>
                  <li>Guests must disclose pre-existing medical conditions to staff prior to activity participation.</li>
                  <li>Children under 12 must be accompanied by a supervising adult at all times.</li>
                  <li>Park staff instructions and safety briefings must be followed without exception.</li>
                  <li>Activities may be suspended without notice due to adverse weather or unsafe river conditions.</li>
                  <li>The 20% down payment confirms your reservation slot; the remaining balance is settled on-site before activity commencement.</li>
                  <li>Down payments are non-refundable for no-shows, but may be rescheduled with at least 24 hours' notice.</li>
                  <li>Guests assume responsibility for personal belongings; the park is not liable for lost or damaged items.</li>
                  <li>Alcohol and illegal substances are strictly prohibited before or during water activities.</li>
                  <li>By checking in, guests release MW Adventure Park and its staff from liability for injuries sustained through guest negligence or failure to follow safety instructions.</li>
                </ol>
              </div>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 9, cursor: 'pointer', fontSize: 11.5, lineHeight: 1.6, color: '#1B3022', marginTop: 14, fontWeight: 600 }}>
                <input type="checkbox" checked={rulesAgreed} onChange={(e) => setRulesAgreed(e.target.checked)} style={{ marginTop: 2, accentColor: '#1B3022', flexShrink: 0 }} />
                <span>I have read, understood, and agree to MW Adventure Park's Rules, Regulations, and River Safety Waiver.</span>
              </label>
            </div>
          )}

          {/* ── STEP: Payment ─────────────────────────────────────────────────── */}
          {!submitted && currentStep === 'payment' && (
            <div className="bm-step">
              <div style={{ background: '#1B3022', borderRadius: 7, padding: '14px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 3 }}>Down Payment Due Now (20%)</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 24, fontWeight: 800, color: '#A67C52' }}>₱{downPaymentDue.toLocaleString()}</div>
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', textAlign: 'right', maxWidth: 130, lineHeight: 1.6 }}>
                  Balance of ₱{balanceDue.toLocaleString()}<br />payable on-site.
                </div>
              </div>

              <div style={{ background: 'rgba(166,124,82,0.06)', border: '1px solid rgba(166,124,82,0.2)', borderRadius: 7, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#A67C52', textTransform: 'uppercase', letterSpacing: '0.1em' }}>🛡️ GCash Down Payment Gateway</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 10, background: '#fff', border: '1px solid rgba(27,48,34,0.08)', borderRadius: 6 }}>
                    <span style={{ fontSize: 8, color: '#999', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>1. Scan QR to Pay</span>
                    {adminQRPref ? (
                      <button
                        type="button"
                        onClick={() => setQrExpanded(true)}
                        style={{ position: 'relative', width: 84, height: 84, background: '#fff', border: '1px solid #eee', borderRadius: 5, padding: 4, cursor: 'zoom-in' }}
                      >
                        <img src={adminQRPref} alt="GCash Merchant QR" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      </button>
                    ) : (
                      <div style={{ width: 84, height: 84, background: '#eaf3fb', borderRadius: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px solid #d5e8f7' }}>
                        <QrCode size={22} color="#2b6cb0" />
                        <span style={{ fontSize: 7, color: '#2b6cb0', marginTop: 4, textAlign: 'center', lineHeight: 1.3 }}>GCash Sandbox QR</span>
                      </div>
                    )}
                    <span style={{ fontSize: 7.5, color: '#999', marginTop: 5, textTransform: 'uppercase' }}>MW Merchant Code</span>
                  </div>

                  <div>
                    <span style={{ fontSize: 8, color: '#999', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>2. Upload Proof</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg"
                      id="bm-proof-upload"
                      style={{ display: 'none' }}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleProofUpload(f); }}
                    />
                    <button
                      className="bm-add-btn"
                      onClick={() => document.getElementById('bm-proof-upload')?.click()}
                      disabled={isUploadingProof}
                    >
                      {isUploadingProof ? (
                        <>
                          <span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid #fff', borderRadius: '50%', display: 'inline-block', animation: 'bm-spin 0.75s linear infinite' }} />
                          Uploading…
                        </>
                      ) : (
                        <><Upload size={13} /> Upload Screenshot</>
                      )}
                    </button>
                    <p style={{ fontSize: 8.5, color: '#aaa', marginTop: 6, textAlign: 'center' }}>Supported: JPG, JPEG, PNG only.</p>
                  </div>
                </div>
              </div>

              {qrExpanded && adminQRPref && (
                <div
                  onClick={() => setQrExpanded(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(27,48,34,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                >
                  <div style={{ background: '#fff', borderRadius: 8, padding: 14, maxWidth: 320 }} onClick={(e) => e.stopPropagation()}>
                    <img src={adminQRPref} alt="GCash QR enlarged" referrerPolicy="no-referrer" style={{ width: '100%', objectFit: 'contain' }} />
                    <button className="bm-ghost-btn" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }} onClick={() => setQrExpanded(false)}>Close</button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* ── Footer nav ────────────────────────────────────────────────────── */}
        {!submitted && currentStep !== 'payment' && (
          <div style={{ borderTop: '1px solid rgba(27,48,34,0.07)', padding: '14px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', flexShrink: 0 }}>
            <button className="bm-ghost-btn" onClick={goBack}>
              <ArrowLeft size={12} />
              {stepIdx === 0 ? 'Cancel' : 'Back'}
            </button>

            <button className="bm-primary-btn" onClick={goNext} disabled={stepBusy}>
              {stepBusy ? (
                <>
                  <span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid #fff', borderRadius: '50%', display: 'inline-block', animation: 'bm-spin 0.75s linear infinite' }} />
                  Please wait…
                </>
              ) : currentStep === 'checkin' ? (
                <><UserPlus size={12} /> Check In</>
              ) : currentStep === 'activities' ? (
                <>Continue — {cart.length} {cart.length === 1 ? 'activity' : 'activities'} <ArrowRight size={12} /></>
              ) : currentStep === 'cottages' ? (
                <>Next — Confirm Check-In <ArrowRight size={12} /></>
              ) : currentStep === 'confirm' ? (
                <><CheckCircle size={12} /> Confirm Check-In</>
              ) : (
                <>Agree &amp; Continue <ArrowRight size={12} /></>
              )}
            </button>
          </div>
        )}

        {!submitted && currentStep === 'payment' && (
          <div style={{ borderTop: '1px solid rgba(27,48,34,0.07)', padding: '14px 22px', display: 'flex', justifyContent: 'flex-start', background: '#fff', flexShrink: 0 }}>
            <button className="bm-ghost-btn" onClick={goBack}>
              <ArrowLeft size={12} /> Back
            </button>
          </div>
        )}

      </div>
    </div>
  );
}