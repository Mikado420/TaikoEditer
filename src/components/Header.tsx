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
  FileText,
  Sliders,
  FileCode,
  Eye,
  Edit3,
} from 'lucide-react';
import { TaikoChart } from '../types/chart';

interface HeaderProps {
  chart: TaikoChart;
  isPlaying: boolean;
  renderMode: 'edit' | 'play';
  onToggleRenderMode: () => void;
  onTogglePlay: () => void;
  onStop: () => void;
  onOpenProjectModal: () => void;
  onOpenShortcutsModal: () => void;
  onOpenTjaModal: () => void;
  onImportFile: (file: File) => void;
  onExportTja: () => void;
  onLoadAudio: (file: File) => void;
  isAudioLoaded: boolean;
  audioFileName: string | null;
  pwaPrompt: any;
  onInstallPwa: () => void;
  leftPanelOpen: boolean;
  onToggleLeftPanel: () => void;
  rightPanelOpen: boolean;
  onToggleRightPanel: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  chart,
  isPlaying,
  renderMode,
  onToggleRenderMode,
  onTogglePlay,
  onStop,
  onOpenProjectModal,
  onOpenShortcutsModal,
  onOpenTjaModal,
  onImportFile,
  onExportTja,
  onLoadAudio,
  isAudioLoaded,
  audioFileName,
  pwaPrompt,
  onInstallPwa,
  leftPanelOpen,
  onToggleLeftPanel,
  rightPanelOpen,
  onToggleRightPanel,
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
    <header className="h-11 bg-[#141414] border-b border-[#2D2D2D] px-2 flex items-center justify-between gap-1.5 text-xs shrink-0 select-none safe-pl safe-pr safe-pt">
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

      {/* Left: Left Panel Toggle, Project Modal, & TJA Source */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onToggleLeftPanel}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition text-[11px] font-semibold active:scale-95 ${
            leftPanelOpen
              ? 'bg-[#FF5A36] border-[#FF5A36] text-white shadow'
              : 'bg-[#222222] hover:bg-[#2C2C2C] border-[#383838] text-gray-200'
          }`}
          title="譜面情報・設定パネルを開く"
        >
          <FileText size={13} />
          <span className="hidden sm:inline">譜面情報</span>
        </button>

        <button
          onClick={onOpenProjectModal}
          className="flex items-center gap-1 bg-[#222222] hover:bg-[#2C2C2C] active:scale-95 transition px-2 py-1 rounded-lg border border-[#383838] text-gray-200 text-[11px] truncate max-w-[130px] sm:max-w-[180px]"
          title="プロジェクト一覧"
        >
          <FolderOpen size={13} className="text-[#FF5A36] shrink-0" />
          <span className="truncate font-semibold">{chart.header.title || '無題の譜面'}</span>
        </button>

        <button
          onClick={onOpenTjaModal}
          className="flex items-center gap-1 px-2 py-1 bg-[#222222] hover:bg-[#2C2C2C] border border-[#383838] text-amber-400 hover:text-amber-300 rounded-lg transition text-[11px] font-semibold active:scale-95"
          title="TJAソースエディタを開く"
        >
          <FileCode size={13} />
          <span className="hidden sm:inline">TJA Source</span>
        </button>
      </div>

      {/* Middle: Playback & Render Mode Switcher */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Render Mode Switcher */}
        <button
          onClick={onToggleRenderMode}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition active:scale-95 ${
            renderMode === 'play'
              ? 'bg-rose-950/80 border-rose-600 text-rose-300'
              : 'bg-sky-950/80 border-sky-600 text-sky-300'
          }`}
          title={renderMode === 'play' ? '演奏モード（演出重視）' : '編集モード（一定間隔描画）'}
        >
          {renderMode === 'play' ? <Eye size={13} /> : <Edit3 size={13} />}
          <span>{renderMode === 'play' ? '演奏' : '編集'}</span>
        </button>

        <button
          onClick={onTogglePlay}
          className={`flex items-center gap-1 px-3 py-1 rounded-lg font-bold text-white shadow transition active:scale-95 text-[11px] ${
            isPlaying ? 'bg-amber-600 hover:bg-amber-500' : 'bg-[#FF5A36] hover:bg-[#ff6f4f]'
          }`}
        >
          {isPlaying ? <Pause size={13} /> : <Play size={13} />}
          <span>{isPlaying ? '停止' : '再生'}</span>
        </button>
        <button
          onClick={onStop}
          className="p-1 bg-[#222222] hover:bg-[#2C2C2C] text-gray-300 hover:text-white rounded-lg transition active:scale-95 border border-[#383838]"
          title="最初に戻る"
        >
          <RotateCcw size={13} />
        </button>
      </div>

      {/* Right: Right Panel Toggle & File Imports */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => audioInputRef.current?.click()}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition text-[11px] ${
            isAudioLoaded
              ? 'bg-emerald-950/70 border-emerald-600 text-emerald-300 font-bold'
              : 'bg-[#222222] hover:bg-[#2C2C2C] border-[#383838] text-gray-300'
          }`}
          title={audioFileName || '音源ファイル (MP3/OGG/WAV) を選択'}
        >
          <Music size={13} className={isAudioLoaded ? 'text-emerald-400' : 'text-gray-400'} />
          <span className="hidden md:inline">{isAudioLoaded ? '音源OK' : '音源'}</span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 px-2 py-1 bg-[#222222] hover:bg-[#2C2C2C] border border-[#383838] text-gray-200 rounded-lg transition text-[11px]"
          title="TJA / ZIP ファイルを読込"
        >
          <Upload size={13} className="text-sky-400" />
          <span className="hidden sm:inline">読込</span>
        </button>

        <button
          onClick={onExportTja}
          className="flex items-center gap-1 px-2 py-1 bg-[#222222] hover:bg-[#2C2C2C] border border-[#383838] text-gray-200 rounded-lg transition text-[11px]"
          title="TJA出力"
        >
          <Download size={13} className="text-emerald-400" />
          <span className="hidden sm:inline">出力</span>
        </button>

        <button
          onClick={onToggleRightPanel}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition text-[11px] font-semibold active:scale-95 ${
            rightPanelOpen
              ? 'bg-[#FF5A36] border-[#FF5A36] text-white shadow'
              : 'bg-[#222222] hover:bg-[#2C2C2C] border-[#383838] text-gray-200'
          }`}
          title="イベント・設定パネルを開く"
        >
          <Sliders size={13} />
          <span className="hidden sm:inline">イベント</span>
        </button>

        {pwaPrompt && (
          <button
            onClick={onInstallPwa}
            className="p-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 rounded-lg transition"
            title="アプリ追加"
          >
            <DownloadCloud size={13} />
          </button>
        )}

        <button
          onClick={onOpenShortcutsModal}
          className="p-1 bg-[#222222] hover:bg-[#2C2C2C] text-gray-400 hover:text-white rounded-lg transition border border-[#383838]"
          title="操作ガイド"
        >
          <HelpCircle size={14} />
        </button>
      </div>
    </header>
  );
};
