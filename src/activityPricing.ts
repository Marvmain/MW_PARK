import { Activity } from './types';
import { ACTIVITIES_DATA } from './activitiesData';

export function loadActivitiesFromStorage(): Activity[] {
  const saved = localStorage.getItem('mw_activities_data');
  if (!saved) return ACTIVITIES_DATA;

  try {
    const parsed = JSON.parse(saved) as Activity[];
    const expectedIds = new Set(ACTIVITIES_DATA.map((activity) => activity.id));
    const isCurrentCatalog =
      parsed.length === ACTIVITIES_DATA.length &&
      parsed.every((activity) => expectedIds.has(activity.id));

    return isCurrentCatalog ? parsed : ACTIVITIES_DATA;
  } catch {
    return ACTIVITIES_DATA;
  }
}

export function formatActivityPriceSummary(activity: Activity): string {
  if (activity.adultRate === 0 && activity.childRate === 0) return 'Free';

  const primary = activity.primaryRateLabel || 'Adult';
  const secondary = activity.secondaryRateLabel || 'Child';

  if (activity.adultRate === activity.childRate) {
    return `₱${activity.adultRate.toLocaleString()} ${primary}`;
  }

  return `₱${activity.adultRate.toLocaleString()} (${primary}), ₱${activity.childRate.toLocaleString()} (${secondary})`;
}

export function formatActivityPriceShort(activity: Activity): string {
  if (activity.adultRate === 0 && activity.childRate === 0) return 'Free';
  if (activity.adultRate === activity.childRate) return `₱${activity.adultRate}`;
  return `₱${activity.adultRate} / ₱${activity.childRate}`;
}

export function getPrimaryGuestLabel(activity: Activity | undefined): string {
  return activity?.primaryRateLabel || 'Adults';
}

export function getSecondaryGuestLabel(activity: Activity | undefined): string {
  return activity?.secondaryRateLabel || 'Children (Ages 5-17)';
}
