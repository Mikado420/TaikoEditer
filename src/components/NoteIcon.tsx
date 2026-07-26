import React from 'react';
import { NoteType } from '../types/chart';

interface NoteIconProps {
  type: NoteType;
  size?: number; // pixel size
  className?: string;
}

export const NoteIcon: React.FC<NoteIconProps> = ({ type, size = 28, className = '' }) => {
  switch (type) {
    case 1: // ドン (Don)
      return (
        <div
          style={{ width: size, height: size }}
          className={`rounded-full bg-[#FF3B30] border-2 border-white shadow-md flex items-center justify-center shrink-0 ${className}`}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
        </div>
      );

    case 2: // カッ (Ka)
      return (
        <div
          style={{ width: size, height: size }}
          className={`rounded-full bg-[#34C759] sm:bg-[#007AFF] border-2 border-white shadow-md flex items-center justify-center shrink-0 ${className}`}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
        </div>
      );

    case 3: // 大ドン (Don Big)
      return (
        <div
          style={{ width: size + 6, height: size + 6 }}
          className={`rounded-full bg-[#E02020] border-2 border-white shadow-md flex items-center justify-center shrink-0 font-extrabold text-[10px] text-white ${className}`}
        >
          大
        </div>
      );

    case 4: // 大カッ (Ka Big)
      return (
        <div
          style={{ width: size + 6, height: size + 6 }}
          className={`rounded-full bg-[#0066CC] border-2 border-white shadow-md flex items-center justify-center shrink-0 font-extrabold text-[10px] text-white ${className}`}
        >
          大
        </div>
      );

    case 5: // 連打 (Roll)
      return (
        <div
          style={{ width: size + 4, height: size - 4 }}
          className={`rounded-full bg-[#FFCC00] border-2 border-white shadow-md flex items-center justify-center shrink-0 font-bold text-[9px] text-amber-950 ${className}`}
        >
          連
        </div>
      );

    case 6: // 大連打 (Roll Big)
      return (
        <div
          style={{ width: size + 10, height: size + 2 }}
          className={`rounded-full bg-[#FF9500] border-2 border-white shadow-md flex items-center justify-center shrink-0 font-bold text-[10px] text-amber-950 ${className}`}
        >
          特連
        </div>
      );

    case 7: // 風船 (Balloon)
      return (
        <div
          style={{ width: size + 2, height: size + 2 }}
          className={`rounded-full bg-[#FF2D55] border-2 border-white shadow-md flex items-center justify-center shrink-0 font-bold text-[10px] text-white relative ${className}`}
        >
          風
          <div className="absolute -bottom-1 w-1 h-1.5 bg-[#FF2D55] rotate-45 rounded-xs" />
        </div>
      );

    default:
      return (
        <div
          style={{ width: size, height: size }}
          className={`rounded-full bg-gray-600 border border-gray-400 ${className}`}
        />
      );
  }
};
