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
  const lastTimeRef = useRef<number>(currentTime);

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

  // Track playback time updates for hit sound scheduling
  useEffect(() => {
    if (!isPlaying) {
      playedNoteIdsRef.current.clear();
    }
    lastTimeRef.current = currentTime;
  }, [isPlaying, currentTime]);

  // Clear rollStartPoint if selected note type changes
  useEffect(() => {
    setRollStartPoint(null);
  }, [selectedNoteType]);

  // Base layout pixels per measure (Official Taiko density: ~1 measure visible ahead)
  const basePxPerMeasure = 520;
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
      const laneHeight = Math.min(110, Math.max(75, height * 0.45));
      const laneTopY = laneY - laneHeight / 2;
      const wfBandHeight = Math.round(laneHeight * 0.18); // ~18% top strip for waveform

      ctx.fillStyle = isGogo ? '#220400' : '#0D0D0D';
      ctx.fillRect(0, laneTopY, width, laneHeight);
      ctx.strokeStyle = isGogo ? '#FF4400' : '#2A2A2A';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(0, laneTopY, width, laneHeight);

      // Dedicated Top Waveform Area
      ctx.fillStyle = '#080808';
      ctx.fillRect(0, laneTopY, width, wfBandHeight);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, laneTopY + wfBandHeight);
      ctx.lineTo(width, laneTopY + wfBandHeight);
      ctx.stroke();

      // High-precision Waveform Rendering inside top strip
      const judgeX = Math.max(90, width * 0.18);
      if (audioPeaks && audioPeaks.length > 0) {
        ctx.fillStyle = isGogo ? '#FFB000' : '#00D0FF';
        const totalDuration = measures[measures.length - 1]?.timeSeconds || 120;
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
              const h = Math.max(2, peakVal * (wfBandHeight - 2));
              const yPeak = laneTopY + (wfBandHeight - h) / 2;
              ctx.fillRect(px, yPeak, step, h);
            }
          }
        }
      }

      // Label for Waveform
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '8px sans-serif';
      ctx.fillText('WAVEFORM', 8, laneTopY + wfBandHeight - 3);

      // 4. Judgment Line & Taiko Icon
      // Outer Judgment Ring
      ctx.beginPath();
      ctx.arc(judgeX, laneY + wfBandHeight / 2, laneHeight * 0.38, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Inner Judgment Ring
      ctx.beginPath();
      ctx.arc(judgeX, laneY + wfBandHeight / 2, laneHeight * 0.28, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Left Taiko Drumhead Icon
      const drumheadX = judgeX - laneHeight * 0.65;
      if (drumheadX > 15) {
        ctx.beginPath();
        ctx.arc(drumheadX, laneY + wfBandHeight / 2, laneHeight * 0.38, 0, Math.PI * 2);
        ctx.fillStyle = '#E82C0C';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(drumheadX, laneY + wfBandHeight / 2, laneHeight * 0.24, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
      }

      // 5. Grid Lines & Measure Barlines (Fixed layout independent of note SCROLL)
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
            ctx.moveTo(mX, laneTopY + wfBandHeight);
            ctx.lineTo(mX, laneTopY + laneHeight);
            ctx.stroke();

            // Measure Number Label
            ctx.fillStyle = '#AAAAAA';
            ctx.font = 'bold 11px sans-serif';
            ctx.fillText(`M${m + 1}`, mX + 4, laneTopY + wfBandHeight - 3);
          }

          // Sub-grid ticks according to Snap
          const ticksCount = Math.max(4, snap);
          for (let t = 1; t < ticksCount; t++) {
            const tickX = mX + (t / ticksCount) * pxPerMeasure;
            const isQuarter = t % (ticksCount / 4) === 0;

            if (tickX >= -20 && tickX <= width + 20) {
              ctx.beginPath();
              ctx.moveTo(tickX, laneTopY + wfBandHeight);
              ctx.lineTo(tickX, laneTopY + laneHeight);
              ctx.strokeStyle = isQuarter ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)';
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }
        }
      }

      // 6. Draw Events (#SCROLL, #BPMCHANGE, #GOGO) at exact fractional time position
      for (const ev of chart.events) {
        const evMVal = ev.measureIndex + ev.positionInMeasure;
        const evX = judgeX + (evMVal - currentPosVal) * pxPerMeasure;

        if (evX >= -50 && evX <= width + 50) {
          const color =
            ev.type === 'BPMCHANGE'
              ? '#FFB000'
              : ev.type === 'SCROLL'
              ? '#00B2FF'
              : ev.type === 'MEASURE'
              ? '#10B981'
              : ev.type === 'GOGOSTART' || ev.type === 'GOGOEND'
              ? '#F43F5E'
              : '#A855F7';

          // Fine vertical event marker across lane
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(evX, laneTopY + wfBandHeight);
          ctx.lineTo(evX, laneTopY + laneHeight);
          ctx.stroke();

          // Small badge above lane
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(evX, laneTopY - 7, 3.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.font = '9px sans-serif';
          ctx.fillText(ev.value ? `${ev.type}:${ev.value}` : ev.type, evX + 5, laneTopY - 4);
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
        ctx.moveTo(rollStartX, laneTopY);
        ctx.lineTo(rollStartX, laneTopY + laneHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#FFCC00';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText('連打開始点', rollStartX + 4, laneTopY - 14);
      }

      // 8. Hit Sound Scheduler & Notes Rendering
      const notesY = laneY + wfBandHeight / 2;
      const radiusStandard = 15; // 30px standard note
      const radiusBig = 20; // ~1.33x big note (40px)

      // Precise hit sound trigger during playback frame
      if (isPlaying) {
        const fromT = lastTimeRef.current;
        const toT = currentTime;

        if (toT > fromT) {
          for (const note of chart.notes) {
            if (note.type === 0) continue;
            if (
              note.timeSeconds >= fromT - 0.01 &&
              note.timeSeconds <= toT + 0.015 &&
              !playedNoteIdsRef.current.has(note.id)
            ) {
              playedNoteIdsRef.current.add(note.id);
              audioEngine.playHitSound(note.type);
            }
          }
        }
        lastTimeRef.current = currentTime;
      }

      for (const note of chart.notes) {
        if (note.type === 0) continue;

        // In Edit Mode, note density/spacing is kept uniform (Beat Position based).
        // In Play Mode, #SCROLL alters note display speed.
        const noteMeasure = measures[note.measureIndex] || activeMeasure;
        const noteScroll = noteMeasure.scroll || 1.0;
        const effectiveScroll = isPlaying ? noteScroll : 1.0;

        const noteMVal = note.measureIndex + note.positionInMeasure;
        const noteX = judgeX + (noteMVal - currentPosVal) * pxPerMeasure * effectiveScroll;

        if (noteX >= -100 && noteX <= width + 100) {
          const isSelected = selectedNoteIds.includes(note.id);
          const r = note.type === 3 || note.type === 4 || note.type === 6 ? radiusBig : radiusStandard;

          // Draw long roll / balloon body
          if (note.type === 5 || note.type === 6 || note.type === 7) {
            const duration = note.durationSeconds || 0.5;
            const endM = timeToMeasureAndPos(note.timeSeconds + duration, measures);
            const endMVal = endM.measureIndex + endM.positionInMeasure;
            const endX = judgeX + (endMVal - currentPosVal) * pxPerMeasure * effectiveScroll;

            ctx.fillStyle = note.type === 7 ? 'rgba(255, 136, 0, 0.85)' : 'rgba(255, 204, 0, 0.85)';
            ctx.fillRect(noteX, notesY - r, Math.max(12, endX - noteX), r * 2);

            ctx.beginPath();
            ctx.arc(endX, notesY, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }

          // Note Head Circle
          ctx.beginPath();
          ctx.arc(noteX, notesY, r, 0, Math.PI * 2);

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
            ctx.arc(noteX, notesY, r + 4, 0, Math.PI * 2);
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
