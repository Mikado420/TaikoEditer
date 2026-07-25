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

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Find current active measure info
      const activeMeasure =
        measures.find(
          (m) =>
            currentTime >= m.timeSeconds &&
            currentTime < m.timeSeconds + m.durationSeconds
        ) || measures[0] || { bpm: chart.header.bpm || 120, scroll: 1.0, isGogo: false };

      const isGogo = activeMeasure.isGogo;

      // 1. Draw Background
      if (isGogo) {
        // Gogo flame background gradient
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#581000');
        grad.addColorStop(0.5, '#A02000');
        grad.addColorStop(1, '#380800');
        ctx.fillStyle = grad;
      } else {
        // Normal Stage background
        ctx.fillStyle = '#1B1B1B';
      }
      ctx.fillRect(0, 0, width, height);

      // Top & Bottom Border Lines
      ctx.fillStyle = isGogo ? '#FF8800' : '#3A3A3A';
      ctx.fillRect(0, 0, width, 2);
      ctx.fillRect(0, height - 2, width, 2);

      // 2. Taiko Lane (Center strip)
      const laneY = height * 0.45;
      const laneHeight = Math.min(70, height * 0.5);

      ctx.fillStyle = isGogo ? '#300800' : '#121212';
      ctx.fillRect(0, laneY - laneHeight / 2, width, laneHeight);
      ctx.strokeStyle = isGogo ? '#FF4400' : '#2D2D2D';
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

      // Inner judge ring
      ctx.beginPath();
      ctx.arc(judgeX, laneY, laneHeight * 0.35, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Taiko Drum Frame Icon on Left
      ctx.beginPath();
      ctx.arc(judgeX - laneHeight * 0.7, laneY, laneHeight * 0.42, 0, Math.PI * 2);
      ctx.fillStyle = '#E82C0C'; // Red drum side
      ctx.fill();
      ctx.beginPath();
      ctx.arc(judgeX - laneHeight * 0.7, laneY, laneHeight * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF'; // White drum head
      ctx.fill();

      // Base scroll velocity in pixels per second
      // Standard: 1.0 scroll at 120 BPM moves ~400px per sec
      const baseSpeed = (width / 2.5) * (activeMeasure.bpm / 120) * activeMeasure.scroll;

      // 4. Draw Bar lines (小節線)
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

          // Measure number above bar line
          ctx.fillStyle = '#888888';
          ctx.font = '10px sans-serif';
          ctx.fillText(`M${m.index + 1}`, x + 4, laneY - laneHeight / 2 - 4);
        }
      }

      // 5. Draw Notes (ノーツ)
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

        // Only draw visible notes
        if (x < judgeX - 100 || x > width + 100) continue;

        const r = note.type === 3 || note.type === 4 || note.type === 6 ? radiusBig : radiusSmall;

        // Long roll/balloon body drawing
        if (note.type === 5 || note.type === 6 || note.type === 7) {
          const duration = note.durationSeconds || 0.5;
          const endX = judgeX + (note.timeSeconds + duration - currentTime) * baseSpeed;

          ctx.fillStyle = note.type === 7 ? '#FF8800' : '#FFCC00';
          ctx.fillRect(x, laneY - r, Math.max(10, endX - x), r * 2);

          // End circle
          ctx.beginPath();
          ctx.arc(endX, laneY, r, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw note head
        ctx.beginPath();
        ctx.arc(x, laneY, r, 0, Math.PI * 2);

        switch (note.type) {
          case 1: // Don
          case 3: // Big Don
            ctx.fillStyle = '#FF3B30';
            break;
          case 2: // Ka
          case 4: // Big Ka
            ctx.fillStyle = '#00A2FF';
            break;
          case 5: // Roll
          case 6: // Big Roll
            ctx.fillStyle = '#FFCC00';
            break;
          case 7: // Balloon
            ctx.fillStyle = '#FF8800';
            break;
          default:
            ctx.fillStyle = '#CCCCCC';
        }
        ctx.fill();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Inner white face
        ctx.beginPath();
        ctx.arc(x, laneY, r * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.fill();
      }

      // 6. Draw Hit Effect / Sparkle at Judge Line
      if (hitEffect && Date.now() - hitEffect.id < 150) {
        ctx.beginPath();
        ctx.arc(judgeX, laneY, laneHeight * 0.6, 0, Math.PI * 2);
        ctx.fillStyle =
          hitEffect.type === 1 || hitEffect.type === 3
            ? 'rgba(255, 59, 48, 0.4)'
            : 'rgba(0, 162, 255, 0.4)';
        ctx.fill();
      }

      // 7. HUD Overlays (BPM, Scroll, Gogo, Combo)
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`BPM: ${activeMeasure.bpm}`, 10, 16);
      ctx.fillText(`SCROLL: ${activeMeasure.scroll}x`, 90, 16);

      if (isGogo) {
        ctx.fillStyle = '#FFCC00';
        ctx.font = 'italic bold 11px sans-serif';
        ctx.fillText('GOGO TIME!', 180, 16);
      }

      if (combo > 0) {
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(`${combo} COMBO!`, judgeX - 35, laneY - laneHeight / 2 - 10);
      }

      animId = requestAnimationFrame(render);
    };

    // Auto-resize canvas resolution to match container
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
    <div className="flex-1 h-full min-h-0 relative bg-[#1B1B1B] overflow-hidden select-none">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};
