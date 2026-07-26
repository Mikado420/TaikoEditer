import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Sliders,
  Music,
  User,
  Star,
  Flame,
  Globe,
  Tag,
  Hash,
} from 'lucide-react';
import { ChartHeader } from '../types/chart';

interface RightPanelProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  header: ChartHeader;
  onChangeHeader: (newHeader: ChartHeader) => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  isOpen,
  onToggleOpen,
  header,
  onChangeHeader,
}) => {
  if (!isOpen) {
    return (
      <div className="bg-[#181818] border-l border-[#3A3A3A] flex flex-col items-center py-2 shrink-0 z-10 w-7">
        <button
          onClick={onToggleOpen}
          className="p-1 text-gray-400 hover:text-white hover:bg-[#2A2A2A] rounded transition"
          title="右パネルを展開 (20%)"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="mt-4 [writing-mode:vertical-rl] text-[10px] tracking-widest text-gray-500 font-semibold uppercase">
          Chart Info Editor
        </div>
      </div>
    );
  }

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
    <aside className="w-[22%] min-w-[160px] max-w-[260px] bg-[#181818] border-l border-[#3A3A3A] flex flex-col shrink-0 text-xs z-10 select-none overflow-hidden safe-pr">
      {/* Header */}
      <div className="h-9 px-2 bg-[#202020] border-b border-[#3A3A3A] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 font-bold text-gray-300 text-[11px]">
          <Sliders size={13} className="text-[#FF5A36]" />
          <span>譜面情報設定</span>
        </div>
        <button
          onClick={onToggleOpen}
          className="p-1 text-gray-400 hover:text-white hover:bg-[#2A2A2A] rounded transition"
          title="右パネルを折りたたむ"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Form Controls */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2.5 custom-scrollbar">
        {/* Title */}
        <div>
          <label className="text-[10px] text-gray-400 font-semibold uppercase mb-1 block">
            Title (曲名)
          </label>
          <input
            type="text"
            value={header.title}
            onChange={(e) => handleChange('title', e.target.value)}
            className="w-full bg-[#242424] border border-[#3A3A3A] rounded px-2 py-1 text-gray-200 focus:outline-none focus:border-[#FF5A36]"
          />
        </div>

        {/* Subtitle */}
        <div>
          <label className="text-[10px] text-gray-400 font-semibold uppercase mb-1 block">
            Subtitle (サブタイトル)
          </label>
          <input
            type="text"
            value={header.subtitle}
            onChange={(e) => handleChange('subtitle', e.target.value)}
            className="w-full bg-[#242424] border border-[#3A3A3A] rounded px-2 py-1 text-gray-200 focus:outline-none focus:border-[#FF5A36]"
          />
        </div>

        {/* Base BPM & Offset */}
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <label className="text-[10px] text-gray-400 font-semibold uppercase mb-1 block">
              BPM (基本)
            </label>
            <input
              type="number"
              step="0.01"
              value={header.bpm}
              onChange={(e) => handleChange('bpm', parseFloat(e.target.value) || 120)}
              className="w-full bg-[#242424] border border-[#3A3A3A] rounded px-2 py-1 text-gray-200 focus:outline-none focus:border-[#FF5A36]"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 font-semibold uppercase mb-1 block">
              Offset (秒)
            </label>
            <input
              type="number"
              step="0.001"
              value={header.offset}
              onChange={(e) => handleChange('offset', parseFloat(e.target.value) || 0)}
              className="w-full bg-[#242424] border border-[#3A3A3A] rounded px-2 py-1 text-gray-200 focus:outline-none focus:border-[#FF5A36]"
            />
          </div>
        </div>

        {/* Wave audio file & DemoStart */}
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <label className="text-[10px] text-gray-400 font-semibold uppercase mb-1 block">
              Wave (音源名)
            </label>
            <input
              type="text"
              value={header.wave}
              onChange={(e) => handleChange('wave', e.target.value)}
              className="w-full bg-[#242424] border border-[#3A3A3A] rounded px-2 py-1 text-gray-200 focus:outline-none focus:border-[#FF5A36]"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 font-semibold uppercase mb-1 block">
              DemoStart (秒)
            </label>
            <input
              type="number"
              step="0.1"
              value={header.demoStart}
              onChange={(e) => handleChange('demoStart', parseFloat(e.target.value) || 0)}
              className="w-full bg-[#242424] border border-[#3A3A3A] rounded px-2 py-1 text-gray-200 focus:outline-none focus:border-[#FF5A36]"
            />
          </div>
        </div>

        {/* Course & Level */}
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <label className="text-[10px] text-gray-400 font-semibold uppercase mb-1 block">
              Course (コース)
            </label>
            <select
              value={header.course}
              onChange={(e) => handleChange('course', e.target.value)}
              className="w-full bg-[#242424] border border-[#3A3A3A] rounded px-1.5 py-1 text-gray-200 focus:outline-none focus:border-[#FF5A36]"
            >
              <option value="Easy">簡単 (Easy)</option>
              <option value="Normal">普通 (Normal)</option>
              <option value="Hard">難しい (Hard)</option>
              <option value="Oni">おに (Oni)</option>
              <option value="Edit">裏おに (Edit)</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-400 font-semibold uppercase mb-1 block">
              Level (★1〜10)
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={header.level}
              onChange={(e) => handleChange('level', parseInt(e.target.value, 10) || 1)}
              className="w-full bg-[#242424] border border-[#3A3A3A] rounded px-2 py-1 text-gray-200 focus:outline-none focus:border-[#FF5A36]"
            />
          </div>
        </div>

        {/* Genre & Creator */}
        <div>
          <label className="text-[10px] text-gray-400 font-semibold uppercase mb-1 block">
            Genre (ジャンル)
          </label>
          <input
            type="text"
            value={header.genre}
            onChange={(e) => handleChange('genre', e.target.value)}
            placeholder="J-POP, アニメ, Namco, etc."
            className="w-full bg-[#242424] border border-[#3A3A3A] rounded px-2 py-1 text-gray-200 focus:outline-none focus:border-[#FF5A36]"
          />
        </div>

        <div>
          <label className="text-[10px] text-gray-400 font-semibold uppercase mb-1 block">
            Creator (製作者)
          </label>
          <input
            type="text"
            value={header.creator}
            onChange={(e) => handleChange('creator', e.target.value)}
            className="w-full bg-[#242424] border border-[#3A3A3A] rounded px-2 py-1 text-gray-200 focus:outline-none focus:border-[#FF5A36]"
          />
        </div>

        {/* ScoreInit & ScoreDiff */}
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <label className="text-[10px] text-gray-400 font-semibold uppercase mb-1 block">
              ScoreInit (初項)
            </label>
            <input
              type="number"
              value={header.scoreInit}
              onChange={(e) => handleChange('scoreInit', parseInt(e.target.value, 10) || 0)}
              className="w-full bg-[#242424] border border-[#3A3A3A] rounded px-2 py-1 text-gray-200 focus:outline-none focus:border-[#FF5A36]"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 font-semibold uppercase mb-1 block">
              ScoreDiff (公差)
            </label>
            <input
              type="number"
              value={header.scoreDiff}
              onChange={(e) => handleChange('scoreDiff', parseInt(e.target.value, 10) || 0)}
              className="w-full bg-[#242424] border border-[#3A3A3A] rounded px-2 py-1 text-gray-200 focus:outline-none focus:border-[#FF5A36]"
            />
          </div>
        </div>

        {/* Balloon Counts */}
        <div>
          <label className="text-[10px] text-gray-400 font-semibold uppercase mb-1 block">
            Balloon (風船打数: 例 5,10,15)
          </label>
          <input
            type="text"
            value={(header.balloon || []).join(',')}
            onChange={(e) => handleBalloonChange(e.target.value)}
            placeholder="5, 10, 15"
            className="w-full bg-[#242424] border border-[#3A3A3A] rounded px-2 py-1 text-gray-200 focus:outline-none focus:border-[#FF5A36]"
          />
        </div>
      </div>
    </aside>
  );
};
