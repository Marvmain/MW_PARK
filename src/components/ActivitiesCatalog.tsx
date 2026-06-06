import React, { useState } from 'react';
import { 
  Compass, 
  TrendingUp, 
  Clock, 
  ArrowRight, 
  Search, 
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { Activity } from '../types';
import { formatActivityPriceShort } from '../activityPricing';
import { ACTIVITIES_DATA } from '../activitiesData';

interface ActivitiesCatalogProps {
  onSelectActivity: (activity: Activity) => void;
  isLoggedIn: boolean;
  onInstantBook?: (activityName: Activity['name']) => void;
  activities?: Activity[];
}

export default function ActivitiesCatalog({ 
  onSelectActivity, 
  isLoggedIn,
  onInstantBook,
  activities
}: ActivitiesCatalogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');

  const sourceData = activities || ACTIVITIES_DATA;

  // Filter activities based on query and selected difficulty filter
  const filteredActivities = sourceData.filter(act => {
    const matchesSearch = act.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          act.tagline.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          act.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDifficulty = selectedDifficulty === 'All' || act.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesDifficulty;
  });

  const difficulties = ['All', 'Easy', 'Moderate', 'Challenging', 'Extreme'];

  const difficultyColors = {
    Easy: 'bg-emerald-50 text-emerald-800 border-emerald-100',
    Moderate: 'bg-sky-50 text-sky-800 border-sky-100',
    Challenging: 'bg-amber-50 text-amber-800 border-amber-100',
    Extreme: 'bg-red-50 text-red-800 border-red-100'
  };

  return (
    <div className="space-y-6">
      
      {/* Search and Filters Ribbon - Beautiful Editorial Styling */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 border border-[#1B3022]/10">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search adventures (e.g. trekking, rapids)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-[#1B3022]/15 bg-transparent rounded-sm text-xs font-light tracking-wide focus:outline-none focus:border-[#A67C52] text-[#1B3022]"
          />
        </div>

        {/* Filter Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 flex items-center gap-1">
            <SlidersHorizontal className="h-3 w-3" />
            <span>Difficulty:</span>
          </span>
          <div className="flex flex-wrap gap-1.5">
            {difficulties.map(d => (
              <button
                key={d}
                onClick={() => setSelectedDifficulty(d)}
                className={`px-3 py-1 text-[10px] tracking-wider rounded transition-all font-medium uppercase ${
                  selectedDifficulty === d 
                    ? 'bg-[#1B3022] text-[#FAF9F6] font-semibold' 
                    : 'bg-stone-100 text-gray-500 hover:bg-stone-200'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Adventure Packages */}
      {filteredActivities.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-[#1B3022]/10 bg-white/50 rounded p-6">
          <Compass className="h-10 w-10 text-slate-300 mx-auto animate-pulse mb-3" />
          <h5 className="font-serif text-base font-bold">No Matching Adventures Found</h5>
          <p className="text-xs text-gray-500 mt-1">Try refining your search text or selecting a different difficulty filter constraint.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredActivities.map((act) => (
            <div 
              key={act.id} 
              className="bg-white border border-[#1B3022]/10 hover:border-[#1B3022]/30 transition-all flex flex-col sm:flex-row group shadow-sm overflow-hidden"
            >
              {/* Product Thumbnail Block (Left) */}
              <div className="relative sm:w-5/12 h-44 sm:h-auto bg-stone-100 overflow-hidden shrink-0">
                <img 
                  src={act.image} 
                  alt={act.name}
                  referrerPolicy="no-referrer"
                  className={`w-full h-full object-cover opacity-90 group-hover:scale-105 group-hover:opacity-100 transition-all duration-700 mix-blend-luminosity group-hover:mix-blend-normal ${act.disabled ? 'grayscale brightness-50' : ''}`}
                />
                
                {/* Difficulty tag left block overlay */}
                <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
                  <span className={`inline-block px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest border rounded bg-white/95 shadow-sm ${difficultyColors[act.difficulty as keyof typeof difficultyColors] || 'text-stone-800 bg-white'}`}>
                    {act.difficulty}
                  </span>
                  {act.disabled && (
                    <span className="inline-block px-2 py-0.5 text-[8px] font-black uppercase tracking-widest bg-red-600 text-white rounded shadow-sm">
                      ⚠️ CLosed
                    </span>
                  )}
                </div>
              </div>

              {/* Specification overview card content (Right) */}
              <div className="flex-1 p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-gray-400">
                    <span className="font-mono text-[9px] tracking-widest uppercase">
                      {act.duration}
                    </span>
                    <span className="text-[10px] font-medium text-[#A67C52] tracking-tight">
                      {formatActivityPriceShort(act)}
                    </span>
                  </div>
                  
                  <h4 className="font-serif text-lg font-bold text-[#1B3022] group-hover:text-[#A67C52] transition-colors leading-tight flex items-center justify-between">
                    <span>{act.name}</span>
                    {act.disabled && <span className="text-red-600 text-[10px] uppercase font-sans font-extrabold px-1.5 py-0.5 bg-red-50 border border-red-200 rounded">Suspended</span>}
                  </h4>
                  
                  <p className="text-xs font-light text-gray-500 leading-relaxed line-clamp-2">
                    {act.description}
                  </p>
                </div>

                {/* Foot Action Panel */}
                <div className="pt-3 border-t border-[#1B3022]/0 flex items-center justify-between gap-3 flex-wrap">
                  <button
                    onClick={() => onSelectActivity(act)}
                    className="text-xs font-bold text-[#1B3022] hover:text-[#A67C52] transition-colors flex items-center gap-1 group/btn"
                  >
                    <span>View Specifications</span>
                    <ChevronRight className="h-3.5 w-3.5 group-hover/btn:translate-x-1 transition-transform" />
                  </button>

                  {onInstantBook && (
                    act.disabled ? (
                      <span className="px-2.5 py-1 bg-red-50 border border-red-200 text-red-700 text-[9px] font-extrabold uppercase tracking-wide rounded">
                        ⚠️ CLOSED
                      </span>
                    ) : (
                      <button
                        onClick={() => onInstantBook(act.name)}
                        className="px-3.5 py-1.5 bg-[#1B3022] hover:bg-[#A67C52] text-white text-[10px] font-semibold uppercase tracking-wider transition-colors"
                      >
                        {isLoggedIn ? 'Book Entry' : 'Unlock & Book'}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Footnote Banner */}
      <div className="text-center bg-[#1B3022]/5 p-4 border border-[#1B3022]/10 rounded-sm">
        <p className="text-[10px] text-gray-500 font-light leading-relaxed">
          🌲 <strong>CONSERVATION COMMITMENT:</strong> Under the Pandan Watershed Management Protection Act, 5% of all client registration proceeds are directly deposited to local river stewardship programs and stilt habitat safety maintenance.
        </p>
      </div>

    </div>
  );
}
