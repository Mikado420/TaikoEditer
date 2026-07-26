import React, { useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Upload,
  Download,
  Music,
  FolderOpen,
  HelpCircle,
  DownloadCloud,
  Layers,
  Sparkles,
} from 'lucide-react';
import { TaikoChart } from '../types/chart';

interface HeaderProps {
  chart: TaikoChart;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStop: () => void;
  onOpenProjectModal: () => void;
  onOpenShortcutsModal: () => void;
  onImportFile: (file: File) => void;
  onExportTja: () => void;
  onLoadAudio: (file: File) => void;
  isAudioLoaded: boolean;
  audioFileName: string | null;
  pwaPrompt: any;
  onInstallPwa: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  chart,
  isPlaying,
  onTogglePlay,
  onStop,
  onOpenProjectModal,
  onOpenShortcutsModal,
  onImportFile,
  onExportTja,
  onLoadAudio,
  isAudioLoaded,
  audioFileName,
  pwaPrompt,
  onInstallPwa,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImportFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onLoadAudio(e.target.files[0]);
      e.target.value = '';
    }
  };

  return (
    <header className="h-12 bg-[#141414] border-b border-[#3A3A3A] px-2 flex items-center justify-between gap-2 text-xs shrink-0 select-none safe-pl safe-pr safe-pt">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".tja,.txt,.zip,audio/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        type="file"
        ref={audioInputRef}
        accept="audio/*,.zip"
        onChange={handleAudioChange}
        className="hidden"
      />

      {/* Left Section: Logo & Chart Title */}
      <div className="flex items-center gap-2 overflow-hidden shrink-0">
        <div
          onClick={onOpenProjectModal}
          className="flex items-center gap-1.5 bg-[#262626] hover:bg-[#333333] active:scale-95 transition cursor-pointer px-2 py-1 rounded border border-[#3A3A3A]"
        >
          <div className="w-5 h-5 rounded-full bg-[#FF5A36] flex items-center justify-center font-bold text-white text-[10px]">
            太
          </div>
          <span className="font-bold text-white tracking-wide hidden sm:inline">
            Taiko Editor
          </span>
          <FolderOpen size={14} className="text-[#FF5A36] ml-0.5" />
        </div>

        <div className="flex items-center gap-1.5 bg-[#1F1F1F] px-2 py-1 rounded border border-[#2D2D2D] max-w-[180px] sm:max-w-[240px] truncate">
          <Layers size={13} className="text-gray-400 shrink-0" />
          <span className="truncate font-medium text-gray-200">
            {chart.header.title || '無題の譜面'}
          </span>
          <span className="text-[10px] px-1 bg-[#FF5A36]/20 text-[#FF5A36] font-semibold rounded shrink-0">
            {chart.header.course}
          </span>
        </div>
      </div>

      {/* Middle Section: Quick Play Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={onTogglePlay}
          className={`flex items-center gap-1 px-3 py-1 rounded font-semibold text-white shadow transition active:scale-95 ${
            isPlaying
              ? 'bg-amber-600 hover:bg-amber-500'
              : 'bg-[#FF5A36] hover:bg-[#ff6f4f]'
          }`}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          <span>{isPlaying ? '一時停止' : '再生'}</span>
        </button>

        <button
          onClick={onStop}
          className="p-1.5 bg-[#262626] hover:bg-[#333333] text-gray-300 hover:text-white rounded transition active:scale-95"
          title="最初に戻る"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Right Section: Action Buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => audioInputRef.current?.click()}
          className={`flex items-center gap-1 px-2 py-1 rounded border transition text-[11px] ${
            isAudioLoaded
              ? 'bg-emerald-950/60 border-emerald-700/80 text-emerald-300'
              : 'bg-[#262626] hover:bg-[#333333] border-[#3A3A3A] text-gray-300'
          }`}
          title={audioFileName || '音源ファイル (MP3/OGG/WAV) を選択'}
        >
          <Music size={13} className={isAudioLoaded ? 'text-emerald-400' : 'text-gray-400'} />
          <span className="hidden md:inline truncate max-w-[80px]">
            {isAudioLoaded ? '音源設定済' : '音源読込'}
          </span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 px-2 py-1 bg-[#262626] hover:bg-[#333333] border border-[#3A3A3A] text-gray-200 rounded transition text-[11px]"
          title="TJA / ZIP / 音声ファイルを読み込む"
        >
          <Upload size={13} className="text-sky-400" />
          <span className="hidden sm:inline">ファイル/ZIP読込</span>
        </button>

        <button
          onClick={onExportTja}
          className="flex items-center gap-1 px-2 py-1 bg-[#262626] hover:bg-[#333333] border border-[#3A3A3A] text-gray-200 rounded transition text-[11px]"
          title="TJA形式で書き出し"
        >
          <Download size={13} className="text-emerald-400" />
          <span className="hidden sm:inline">TJA出力</span>
        </button>

        {pwaPrompt && (
          <button
            onClick={onInstallPwa}
            className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 rounded transition text-[11px] font-medium"
          >
            <DownloadCloud size={13} />
            <span className="hidden md:inline">アプリ追加</span>
          </button>
        )}

        <button
          onClick={onOpenShortcutsModal}
          className="p-1.5 bg-[#262626] hover:bg-[#333333] text-gray-400 hover:text-white rounded transition"
          title="操作方法・ショートカット"
        >
          <HelpCircle size={15} />
        </button>
      </div>
    </header>
  );
};
