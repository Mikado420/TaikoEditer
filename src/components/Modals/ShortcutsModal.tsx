import React from 'react';
import { X, HelpCircle, Keyboard, Smartphone, Touchpad } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 select-none">
      <div className="bg-[#1C1C1C] border border-[#3A3A3A] rounded-xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-4 py-3 bg-[#242424] border-b border-[#3A3A3A] flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-gray-200 text-sm">
            <HelpCircle size={16} className="text-[#FF5A36]" />
            <span>操作方法 & ショートカット</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded hover:bg-[#333333] transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4 custom-scrollbar text-xs">
          {/* Touch Gestures */}
          <div>
            <h4 className="text-[10px] uppercase font-bold text-[#FF5A36] mb-2 flex items-center gap-1">
              <Smartphone size={13} />
              <span>スマホ・タッチ操作 (Touch & Gestures)</span>
            </h4>
            <div className="space-y-1.5 text-gray-300">
              <div className="bg-[#222222] p-2 rounded border border-[#2D2D2D] flex justify-between">
                <span className="font-semibold text-white">1本指タップ (Tap)</span>
                <span className="text-gray-400">ノーツ配置 / シーク</span>
              </div>
              <div className="bg-[#222222] p-2 rounded border border-[#2D2D2D] flex justify-between">
                <span className="font-semibold text-white">1本指ドラッグ (Drag)</span>
                <span className="text-gray-400">ノーツ移動 / タイムラインスクロール</span>
              </div>
              <div className="bg-[#222222] p-2 rounded border border-[#2D2D2D] flex justify-between">
                <span className="font-semibold text-white">2本指ピンチ (Pinch Zoom)</span>
                <span className="text-gray-400">タイムライン拡大・縮小</span>
              </div>
              <div className="bg-[#222222] p-2 rounded border border-[#2D2D2D] flex justify-between">
                <span className="font-semibold text-white">削除ツールでタップ</span>
                <span className="text-gray-400">対象ノーツを削除</span>
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div>
            <h4 className="text-[10px] uppercase font-bold text-amber-400 mb-2 flex items-center gap-1">
              <Keyboard size={13} />
              <span>外部キーボード ショートカット (Keyboard)</span>
            </h4>
            <div className="space-y-1.5 text-gray-300">
              <div className="bg-[#222222] p-2 rounded border border-[#2D2D2D] flex justify-between">
                <span className="font-mono bg-[#181818] px-1.5 py-0.5 rounded border border-[#3A3A3A] text-gray-200">
                  Space
                </span>
                <span className="text-gray-400">再生 / 一時停止</span>
              </div>
              <div className="bg-[#222222] p-2 rounded border border-[#2D2D2D] flex justify-between">
                <span className="font-mono bg-[#181818] px-1.5 py-0.5 rounded border border-[#3A3A3A] text-gray-200">
                  Delete / Backspace
                </span>
                <span className="text-gray-400">選択中のノーツを削除</span>
              </div>
              <div className="bg-[#222222] p-2 rounded border border-[#2D2D2D] flex justify-between">
                <span className="font-mono bg-[#181818] px-1.5 py-0.5 rounded border border-[#3A3A3A] text-gray-200">
                  Ctrl + Z
                </span>
                <span className="text-gray-400">元に戻す (Undo)</span>
              </div>
              <div className="bg-[#222222] p-2 rounded border border-[#2D2D2D] flex justify-between">
                <span className="font-mono bg-[#181818] px-1.5 py-0.5 rounded border border-[#3A3A3A] text-gray-200">
                  Ctrl + Y
                </span>
                <span className="text-gray-400">やり直し (Redo)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
