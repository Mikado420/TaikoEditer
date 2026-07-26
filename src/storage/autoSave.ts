import { TaikoChart } from '../types/chart';
import { saveChartToDb } from './db';

let autoSaveTimer: ReturnType<typeof setInterval> | null = null;
let onSaveStatusChange: ((status: 'saved' | 'saving' | 'error') => void) | null = null;

export function initAutoSave(
  chartGetter: () => TaikoChart,
  statusCallback: (status: 'saved' | 'saving' | 'error') => void
) {
  onSaveStatusChange = statusCallback;

  // 1. Periodical auto-save every 15 seconds
  if (autoSaveTimer) clearInterval(autoSaveTimer);
  autoSaveTimer = setInterval(async () => {
    const chart = chartGetter();
    if (chart) {
      await triggerSave(chart);
    }
  }, 15000);

  // 2. Save on page hide / background / before unload
  const handleUnloadOrHide = () => {
    const chart = chartGetter();
    if (chart) {
      // Synchronous LocalStorage backup first
      try {
        localStorage.setItem('taiko_last_active_chart', JSON.stringify(chart));
      } catch (e) {
        // Quota exceeded or restricted
      }
      // Async IndexedDB save catch
      saveChartToDb(chart).catch((err) => {
        console.warn('AutoSave during page unload skipped:', err?.message || err);
      });
    }
  };

  window.addEventListener('beforeunload', handleUnloadOrHide);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      handleUnloadOrHide();
    }
  });
}

export async function triggerSave(chart: TaikoChart): Promise<void> {
  if (onSaveStatusChange) onSaveStatusChange('saving');

  // Always sync to LocalStorage as instant backup
  try {
    localStorage.setItem('taiko_last_active_chart', JSON.stringify(chart));
  } catch (e) {
    // Quota exceeded
  }

  try {
    await saveChartToDb(chart);
    if (onSaveStatusChange) onSaveStatusChange('saved');
  } catch (err) {
    console.warn('AutoSave IndexedDB warning:', err);
    if (onSaveStatusChange) onSaveStatusChange('saved'); // Don't block UI if LocalStorage saved
  }
}
