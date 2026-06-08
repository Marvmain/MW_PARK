import React, { useState, useCallback } from 'react';
import {
  X, Plus, Trash2, ChevronDown, ArrowRight, ArrowLeft,
  CheckCircle, Calendar, Clock, ShoppingCart, Home, QrCode
} from 'lucide-react';
import { Activity, Cottage, ActivityName, CartItem } from '../types';
import { getPrimaryGuestLabel, getSecondaryGuestLabel, formatActivityPriceSummary } from '../activityPricing';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface BookingModalProps {
  activitiesList: Activity[];
  cottagesList: Cottage[];
  token: string;
  onSuccess: () => void;                         // refresh bookings after submit
  showMsg: (text: string, type: 'success' | 'error') => void;
  onClose: () => void;
  /** Optional: pre-select an activity when opened via "Instant Book" */
  preSelectedActivity?: ActivityName;
  /** Optional: pre-select a cottage when opened via "Add Cottage" */
  preSelectedCottage?: string;
}

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

const STEPS = [
  { num: 1, label: 'Activities' },
  { num: 2, label: 'Cottage'    },
  { num: 3, label: 'Schedule'   },
  { num: 4, label: 'Confirm'    },
];

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
    token,
    onSuccess,
    showMsg,
    onClose,
    preSelectedActivity,
    preSelectedCottage,
}: BookingModalProps) {
  const available = activitiesList.filter((a) => !a.disabled);
  const defaultActId = preSelectedActivity
    ? (available.find((a) => a.name === preSelectedActivity)?.id ?? available[0]?.id ?? '')
    : (available[0]?.id ?? '');

  // ── Step state ──────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBookingId, setConfirmedBookingId] = useState('');

  // ── Step 1: Activities ──────────────────────────────────────────────────
  const [cart, setCart] = useState<{ activityId: string; primaryQty: number; secondaryQty: number }[]>(() => {
    if (preSelectedActivity) {
      const act = available.find((a) => a.name === preSelectedActivity);
      if (act) return [{ activityId: act.id, primaryQty: 1, secondaryQty: 0 }];
    }
    return [];
  });
  const [pickerActId, setPickerActId] = useState(defaultActId);
  const [pickerPrimary, setPickerPrimary] = useState(1);
  const [pickerSecondary, setPickerSecondary] = useState(0);

  // ── Step 2: Cottage ─────────────────────────────────────────────────────
  const [cottageName, setCottageName] = useState(preSelectedCottage ?? 'None');

  // ── Step 3: Schedule ────────────────────────────────────────────────────
  const [bookingDate, setBookingDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState<typeof TIME_SLOTS[number]>('08:00 AM');

  // ── Derived totals ──────────────────────────────────────────────────────
  const pickerAct = available.find((a) => a.id === pickerActId);

  const activitiesTotal = cart.reduce((sum, c) => {
    const act = activitiesList.find((a) => a.id === c.activityId);
    return act ? sum + calcLine(act, c.primaryQty, c.secondaryQty) : sum;
  }, 0);

  const cottageRate = COTTAGE_RATES[cottageName] ?? 0;
  const grandTotal = activitiesTotal + cottageRate;

  const today = new Date().toISOString().split('T')[0];

  // ── Cart helpers ────────────────────────────────────────────────────────
  const addToCart = useCallback(() => {
    if (!pickerAct || (pickerPrimary <= 0 && pickerSecondary <= 0)) return;
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.activityId === pickerActId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          primaryQty: next[idx].primaryQty + pickerPrimary,
          secondaryQty: next[idx].secondaryQty + pickerSecondary,
        };
        return next;
      }
      return [...prev, { activityId: pickerActId, primaryQty: pickerPrimary, secondaryQty: pickerSecondary }];
    });
    setPickerPrimary(1);
    setPickerSecondary(0);
  }, [pickerAct, pickerActId, pickerPrimary, pickerSecondary]);

  const removeFromCart = (actId: string) =>
    setCart((prev) => prev.filter((c) => c.activityId !== actId));

  const updateQty = (actId: string, field: 'primaryQty' | 'secondaryQty', delta: number) =>
    setCart((prev) =>
      prev
        .map((c) => c.activityId !== actId ? c : { ...c, [field]: Math.max(0, c[field] + delta) })
        .filter((c) => c.primaryQty > 0 || c.secondaryQty > 0)
    );

  // ── Validation ──────────────────────────────────────────────────────────
  const canNext = () => {
    if (step === 1) return cart.length > 0;
    if (step === 3) return !!bookingDate;
    return true;
  };

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (cart.length === 0 || !bookingDate) return;
    setIsSubmitting(true);

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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          cartItems,
          cottageName,
          bookingDate,
          scheduleTime,
          totalAmount: grandTotal,
          activityName: firstAct.name,
          numberOfAdults: totalAdults,
          numberOfChildren: totalChildren,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setConfirmedBookingId(data.booking?.id ?? '');
        setSubmitted(true);
        onSuccess();
      
        setTimeout(() => {
          onClose();
        }, 1500);
      }
      else {
        showMsg(data.error || 'Failed to submit reservation.', 'error');
      }
    } catch {
      showMsg('Network error — please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Reset ───────────────────────────────────────────────────────────────
  const reset = () => {
    setStep(1);
    setSubmitted(false);
    setCart([]);
    setCottageName('None');
    setBookingDate('');
    setScheduleTime('08:00 AM');
    setConfirmedBookingId('');
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
    onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
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
        background: '#FAF9F6', borderRadius: 10, width: '100%', maxWidth: 560,
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 40px 100px rgba(27,48,34,0.35)', overflow: 'hidden',
        fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif",
      }}>

        {/* ── Modal header ────────────────────────────────────────────────── */}
        <div style={{ background: '#1B3022', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', color: '#A67C52', textTransform: 'uppercase', marginBottom: 3 }}>
              {submitted ? 'Booking Confirmed' : `Step ${step} of 4`}
            </div>
            <div style={{ fontFamily: "'Playfair Display', 'Georgia', serif", fontSize: 18, fontWeight: 700, color: '#FAF9F6', lineHeight: 1.2 }}>
              {submitted
                ? '🎉 Reservation Submitted!'
                : step === 1 ? 'Select Activities'
                : step === 2 ? 'Add a Cottage (Optional)'
                : step === 3 ? 'Choose Date & Time'
                : 'Review & Confirm'}
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
          <div style={{ background: '#fff', borderBottom: '1px solid rgba(27,48,34,0.07)', padding: '12px 22px', display: 'flex', flexShrink: 0 }}>
            {STEPS.map((s, i) => (
              <div key={s.num} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 800,
                    background: step > s.num ? '#1B3022' : step === s.num ? '#A67C52' : 'transparent',
                    color: step >= s.num ? '#FAF9F6' : '#ccc',
                    border: step < s.num ? '2px solid #ddd' : 'none',
                    transition: 'all .22s',
                  }}>
                    {step > s.num ? <CheckCircle size={13} /> : s.num}
                  </div>
                  <div style={{ fontSize: 8.5, fontWeight: 700, marginTop: 4, letterSpacing: '0.08em', textTransform: 'uppercase', color: step === s.num ? '#A67C52' : step > s.num ? '#1B3022' : '#ccc', transition: 'color .22s' }}>
                    {s.label}
                  </div>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ height: 2, flex: 1, background: step > s.num ? '#1B3022' : '#e8e8e8', marginBottom: 18, transition: 'background .22s' }} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Scrollable body ───────────────────────────────────────────────── */}
        <div className="bm-scroll" style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>

          {/* ── SUCCESS ─────────────────────────────────────────────────────── */}
          {submitted && (
            <div className="bm-step" style={{ textAlign: 'center', padding: '12px 0 6px' }}>
              <div style={{ width: 68, height: 68, background: 'rgba(27,48,34,0.08)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <CheckCircle size={34} color="#1B3022" />
              </div>
              <p style={{ fontSize: 12, color: '#888', lineHeight: 1.75, maxWidth: 330, margin: '0 auto 18px' }}>
                Your reservation is pending payment. Go to <strong>Payments</strong> to upload your GCash proof and receive your QR entry ticket.
              </p>

              {/* Summary card */}
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
                <div style={{ marginTop: 8, fontSize: 11, color: '#999' }}>
                  📅 {bookingDate} &nbsp;·&nbsp; ⏰ {scheduleTime}
                </div>
                {confirmedBookingId && (
                  <div style={{ marginTop: 6, fontSize: 10, color: '#bbb', fontFamily: 'monospace' }}>
                    ID: {confirmedBookingId}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 14 }}>
                <button
                  className="bm-ghost-btn"
                  onClick={reset}
                >
                  <Plus size={12} /> New Booking
                </button>
                <button
                  className="bm-primary-btn"
                  onClick={reset}
                >
                  <QrCode size={13} /> View Payments
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 1: Activities ───────────────────────────────────────────── */}
          {!submitted && step === 1 && (
            <div className="bm-step">
              <p style={{ fontSize: 11, color: '#999', lineHeight: 1.7, marginBottom: 14 }}>
                Pick one or more river activities, set guest counts, then click <strong style={{ color: '#1B3022' }}>Add Activities</strong>.
              </p>

              {/* Picker box */}
              <div style={{ background: '#fff', border: '1px solid rgba(27,48,34,0.1)', borderRadius: 7, padding: 14, marginBottom: 14 }}>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.18em', color: '#888', textTransform: 'uppercase', marginBottom: 8 }}>Select Activity</div>

                {/* Dropdown */}
                <div style={{ position: 'relative', marginBottom: 13 }}>
                  <select
                    value={pickerActId}
                    onChange={(e) => { setPickerActId(e.target.value); setPickerPrimary(1); setPickerSecondary(0); }}
                    style={{ width: '100%', appearance: 'none', border: '1.5px solid rgba(27,48,34,0.16)', borderRadius: 5, padding: '9px 32px 9px 11px', fontSize: 12, color: '#1B3022', background: '#FAF9F6', fontFamily: 'inherit', fontWeight: 500, cursor: 'pointer', outline: 'none' }}
                  >
                    {available.map((act) => (
                      <option key={act.id} value={act.id}>
                        {act.name} — {formatActivityPriceSummary(act)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#aaa', pointerEvents: 'none' }} />
                </div>

                {/* Qty row */}
                {pickerAct && (
                  <div style={{ display: 'grid', gridTemplateColumns: pickerAct.childRate > 0 ? '1fr 1fr' : '1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: '#A67C52', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 7 }}>
                        {getPrimaryGuestLabel(pickerAct)} {pickerAct.adultRate > 0 && <span style={{ color: '#999' }}>· ₱{pickerAct.adultRate}</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button className="bm-qty" onClick={() => setPickerPrimary(Math.max(0, pickerPrimary - 1))}>−</button>
                        <span style={{ fontSize: 15, fontWeight: 800, width: 22, textAlign: 'center', color: '#1B3022' }}>{pickerPrimary}</span>
                        <button className="bm-qty" onClick={() => setPickerPrimary(pickerPrimary + 1)}>+</button>
                      </div>
                    </div>
                    {pickerAct.childRate > 0 && (
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: '#A67C52', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 7 }}>
                          {getSecondaryGuestLabel(pickerAct)} {pickerAct.childRate > 0 && <span style={{ color: '#999' }}>· ₱{pickerAct.childRate}</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button className="bm-qty" onClick={() => setPickerSecondary(Math.max(0, pickerSecondary - 1))}>−</button>
                          <span style={{ fontSize: 15, fontWeight: 800, width: 22, textAlign: 'center', color: '#1B3022' }}>{pickerSecondary}</span>
                          <button className="bm-qty" onClick={() => setPickerSecondary(pickerSecondary + 1)}>+</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <button
                  className="bm-add-btn"
                  onClick={addToCart}
                  disabled={!pickerAct || (pickerPrimary <= 0 && pickerSecondary <= 0)}
                >
                  <Plus size={13} /> Add Activities
                </button>
              </div>

              {/* Cart */}
              {cart.length > 0 ? (
                <div>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', color: '#888', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <ShoppingCart size={10} /> Your Cart ({cart.length} {cart.length === 1 ? 'item' : 'items'})
                  </div>
                  <div style={{ border: '1px solid rgba(27,48,34,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                    {cart.map((c, idx) => {
                      const act = activitiesList.find((a) => a.id === c.activityId);
                      if (!act) return null;
                      const line = calcLine(act, c.primaryQty, c.secondaryQty);
                      return (
                        <div key={c.activityId} style={{ padding: '11px 13px', background: idx % 2 === 0 ? '#fff' : '#FAF9F6', borderBottom: idx < cart.length - 1 ? '1px solid rgba(27,48,34,0.06)' : 'none' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#1B3022' }}>{act.name}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                              <span style={{ fontSize: 12, fontWeight: 800, fontFamily: 'monospace', color: '#1B3022' }}>₱{line.toLocaleString()}</span>
                              <button onClick={() => removeFromCart(c.activityId)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', padding: 0, display: 'flex', transition: 'color .15s' }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = '#e53e3e')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = '#ccc')}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span style={{ fontSize: 9, color: '#bbb', fontWeight: 700, textTransform: 'uppercase' }}>{getPrimaryGuestLabel(act)}</span>
                              <button className="bm-qty" style={{ width: 22, height: 22, fontSize: 12 }} onClick={() => updateQty(c.activityId, 'primaryQty', -1)}>−</button>
                              <span style={{ fontSize: 12, fontWeight: 800, width: 18, textAlign: 'center', color: '#1B3022' }}>{c.primaryQty}</span>
                              <button className="bm-qty" style={{ width: 22, height: 22, fontSize: 12 }} onClick={() => updateQty(c.activityId, 'primaryQty', 1)}>+</button>
                            </div>
                            {act.childRate > 0 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ fontSize: 9, color: '#bbb', fontWeight: 700, textTransform: 'uppercase' }}>{getSecondaryGuestLabel(act)}</span>
                                <button className="bm-qty" style={{ width: 22, height: 22, fontSize: 12 }} onClick={() => updateQty(c.activityId, 'secondaryQty', -1)}>−</button>
                                <span style={{ fontSize: 12, fontWeight: 800, width: 18, textAlign: 'center', color: '#1B3022' }}>{c.secondaryQty}</span>
                                <button className="bm-qty" style={{ width: 22, height: 22, fontSize: 12 }} onClick={() => updateQty(c.activityId, 'secondaryQty', 1)}>+</button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 2px 0', fontSize: 13, fontWeight: 800, color: '#1B3022' }}>
                    <span>Activities Subtotal</span>
                    <span style={{ fontFamily: 'monospace' }}>₱{activitiesTotal.toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '22px 0', color: '#ccc', fontSize: 12 }}>
                  <ShoppingCart size={30} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.5 }} />
                  Add at least one activity to continue
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Cottage ──────────────────────────────────────────────── */}
          {!submitted && step === 2 && (
            <div className="bm-step">
              <p style={{ fontSize: 11, color: '#999', lineHeight: 1.7, marginBottom: 14 }}>
                Add a riverside cottage to your booking, or skip to continue with activities only.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* None option */}
                <div className={`bm-cot ${cottageName === 'None' ? 'selected' : ''}`} onClick={() => setCottageName('None')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>No Cottage</div>
                      <div style={{ fontSize: 11, marginTop: 2, opacity: 0.65 }}>Activities only — no cabin add-on</div>
                    </div>
                    {cottageName === 'None' && <CheckCircle size={16} color="#A67C52" />}
                  </div>
                </div>

                {/* Cottage options */}
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

          {/* ── STEP 3: Schedule ─────────────────────────────────────────────── */}
          {!submitted && step === 3 && (
            <div className="bm-step">
              <p style={{ fontSize: 11, color: '#999', lineHeight: 1.7, marginBottom: 16 }}>
                Choose your visit date and preferred boarding time slot.
              </p>

              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', color: '#888', textTransform: 'uppercase', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Calendar size={10} /> Visit Date
                </div>
                <input
                  type="date"
                  required
                  min={today}
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  style={{ width: '100%', border: '1.5px solid rgba(27,48,34,0.16)', borderRadius: 5, padding: '10px 12px', fontSize: 12, color: '#1B3022', background: '#FAF9F6', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s' }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#A67C52')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(27,48,34,0.16)')}
                />
              </div>

              <div>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', color: '#888', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Clock size={10} /> Boarding Time
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {TIME_SLOTS.map((slot) => (
                    <div key={slot} className={`bm-timeslot ${scheduleTime === slot ? 'active' : ''}`} onClick={() => setScheduleTime(slot)}>
                      {slot}
                    </div>
                  ))}
                </div>
              </div>

              {bookingDate && (
                <div style={{ marginTop: 14, padding: '9px 13px', background: 'rgba(27,48,34,0.05)', border: '1px solid rgba(27,48,34,0.1)', borderRadius: 5, fontSize: 11, color: '#555', display: 'flex', gap: 12 }}>
                  <span>📅 {new Date(bookingDate + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <span>⏰ {scheduleTime}</span>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 4: Confirm ──────────────────────────────────────────────── */}
          {!submitted && step === 4 && (
            <div className="bm-step">
              <p style={{ fontSize: 11, color: '#999', lineHeight: 1.7, marginBottom: 14 }}>
                Review everything below. Hit <strong style={{ color: '#1B3022' }}>Confirm & Book</strong> to submit your reservation.
              </p>

              {/* Activities breakdown */}
              <div style={{ background: '#fff', border: '1px solid rgba(27,48,34,0.09)', borderRadius: 7, padding: '12px 14px', marginBottom: 8 }}>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.15em', color: '#A67C52', textTransform: 'uppercase', marginBottom: 9 }}>Activities</div>
                {cart.map((c) => {
                  const act = activitiesList.find((a) => a.id === c.activityId);
                  if (!act) return null;
                  return (
                    <div key={c.activityId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6, color: '#444' }}>
                      <span>
                        {act.name}
                        <span style={{ color: '#bbb', marginLeft: 6 }}>
                          {c.primaryQty > 0 && `${c.primaryQty}×${getPrimaryGuestLabel(act)}`}
                          {c.secondaryQty > 0 && `, ${c.secondaryQty}×${getSecondaryGuestLabel(act)}`}
                        </span>
                      </span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1B3022' }}>₱{calcLine(act, c.primaryQty, c.secondaryQty).toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>

              {/* Cottage */}
              {cottageName !== 'None' && (
                <div style={{ background: '#fff', border: '1px solid rgba(27,48,34,0.09)', borderRadius: 7, padding: '12px 14px', marginBottom: 8 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.15em', color: '#A67C52', textTransform: 'uppercase', marginBottom: 7 }}>Cottage Add-on</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#444' }}>
                    <span>⛺ {cottageName}</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1B3022' }}>₱{cottageRate.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Schedule */}
              <div style={{ background: '#fff', border: '1px solid rgba(27,48,34,0.09)', borderRadius: 7, padding: '12px 14px', marginBottom: 10 }}>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.15em', color: '#A67C52', textTransform: 'uppercase', marginBottom: 7 }}>Schedule</div>
                <div style={{ fontSize: 12, color: '#444', marginBottom: 3 }}>
                  📅 {new Date(bookingDate + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                <div style={{ fontSize: 12, color: '#444' }}>⏰ {scheduleTime}</div>
              </div>

              {/* Grand total banner */}
              <div style={{ background: '#1B3022', borderRadius: 7, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 3 }}>Grand Total (PHP)</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 24, fontWeight: 800, color: '#A67C52' }}>₱{grandTotal.toLocaleString()}</div>
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', textAlign: 'right', maxWidth: 130, lineHeight: 1.6 }}>
                  Eco Heritage Tax<br />included. Pay via GCash<br />after confirmation.
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ── Footer nav ────────────────────────────────────────────────────── */}
        {!submitted && (
          <div style={{ borderTop: '1px solid rgba(27,48,34,0.07)', padding: '14px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', flexShrink: 0 }}>
            <button
              className="bm-ghost-btn"
              onClick={() => step > 1 ? setStep(step - 1) : reset()}
            >
              <ArrowLeft size={12} />
              {step === 1 ? 'Cancel' : 'Back'}
            </button>

            {step < 4 ? (
              <button
                className="bm-primary-btn"
                onClick={() => canNext() && setStep(step + 1)}
                disabled={!canNext()}
              >
                {step === 1
                  ? `Continue — ${cart.length} ${cart.length === 1 ? 'activity' : 'activities'}`
                  : step === 2
                  ? 'Next — Set Schedule'
                  : 'Review Booking'}
                <ArrowRight size={12} />
              </button>
            ) : (
              <button
                className="bm-confirm-btn"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.35)', borderTop: '2px solid #fff', borderRadius: '50%', display: 'inline-block', animation: 'bm-spin 0.75s linear infinite' }} />
                    Submitting…
                  </>
                ) : (
                  <><CheckCircle size={13} /> Confirm &amp; Book</>
                )}
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}