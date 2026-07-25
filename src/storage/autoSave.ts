import { TaikoChart } from '../types/chart';
import { saveChartToDb } from './db';

let autoSaveTimer: ReturnType<typeof setInterval> | null = null;
let currentChartRef: TaikoChart | null = null;
let onSaveStatusChange: ((status: 'saved' | 'saving' | 'error') => void) | null = null;

export function initAutoSave(
  chartGetter: () => TaikoChart,
  statusCallback: (status: 'saved' | 'saving' | 'error') => void
) {
  onSaveStatusChange = statusCallback;

  // 1. Periodical auto-save every 30 seconds
  if (autoSaveTimer) clearInterval(autoSaveTimer);
  autoSaveTimer = setInterval(async () => {
    const chart = chartGetter();
    if (chart) {
      await triggerSave(chart);
    }
  }, 30000);

  // 2. Save on page hide / background / before unload
  const handleUnloadOrHide = () => {
    const chart = chartGetter();
    if (chart) {
      saveChartToDb(chart).catch((err) => console.error('AutoSave error:', err));
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
  currentChartRef = chart;
  if (onSaveStatusChange) onSaveStatusChange('saving');
  try {
    await saveChartToDb(chart);
    if (onSaveStatusChange) onSaveStatusChange('saved');
  } catch (err) {
    console.error('AutoSave failed:', err);
    if (onSaveStatusChange) onSaveStatusChange('error');
  }
}
