import React from 'react';
import { RefreshCw, X } from 'lucide-react';

interface UpdateBannerProps {
  newWorker: ServiceWorker | null;
  onDismiss: () => void;
}

export const UpdateBanner: React.FC<UpdateBannerProps> = ({ newWorker, onDismiss }) => {
  if (!newWorker) return null;

  const handleReload = () => {
    newWorker.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  };

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 bg-[#252525] border border-[#FF5A36] rounded-xl shadow-2xl px-4 py-2.5 flex items-center gap-3 animate-bounce max-w-sm">
      <RefreshCw size={18} className="text-[#FF5A36] animate-spin shrink-0" />
      <div className="flex-1 text-xs">
        <div className="font-bold text-white">新しいバージョンがあります</div>
        <div className="text-[10px] text-gray-400">アプリを最新の状態に更新できます</div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleReload}
          className="px-2.5 py-1 bg-[#FF5A36] hover:bg-[#E04826] text-white text-xs font-bold rounded transition active:scale-95"
        >
          再読み込み
        </button>
        <button
          onClick={onDismiss}
          className="p-1 text-gray-400 hover:text-white rounded hover:bg-[#333333] transition"
          title="あとで"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
