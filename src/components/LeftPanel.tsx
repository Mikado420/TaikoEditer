import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Activity,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ChartEvent } from '../types/chart';
import { audioEngine } from '../audio/audioEngine';

interface LeftPanelProps {
  isOpen: boolean;
  onClose: () => void;
  events: ChartEvent[];
  onJumpToEvent: (event: ChartEvent) => void;
  onAddEventClick: () => void;
  onDeleteEvent: (eventId: string) => void;
}

export const LeftPanel: React.FC<LeftPanelProps> = ({
  isOpen,
  onClose,
  events,
  onJumpToEvent,
  onAddEventClick,
  onDeleteEvent,
}) => {
  const [sfxMuted, setSfxMuted] = useState(false);
  const [sfxVolume, setSfxVolume] = useState(0.8);

  if (!isOpen) return null;

  const handleMuteToggle = () => {
    const newMuted = !sfxMuted;
    setSfxMuted(newMuted);
    audioEngine.setSfxMuted(newMuted);
  };

  const handleVolumeChange = (vol: number) => {
    setSfxVolume(vol);
    audioEngine.setSfxVolume(vol);
  };

  const sortedEvents = [...events].sort((a, b) => {
    if (a.measureIndex !== b.measureIndex) return a.measureIndex - b.measureIndex;
    return a.positionInMeasure - b.positionInMeasure;
  });

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'BPMCHANGE':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'SCROLL':
        return 'bg-sky-500/20 text-sky-400 border-sky-500/40';
      case 'MEASURE':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'GOGOSTART':
      case 'GOGOEND':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
      case 'DELAY':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
      default:
        return 'bg-gray-700/50 text-gray-300 border-gray-600';
    }
  };

  const getEventText = (ev: ChartEvent) => {
    switch (ev.type) {
      case 'BPMCHANGE':
        return `BPM: ${ev.value}`;
      case 'SCROLL':
        return `SCROLL: ${ev.value}x`;
      case 'MEASURE':
        return `拍子: ${ev.numerator}/${ev.denominator}`;
      case 'DELAY':
        return `DELAY: ${ev.value}s`;
      case 'GOGOSTART':
        return 'ゴーゴー開始';
      case 'GOGOEND':
        return 'ゴーゴー終了';
      case 'BARLINEON':
        return '小節線表示';
      case 'BARLINEOFF':
        return '小節線非表示';
      case 'LYRIC':
        return `歌詞: ${ev.text}`;
      default:
        return ev.type;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex select-none animate-fade-in">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
      />

      {/* Slide-over Content Container */}
      <aside className="relative w-80 max-w-[85vw] h-full bg-[#181818] border-r border-[#3A3A3A] flex flex-col shadow-2xl z-10 text-xs safe-pl safe-pt safe-pb">
        {/* Header */}
        <div className="h-11 px-3 bg-[#202020] border-b border-[#3A3A3A] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 font-bold text-gray-200 text-sm">
            <Activity size={16} className="text-[#FF5A36]" />
            <span>環境・イベント管理</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white hover:bg-[#333333] rounded-lg transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Audio / SFX Settings Section */}
        <div className="p-3 bg-[#1F1F1F] border-b border-[#2D2D2D] space-y-2 shrink-0">
          <div className="flex items-center justify-between text-gray-300 font-bold text-xs">
            <div className="flex items-center gap-1.5">
              {sfxMuted ? (
                <VolumeX size={15} className="text-rose-400" />
              ) : (
                <Volume2 size={15} className="text-amber-400" />
              )}
              <span>打音 (SE) 設定</span>
            </div>
            <button
              onClick={handleMuteToggle}
              className={`px-2 py-0.5 rounded font-bold text-[10px] transition ${
                sfxMuted
                  ? 'bg-rose-950/60 border border-rose-600 text-rose-300'
                  : 'bg-emerald-950/60 border border-emerald-600 text-emerald-300'
              }`}
            >
              {sfxMuted ? '消音中 (OFF)' : '打音 (ON)'}
            </button>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] text-gray-400 w-12 font-medium">音量</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={sfxVolume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              disabled={sfxMuted}
              className="flex-1 accent-[#FF5A36] h-1.5 bg-[#333333] rounded-lg cursor-pointer"
            />
            <span className="text-[10px] text-gray-300 font-mono w-8 text-right">
              {Math.round(sfxVolume * 100)}%
            </span>
          </div>
        </div>

        {/* Events Sub-header */}
        <div className="px-3 py-2 bg-[#222222] border-b border-[#2A2A2A] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1 font-bold text-gray-300 text-xs">
            <span>譜面イベント一覧</span>
            <span className="text-[10px] text-gray-400 font-normal">({events.length})</span>
          </div>
          <button
            onClick={onAddEventClick}
            className="flex items-center gap-1 px-2 py-0.5 bg-[#FF5A36] hover:bg-[#ff6f4f] text-white font-bold rounded-lg transition active:scale-95 text-[11px] shadow"
          >
            <Plus size={12} />
            <span>追加</span>
          </button>
        </div>

        {/* Event List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
          {sortedEvents.length === 0 ? (
            <div className="text-center py-10 text-gray-500 text-xs">
              イベントがありません
              <br />
              <button
                onClick={onAddEventClick}
                className="mt-3 px-3 py-1 bg-[#262626] border border-[#383838] text-[#FF5A36] font-bold rounded-lg hover:bg-[#303030]"
              >
                + イベントを追加
              </button>
            </div>
          ) : (
            sortedEvents.map((ev) => (
              <div
                key={ev.id}
                onClick={() => {
                  onJumpToEvent(ev);
                  onClose();
                }}
                className="group flex items-center justify-between p-2 rounded-xl bg-[#222222] hover:bg-[#2C2C2C] border border-[#303030] cursor-pointer transition shadow-xs"
              >
                <div className="flex flex-col min-w-0 pr-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${getBadgeColor(
                        ev.type
                      )}`}
                    >
                      小節 {ev.measureIndex + 1} ({Math.round(ev.positionInMeasure * 100)}%)
                    </span>
                  </div>
                  <span className="font-bold text-gray-100 truncate text-xs">
                    {getEventText(ev)}
                  </span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteEvent(ev.id);
                  }}
                  className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition shrink-0"
                  title="削除"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
};
