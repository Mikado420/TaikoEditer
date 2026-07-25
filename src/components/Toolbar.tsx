import React from 'react';
import {
  Undo,
  Redo,
  Play,
  Pause,
  Trash2,
  ZoomIn,
  Grid,
  FastForward,
} from 'lucide-react';
import { NoteType, SnapValue, ZoomValue } from '../types/chart';
import { audioEngine } from '../audio/audioEngine';

interface ToolbarProps {
  selectedNoteType: NoteType;
  onSelectNoteType: (type: NoteType) => void;
  activeTool: 'place' | 'select' | 'delete';
  onSelectTool: (tool: 'place' | 'select' | 'delete') => void;
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
}

export const Toolbar: React.FC<ToolbarProps> = ({
  selectedNoteType,
  onSelectNoteType,
  activeTool,
  onSelectTool,
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
  onChangeSpeed, }) => {
  const noteButtons: { type: NoteType; label: string; color: string; border: string }[] = [
    { type: 1, label: 'ドン', color: 'bg-[#FF3B30]', border: 'border-[#FF3B30]' },
    { type: 2, label: 'カッ', color: 'bg-[#00A2FF]', border: 'border-[#00A2FF]' },
    { type: 3, label: '大ドン', color: 'bg-[#FF3B30]', border: 'border-[#FF3B30]' },
    { type: 4, label: '大カッ', color: 'bg-[#00A2FF]', border: 'border-[#00A2FF]' },
    { type: 5, label: '連打', color: 'bg-[#FFCC00]', border: 'border-[#FFCC00]' },
    { type: 6, label: '大連打', color: 'bg-[#FFCC00]', border: 'border-[#FFCC00]' },
    { type: 7, label: '風船', color: 'bg-[#FF8800]', border: 'border-[#FF8800]' },
  ];

  const handleNoteClick = (type: NoteType) => {
    onSelectNoteType(type);
    onSelectTool('place');
    audioEngine.playHitSound(type);
  };

  return (
    <div className="h-12 bg-[#141414] border-t border-[#3A3A3A] px-2 flex items-center justify-between gap-1.5 shrink-0 select-none overflow-x-auto text-xs">
      {/* Note Type Buttons */}
      <div className="flex items-center gap-1 shrink-0">
        {noteButtons.map((btn) => {
          const isActive = activeTool === 'place' && selectedNoteType === btn.type;
          return (
            <button
              key={btn.type}
              onClick={() => handleNoteClick(btn.type)}
              className={`flex items-center gap-1 px-2 py-1 rounded-full border transition active:scale-95 ${
                isActive
                  ? 'bg-[#2A2A2A] text-white ring-2 ring-[#FF5A36] font-bold'
                  : 'bg-[#202020] hover:bg-[#2A2A2A] text-gray-300 border-[#333333]'
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full ${btn.color} shrink-0 shadow-sm`}
              />
              <span className="text-[11px] font-semibold whitespace-nowrap">
                {btn.label}
              </span>
            </button>
          );
        })}

        {/* Delete Tool */}
        <button
          onClick={() => onSelectTool('delete')}
          className={`flex items-center gap-1 px-2 py-1 rounded-full border transition active:scale-95 ${
            activeTool === 'delete'
              ? 'bg-rose-950/80 text-rose-300 border-rose-600 ring-2 ring-rose-500 font-bold'
              : 'bg-[#202020] hover:bg-[#2A2A2A] text-gray-400 border-[#333333]'
          }`}
        >
          <Trash2 size={13} className="text-rose-400" />
          <span className="text-[11px] font-semibold">削除</span>
        </button>
      </div>

      {/* Middle: Undo / Redo / Play */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`p-1.5 rounded bg-[#202020] transition active:scale-95 ${
            canUndo
              ? 'hover:bg-[#2A2A2A] text-gray-200'
              : 'text-gray-600 cursor-not-allowed'
          }`}
          title="元に戻す (Ctrl+Z)"
        >
          <Undo size={14} />
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`p-1.5 rounded bg-[#202020] transition active:scale-95 ${
            canRedo
              ? 'hover:bg-[#2A2A2A] text-gray-200'
              : 'text-gray-600 cursor-not-allowed'
          }`}
          title="やり直し (Ctrl+Y)"
        >
          <Redo size={14} />
        </button>

        <button
          onClick={onTogglePlay}
          className={`p-1.5 rounded font-bold text-white transition active:scale-95 ${
            isPlaying ? 'bg-amber-600' : 'bg-[#FF5A36]'
          }`}
          title="再生/一時停止 (Space)"
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>
      </div>

      {/* Right Controls: Snap / Zoom / Speed Selectors */}
      <div className="flex items-center gap-1.5 shrink-0 text-[11px]">
        {/* Snap */}
        <div className="flex items-center gap-1 bg-[#202020] border border-[#333333] px-1.5 py-0.5 rounded">
          <Grid size={12} className="text-amber-400 shrink-0" />
          <span className="text-gray-400 hidden sm:inline">Snap:</span>
          <select
            value={snap}
            onChange={(e) => onChangeSnap(parseInt(e.target.value, 10))}
            className="bg-transparent text-gray-200 focus:outline-none font-semibold cursor-pointer"
          >
            {[1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64].map((s) => (
              <option key={s} value={s} className="bg-[#202020]">
                1/{s}分
              </option>
            ))}
          </select>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-1 bg-[#202020] border border-[#333333] px-1.5 py-0.5 rounded">
          <ZoomIn size={12} className="text-sky-400 shrink-0" />
          <span className="text-gray-400 hidden sm:inline">Zoom:</span>
          <select
            value={zoom}
            onChange={(e) => onChangeZoom(parseFloat(e.target.value) as ZoomValue)}
            className="bg-transparent text-gray-200 focus:outline-none font-semibold cursor-pointer"
          >
            {[0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 4.0, 8.0].map((z) => (
              <option key={z} value={z} className="bg-[#202020]">
                {(z * 100).toFixed(0)}%
              </option>
            ))}
          </select>
        </div>

        {/* Speed */}
        <div className="flex items-center gap-1 bg-[#202020] border border-[#333333] px-1.5 py-0.5 rounded">
          <FastForward size={12} className="text-emerald-400 shrink-0" />
          <span className="text-gray-400 hidden sm:inline">速度:</span>
          <select
            value={playbackSpeed}
            onChange={(e) => onChangeSpeed(parseFloat(e.target.value))}
            className="bg-transparent text-gray-200 focus:outline-none font-semibold cursor-pointer"
          >
            {[0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((sp) => (
              <option key={sp} value={sp} className="bg-[#202020]">
                {sp}x
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
