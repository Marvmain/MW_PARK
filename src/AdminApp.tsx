import { useState } from 'react';
import { Activity, Cottage } from './types';
import { COTTAGES_DATA } from './cottagesData';
import { loadActivitiesFromStorage } from './activityPricing';
import AdminWorkstation from './components/AdminWorkstation';

export default function AdminApp() {
  const [activitiesList, setActivitiesList] = useState<Activity[]>(loadActivitiesFromStorage);

  const [cottagesList, setCottagesList] = useState<Cottage[]>(() => {
    const saved = localStorage.getItem('mw_cottages_data');
    return saved ? JSON.parse(saved) : COTTAGES_DATA;
  });

  const [sysMessage, setSysMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showMsg = (text: string, type: 'success' | 'error') => {
    setSysMessage({ text, type });
    setTimeout(() => setSysMessage(null), 6000);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1B3022]">
      {sysMessage && (
        <div className="fixed top-4 left-1/2 z-50 w-full max-w-md -translate-x-1/2 px-4">
          <div className={`rounded-lg border p-4 text-sm shadow-xl ${
            sysMessage.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-red-200 bg-red-50 text-red-900'
          }`}>
            {sysMessage.text}
          </div>
        </div>
      )}

      <AdminWorkstation
        onClose={() => { window.location.href = '/'; }}
        showMsg={showMsg}
        token={null}
        activities={activitiesList}
        onUpdateActivities={(acts) => {
          setActivitiesList(acts);
          localStorage.setItem('mw_activities_data', JSON.stringify(acts));
        }}
        cottages={cottagesList}
        onUpdateCottages={(cots) => {
          setCottagesList(cots);
          localStorage.setItem('mw_cottages_data', JSON.stringify(cots));
        }}
      />
    </div>
  );
}
