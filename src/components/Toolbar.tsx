import React, { useState } from 'react';
import {
  Undo,
  Redo,
  Play,
  Pause,
  Grid,
  ZoomIn,
  FastForward,
  SlidersHorizontal,
} from 'lucide-react';
import { NoteType, SnapValue, ZoomValue } from '../types/chart';
import { audioEngine } from '../audio/audioEngine';
import { NoteIcon } from './NoteIcon';

interface ToolbarProps {
  selectedNoteType: NoteType;
  onSelectNoteType: (type: NoteType) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  snap: SnapValue;
  onChangeSnap: (snap: SnapValue) => void;
  zoom: ZoomValue;
  onChangeZoom: (zoom: ZoomValue) => void;
  playbackSpeed: number;
  onChangeSpeed: (speed: number) => void;
  onOpenLeftDrawer?: () => void;
  onOpenRightDrawer?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  selectedNoteType,
  onSelectNoteType,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isPlaying,
  onTogglePlay,
  snap,
  onChangeSnap,
  zoom,
  onChangeZoom,
  playbackSpeed,
  onChangeSpeed,
  onOpenLeftDrawer,
  onOpenRightDrawer,
}) => {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [showSettingsPopover, setShowSettingsPopover] = useState<boolean>(false);

  const notesList: { type: NoteType; name: string }[] = [
    { type: 1, name: 'ドン' },
    { type: 2, name: 'カッ' },
    { type: 3, name: '大ドン' },
    { type: 4, name: '大カッ' },
    { type: 5, name: '連打' },
    { type: 6, name: '大連打' },
    { type: 7, name: '風船' },
  ];

  const handleNoteClick = (type: NoteType) => {
    onSelectNoteType(type);
    audioEngine.playHitSound(type);
  };

  const handleTouchStart = (name: string) => {
    setActiveTooltip(name);
  };

  const handleTouchEnd = () => {
    setTimeout(() => setActiveTooltip(null), 1200);
  };

  return (
    <div className="h-14 bg-[#141414]/95 backdrop-blur-md border-t border-[#333333] px-2 flex items-center justify-between gap-2 shrink-0 select-none safe-pb safe-pl safe-pr relative z-30">
      {/* Tooltip Overlay */}
      {activeTooltip && (
        <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-[#282828] text-amber-400 border border-amber-500/40 px-3 py-1 rounded-full text-[11px] font-bold shadow-lg animate-fade-in pointer-events-none">
          {activeTooltip}
        </div>
      )}

      {/* Left: Quick Undo / Redo */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`p-2 rounded-xl bg-[#222222] border border-[#333333] transition active:scale-95 ${
            canUndo ? 'hover:bg-[#2A2A2A] text-gray-200' : 'text-gray-600 border-transparent cursor-not-allowed'
          }`}
          title="元に戻す"
        >
          <Undo size={16} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`p-2 rounded-xl bg-[#222222] border border-[#333333] transition active:scale-95 ${
            canRedo ? 'hover:bg-[#2A2A2A] text-gray-200' : 'text-gray-600 border-transparent cursor-not-allowed'
          }`}
          title="やり直し"
        >
          <Redo size={16} />
        </button>
      </div>

      {/* Center: Note Selection Icons (Visual ONLY - No Text Labels unless Long Pressed) */}
      <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 overflow-x-auto custom-scrollbar px-1 py-1">
        {notesList.map((item) => {
          const isSelected = selectedNoteType === item.type;
          return (
            <button
              key={item.type}
              onClick={() => handleNoteClick(item.type)}
              onTouchStart={() => handleTouchStart(item.name)}
              onTouchEnd={handleTouchEnd}
              onMouseEnter={() => setActiveTooltip(item.name)}
              onMouseLeave={() => setActiveTooltip(null)}
              className={`p-1.5 rounded-2xl transition-all duration-150 flex items-center justify-center shrink-0 active:scale-90 relative ${
                isSelected
                  ? 'bg-[#333333] ring-2 ring-[#FF5A36] shadow-lg scale-110 -translate-y-0.5'
                  : 'bg-[#202020] hover:bg-[#2A2A2A] opacity-80 hover:opacity-100'
              }`}
            >
              <NoteIcon type={item.type} size={28} />
            </button>
          );
        })}
      </div>

      {/* Right: Play / Settings Popover */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Play / Pause */}
        <button
          onClick={onTogglePlay}
          className={`p-2 rounded-xl font-bold text-white transition active:scale-95 flex items-center justify-center ${
            isPlaying ? 'bg-amber-600' : 'bg-[#FF5A36] hover:bg-[#FF451A]'
          }`}
          title={isPlaying ? '一時停止' : '再生'}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
        </button>

        {/* Snap/Zoom/Speed Settings Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowSettingsPopover(!showSettingsPopover)}
            className={`p-2 rounded-xl bg-[#222222] border transition active:scale-95 ${
              showSettingsPopover
                ? 'bg-[#333333] border-[#FF5A36] text-[#FF5A36]'
                : 'border-[#333333] text-gray-300 hover:bg-[#2A2A2A]'
            }`}
            title="グリッド・ズーム設定"
          >
            <SlidersHorizontal size={16} />
          </button>

          {/* Popover Card */}
          {showSettingsPopover && (
            <div className="absolute bottom-12 right-0 bg-[#1E1E1E] border border-[#3A3A3A] p-3 rounded-2xl shadow-2xl w-52 flex flex-col gap-2.5 text-xs z-50 animate-fade-in">
              <div className="flex items-center justify-between border-b border-[#2C2C2C] pb-1.5 font-bold text-gray-300">
                <span>グリッド & 表示設定</span>
                <span className="text-[10px] text-gray-500">Tap outside to close</span>
              </div>

              {/* Snap */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-gray-300">
                  <Grid size={14} className="text-amber-400" />
                  <span>スナップ:</span>
                </div>
                <select
                  value={snap}
                  onChange={(e) => onChangeSnap(parseInt(e.target.value, 10))}
                  className="bg-[#2B2B2B] border border-[#3A3A3A] rounded px-2 py-0.5 text-gray-200 focus:outline-none font-semibold text-xs cursor-pointer"
                >
                  {[1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64].map((s) => (
                    <option key={s} value={s}>
                      1/{s}分
                    </option>
                  ))}
                </select>
              </div>

              {/* Zoom */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-gray-300">
                  <ZoomIn size={14} className="text-sky-400" />
                  <span>ズーム:</span>
                </div>
                <select
                  value={zoom}
                  onChange={(e) => onChangeZoom(parseFloat(e.target.value) as ZoomValue)}
                  className="bg-[#2B2B2B] border border-[#3A3A3A] rounded px-2 py-0.5 text-gray-200 focus:outline-none font-semibold text-xs cursor-pointer"
                >
                  {[0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 4.0, 8.0].map((z) => (
                    <option key={z} value={z}>
                      {(z * 100).toFixed(0)}%
                    </option>
                  ))}
                </select>
              </div>

              {/* Playback Speed */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-gray-300">
                  <FastForward size={14} className="text-emerald-400" />
                  <span>再生速度:</span>
                </div>
                <select
                  value={playbackSpeed}
                  onChange={(e) => onChangeSpeed(parseFloat(e.target.value))}
                  className="bg-[#2B2B2B] border border-[#3A3A3A] rounded px-2 py-0.5 text-gray-200 focus:outline-none font-semibold text-xs cursor-pointer"
                >
                  {[0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((sp) => (
                    <option key={sp} value={sp}>
                      {sp}x
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
