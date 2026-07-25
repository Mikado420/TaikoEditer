import React, { useEffect, useState } from 'react';
import {
  Clock,
  Activity,
  Layers,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Hash,
} from 'lucide-react';
import { MeasureInfo, SnapValue, ZoomValue } from '../types/chart';
import { formatTimeString, timeToMeasureAndPos } from '../utils/timeMath';

interface StatusBarProps {
  currentTime: number;
  measures: MeasureInfo[];
  snap: SnapValue;
  zoom: ZoomValue;
  selectedCount: number;
  autoSaveStatus: 'saved' | 'saving' | 'error';
}

export const StatusBar: React.FC<StatusBarProps> = ({
  currentTime,
  measures,
  snap,
  zoom,
  selectedCount,
  autoSaveStatus,
}) => {
  const [fps, setFps] = useState(60);

  // FPS Counter
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animId: number;

    const checkFps = () => {
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
      }
      animId = requestAnimationFrame(checkFps);
    };

    animId = requestAnimationFrame(checkFps);
    return () => cancelAnimationFrame(animId);
  }, []);

  const pos = timeToMeasureAndPos(currentTime, measures);
  const activeMeasure = measures[pos.measureIndex] || { bpm: 120 };

  return (
    <footer className="h-6 bg-[#0F0F0F] border-t border-[#262626] px-2 flex items-center justify-between text-[10px] text-gray-400 font-mono select-none shrink-0">
      {/* Left: Time & Measure position */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-gray-300">
          <Clock size={11} className="text-[#FF5A36]" />
          <span>{formatTimeString(currentTime)}</span>
        </div>

        <div className="flex items-center gap-1 text-gray-300">
          <Layers size={11} className="text-amber-400" />
          <span>
            小節 {pos.measureIndex + 1} ({(pos.positionInMeasure * 100).toFixed(0)}%)
          </span>
        </div>

        <div className="flex items-center gap-1 text-gray-300 hidden sm:flex">
          <Activity size={11} className="text-emerald-400" />
          <span>BPM {activeMeasure.bpm}</span>
        </div>
      </div>

      {/* Right: FPS, Selection count & AutoSave status */}
      <div className="flex items-center gap-3">
        {selectedCount > 0 && (
          <span className="text-amber-300 font-semibold bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-800/50">
            選択中: {selectedCount}
          </span>
        )}

        <div className="flex items-center gap-1 text-gray-400 hidden md:flex">
          <span>Snap: 1/{snap}</span>
          <span>|</span>
          <span>Zoom: {(zoom * 100).toFixed(0)}%</span>
        </div>

        <div className="flex items-center gap-1 text-gray-500">
          <span>FPS: {fps}</span>
        </div>

        {/* AutoSave Badge */}
        <div className="flex items-center gap-1">
          {autoSaveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-emerald-400" title="自動保存完了">
              <CheckCircle2 size={11} />
              <span className="hidden sm:inline">保存済</span>
            </span>
          )}
          {autoSaveStatus === 'saving' && (
            <span className="flex items-center gap-1 text-amber-400 animate-pulse" title="保存中...">
              <RefreshCw size={11} className="animate-spin" />
              <span className="hidden sm:inline">保存中</span>
            </span>
          )}
          {autoSaveStatus === 'error' && (
            <span className="flex items-center gap-1 text-rose-400" title="保存エラー">
              <AlertCircle size={11} />
              <span className="hidden sm:inline">保存失敗</span>
            </span>
          )}
        </div>
      </div>
    </footer>
  );
};
