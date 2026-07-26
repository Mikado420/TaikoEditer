import React, { useEffect, useState } from 'react';
import { X, Copy, Check, Save, FileCode, PlayCircle } from 'lucide-react';
import { TaikoChart } from '../types/chart';
import { exportToTja } from '../parser/tjaExporter';
import { parseTja } from '../parser/tjaParser';

interface TjaSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  chart: TaikoChart;
  onApplyTja: (newChart: TaikoChart) => void;
  currentMeasureIndex: number;
}

export const TjaSourceModal: React.FC<TjaSourceModalProps> = ({
  isOpen,
  onClose,
  chart,
  onApplyTja,
  currentMeasureIndex,
}) => {
  const [tjaText, setTjaText] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [hasError, setHasError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTjaText(exportToTja(chart));
      setHasError(null);
    }
  }, [isOpen, chart]);

  if (!isOpen) return null;

  const handleSave = () => {
    try {
      const parsed = parseTja(tjaText);
      onApplyTja(parsed);
      setHasError(null);
      onClose();
    } catch (err: any) {
      setHasError(err?.message || 'TJA構文の解析に失敗しました');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(tjaText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 select-none animate-fade-in">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-3xl h-[85vh] bg-[#181818] border border-[#383838] rounded-xl flex flex-col shadow-2xl z-10 overflow-hidden text-xs">
        {/* Header */}
        <div className="h-12 px-4 bg-[#202020] border-b border-[#383838] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 font-bold text-gray-200 text-sm">
            <FileCode size={18} className="text-[#FF5A36]" />
            <span>TJA Source (TJAソースエディタ)</span>
            <span className="ml-2 px-2 py-0.5 bg-[#333333] border border-[#444] rounded text-[11px] text-amber-300 font-mono flex items-center gap-1">
              <PlayCircle size={12} />
              現在位置: M{currentMeasureIndex + 1}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1 bg-[#282828] hover:bg-[#333] text-gray-200 rounded-lg transition border border-[#3A3A3A] active:scale-95 text-[11px]"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? 'コピー完了' : 'コピー'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-white hover:bg-[#333] rounded-lg transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Text Area */}
        <div className="flex-1 relative bg-[#0D0D0D] p-3 overflow-hidden flex flex-col">
          <textarea
            value={tjaText}
            onChange={(e) => setTjaText(e.target.value)}
            spellCheck={false}
            className="w-full h-full bg-transparent text-emerald-400 font-mono text-xs leading-relaxed focus:outline-none resize-none custom-scrollbar p-2"
          />
        </div>

        {/* Error message banner */}
        {hasError && (
          <div className="px-4 py-2 bg-red-950/80 border-t border-red-800 text-red-300 font-semibold text-[11px]">
            {hasError}
          </div>
        )}

        {/* Footer */}
        <div className="h-12 px-4 bg-[#202020] border-t border-[#383838] flex items-center justify-between shrink-0">
          <span className="text-[11px] text-gray-400">
            TJAソースを直接編集して譜面に即時反映できます。
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-[#282828] hover:bg-[#333] text-gray-300 rounded-lg transition font-semibold"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#FF5A36] hover:bg-[#ff6f4f] text-white rounded-lg transition font-bold shadow-lg active:scale-95"
            >
              <Save size={14} />
              <span>保存・即時反映</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
