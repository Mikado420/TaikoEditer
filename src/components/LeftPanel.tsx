import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Zap,
  Activity,
  Maximize2,
  Clock,
  Sparkles,
  AlignLeft,
} from 'lucide-react';
import { ChartEvent } from '../types/chart';

interface LeftPanelProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  events: ChartEvent[];
  onJumpToEvent: (event: ChartEvent) => void;
  onAddEventClick: () => void;
  onDeleteEvent: (eventId: string) => void;
}

export const LeftPanel: React.FC<LeftPanelProps> = ({
  isOpen,
  onToggleOpen,
  events,
  onJumpToEvent,
  onAddEventClick,
  onDeleteEvent,
}) => {
  if (!isOpen) {
    return (
      <div className="bg-[#181818] border-r border-[#3A3A3A] flex flex-col items-center py-2 shrink-0 z-10 w-7">
        <button
          onClick={onToggleOpen}
          className="p-1 text-gray-400 hover:text-white hover:bg-[#2A2A2A] rounded transition"
          title="左パネルを展開 (15%)"
        >
          <ChevronRight size={16} />
        </button>
        <div className="mt-4 [writing-mode:vertical-rl] text-[10px] tracking-widest text-gray-500 font-semibold uppercase">
          Synchronization & Events
        </div>
      </div>
    );
  }

  // Group events by category or sorted list
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
    <aside className="w-[18%] min-w-[140px] max-w-[220px] bg-[#181818] border-r border-[#3A3A3A] flex flex-col shrink-0 text-xs z-10 select-none overflow-hidden safe-pl">
      {/* Header */}
      <div className="h-9 px-2 bg-[#202020] border-b border-[#3A3A3A] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 font-bold text-gray-300 text-[11px]">
          <Activity size={13} className="text-[#FF5A36]" />
          <span>イベント一覧</span>
          <span className="text-[10px] text-gray-500 font-normal">({events.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onAddEventClick}
            className="p-1 bg-[#FF5A36] hover:bg-[#ff6f4f] text-white rounded transition active:scale-95"
            title="イベント追加"
          >
            <Plus size={13} />
          </button>
          <button
            onClick={onToggleOpen}
            className="p-1 text-gray-400 hover:text-white hover:bg-[#2A2A2A] rounded transition"
            title="左パネルを折りたたむ"
          >
            <ChevronLeft size={16} />
          </button>
        </div>
      </div>

      {/* Categories Bar */}
      <div className="px-2 py-1.5 bg-[#1C1C1C] border-b border-[#2A2A2A] flex flex-wrap gap-1 text-[10px] text-gray-400 font-medium shrink-0">
        <span className="px-1 bg-[#282828] rounded">BPM</span>
        <span className="px-1 bg-[#282828] rounded">SCROLL</span>
        <span className="px-1 bg-[#282828] rounded">MEASURE</span>
        <span className="px-1 bg-[#282828] rounded">GOGO</span>
        <span className="px-1 bg-[#282828] rounded">DELAY</span>
      </div>

      {/* Event List */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
        {sortedEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-[11px]">
            イベントなし
            <br />
            <button
              onClick={onAddEventClick}
              className="mt-2 text-[#FF5A36] hover:underline"
            >
              + イベントを追加
            </button>
          </div>
        ) : (
          sortedEvents.map((ev) => (
            <div
              key={ev.id}
              onClick={() => onJumpToEvent(ev)}
              className="group flex items-center justify-between p-1.5 rounded bg-[#222222] hover:bg-[#2C2C2C] border border-[#303030] cursor-pointer transition"
            >
              <div className="flex flex-col min-w-0 pr-1">
                <div className="flex items-center gap-1 mb-0.5">
                  <span
                    className={`text-[9px] font-semibold px-1 rounded border ${getBadgeColor(
                      ev.type
                    )}`}
                  >
                    M{ev.measureIndex + 1} #
                    {(ev.positionInMeasure * 100).toFixed(0)}%
                  </span>
                </div>
                <span className="font-semibold text-gray-200 truncate text-[11px]">
                  {getEventText(ev)}
                </span>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteEvent(ev.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-rose-400 hover:bg-rose-950/40 rounded transition shrink-0"
                title="削除"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
};
