import React from 'react';
import { Smartphone, Sparkles, Check, Download, Zap, MoveRight, Layers } from 'lucide-react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 select-none">
      <div className="bg-[#1C1C1C] border border-[#3A3A3A] rounded-xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#242424] to-[#1A1A1A] border-b border-[#3A3A3A] flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-bold text-white text-base">
            <div className="p-1.5 bg-[#FF5A36]/20 rounded-lg text-[#FF5A36]">
              <Sparkles size={20} />
            </div>
            <span>Taiko Chart Editor PWA へようこそ！</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs custom-scrollbar">
          {/* Welcome Intro */}
          <div className="bg-[#242424] p-3 rounded-lg border border-[#333333]">
            <p className="text-gray-200 leading-relaxed font-medium">
              本アプリは<span className="text-[#FF5A36] font-bold">ホーム画面追加型のPWA（Progressive Web App）</span>として設計されています。オフラインでも動作し、ネイティブアプリ感覚で太鼓譜面を編集できます。
            </p>
          </div>

          {/* Quick Features */}
          <div className="grid grid-cols-2 gap-2 text-gray-300">
            <div className="bg-[#222222] p-2.5 rounded border border-[#2D2D2D] flex items-center gap-2">
              <Zap size={16} className="text-amber-400 shrink-0" />
              <div>
                <div className="font-bold text-white text-[11px]">爆速・オフライン対応</div>
                <div className="text-[10px] text-gray-400">ネット環境がなくても編集可能</div>
              </div>
            </div>
            <div className="bg-[#222222] p-2.5 rounded border border-[#2D2D2D] flex items-center gap-2">
              <Layers size={16} className="text-sky-400 shrink-0" />
              <div>
                <div className="font-bold text-white text-[11px]">自動保存 & クラッシュ復元</div>
                <div className="text-[10px] text-gray-400">編集内容はIndexedDBへ常に保存</div>
              </div>
            </div>
          </div>

          {/* Touch Gestures Guide */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone size={14} className="text-[#FF5A36]" />
              <span>基本ジェスチャー & 操作</span>
            </h4>
            <div className="space-y-1.5 text-gray-300">
              <div className="bg-[#222222] px-3 py-2 rounded border border-[#2D2D2D] flex justify-between items-center">
                <span className="font-semibold text-white">タップ / ドラッグ</span>
                <span className="text-gray-400">ノーツ配置・移動・タイムライン移動</span>
              </div>
              <div className="bg-[#222222] px-3 py-2 rounded border border-[#2D2D2D] flex justify-between items-center">
                <span className="font-semibold text-white">2本指ピンチ (Zoom)</span>
                <span className="text-gray-400">タイムラインの拡大・縮小</span>
              </div>
              <div className="bg-[#222222] px-3 py-2 rounded border border-[#2D2D2D] flex justify-between items-center">
                <span className="font-semibold text-white">音源・TJAインポート</span>
                <span className="text-gray-400">上部メニューからファイル読み込み</span>
              </div>
            </div>
          </div>

          {/* PWA Home Screen Instructions */}
          <div className="bg-gradient-to-r from-amber-500/10 to-transparent p-3 rounded-lg border border-amber-500/30">
            <div className="flex items-center gap-2 text-amber-300 font-bold mb-1">
              <Download size={15} />
              <span>ホーム画面への追加（推奨）</span>
            </div>
            <p className="text-gray-300 text-[11px] leading-relaxed">
              Safari「共有」→「ホーム画面に追加」、またはChrome「アプリをインストール」を実行すると、フルスクリーン横画面のアプリとして起動できます。
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#242424] border-t border-[#3A3A3A] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#FF5A36] hover:bg-[#E04826] text-white font-bold rounded-lg transition flex items-center gap-1.5 shadow-lg active:scale-95"
          >
            <span>編集をはじめる</span>
            <Check size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
