import React, { useEffect, useRef, useState } from 'react';
import {
  MeasureInfo,
  Note,
  NoteType,
  SnapValue,
  TaikoChart,
  ZoomValue,
} from '../types/chart';
import { measureAndPosToTime, snapPosition, timeToMeasureAndPos } from '../utils/timeMath';
import { audioEngine } from '../audio/audioEngine';

interface UnifiedEditorCanvasProps {
  chart: TaikoChart;
  measures: MeasureInfo[];
  currentTime: number;
  isPlaying: boolean;
  onSeek: (time: number) => void;
  selectedNoteType: NoteType;
  snap: SnapValue;
  zoom: ZoomValue;
  onAddNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
  onMoveNote: (id: string, newMeasure: number, newPos: number) => void;
  selectedNoteIds: string[];
  onSelectNotes: (ids: string[]) => void;
  audioPeaks: Float32Array | null;
}

export const UnifiedEditorCanvas: React.FC<UnifiedEditorCanvasProps> = ({
  chart,
  measures,
  currentTime,
  isPlaying,
  onSeek,
  selectedNoteType,
  snap,
  zoom,
  onAddNote,
  onDeleteNote,
  onMoveNote,
  selectedNoteIds,
  onSelectNotes,
  audioPeaks,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playedNoteIdsRef = useRef<Set<string>>(new Set());

  // Roll / Balloon multi-tap creation state
  const [rollStartPoint, setRollStartPoint] = useState<{
    measureIndex: number;
    positionInMeasure: number;
    timeSeconds: number;
  } | null>(null);

  // Dragging state for smooth horizontal scrubbing
  const pointerRef = useRef<{
    isDown: boolean;
    startX: number;
    startY: number;
    startTime: number;
    hasDragged: boolean;
  }>({
    isDown: false,
    startX: 0,
    startY: 0,
    startTime: 0,
    hasDragged: false,
  });

  // Reset played note tracking when playback stops or rewinds
  useEffect(() => {
    if (!isPlaying || currentTime === 0) {
      playedNoteIdsRef.current.clear();
    }
  }, [isPlaying, currentTime]);

  // Clear rollStartPoint if selected note type changes
  useEffect(() => {
    setRollStartPoint(null);
  }, [selectedNoteType]);

  // Base layout pixels per measure
  const basePxPerMeasure = 240;
  const pxPerMeasure = basePxPerMeasure * zoom;

  // Render Loop
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
        grad.addColorStop(0, '#380800');
        grad.addColorStop(0.5, '#731400');
        grad.addColorStop(1, '#260400');
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = '#141414';
      }
      ctx.fillRect(0, 0, width, height);

      // 2. Taiko Lane (Main horizontal strip)
      const laneY = height * 0.52;
      const laneHeight = Math.min(100, Math.max(70, height * 0.45));

      ctx.fillStyle = isGogo ? '#220400' : '#0D0D0D';
      ctx.fillRect(0, laneY - laneHeight / 2, width, laneHeight);
      ctx.strokeStyle = isGogo ? '#FF4400' : '#2A2A2A';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(0, laneY - laneHeight / 2, width, laneHeight);

      // 3. Integrated Waveform Overlaid on the Lane
      if (audioPeaks && audioPeaks.length > 0) {
        ctx.fillStyle = isGogo ? 'rgba(255, 200, 0, 0.28)' : 'rgba(0, 204, 255, 0.28)';
        const totalDuration = measures[measures.length - 1]?.timeSeconds || 120;
        const judgeX = Math.max(90, width * 0.18);
        const step = 2;

        for (let px = 0; px < width; px += step) {
          const deltaX = px - judgeX;
          const deltaMeasures = deltaX / pxPerMeasure;
          const currentM = timeToMeasureAndPos(currentTime, measures);
          const targetMVal = currentM.measureIndex + currentM.positionInMeasure + deltaMeasures;

          if (targetMVal >= 0) {
            const mIdx = Math.floor(targetMVal);
            const posRatio = targetMVal - mIdx;
            const t = measureAndPosToTime(mIdx, posRatio, measures);

            if (t >= 0 && t <= totalDuration) {
              const peakIdx = Math.floor((t / totalDuration) * audioPeaks.length);
              const peakVal = audioPeaks[peakIdx] || 0;
              const h = peakVal * laneHeight * 0.8;
              ctx.fillRect(px, laneY - h / 2, step, Math.max(1, h));
            }
          }
        }
      }

      // 4. Judgment Line & Taiko Icon
      const judgeX = Math.max(90, width * 0.18);

      // Outer Judgment Ring
      ctx.beginPath();
      ctx.arc(judgeX, laneY, laneHeight * 0.44, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Inner Judgment Ring
      ctx.beginPath();
      ctx.arc(judgeX, laneY, laneHeight * 0.32, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Left Taiko Drumhead Icon
      const drumheadX = judgeX - laneHeight * 0.7;
      if (drumheadX > 15) {
        ctx.beginPath();
        ctx.arc(drumheadX, laneY, laneHeight * 0.42, 0, Math.PI * 2);
        ctx.fillStyle = '#E82C0C';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(drumheadX, laneY, laneHeight * 0.28, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
      }

      // 5. Grid Lines & Measure Barlines
      const currentM = timeToMeasureAndPos(currentTime, measures);
      const currentPosVal = currentM.measureIndex + currentM.positionInMeasure;

      for (let m = 0; m < measures.length; m++) {
        const mX = judgeX + (m - currentPosVal) * pxPerMeasure;

        if (mX >= -100 && mX <= width + 100) {
          // Major Measure Line
          if (measures[m].barlineVisible) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(mX, laneY - laneHeight / 2);
            ctx.lineTo(mX, laneY + laneHeight / 2);
            ctx.stroke();

            // Measure Number Label
            ctx.fillStyle = '#AAAAAA';
            ctx.font = 'bold 11px sans-serif';
            ctx.fillText(`M${m + 1}`, mX + 4, laneY - laneHeight / 2 - 5);
          }

          // Sub-grid ticks according to Snap
          const ticksCount = Math.max(4, snap);
          for (let t = 1; t < ticksCount; t++) {
            const tickX = mX + (t / ticksCount) * pxPerMeasure;
            const isQuarter = t % (ticksCount / 4) === 0;

            if (tickX >= -20 && tickX <= width + 20) {
              ctx.beginPath();
              ctx.moveTo(tickX, laneY - laneHeight / 2);
              ctx.lineTo(tickX, laneY + laneHeight / 2);
              ctx.strokeStyle = isQuarter ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)';
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }
        }
      }

      // 6. Draw Events (BPM, Scroll, GoGo)
      for (const ev of chart.events) {
        const evMVal = ev.measureIndex + ev.positionInMeasure;
        const evX = judgeX + (evMVal - currentPosVal) * pxPerMeasure;

        if (evX >= -50 && evX <= width + 50) {
          const evY = laneY - laneHeight / 2 - 14;

          ctx.beginPath();
          ctx.arc(evX, evY, 4, 0, Math.PI * 2);
          ctx.fillStyle =
            ev.type === 'BPMCHANGE'
              ? '#FFB000'
              : ev.type === 'SCROLL'
              ? '#00B2FF'
              : ev.type === 'MEASURE'
              ? '#10B981'
              : ev.type === 'GOGOSTART' || ev.type === 'GOGOEND'
              ? '#F43F5E'
              : '#A855F7';
          ctx.fill();

          ctx.fillStyle = '#CCCCCC';
          ctx.font = '9px sans-serif';
          ctx.fillText(ev.value ? `${ev.type}:${ev.value}` : ev.type, evX + 6, evY + 3);
        }
      }

      // 7. Active Pending Roll Start Point Line
      if (rollStartPoint) {
        const rollStartMVal = rollStartPoint.measureIndex + rollStartPoint.positionInMeasure;
        const rollStartX = judgeX + (rollStartMVal - currentPosVal) * pxPerMeasure;

        ctx.strokeStyle = '#FFCC00';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(rollStartX, laneY - laneHeight / 2 - 10);
        ctx.lineTo(rollStartX, laneY + laneHeight / 2 + 10);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#FFCC00';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText('連打開始点', rollStartX + 4, laneY - laneHeight / 2 - 18);
      }

      // 8. Draw Notes
      const radiusSmall = laneHeight * 0.35;
      const radiusBig = laneHeight * 0.45;

      for (const note of chart.notes) {
        if (note.type === 0) continue;

        const noteMVal = note.measureIndex + note.positionInMeasure;
        const noteX = judgeX + (noteMVal - currentPosVal) * pxPerMeasure;

        // Sound trigger during playback
        const timeDiff = note.timeSeconds - currentTime;
        if (
          isPlaying &&
          timeDiff <= 0 &&
          timeDiff >= -0.05 &&
          !playedNoteIdsRef.current.has(note.id)
        ) {
          playedNoteIdsRef.current.add(note.id);
          audioEngine.playHitSound(note.type);
        }

        if (noteX >= -100 && noteX <= width + 100) {
          const isSelected = selectedNoteIds.includes(note.id);
          const r = note.type === 3 || note.type === 4 || note.type === 6 ? radiusBig : radiusSmall;

          // Draw long roll / balloon body
          if (note.type === 5 || note.type === 6 || note.type === 7) {
            const duration = note.durationSeconds || 0.5;
            const endM = timeToMeasureAndPos(note.timeSeconds + duration, measures);
            const endMVal = endM.measureIndex + endM.positionInMeasure;
            const endX = judgeX + (endMVal - currentPosVal) * pxPerMeasure;

            ctx.fillStyle = note.type === 7 ? 'rgba(255, 136, 0, 0.8)' : 'rgba(255, 204, 0, 0.8)';
            ctx.fillRect(noteX, laneY - r, Math.max(12, endX - noteX), r * 2);

            ctx.beginPath();
            ctx.arc(endX, laneY, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }

          // Note Head Circle
          ctx.beginPath();
          ctx.arc(noteX, laneY, r, 0, Math.PI * 2);

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

          ctx.strokeStyle = isSelected ? '#FFFFFF' : '#000000';
          ctx.lineWidth = isSelected ? 3 : 2;
          ctx.stroke();

          // Highlight selection
          if (isSelected) {
            ctx.beginPath();
            ctx.arc(noteX, laneY, r + 4, 0, Math.PI * 2);
            ctx.strokeStyle = '#FF5A36';
            ctx.lineWidth = 2.5;
            ctx.stroke();
          }
        }
      }

      // HUD overlay info
      if (isGogo) {
        ctx.fillStyle = '#FFCC00';
        ctx.font = 'italic bold 12px sans-serif';
        ctx.fillText('ゴーゴータイム', width - 95, 20);
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
  }, [
    chart,
    measures,
    currentTime,
    isPlaying,
    snap,
    zoom,
    selectedNoteIds,
    pxPerMeasure,
    audioPeaks,
    rollStartPoint,
  ]);

  // Pointer Handlers for Scrubbing & Tap-to-Edit
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointerRef.current = {
      isDown: true,
      startX: e.clientX,
      startY: e.clientY,
      startTime: currentTime,
      hasDragged: false,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!pointerRef.current.isDown) return;

    const dx = e.clientX - pointerRef.current.startX;
    if (Math.abs(dx) > 6) {
      pointerRef.current.hasDragged = true;
    }

    if (pointerRef.current.hasDragged) {
      // Scrub currentTime based on drag offset
      const deltaMeasures = -dx / pxPerMeasure;
      const startM = timeToMeasureAndPos(pointerRef.current.startTime, measures);
      const targetM = Math.max(0, startM.measureIndex + startM.positionInMeasure + deltaMeasures);
      const targetMIdx = Math.floor(targetM);
      const targetPos = targetM - targetMIdx;

      const newTime = measureAndPosToTime(targetMIdx, targetPos, measures);
      onSeek(newTime);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!pointerRef.current.isDown) return;
    const canvas = canvasRef.current;

    if (!pointerRef.current.hasDragged && canvas) {
      // Single Tap Action -> Add or Delete Note at tap location
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;
      const judgeX = Math.max(90, width * 0.18);

      const deltaX = clickX - judgeX;
      const deltaMeasures = deltaX / pxPerMeasure;

      const currentM = timeToMeasureAndPos(currentTime, measures);
      const targetM = Math.max(0, currentM.measureIndex + currentM.positionInMeasure + deltaMeasures);
      const measureIndex = Math.floor(targetM);
      const rawPos = targetM - measureIndex;
      const snappedPos = snapPosition(rawPos, snap);

      const timeSeconds = measureAndPosToTime(measureIndex, snappedPos, measures);

      // Check if tapping existing note -> Delete
      const existingNote = chart.notes.find((n) => {
        if (n.type === 0) return false;
        const noteMVal = n.measureIndex + n.positionInMeasure;
        const currentMVal = currentM.measureIndex + currentM.positionInMeasure;
        const noteX = judgeX + (noteMVal - currentMVal) * pxPerMeasure;
        return Math.abs(noteX - clickX) < 22;
      });

      if (existingNote) {
        audioEngine.playHitSound(existingNote.type);
        onDeleteNote(existingNote.id);
        setRollStartPoint(null);
      } else if (selectedNoteType === 5 || selectedNoteType === 6 || selectedNoteType === 7) {
        // Roll / Balloon creation
        if (!rollStartPoint) {
          setRollStartPoint({
            measureIndex,
            positionInMeasure: snappedPos,
            timeSeconds,
          });
          audioEngine.playHitSound(selectedNoteType);
        } else {
          const startTime = rollStartPoint.timeSeconds;
          const endTime = timeSeconds;

          let finalStartM = rollStartPoint.measureIndex;
          let finalStartPos = rollStartPoint.positionInMeasure;
          let finalStartTime = startTime;
          let duration = Math.abs(endTime - startTime);

          if (endTime < startTime) {
            finalStartM = measureIndex;
            finalStartPos = snappedPos;
            finalStartTime = endTime;
          }

          if (duration < 0.1) duration = 0.4;

          const newNote: Note = {
            id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            type: selectedNoteType,
            measureIndex: finalStartM,
            positionInMeasure: finalStartPos,
            timeSeconds: finalStartTime,
            durationSeconds: duration,
          };

          onAddNote(newNote);
          audioEngine.playHitSound(selectedNoteType);
          setRollStartPoint(null);
        }
      } else {
        // Add note
        const newNote: Note = {
          id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          type: selectedNoteType,
          measureIndex,
          positionInMeasure: snappedPos,
          timeSeconds,
        };

        onAddNote(newNote);
        audioEngine.playHitSound(selectedNoteType);
        onSeek(timeSeconds);
      }
    }

    pointerRef.current.isDown = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}
  };

  return (
    <div className="flex-1 w-full h-full relative bg-[#141414] overflow-hidden select-none touch-none">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-full h-full cursor-crosshair block"
      />

      {/* Guide Banner for Roll Selection */}
      {rollStartPoint && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-amber-500 text-black px-3 py-1 rounded-full text-[11px] font-bold shadow-xl flex items-center gap-2 animate-bounce z-20">
          <span>連打の終了位置をタップしてください</span>
          <button
            onClick={() => setRollStartPoint(null)}
            className="px-1.5 py-0.2 bg-black/20 hover:bg-black/40 text-black rounded text-[10px]"
          >
            解除
          </button>
        </div>
      )}
    </div>
  );
};
