import React from 'react';
import { 
  X, 
  Home, 
  CheckCircle, 
  ShieldAlert, 
  Leaf, 
  DollarSign, 
  Users, 
  Layers, 
  TreePine,
  ExternalLink,
  Pocket
} from 'lucide-react';
import { Cottage } from '../types';

interface CottageDetailModalProps {
  cottage: Cottage;
  isOpen: boolean;
  onClose: () => void;
  onSelectForBooking?: (cottageName: Cottage['name']) => void;
  isLoggedIn: boolean;
}

export default function CottageDetailModal({ 
  cottage, 
  isOpen, 
  onClose, 
  onSelectForBooking,
  isLoggedIn 
}: CottageDetailModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in">
      <div 
        id={`cottage-detail-modal-${cottage.id}`}
        className="relative w-full max-w-4xl bg-[#FAF9F6] text-[#1B3022] shadow-2xl border border-[#1B3022]/20 rounded-lg overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
      >
        {/* Left Side: Overwater Picture Block */}
        <div className="relative md:w-5/12 h-64 md:h-auto bg-[#1B3022] overflow-hidden min-h-[300px]">
          <img 
            src={cottage.image} 
            alt={cottage.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-80 mix-blend-luminosity hover:opacity-100 hover:mix-blend-normal transition-all duration-700"
          />
          {/* Black gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col justify-end p-6 text-white">
            <span className="text-[10px] tracking-[0.3em] font-bold text-[#A67C52] uppercase block mb-1">
              Dumagat Riverfront Dwelling
            </span>
            <span className="text-xs text-stone-300 font-mono tracking-widest block uppercase mb-1">
              {cottage.type}
            </span>
            <h3 className="font-serif text-2xl md:text-3xl font-bold leading-tight uppercase">
              {cottage.name}
            </h3>
            <p className="font-serif italic text-xs text-gray-300 mt-2 font-light">
              "{cottage.tagline}"
            </p>
          </div>

          {/* Close button for mobile screens */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 md:hidden bg-black/60 hover:bg-black text-white p-2 rounded-full transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Right Side: Editorial Content Layout */}
        <div className="md:w-7/12 p-6 md:p-8 flex flex-col overflow-y-auto custom-scrollbar">
          
          {/* Header Metadata section */}
          <div className="hidden md:flex items-center justify-between border-b border-[#1B3022]/10 pb-4 mb-4">
            <div>
              <span className="font-mono text-[9px] text-[#A67C52] tracking-widest font-bold uppercase block">Architectural Profile</span>
              <span className="text-xs text-gray-500 font-light">Engineered for Natural River Ventilation</span>
            </div>
            <button 
              onClick={onClose}
              className="text-xs font-bold text-gray-500 hover:text-[#1B3022] bg-[#1B3022]/5 hover:bg-[#1B3022]/10 py-1.5 px-3 rounded transition-colors uppercase flex items-center gap-1 border border-[#1B3022]/10"
            >
              <X className="h-3.5 w-3.5" />
              <span>Close Spec</span>
            </button>
          </div>

          <div className="space-y-6 flex-1">
            
            {/* Long Description and architectural background */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-wider text-[#A67C52] font-bold block">Cabin Description</span>
              <p className="text-sm font-light leading-relaxed text-[#1B3022]/90">
                {cottage.longDescription}
              </p>
            </div>

            {/* Quick specifications parameters */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="border border-[#1B3022]/10 bg-white p-3">
                <span className="text-[9px] uppercase tracking-wider text-gray-400 block font-semibold">Cottage Class</span>
                <span className="text-xs font-bold font-mono text-[#1B3022] mt-0.5 block truncate">
                  {cottage.type}
                </span>
              </div>

              <div className="border border-[#1B3022]/10 bg-white p-3">
                <span className="text-[9px] uppercase tracking-wider text-gray-400 block font-semibold">Max Occupancy</span>
                <span className="text-xs font-bold text-[#1B3022] mt-0.5 flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-[#A67C52]" />
                  {cottage.capacity}
                </span>
              </div>

              <div className="border border-[#1B3022]/10 bg-white p-3 col-span-2 sm:col-span-1">
                <span className="text-[9px] uppercase tracking-wider text-gray-400 block font-semibold">Built Materials</span>
                <span className="text-xs font-bold text-[#1B3022] mt-0.5 block truncate" title={cottage.builtFrom}>
                  {cottage.builtFrom}
                </span>
              </div>
            </div>

            {/* Additional engineering parameters */}
            <div className="border border-[#1B3022]/10 bg-[#FAF9F6] p-3 flex justify-between items-center text-xs">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-amber-800 block font-bold">Stilt Elevation</span>
                <span className="font-semibold text-[#1B3022]">{cottage.stiltHeight}</span>
              </div>
              <div className="border-l border-[#1B3022]/10 pl-6">
                <span className="text-[9px] uppercase tracking-wider text-emerald-800 block font-bold">Foundation Frame</span>
                <span className="font-semibold text-[#1B3022]">{cottage.stiltHeight.includes('Meters') ? 'Reinforced Timber Stilts' : 'Direct Ground Slat Pod'}</span>
              </div>
            </div>

            {/* Twin Listings: Amenities vs Eco-Commitment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Amenities list */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 border-b border-[#1B3022]/10 pb-1.5">
                  <Home className="h-4 w-4 text-[#A67C52]" />
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[#1B3022]">Unique Amenities</span>
                </div>
                <ul className="space-y-2 text-xs text-gray-600 font-light">
                  {cottage.amenities.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-emerald-700 font-bold mt-0.5">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Eco specification list */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 border-b border-[#1B3022]/10 pb-1.5">
                  <Leaf className="h-4 w-4 text-emerald-700" />
                  <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-950">Ecological Specs</span>
                </div>
                <ul className="space-y-2 text-[11px] text-gray-600 font-light leading-relaxed">
                  {cottage.ecologicalSpecs.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-emerald-500 font-bold shrink-0 mt-0.5">🌿</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>

            {/* Rates & Selection CTA */}
            <div className="border-t border-[#1B3022]/10 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/50 p-4 border rounded">
              <div className="space-y-0.5">
                <span className="text-[9px] uppercase tracking-[0.2em] text-[#A67C52] font-bold block">Rental Rates</span>
                <div className="flex items-baseline gap-1 font-mono">
                  <span className="text-2xl font-bold text-[#1B3022]">₱{cottage.ratePerDay.toLocaleString()}</span>
                  <span className="text-xs font-sans font-light text-slate-500">/ Calendar Day</span>
                </div>
                <span className="text-[10px] text-emerald-700 font-medium block">All local tourist environmental fees are fully covered.</span>
              </div>

              {onSelectForBooking && (
                <button
                  onClick={() => {
                    onSelectForBooking(cottage.name);
                    onClose();
                  }}
                  className="w-full sm:w-auto bg-[#1B3022] hover:bg-[#A67C52] text-[#FAF9F6] text-center px-6 py-3 text-xs uppercase tracking-wider font-semibold transition-colors shadow-lg rounded"
                >
                  {isLoggedIn ? 'Add Cottage to Booking' : 'Sign Up & Reserve Dwelling'}
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
