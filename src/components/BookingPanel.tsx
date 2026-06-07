import React, { useState, useCallback } from 'react';
import {
  ArrowRight,
  Plus,
  Trash2,
  ShoppingCart,
  ChevronDown,
  Home,
} from 'lucide-react';
import { Activity, Cottage, ActivityName, CartItem } from '../types';
import { getPrimaryGuestLabel, getSecondaryGuestLabel, formatActivityPriceSummary } from '../activityPricing';

interface BookingPanelProps {
  activitiesList: Activity[];
  cottagesList: Cottage[];
  onSubmit: (payload: {
    cartItems: CartItem[];
    cottageName: string;
    bookingDate: string;
    scheduleTime: '08:00 AM' | '10:30 AM' | '01:30 PM' | '04:00 PM';
    totalAmount: number;
    // legacy compat — first item in cart
    activityName: ActivityName;
    numberOfAdults: number;
    numberOfChildren: number;
  }) => Promise<void>;
  isSubmitting: boolean;
  onBrowseCottages: () => void;
}

const COTTAGE_RATES: Record<string, number> = {
  'Riverfront Canopy Cabana': 1500,
  'Dumagat Stilt Lodge': 2800,
  'Forest Canopy Treehouse': 2000,
  'Pandan Bamboo Shelter': 800,
  None: 0,
};

function calcLineTotal(act: Activity, primary: number, secondary: number): number {
  return primary * act.adultRate + secondary * act.childRate;
}

export default function BookingPanel({
  activitiesList,
  cottagesList,
  onSubmit,
  isSubmitting,
  onBrowseCottages,
}: BookingPanelProps) {
  const availableActivities = activitiesList.filter((a) => !a.disabled);

  // Cart: array of { activityId, primaryQty, secondaryQty }
  const [cart, setCart] = useState<
    { activityId: string; primaryQty: number; secondaryQty: number }[]
  >([]);

  // Activity picker
  const [pickerActivityId, setPickerActivityId] = useState<string>(
    availableActivities[0]?.id ?? ''
  );
  const [pickerPrimary, setPickerPrimary] = useState(1);
  const [pickerSecondary, setPickerSecondary] = useState(0);

  // Booking meta
  const [cottageName, setCottageName] = useState<string>('None');
  const [bookingDate, setBookingDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState<
    '08:00 AM' | '10:30 AM' | '01:30 PM' | '04:00 PM'
  >('08:00 AM');

  const pickerActivity = availableActivities.find((a) => a.id === pickerActivityId);

  const addToCart = useCallback(() => {
    if (!pickerActivity) return;
    if (pickerPrimary <= 0 && pickerSecondary <= 0) return;
    setCart((prev) => {
      // merge if same activity already in cart
      const idx = prev.findIndex((c) => c.activityId === pickerActivityId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          primaryQty: next[idx].primaryQty + pickerPrimary,
          secondaryQty: next[idx].secondaryQty + pickerSecondary,
        };
        return next;
      }
      return [...prev, { activityId: pickerActivityId, primaryQty: pickerPrimary, secondaryQty: pickerSecondary }];
    });
    setPickerPrimary(1);
    setPickerSecondary(0);
  }, [pickerActivity, pickerActivityId, pickerPrimary, pickerSecondary]);

  const removeFromCart = (activityId: string) => {
    setCart((prev) => prev.filter((c) => c.activityId !== activityId));
  };

  const updateCartQty = (activityId: string, field: 'primaryQty' | 'secondaryQty', delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.activityId !== activityId) return c;
          const next = { ...c, [field]: Math.max(0, c[field] + delta) };
          return next;
        })
        .filter((c) => c.primaryQty > 0 || c.secondaryQty > 0)
    );
  };

  // Totals
  const activitiesTotal = cart.reduce((sum, c) => {
    const act = activitiesList.find((a) => a.id === c.activityId);
    if (!act) return sum;
    return sum + calcLineTotal(act, c.primaryQty, c.secondaryQty);
  }, 0);
  const cottageRate = COTTAGE_RATES[cottageName] ?? 0;
  const grandTotal = activitiesTotal + cottageRate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (!bookingDate) return;

    const cartItems: CartItem[] = cart.map((c) => {
      const act = activitiesList.find((a) => a.id === c.activityId)!;
      return {
        activityName: act.name,
        primaryQty: c.primaryQty,
        secondaryQty: c.secondaryQty,
        lineTotal: calcLineTotal(act, c.primaryQty, c.secondaryQty),
      };
    });

    const firstActivity = activitiesList.find((a) => a.id === cart[0].activityId)!;
    const totalAdults = cart.reduce((s, c) => s + c.primaryQty, 0);
    const totalChildren = cart.reduce((s, c) => s + c.secondaryQty, 0);

    await onSubmit({
      cartItems,
      cottageName,
      bookingDate,
      scheduleTime,
      totalAmount: grandTotal,
      activityName: firstActivity.name,
      numberOfAdults: totalAdults,
      numberOfChildren: totalChildren,
    });

    setCart([]);
    setBookingDate('');
    setCottageName('None');
  };

  return (
    <div className="border border-[#1B3022]/10 bg-white p-6 space-y-6">
      <div>
        <h3 className="font-serif text-xl text-[#1B3022] border-b border-[#1B3022]/10 pb-2">
          New River Reservation
        </h3>
        <p className="text-[11px] text-gray-500 mt-1">
          Add multiple activities to your cart, then set your date and confirm.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── ACTIVITY PICKER ─────────────────────────────── */}
        <div className="bg-[#FAF9F6] border border-[#1B3022]/10 rounded p-4 space-y-3">
          <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">
            Add Activity
          </span>

          {/* Activity dropdown */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-semibold text-gray-400 block">Select Activity</label>
            <div className="relative">
              <select
                value={pickerActivityId}
                onChange={(e) => {
                  setPickerActivityId(e.target.value);
                  setPickerPrimary(1);
                  setPickerSecondary(0);
                }}
                className="w-full appearance-none rounded border border-[#1B3022]/20 bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-[#A67C52] focus:outline-none pr-8"
              >
                {availableActivities.map((act) => (
                  <option key={act.id} value={act.id}>
                    {act.name} — {formatActivityPriceSummary(act)}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Qty row */}
          {pickerActivity && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-semibold text-gray-400 block">
                  {getPrimaryGuestLabel(pickerActivity)}
                  <span className="ml-1 text-[#A67C52]">₱{pickerActivity.adultRate}</span>
                </label>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setPickerPrimary(Math.max(0, pickerPrimary - 1))}
                    className="h-7 w-7 rounded border border-[#1B3022]/20 text-xs font-bold hover:bg-[#1B3022]/5 flex items-center justify-center">−</button>
                  <span className="text-xs font-bold w-4 text-center">{pickerPrimary}</span>
                  <button type="button" onClick={() => setPickerPrimary(pickerPrimary + 1)}
                    className="h-7 w-7 rounded border border-[#1B3022]/20 text-xs font-bold hover:bg-[#1B3022]/5 flex items-center justify-center">+</button>
                </div>
              </div>

              {pickerActivity.childRate > 0 && (
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-semibold text-gray-400 block">
                    {getSecondaryGuestLabel(pickerActivity)}
                    <span className="ml-1 text-[#A67C52]">₱{pickerActivity.childRate}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setPickerSecondary(Math.max(0, pickerSecondary - 1))}
                      className="h-7 w-7 rounded border border-[#1B3022]/20 text-xs font-bold hover:bg-[#1B3022]/5 flex items-center justify-center">−</button>
                    <span className="text-xs font-bold w-4 text-center">{pickerSecondary}</span>
                    <button type="button" onClick={() => setPickerSecondary(pickerSecondary + 1)}
                      className="h-7 w-7 rounded border border-[#1B3022]/20 text-xs font-bold hover:bg-[#1B3022]/5 flex items-center justify-center">+</button>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={addToCart}
            disabled={!pickerActivity || (pickerPrimary <= 0 && pickerSecondary <= 0)}
            className="w-full flex items-center justify-center gap-2 bg-[#1B3022] hover:bg-[#A67C52] disabled:opacity-40 text-white py-2 text-[10px] uppercase tracking-wider font-bold rounded transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add to Cart
          </button>
        </div>

        {/* ── CART ───────────────────────────────────────── */}
        {cart.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-[#A67C52]" />
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                Cart ({cart.length} {cart.length === 1 ? 'activity' : 'activities'})
              </span>
            </div>

            <div className="divide-y divide-[#1B3022]/5 border border-[#1B3022]/10 rounded bg-white">
              {cart.map((c) => {
                const act = activitiesList.find((a) => a.id === c.activityId);
                if (!act) return null;
                const lineTotal = calcLineTotal(act, c.primaryQty, c.secondaryQty);
                return (
                  <div key={c.activityId} className="p-3 flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#1B3022]">{act.name}</span>
                        <span className="font-mono text-xs font-bold text-emerald-800">₱{lineTotal.toLocaleString()}</span>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        {/* Primary qty control */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-gray-400 uppercase">{getPrimaryGuestLabel(act)}</span>
                          <button type="button" onClick={() => updateCartQty(c.activityId, 'primaryQty', -1)}
                            className="h-5 w-5 rounded border border-[#1B3022]/20 text-[10px] font-bold hover:bg-[#1B3022]/5 flex items-center justify-center">−</button>
                          <span className="text-xs font-bold w-3 text-center">{c.primaryQty}</span>
                          <button type="button" onClick={() => updateCartQty(c.activityId, 'primaryQty', 1)}
                            className="h-5 w-5 rounded border border-[#1B3022]/20 text-[10px] font-bold hover:bg-[#1B3022]/5 flex items-center justify-center">+</button>
                        </div>

                        {/* Secondary qty control (only if activity has a secondary rate) */}
                        {act.childRate > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] text-gray-400 uppercase">{getSecondaryGuestLabel(act)}</span>
                            <button type="button" onClick={() => updateCartQty(c.activityId, 'secondaryQty', -1)}
                              className="h-5 w-5 rounded border border-[#1B3022]/20 text-[10px] font-bold hover:bg-[#1B3022]/5 flex items-center justify-center">−</button>
                            <span className="text-xs font-bold w-3 text-center">{c.secondaryQty}</span>
                            <button type="button" onClick={() => updateCartQty(c.activityId, 'secondaryQty', 1)}
                              className="h-5 w-5 rounded border border-[#1B3022]/20 text-[10px] font-bold hover:bg-[#1B3022]/5 flex items-center justify-center">+</button>
                          </div>
                        )}
                      </div>
                    </div>

                    <button type="button" onClick={() => removeFromCart(c.activityId)}
                      className="text-gray-300 hover:text-red-600 transition-colors mt-0.5 shrink-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── COTTAGE ADD-ON ──────────────────────────────── */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-[10px] uppercase font-semibold text-gray-500 block">Cottage Add-on (Optional)</label>
            <button type="button" onClick={onBrowseCottages}
              className="text-[9px] text-[#A67C52] hover:underline font-bold flex items-center gap-0.5 focus:outline-none">
              <Home className="h-2.5 w-2.5" />
              Browse specs
            </button>
          </div>
          <select
            value={cottageName}
            onChange={(e) => setCottageName(e.target.value)}
            className="w-full rounded border border-[#1B3022]/20 bg-transparent px-3 py-2 text-xs focus:ring-1 focus:ring-[#A67C52] focus:outline-none"
          >
            <option value="None">None (No Cottage Rental)</option>
            {cottagesList.filter((c) => !c.disabled).map((c) => (
              <option key={c.id} value={c.name}>
                {c.name} (+₱{c.ratePerDay.toLocaleString()} / Day)
              </option>
            ))}
          </select>
        </div>

        {/* ── DATE & TIME ─────────────────────────────────── */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-semibold text-gray-500 block">Booking Date</label>
          <input
            type="date"
            required
            value={bookingDate}
            onChange={(e) => setBookingDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full rounded border border-[#1B3022]/20 bg-transparent px-3 py-1.5 text-xs focus:ring-1 focus:ring-[#A67C52] focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase font-semibold text-gray-500 block">Time Slot</label>
          <div className="grid grid-cols-2 gap-2">
            {(['08:00 AM', '10:30 AM', '01:30 PM', '04:00 PM'] as const).map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => setScheduleTime(slot)}
                className={`px-2 py-1.5 text-[10px] font-semibold border rounded transition-all text-center ${
                  scheduleTime === slot
                    ? 'bg-[#1B3022] text-white border-[#1B3022]'
                    : 'bg-transparent text-gray-600 border-[#1B3022]/10 hover:bg-[#1B3022]/5'
                }`}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>

        {/* ── PRICE BREAKDOWN ─────────────────────────────── */}
        {(cart.length > 0 || cottageName !== 'None') && (
          <div className="bg-[#FAF9F6] p-3 border border-dashed border-[#1B3022]/20 space-y-2">
            <span className="text-[9px] uppercase tracking-wide text-gray-400 font-bold block">
              Cost Breakdown (PHP)
            </span>

            {cart.map((c) => {
              const act = activitiesList.find((a) => a.id === c.activityId);
              if (!act) return null;
              return (
                <div key={c.activityId} className="space-y-0.5">
                  <div className="flex justify-between text-xs text-gray-600 font-medium">
                    <span>{act.name}</span>
                    <span>₱{calcLineTotal(act, c.primaryQty, c.secondaryQty).toLocaleString()}</span>
                  </div>
                  {c.primaryQty > 0 && (
                    <div className="flex justify-between text-[10px] text-gray-400 pl-2">
                      <span>{getPrimaryGuestLabel(act)} ×{c.primaryQty} @ ₱{act.adultRate}</span>
                      <span>₱{(c.primaryQty * act.adultRate).toLocaleString()}</span>
                    </div>
                  )}
                  {c.secondaryQty > 0 && act.childRate > 0 && (
                    <div className="flex justify-between text-[10px] text-gray-400 pl-2">
                      <span>{getSecondaryGuestLabel(act)} ×{c.secondaryQty} @ ₱{act.childRate}</span>
                      <span>₱{(c.secondaryQty * act.childRate).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              );
            })}

            {cottageName !== 'None' && (
              <div className="flex justify-between text-xs text-gray-600">
                <span>{cottageName}</span>
                <span>₱{cottageRate.toLocaleString()}</span>
              </div>
            )}

            <div className="flex justify-between text-xs font-semibold text-gray-600">
              <span>Heritage Eco Tax</span>
              <span className="text-emerald-700">INCLUDED</span>
            </div>

            <div className="border-t border-[#1B3022]/10 pt-2 flex justify-between text-sm font-bold text-[#1B3022]">
              <span>Grand Total:</span>
              <span className="text-base font-serif">₱{grandTotal.toLocaleString()}</span>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || cart.length === 0 || !bookingDate}
          className="w-full bg-[#1B3022] hover:bg-[#2A4533] disabled:opacity-40 text-white py-3 text-xs uppercase tracking-wider font-bold transition-all flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              <span>
                {cart.length === 0
                  ? 'Add activities to cart'
                  : `Confirm ${cart.length} ${cart.length === 1 ? 'activity' : 'activities'} — ₱${grandTotal.toLocaleString()}`}
              </span>
              {cart.length > 0 && <ArrowRight className="h-4 w-4" />}
            </>
          )}
        </button>

      </form>
    </div>
  );
}