import React, { useEffect, useRef, useState } from 'react';
import {
  MeasureInfo,
  Note,
  NoteType,
  SnapValue,
  TaikoChart,
  ZoomValue,
} from '../../types/chart';
import { measureAndPosToTime, snapPosition, timeToMeasureAndPos } from '../../utils/timeMath';
import { audioEngine } from '../../audio/audioEngine';

interface TimelineCanvasProps {
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

export const TimelineCanvas: React.FC<TimelineCanvasProps> = ({
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
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Roll / Balloon multi-tap creation state
  const [rollStartPoint, setRollStartPoint] = useState<{
    measureIndex: number;
    positionInMeasure: number;
    timeSeconds: number;
  } | null>(null);

  // Dragging note length or position
  const [dragInfo, setDragInfo] = useState<{
    noteId: string;
    mode: 'move' | 'resize';
  } | null>(null);

  // Base layout pixels
  const basePxPerMeasure = 220;
  const pxPerMeasure = basePxPerMeasure * zoom;

  // Clear rollStartPoint if note type changes
  useEffect(() => {
    setRollStartPoint(null);
  }, [selectedNoteType]);

  // Main Render Loop
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

      // Scroll position tracking playhead
      const playheadM = timeToMeasureAndPos(currentTime, measures);
      const scrollX = Math.max(
        0,
        (playheadM.measureIndex + playheadM.positionInMeasure) * pxPerMeasure - width * 0.25
      );
      const playheadX =
        (playheadM.measureIndex + playheadM.positionInMeasure) * pxPerMeasure - scrollX;

      ctx.save();
      ctx.translate(-scrollX, 0);

      // Track Lanes Dimensions
      const headerH = 22;
      const waveformH = 34;
      const eventsH = 20;
      const notesLaneY = headerH + waveformH + eventsH + 24;

      // 1. Canvas Background
      ctx.fillStyle = '#161616';
      ctx.fillRect(scrollX, 0, width, height);

      // Lane dividers
      ctx.fillStyle = '#222222';
      ctx.fillRect(scrollX, headerH, width, waveformH);
      ctx.fillRect(scrollX, headerH + waveformH + eventsH, width, height);

      ctx.fillStyle = '#333333';
      ctx.fillRect(scrollX, headerH + waveformH, width, 1);
      ctx.fillRect(scrollX, headerH + waveformH + eventsH, width, 1);

      // 2. Waveform Background
      if (audioPeaks && audioPeaks.length > 0) {
        ctx.fillStyle = 'rgba(0, 204, 255, 0.25)';
        const totalDuration = measures[measures.length - 1]?.timeSeconds || 120;
        const step = 2;

        for (let px = Math.floor(scrollX); px < scrollX + width; px += step) {
          const mRatio = px / pxPerMeasure;
          const mIdx = Math.floor(mRatio);
          const posRatio = mRatio - mIdx;
          const t = measureAndPosToTime(mIdx, posRatio, measures);

          if (t >= 0 && t <= totalDuration) {
            const peakIdx = Math.floor((t / totalDuration) * audioPeaks.length);
            const peakVal = audioPeaks[peakIdx] || 0;
            const h = peakVal * waveformH * 0.8;
            ctx.fillRect(px, headerH + (waveformH - h) / 2, step, Math.max(1, h));
          }
        }
      }

      // 3. Grid Lines & Measures
      const startM = Math.max(0, Math.floor(scrollX / pxPerMeasure));
      const endM = Math.min(measures.length, Math.ceil((scrollX + width) / pxPerMeasure) + 1);

      for (let m = startM; m < endM; m++) {
        const mX = m * pxPerMeasure;

        if (mX >= scrollX - 50 && mX <= scrollX + width + 50) {
          // Major Measure Barline
          ctx.strokeStyle = '#4A4A4A';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(mX, 0);
          ctx.lineTo(mX, height);
          ctx.stroke();

          // Measure Number Header
          ctx.fillStyle = '#888888';
          ctx.font = 'bold 10px sans-serif';
          ctx.fillText(`M${m + 1}`, mX + 4, 14);

          // Grid ticks according to Snap
          const ticksCount = Math.max(4, snap);
          for (let t = 1; t < ticksCount; t++) {
            const tickX = mX + (t / ticksCount) * pxPerMeasure;
            const isQuarter = t % (ticksCount / 4) === 0;

            ctx.beginPath();
            ctx.moveTo(tickX, isQuarter ? headerH : headerH + waveformH + eventsH);
            ctx.lineTo(tickX, height);
            ctx.strokeStyle = isQuarter ? '#333333' : '#222222';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      // 4. Draw Events Track
      for (const ev of chart.events) {
        const evX = (ev.measureIndex + ev.positionInMeasure) * pxPerMeasure;
        if (evX >= scrollX - 50 && evX <= scrollX + width + 50) {
          const evY = headerH + waveformH + 10;

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

          ctx.fillStyle = '#BBBBBB';
          ctx.font = '9px sans-serif';
          ctx.fillText(ev.value ? `${ev.type}:${ev.value}` : ev.type, evX + 6, evY + 3);
        }
      }

      // 5. Draw Active Pending Roll Start Point Preview
      if (rollStartPoint) {
        const startX = (rollStartPoint.measureIndex + rollStartPoint.positionInMeasure) * pxPerMeasure;
        ctx.strokeStyle = '#FFCC00';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(startX, headerH + waveformH + eventsH);
        ctx.lineTo(startX, height);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#FFCC00';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText('連打開始点', startX + 4, notesLaneY - 18);
      }

      // 6. Draw Chart Notes
      for (const note of chart.notes) {
        if (note.type === 0) continue;

        const noteX = (note.measureIndex + note.positionInMeasure) * pxPerMeasure;

        if (noteX >= scrollX - 100 && noteX <= scrollX + width + 100) {
          const isSelected = selectedNoteIds.includes(note.id);
          const r = note.type === 3 || note.type === 4 || note.type === 6 ? 12 : 9;

          // Draw long roll/balloon tail line
          if (note.type === 5 || note.type === 6 || note.type === 7) {
            const duration = note.durationSeconds || 0.5;
            const endM = timeToMeasureAndPos(note.timeSeconds + duration, measures);
            const endX = (endM.measureIndex + endM.positionInMeasure) * pxPerMeasure;

            ctx.fillStyle = note.type === 7 ? 'rgba(255, 136, 0, 0.7)' : 'rgba(255, 204, 0, 0.7)';
            ctx.fillRect(noteX, notesLaneY - r / 2, Math.max(8, endX - noteX), r);

            // Resize handle knob on end of roll
            ctx.beginPath();
            ctx.arc(endX, notesLaneY, r * 0.8, 0, Math.PI * 2);
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.stroke();
          }

          // Draw note head
          ctx.beginPath();
          ctx.arc(noteX, notesLaneY, r, 0, Math.PI * 2);

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
          ctx.lineWidth = isSelected ? 2.5 : 1.5;
          ctx.stroke();

          if (isSelected) {
            ctx.beginPath();
            ctx.arc(noteX, notesLaneY, r + 4, 0, Math.PI * 2);
            ctx.strokeStyle = '#FF5A36';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
      }

      // 7. Draw Playhead Needle
      ctx.strokeStyle = '#FF5A36';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();

      ctx.fillStyle = '#FF5A36';
      ctx.beginPath();
      ctx.moveTo(playheadX - 6, 0);
      ctx.lineTo(playheadX + 6, 0);
      ctx.lineTo(playheadX, 8);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

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
    snap,
    zoom,
    selectedNoteIds,
    pxPerMeasure,
    audioPeaks,
    rollStartPoint,
  ]);

  // Pointer Click / Tap Handler (Unified Tap to Add or Delete)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;

    const playheadM = timeToMeasureAndPos(currentTime, measures);
    const scrollX = Math.max(
      0,
      (playheadM.measureIndex + playheadM.positionInMeasure) * pxPerMeasure - rect.width * 0.25
    );

    const targetX = clickX + scrollX;
    const exactMeasure = targetX / pxPerMeasure;
    const measureIndex = Math.max(0, Math.floor(exactMeasure));
    const rawPos = exactMeasure - measureIndex;
    const snappedPos = snapPosition(rawPos, snap);

    const timeSeconds = measureAndPosToTime(measureIndex, snappedPos, measures);

    // Rule 1: Check if tapping an existing note -> Delete Note instantly!
    const existingNote = chart.notes.find((n) => {
      if (n.type === 0) return false;
      const nX = (n.measureIndex + n.positionInMeasure) * pxPerMeasure;
      return Math.abs(nX - targetX) < 18;
    });

    if (existingNote) {
      audioEngine.playHitSound(existingNote.type);
      onDeleteNote(existingNote.id);
      setRollStartPoint(null);
      return;
    }

    // Rule 2: If selecting Roll (5), Big Roll (6), or Balloon (7)
    if (selectedNoteType === 5 || selectedNoteType === 6 || selectedNoteType === 7) {
      if (!rollStartPoint) {
        // Step 1: Set Start Point
        setRollStartPoint({
          measureIndex,
          positionInMeasure: snappedPos,
          timeSeconds,
        });
        audioEngine.playHitSound(selectedNoteType);
        return;
      } else {
        // Step 2: Set End Point and create long roll note
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
        return;
      }
    }

    // Rule 3: Single-Tap Note Placement (Don, Ka, Don Big, Ka Big = 1, 2, 3, 4)
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
  };

  return (
    <div
      ref={containerRef}
      className="h-[110px] sm:h-[150px] max-h-[30vh] bg-[#181818] border-t border-[#3A3A3A] relative select-none touch-none shrink-0 safe-pl safe-pr"
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        className="w-full h-full cursor-crosshair block"
      />

      {/* Guide Banner for Roll Start/End Selection */}
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
