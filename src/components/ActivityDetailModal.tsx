import React from 'react';
import { 
  X, 
  Clock, 
  Compass, 
  ShieldCheck, 
  Award, 
  Luggage, 
  HelpCircle,
  TrendingUp,
  UserCheck
} from 'lucide-react';
import { Activity } from '../types';
import { formatActivityPriceSummary } from '../activityPricing';

interface ActivityDetailModalProps {
  activity: Activity;
  isOpen: boolean;
  onClose: () => void;
  onSelectForBooking?: (activityName: Activity['name']) => void;
  isLoggedIn: boolean;
}

export default function ActivityDetailModal({ 
  activity, 
  isOpen, 
  onClose, 
  onSelectForBooking,
  isLoggedIn 
}: ActivityDetailModalProps) {
  if (!isOpen) return null;

  const difficultyColors = {
    Easy: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    Moderate: 'bg-sky-50 text-sky-800 border-sky-200',
    Challenging: 'bg-amber-50 text-amber-800 border-amber-200',
    Extreme: 'bg-red-50 text-red-800 border-red-200'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
      <div 
        id="activity-detail-modal"
        className="relative w-full max-w-4xl bg-[#FAF9F6] text-[#1B3022] shadow-2xl border border-[#1B3022]/20 rounded-lg overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
      >
        {/* Left Side: Editorial Image Block */}
        <div className="relative md:w-5/12 h-64 md:h-auto bg-[#1B3022] overflow-hidden min-h-[250px]">
          <img 
            src={activity.image} 
            alt={activity.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain object-center opacity-95 mix-blend-luminosity hover:opacity-100 hover:mix-blend-normal transition-all duration-700 bg-white"
          />
          {/* Black gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-6 text-white">
            <span className="text-[10px] tracking-[0.3em] font-bold text-[#A67C52] uppercase block mb-1">
              River Adventure Specs
            </span>
            <h3 className="font-serif text-2xl md:text-3xl font-bold leading-tight uppercase">
              {activity.name}
            </h3>
            <p className="font-serif italic text-xs text-gray-300 mt-2 font-light">
              "{activity.tagline}"
            </p>
          </div>

          {/* Close button for mobile */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 md:hidden bg-black/60 hover:bg-black text-white p-2 rounded-full transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Right Side: Editorial Metadata Content Grid */}
        <div className="md:w-7/12 p-6 md:p-8 flex flex-col overflow-y-auto custom-scrollbar">
          
          {/* Header Metadata Ribbon */}
          <div className="hidden md:flex items-center justify-between border-b border-[#1B3022]/10 pb-4 mb-4">
            <div>
              <span className="font-mono text-[9px] text-[#A67C52] tracking-widest font-bold uppercase block">Pandan Watershed</span>
              <span className="text-xs text-gray-500 font-light">Municipal Eco-Tourism Permit Certified</span>
            </div>
            <button 
              onClick={onClose}
              className="text-xs font-bold text-gray-500 hover:text-[#1B3022] bg-[#1B3022]/5 hover:bg-[#1B3022]/10 py-1.5 px-3 rounded transition-colors uppercase flex items-center gap-1 border border-[#1B3022]/10"
            >
              <X className="h-3.5 w-3.5" />
              <span>Close Entry</span>
            </button>
          </div>

          <div className="space-y-6 flex-1">
            
            {/* Extended Description */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-wider text-[#A67C52] font-bold block">Overview</span>
              <p className="text-sm font-light leading-relaxed text-[#1B3022]/90">
                {activity.longDescription}
              </p>
            </div>

            {/* Micro-Parameters Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="border border-[#1B3022]/10 bg-white p-2.5">
                <span className="text-[9px] uppercase tracking-wider text-gray-400 block font-semibold">Duration</span>
                <span className="text-xs font-bold font-mono text-[#1B3022] mt-0.5 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-[#A67C52]" />
                  {activity.duration}
                </span>
              </div>
             

              <div className="border border-[#1B3022]/10 bg-white p-2.5">
                <span className="text-[9px] uppercase tracking-wider text-gray-400 block font-semibold">Age Limit</span>
                <span className="text-xs font-bold text-[#1B3022] mt-0.5 flex items-center gap-0.5 truncate" title={activity.ageRequirement}>
                  <UserCheck className="h-3.5 w-3.5 text-[#A67C52] shrink-0" />
                  <span className="truncate">{activity.ageRequirement}</span>
                </span>
              </div>

              <div className="border border-[#1B3022]/10 bg-[#1B3022]/5 p-2.5">
                <span className="text-[9px] uppercase tracking-wider text-gray-500 block font-semibold">Best Departure</span>
                <span className="text-[10px] font-semibold text-[#1B3022] mt-0.5 leading-tight block">
                  {activity.bestTime}
                </span>
              </div>
            </div>

            {/* Side-by-Side: Highlights vs Safety Rules */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Highlights List */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 border-b border-[#1B3022]/10 pb-1.5">
                  <Award className="h-4 w-4 text-[#A67C52]" />
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[#1B3022]">WHAT'S INCLUDED</span>
                </div>
                <ul className="space-y-2 text-xs text-gray-600 font-light">
                  {activity.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-[#A67C52] font-bold mt-0.5">•</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Safety Regulations */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 border-b border-[#1B3022]/10 pb-1.5">
                  <ShieldCheck className="h-4 w-4 text-red-700" />
                  <span className="text-[10px] uppercase tracking-wider font-bold text-red-950">Safety Standards</span>
                </div>
                <ul className="space-y-2 text-[11px] text-gray-600 font-light leading-relaxed">
                  {activity.safetyGuidelines.map((s, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-red-500 font-bold shrink-0 mt-0.5">!</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>

            {/* Equipment Inventory */}
            <div className="border border-[#1B3022]/10 bg-white p-4 space-y-2.5">
              <div className="flex items-center gap-1.5">
                <Compass className="h-4 w-4 text-[#A67C52]" />
                <span className="text-[10px] uppercase tracking-wider font-bold">Standard Equipment Provided (Included in rate)</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                {activity.equipmentProvided.map((eq, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-700"></span>
                    <span>{eq}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Under-The-Hood Pricing Matrix & Booking CTA */}
            <div className="border-t border-[#1B3022]/10 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[9px] uppercase tracking-[0.2em] text-[#A67C52] font-bold block">Rate</span>
                <p className="text-lg font-bold font-mono text-[#1B3022]">
                  {formatActivityPriceSummary(activity)}
                </p>
              </div>

              {onSelectForBooking && (
                <button
                  onClick={() => {
                    onSelectForBooking(activity.name);
                    onClose();
                  }}
                  className="w-full sm:w-auto bg-[#1B3022] hover:bg-[#2A4533] text-[#FAF9F6] text-center px-6 py-3 text-xs uppercase tracking-wider font-semibold transition-colors shadow-lg"
                >
                  {isLoggedIn ? 'Book This Adventure' : 'Sign Up & Book Now'}
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
