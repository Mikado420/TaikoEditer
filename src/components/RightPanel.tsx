import React from 'react';
import {
  X,
  Sliders,
} from 'lucide-react';
import { ChartHeader } from '../types/chart';
import { BufferedNumberInput } from './BufferedNumberInput';

interface RightPanelProps {
  isOpen: boolean;
  onClose: () => void;
  header: ChartHeader;
  onChangeHeader: (newHeader: ChartHeader) => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  isOpen,
  onClose,
  header,
  onChangeHeader,
}) => {
  if (!isOpen) return null;

  const handleChange = (field: keyof ChartHeader, value: any) => {
    onChangeHeader({
      ...header,
      [field]: value,
    });
  };

  const handleBalloonChange = (str: string) => {
    const arr = str
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));
    handleChange('balloon', arr);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end select-none animate-fade-in">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
      />

      {/* Slide-over Content Container */}
      <aside className="relative w-80 max-w-[85vw] h-full bg-[#181818] border-l border-[#3A3A3A] flex flex-col shadow-2xl z-10 text-xs safe-pr safe-pt safe-pb">
        {/* Header */}
        <div className="h-11 px-3 bg-[#202020] border-b border-[#3A3A3A] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 font-bold text-gray-200 text-sm">
            <Sliders size={16} className="text-[#FF5A36]" />
            <span>譜面ヘッダー情報</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white hover:bg-[#333333] rounded-lg transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Controls */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
          {/* Title */}
          <div>
            <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">
              Title (曲名)
            </label>
            <input
              type="text"
              value={header.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full bg-[#242424] border border-[#3A3A3A] rounded-lg px-2.5 py-1.5 text-gray-100 font-semibold focus:outline-none focus:border-[#FF5A36]"
            />
          </div>

          {/* Subtitle */}
          <div>
            <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">
              Subtitle (サブタイトル)
            </label>
            <input
              type="text"
              value={header.subtitle}
              onChange={(e) => handleChange('subtitle', e.target.value)}
              className="w-full bg-[#242424] border border-[#3A3A3A] rounded-lg px-2.5 py-1.5 text-gray-100 focus:outline-none focus:border-[#FF5A36]"
            />
          </div>

          {/* Base BPM & Offset */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">
                BPM (基本)
              </label>
              <BufferedNumberInput
                step="0.01"
                defaultValue={120}
                value={header.bpm}
                onChange={(val) => handleChange('bpm', val)}
                className="w-full bg-[#242424] border border-[#3A3A3A] rounded-lg px-2.5 py-1.5 text-gray-100 font-mono font-bold focus:outline-none focus:border-[#FF5A36]"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">
                Offset (秒)
              </label>
              <BufferedNumberInput
                step="0.001"
                defaultValue={0}
                value={header.offset}
                onChange={(val) => handleChange('offset', val)}
                className="w-full bg-[#242424] border border-[#3A3A3A] rounded-lg px-2.5 py-1.5 text-gray-100 font-mono focus:outline-none focus:border-[#FF5A36]"
              />
            </div>
          </div>

          {/* Wave audio file & DemoStart */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">
                Wave (音源ファイル名)
              </label>
              <input
                type="text"
                value={header.wave}
                onChange={(e) => handleChange('wave', e.target.value)}
                className="w-full bg-[#242424] border border-[#3A3A3A] rounded-lg px-2.5 py-1.5 text-gray-100 focus:outline-none focus:border-[#FF5A36]"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">
                DemoStart (秒)
              </label>
              <BufferedNumberInput
                step="0.1"
                defaultValue={0}
                value={header.demoStart}
                onChange={(val) => handleChange('demoStart', val)}
                className="w-full bg-[#242424] border border-[#3A3A3A] rounded-lg px-2.5 py-1.5 text-gray-100 font-mono focus:outline-none focus:border-[#FF5A36]"
              />
            </div>
          </div>

          {/* Course & Level */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">
                Course (コース)
              </label>
              <select
                value={header.course}
                onChange={(e) => handleChange('course', e.target.value)}
                className="w-full bg-[#242424] border border-[#3A3A3A] rounded-lg px-2 py-1.5 text-gray-100 font-bold focus:outline-none focus:border-[#FF5A36]"
              >
                <option value="Easy">かんたん (Easy)</option>
                <option value="Normal">ふつう (Normal)</option>
                <option value="Hard">むずかしい (Hard)</option>
                <option value="Oni">おに (Oni)</option>
                <option value="Edit">裏おに (Edit)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">
                Level (難易度 ★1〜10)
              </label>
              <BufferedNumberInput
                min={1}
                max={10}
                defaultValue={1}
                value={header.level}
                onChange={(val) => handleChange('level', val)}
                className="w-full bg-[#242424] border border-[#3A3A3A] rounded-lg px-2.5 py-1.5 text-amber-400 font-bold focus:outline-none focus:border-[#FF5A36]"
              />
            </div>
          </div>

          {/* Genre & Creator */}
          <div>
            <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">
              Genre (ジャンル)
            </label>
            <input
              type="text"
              value={header.genre}
              onChange={(e) => handleChange('genre', e.target.value)}
              placeholder="J-POP, アニメ, ボーカロイド, etc."
              className="w-full bg-[#242424] border border-[#3A3A3A] rounded-lg px-2.5 py-1.5 text-gray-100 focus:outline-none focus:border-[#FF5A36]"
            />
          </div>

          <div>
            <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">
              Maker (創作譜面制作者)
            </label>
            <input
              type="text"
              value={header.creator}
              onChange={(e) => handleChange('creator', e.target.value)}
              className="w-full bg-[#242424] border border-[#3A3A3A] rounded-lg px-2.5 py-1.5 text-gray-100 focus:outline-none focus:border-[#FF5A36]"
            />
          </div>

          {/* ScoreInit & ScoreDiff */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">
                ScoreInit (初項)
              </label>
              <BufferedNumberInput
                defaultValue={0}
                value={header.scoreInit}
                onChange={(val) => handleChange('scoreInit', val)}
                className="w-full bg-[#242424] border border-[#3A3A3A] rounded-lg px-2.5 py-1.5 text-gray-100 font-mono focus:outline-none focus:border-[#FF5A36]"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">
                ScoreDiff (公差)
              </label>
              <BufferedNumberInput
                defaultValue={0}
                value={header.scoreDiff}
                onChange={(val) => handleChange('scoreDiff', val)}
                className="w-full bg-[#242424] border border-[#3A3A3A] rounded-lg px-2.5 py-1.5 text-gray-100 font-mono focus:outline-none focus:border-[#FF5A36]"
              />
            </div>
          </div>

          {/* Balloon Counts */}
          <div>
            <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">
              Balloon (風船打数: カンマ区切り)
            </label>
            <input
              type="text"
              value={(header.balloon || []).join(',')}
              onChange={(e) => handleBalloonChange(e.target.value)}
              placeholder="5, 10, 15"
              className="w-full bg-[#242424] border border-[#3A3A3A] rounded-lg px-2.5 py-1.5 text-amber-300 font-mono focus:outline-none focus:border-[#FF5A36]"
            />
          </div>
        </div>
      </aside>
    </div>
  );
};
