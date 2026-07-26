import React, { useEffect, useRef, useState } from 'react';
import { MeasureInfo, Note, TaikoChart } from '../types/chart';
import { audioEngine } from '../audio/audioEngine';

interface CentralCanvasProps {
  chart: TaikoChart;
  measures: MeasureInfo[];
  currentTime: number;
  isPlaying: boolean;
}

export const CentralCanvas: React.FC<CentralCanvasProps> = ({
  chart,
  measures,
  currentTime,
  isPlaying,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playedNoteIdsRef = useRef<Set<string>>(new Set());
  const [combo, setCombo] = useState(0);
  const [hitEffect, setHitEffect] = useState<{ type: number; id: number } | null>(null);

  // Reset played note tracking on stop or seek backwards
  useEffect(() => {
    if (!isPlaying || currentTime === 0) {
      playedNoteIdsRef.current.clear();
      setCombo(0);
    }
  }, [isPlaying, currentTime]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Active measure info
      const activeMeasure =
        measures.find(
          (m) =>
            currentTime >= m.timeSeconds &&
            currentTime < m.timeSeconds + m.durationSeconds
        ) || measures[0] || { bpm: chart.header.bpm || 120, scroll: 1.0, isGogo: false };

      const isGogo = activeMeasure.isGogo;

      // 1. Stage Background
      if (isGogo) {
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#4A0C00');
        grad.addColorStop(0.5, '#901C00');
        grad.addColorStop(1, '#300600');
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = '#161616';
      }
      ctx.fillRect(0, 0, width, height);

      // Top & Bottom Accent Border
      ctx.fillStyle = isGogo ? '#FF8800' : '#2D2D2D';
      ctx.fillRect(0, 0, width, 2);
      ctx.fillRect(0, height - 2, width, 2);

      // 2. Taiko Lane (Main horizontal strip)
      const laneY = height * 0.5;
      const laneHeight = Math.min(80, height * 0.55);

      ctx.fillStyle = isGogo ? '#280600' : '#111111';
      ctx.fillRect(0, laneY - laneHeight / 2, width, laneHeight);
      ctx.strokeStyle = isGogo ? '#FF4400' : '#2A2A2A';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(0, laneY - laneHeight / 2, width, laneHeight);

      // 3. Judge Line (判定線)
      const judgeX = Math.max(80, width * 0.18);
      ctx.beginPath();
      ctx.arc(judgeX, laneY, laneHeight * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(judgeX, laneY, laneHeight * 0.35, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Drum Head Left Icon
      ctx.beginPath();
      ctx.arc(judgeX - laneHeight * 0.7, laneY, laneHeight * 0.42, 0, Math.PI * 2);
      ctx.fillStyle = '#E82C0C';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(judgeX - laneHeight * 0.7, laneY, laneHeight * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();

      // Base scroll speed calculation
      const baseSpeed = (width / 2.5) * (activeMeasure.bpm / 120) * activeMeasure.scroll;

      // 4. Bar lines (小節線)
      for (const m of measures) {
        const timeDiff = m.timeSeconds - currentTime;
        const x = judgeX + timeDiff * baseSpeed;

        if (x >= judgeX - 20 && x <= width + 20 && m.barlineVisible) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, laneY - laneHeight / 2);
          ctx.lineTo(x, laneY + laneHeight / 2);
          ctx.stroke();

          ctx.fillStyle = '#888888';
          ctx.font = '10px sans-serif';
          ctx.fillText(`M${m.index + 1}`, x + 4, laneY - laneHeight / 2 - 4);
        }
      }

      // 5. Notes Rendering
      const radiusSmall = laneHeight * 0.35;
      const radiusBig = laneHeight * 0.45;

      for (const note of chart.notes) {
        if (note.type === 0) continue;

        const timeDiff = note.timeSeconds - currentTime;
        const x = judgeX + timeDiff * baseSpeed;

        // Sound trigger check during playback
        if (
          isPlaying &&
          timeDiff <= 0 &&
          timeDiff >= -0.05 &&
          !playedNoteIdsRef.current.has(note.id)
        ) {
          playedNoteIdsRef.current.add(note.id);
          audioEngine.playHitSound(note.type);
          setCombo((c) => c + 1);
          setHitEffect({ type: note.type, id: Date.now() });
        }

        if (x < judgeX - 100 || x > width + 100) continue;

        const r = note.type === 3 || note.type === 4 || note.type === 6 ? radiusBig : radiusSmall;

        if (note.type === 5 || note.type === 6 || note.type === 7) {
          const duration = note.durationSeconds || 0.5;
          const endX = judgeX + (note.timeSeconds + duration - currentTime) * baseSpeed;

          ctx.fillStyle = note.type === 7 ? '#FF8800' : '#FFCC00';
          ctx.fillRect(x, laneY - r, Math.max(10, endX - x), r * 2);

          ctx.beginPath();
          ctx.arc(endX, laneY, r, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(x, laneY, r, 0, Math.PI * 2);

        switch (note.type) {
          case 1:
          case 3:
            ctx.fillStyle = '#FF3B30';
            break;
          case 2:
          case 4:
            ctx.fillStyle = '#00A2FF';
            break;
          case 5:
          case 6:
            ctx.fillStyle = '#FFCC00';
            break;
          case 7:
            ctx.fillStyle = '#FF8800';
            break;
          default:
            ctx.fillStyle = '#CCCCCC';
        }
        ctx.fill();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x, laneY, r * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.fill();
      }

      // 6. Hit Effect
      if (hitEffect && Date.now() - hitEffect.id < 150) {
        ctx.beginPath();
        ctx.arc(judgeX, laneY, laneHeight * 0.6, 0, Math.PI * 2);
        ctx.fillStyle =
          hitEffect.type === 1 || hitEffect.type === 3
            ? 'rgba(255, 59, 48, 0.4)'
            : 'rgba(0, 162, 255, 0.4)';
        ctx.fill();
      }

      // 7. Minimal HUD
      if (isGogo) {
        ctx.fillStyle = '#FFCC00';
        ctx.font = 'italic bold 12px sans-serif';
        ctx.fillText('ゴーゴータイム', width - 90, 18);
      }

      if (combo > 0) {
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(`${combo} COMBO`, judgeX - 35, laneY - laneHeight / 2 - 10);
      }

      animId = requestAnimationFrame(render);
    };

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [chart, measures, currentTime, isPlaying, hitEffect, combo]);

  return (
    <div className="flex-1 h-full min-h-0 relative bg-[#161616] overflow-hidden select-none">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};
