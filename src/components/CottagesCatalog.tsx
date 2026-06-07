import React, { useState } from 'react';
import { 
  Search, 
  Home, 
  Users, 
  DollarSign, 
  ChevronRight, 
  Compass, 
  SlidersHorizontal,
  Waves,
  Sun,
  ShieldCheck
} from 'lucide-react';
import { Cottage } from '../types';
import { COTTAGES_DATA } from '../cottagesData';

interface CottagesCatalogProps {
  onSelectCottage: (cottage: Cottage) => void;
  isLoggedIn: boolean;
  onInstantBook?: (cottageName: Cottage['name']) => void;
  cottages?: Cottage[];
}

export default function CottagesCatalog({ 
  onSelectCottage, 
  isLoggedIn,
  onInstantBook,
  cottages
}: CottagesCatalogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [capacityFilter, setCapacityFilter] = useState<'All' | 'Small' | 'Large'>('All');

  const sourceData = cottages || COTTAGES_DATA;

  // Filter based on query and capacity brackets
  const filteredCottages = sourceData.filter(cot => {
    const matchesSearch = cot.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          cot.tagline.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          cot.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          cot.amenities.some(am => am.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Bracket definition: Small (<= 6 guests), Large (> 6 guests)
    const capValue = parseInt(cot.capacity.replace(/[^0-9]/g, ''), 10) || 6;
    let matchesCapacity = true;
    if (capacityFilter === 'Small') {
      matchesCapacity = capValue <= 6;
    } else if (capacityFilter === 'Large') {
      matchesCapacity = capValue > 6;
    }

    return matchesSearch && matchesCapacity;
  });

  return (
    <div className="space-y-6">
      
      {/* Search and Capacity Filtering Ribbon */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 border border-[#1B3022]/10 rounded shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search stilt cottages (e.g. hammock, solar, family)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-[#1B3022]/15 bg-transparent rounded-sm text-xs font-light tracking-wide focus:outline-none focus:border-[#A67C52] text-[#1B3022]"
          />
        </div>

        {/* Filter Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 flex items-center gap-1">
            <SlidersHorizontal className="h-3 w-3" />
            <span>Capacity Class:</span>
          </span>
          <div className="flex gap-1.5">
            {[
              { label: 'All Cottages', value: 'All' },
              { label: 'Micro & Friends (1-6 pax)', value: 'Small' },
              { label: 'Family & Corporate (7-12 pax)', value: 'Large' }
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => setCapacityFilter(tab.value as any)}
                className={`px-3 py-1.5 text-[10px] tracking-wider rounded transition-all font-medium uppercase ${
                  capacityFilter === tab.value 
                    ? 'bg-[#1B3022] text-[#FAF9F6] font-semibold' 
                    : 'bg-stone-100 text-gray-500 hover:bg-stone-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Cottages */}
      {filteredCottages.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-[#1B3022]/10 bg-white/50 rounded p-6">
          <Home className="h-10 w-10 text-slate-300 mx-auto animate-pulse mb-3" />
          <h5 className="font-serif text-base font-bold">No Matching Shuts or Cabanas</h5>
          <p className="text-xs text-gray-500 mt-1">Try resetting the keyword search or picking Another Capacity filter bracket.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredCottages.map((cot) => (
            <div 
              key={cot.id} 
              className="bg-white border border-[#1B3022]/10 hover:border-[#1B3022]/30 transition-all flex flex-col sm:flex-row group shadow-sm overflow-hidden rounded"
            >
              {/* Image Segment (Left) */}
              <div className="relative sm:w-5/12 h-44 sm:h-auto bg-stone-100 overflow-hidden shrink-0">
                <img 
                  src={cot.image} 
                  alt={cot.name}
                  referrerPolicy="no-referrer"
                  className={`w-full h-full object-cover opacity-90 group-hover:scale-105 group-hover:opacity-100 transition-all duration-700 mix-blend-luminosity group-hover:mix-blend-normal ${cot.disabled ? 'grayscale brightness-50' : ''}`}
                />
                
                {/* Elevation stilt badge */}
                <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
                  <span className="inline-block px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest border border-amber-200 text-amber-900 bg-amber-50/95 shadow-sm rounded">
                    {cot.stiltHeight}
                  </span>
                  {cot.disabled && (
                    <span className="inline-block px-2 py-0.5 text-[8px] font-black uppercase tracking-widest bg-red-600 text-white rounded shadow-sm">
                      ⚠️ OUT OF SERVICE
                    </span>
                  )}
                </div>
              </div>

              {/* Specification layout (Right) */}
              <div className="flex-1 p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-gray-400">
                    <span className="font-mono text-[9px] tracking-widest uppercase flex items-center gap-1 font-semibold">
                      <Users className="h-3 w-3 text-[#A67C52]" />
                      {cot.capacity}
                    </span>
                    <span className="text-[10px] font-bold text-[#A67C52] tracking-tight">
                      ₱{cot.ratePerDay} / Day
                    </span>
                  </div>
                  
                  <h4 className="font-serif text-lg font-bold text-[#1B3022] group-hover:text-[#A67C52] transition-colors leading-tight flex items-center justify-between">
                    <span>{cot.name}</span>
                    {cot.disabled && <span className="text-red-500 text-[10px] uppercase font-sans font-extrabold px-1.5 py-0.5 bg-red-50 border border-red-200 rounded">Suspended</span>}
                  </h4>
                  
                  <p className="text-xs font-light text-gray-500 leading-relaxed line-clamp-2">
                    {cot.description}
                  </p>

                  {/* Icon highlights */}
                  <div className="flex items-center gap-3 pt-2">
                    {cot.id === 'cot_canopy' && (
                      <span className="text-[9px] uppercase tracking-wide bg-sky-50 text-sky-800 px-1.5 py-0.5 border border-sky-200 rounded flex items-center gap-0.5 font-medium">
                        <Waves className="h-2.5 w-2.5" />
                        <span>Rapids Overhang</span>
                      </span>
                    )}
                    {cot.id === 'cot_lodge' && (
                      <span className="text-[9px] uppercase tracking-wide bg-amber-50 text-amber-800 px-1.5 py-0.5 border border-amber-200 rounded flex items-center gap-0.5 font-medium">
                        <Home className="h-2.5 w-2.5" />
                        <span>Duplex Deck</span>
                      </span>
                    )}
                    {cot.id === 'cot_treehouse' && (
                      <span className="text-[9px] uppercase tracking-wide bg-emerald-50 text-emerald-800 px-1.5 py-0.5 border border-emerald-200 rounded flex items-center gap-0.5 font-medium">
                        <Waves className="h-2.5 w-2.5" />
                        <span>Mango Canopy</span>
                      </span>
                    )}
                    {cot.id === 'cot_shelter' && (
                      <span className="text-[9px] uppercase tracking-wide bg-stone-50 text-stone-800 px-1.5 py-0.5 border border-stone-200 rounded flex items-center gap-0.5 font-medium">
                        <Waves className="h-2.5 w-2.5" />
                        <span>Wading Coves</span>
                      </span>
                    )}
                    <span className="text-[9px] uppercase tracking-wide bg-emerald-50/50 text-emerald-700 px-1.5 py-0.5 border border-emerald-200/50 rounded flex items-center gap-0.5 font-medium">
                      <Sun className="h-2.5 w-2.5 text-amber-500" />
                      <span>Solar Power</span>
                    </span>
                  </div>
                </div>

                {/* Bottom interactive navigation row */}
                <div className="pt-3 border-t border-[#1B3022]/5 flex items-center justify-between gap-3 flex-wrap">
                  <button
                    onClick={() => onSelectCottage(cot)}
                    className="text-xs font-bold text-[#1B3022] hover:text-[#A67C52] transition-colors flex items-center gap-1 group/btn"
                  >
                    <span>View Specifications</span>
                    <ChevronRight className="h-3.5 w-3.5 group-hover/btn:translate-x-1 transition-transform" />
                  </button>

                  {onInstantBook && (
                        cot.disabled ? (
                          <span className="px-2.5 py-1 bg-red-50 border border-red-200 text-red-700 text-[9px] font-extrabold uppercase tracking-wide rounded">
                            ⚠️ DEACTIVATED
                          </span>
                        ) : (
                          <span className="px-3.5 py-1.5 bg-green-50 border border-green-200 text-green-700 text-[10px] font-semibold uppercase tracking-wider rounded">
                            Available
                          </span>
                        )
                      )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Conservation Banner */}
      <div className="text-center bg-[#1B3022]/5 p-4 border border-[#1B3022]/10 rounded-sm">
        <p className="text-[10px] text-gray-500 font-light leading-relaxed">
          🍂 <strong>CULTURAL ARCHITECTURE RESERVATION:</strong> Every cottage structure uses authentic nipa, cogon thatch, and split structural rattan, sustainably harvested from certified community groves in Culasi and Pandan, Antique.
        </p>
      </div>

    </div>
  );
}
