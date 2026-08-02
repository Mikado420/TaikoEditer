import React, { useEffect, useRef, useState } from 'react';
import {
  MeasureInfo,
  Note,
  NoteType,
  SnapValue,
  TaikoChart,
  ZoomValue,
} from '../../types/chart';
import {
  absMeasurePosToMeasureAndPos,
  getAbsoluteMeasurePos,
  getGogoIntervals,
  measureAndPosToTime,
  snapPosition,
  timeToMeasureAndPos,
} from '../../utils/timeMath';
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

  // Dragging state for smooth horizontal scrolling / seeking
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
      const playheadAbs = getAbsoluteMeasurePos(
        playheadM.measureIndex,
        playheadM.positionInMeasure,
        measures
      );
      const playheadMeasPx = playheadAbs * pxPerMeasure;
      const scrollX = Math.max(0, playheadMeasPx - width * 0.25);
      const playheadX = playheadMeasPx - scrollX;

      ctx.save();
      ctx.translate(-scrollX, 0);

      // Track Lanes Dimensions
      const headerH = 22;
      const waveformH = 36;
      const eventsH = 20;
      const notesLaneY = headerH + waveformH + eventsH + 26;

      // 1. Canvas Background
      ctx.fillStyle = '#141414';
      ctx.fillRect(scrollX, 0, width, height);

      // Lane dividers
      ctx.fillStyle = '#1A1A1A';
      ctx.fillRect(scrollX, headerH, width, waveformH);
      ctx.fillRect(scrollX, headerH + waveformH + eventsH, width, height);

      ctx.fillStyle = '#2D2D2D';
      ctx.fillRect(scrollX, headerH + waveformH, width, 1);
      ctx.fillRect(scrollX, headerH + waveformH + eventsH, width, 1);

      // 1b. GOGO Time Background Overlay
      const gogoIntervals = getGogoIntervals(chart.events, measures);
      const notesLaneTop = headerH + waveformH + eventsH;
      const notesLaneH = height - notesLaneTop;

      for (const gogo of gogoIntervals) {
        const startX = gogo.startAbsPos * pxPerMeasure;
        const endX = gogo.endAbsPos * pxPerMeasure;
        if (endX >= scrollX - 50 && startX <= scrollX + width + 50) {
          const rectX = Math.max(scrollX, startX);
          const rectW = Math.max(1, Math.min(scrollX + width, endX) - rectX);

          // Warm red translucent background fill
          ctx.fillStyle = 'rgba(239, 68, 68, 0.22)';
          ctx.fillRect(rectX, notesLaneTop, rectW, notesLaneH);

          // Top and bottom accent border
          ctx.strokeStyle = '#FF4400';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(rectX, notesLaneTop);
          ctx.lineTo(rectX + rectW, notesLaneTop);
          ctx.moveTo(rectX, height - 1);
          ctx.lineTo(rectX + rectW, height - 1);
          ctx.stroke();

          // Start line boundary
          if (startX >= scrollX - 20 && startX <= scrollX + width + 20) {
            ctx.strokeStyle = '#F97316';
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.moveTo(startX, notesLaneTop);
            ctx.lineTo(startX, height);
            ctx.stroke();

            ctx.fillStyle = '#FF4400';
            ctx.font = 'bold 9px sans-serif';
            ctx.fillText('🔥 GOGO', startX + 4, notesLaneTop + 12);
          }
        }
      }

      // 2. Waveform Background
      if (audioPeaks && audioPeaks.length > 0) {
        ctx.fillStyle = 'rgba(0, 204, 255, 0.35)';
        const totalDuration = measures[measures.length - 1]?.timeSeconds || 120;
        const step = 2;

        for (let px = Math.floor(scrollX); px < scrollX + width; px += step) {
          const absPos = px / pxPerMeasure;
          const { measureIndex, positionInMeasure } = absMeasurePosToMeasureAndPos(absPos, measures);
          const t = measureAndPosToTime(measureIndex, positionInMeasure, measures);

          if (t >= 0 && t <= totalDuration) {
            const peakIdx = Math.floor((t / totalDuration) * audioPeaks.length);
            const peakVal = audioPeaks[peakIdx] || 0;
            const h = peakVal * waveformH * 0.85;
            ctx.fillRect(px, headerH + (waveformH - h) / 2, step, Math.max(1, h));
          }
        }
      }

      // 3. Grid Lines & Measures
      for (let m = 0; m < measures.length; m++) {
        const mInfo = measures[m];
        const mX = mInfo.startMeasurePos * pxPerMeasure;

        if (mX >= scrollX - 100 && mX <= scrollX + width + 100) {
          // Major Measure Barline
          ctx.strokeStyle = '#555555';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(mX, 0);
          ctx.lineTo(mX, height);
          ctx.stroke();

          // Measure Number Header
          ctx.fillStyle = '#AAAAAA';
          ctx.font = 'bold 11px sans-serif';
          ctx.fillText(`M${m + 1}`, mX + 5, 15);

          // Grid ticks according to Snap & Time Signature (Only visible during edit mode, hidden during playback)
          if (!isPlaying) {
            const N = mInfo.numerator;
            const D = mInfo.denominator;
            const ticksCount = Math.max(1, Math.round(snap * (N / D)));

            for (let t = 1; t < ticksCount; t++) {
              const tickAbs = mInfo.startMeasurePos + (t / ticksCount) * mInfo.measureLengthRatio;
              const tickX = tickAbs * pxPerMeasure;
              const isMainBeat = ticksCount % N === 0 ? t % (ticksCount / N) === 0 : false;

              if (tickX >= scrollX - 20 && tickX <= scrollX + width + 20) {
                ctx.beginPath();
                ctx.moveTo(tickX, isMainBeat ? headerH : headerH + waveformH + eventsH);
                ctx.lineTo(tickX, height);
                ctx.strokeStyle = isMainBeat ? '#444444' : '#262626';
                ctx.lineWidth = isMainBeat ? 1.5 : 1.0;
                ctx.stroke();
              }
            }
          }
        }
      }

      // 4. Draw Events Track
      for (const ev of chart.events) {
        if (ev.type === 'GOGOSTART' || ev.type === 'GOGOEND') continue;

        const evAbs = getAbsoluteMeasurePos(ev.measureIndex, ev.positionInMeasure, measures);
        const evX = evAbs * pxPerMeasure;
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
              : '#A855F7';
          ctx.fill();

          ctx.fillStyle = '#CCCCCC';
          ctx.font = '9px sans-serif';
          ctx.fillText(ev.value ? `${ev.type}:${ev.value}` : ev.type, evX + 6, evY + 3);
        }
      }

      // 5. Draw Active Pending Roll Start Point Preview
      if (rollStartPoint) {
        const startAbs = getAbsoluteMeasurePos(
          rollStartPoint.measureIndex,
          rollStartPoint.positionInMeasure,
          measures
        );
        const startX = startAbs * pxPerMeasure;
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

        const noteAbs = getAbsoluteMeasurePos(note.measureIndex, note.positionInMeasure, measures);
        const noteX = noteAbs * pxPerMeasure;

        if (noteX >= scrollX - 100 && noteX <= scrollX + width + 100) {
          const isSelected = selectedNoteIds.includes(note.id);
          const r = note.type === 3 || note.type === 4 || note.type === 6 ? 13 : 10;

          // Draw long roll/balloon tail line
          if (note.type === 5 || note.type === 6 || note.type === 7) {
            const duration = note.durationSeconds || 0.5;
            const endM = timeToMeasureAndPos(note.timeSeconds + duration, measures);
            const endAbs = getAbsoluteMeasurePos(endM.measureIndex, endM.positionInMeasure, measures);
            const endX = endAbs * pxPerMeasure;

            ctx.fillStyle = note.type === 7 ? 'rgba(255, 136, 0, 0.75)' : 'rgba(255, 204, 0, 0.75)';
            ctx.fillRect(noteX, notesLaneY - r / 2, Math.max(10, endX - noteX), r);

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
          ctx.lineWidth = isSelected ? 3 : 1.5;
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

      // 7. Prominent Playhead Needle
      ctx.strokeStyle = '#FF5A36';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();

      // Playhead Top Indicator Knob
      ctx.fillStyle = '#FF5A36';
      ctx.beginPath();
      ctx.moveTo(playheadX - 7, 0);
      ctx.lineTo(playheadX + 7, 0);
      ctx.lineTo(playheadX, 10);
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

  // Pointer Handlers for Tap, Drag, and Horizontal Scrubbing
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
      // Horizontal Drag to Scrub Playhead / Scroll
      const deltaMeasures = -dx / pxPerMeasure;
      const startM = timeToMeasureAndPos(pointerRef.current.startTime, measures);
      const startAbs = getAbsoluteMeasurePos(startM.measureIndex, startM.positionInMeasure, measures);
      const targetAbs = Math.max(0, startAbs + deltaMeasures);
      const { measureIndex, positionInMeasure } = absMeasurePosToMeasureAndPos(targetAbs, measures);

      const newTime = measureAndPosToTime(measureIndex, positionInMeasure, measures);
      onSeek(newTime);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!pointerRef.current.isDown) return;
    const canvas = canvasRef.current;

    if (!pointerRef.current.hasDragged && canvas) {
      // Execute Single Tap Action (Add or Delete Note)
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;

      const playheadM = timeToMeasureAndPos(currentTime, measures);
      const playheadAbs = getAbsoluteMeasurePos(
        playheadM.measureIndex,
        playheadM.positionInMeasure,
        measures
      );
      const scrollX = Math.max(0, playheadAbs * pxPerMeasure - rect.width * 0.25);

      const targetX = clickX + scrollX;
      const exactAbs = targetX / pxPerMeasure;
      const { measureIndex, positionInMeasure } = absMeasurePosToMeasureAndPos(exactAbs, measures);
      const mInfo = measures[measureIndex] || measures[0] || { numerator: 4, denominator: 4 };
      const snappedPos = snapPosition(positionInMeasure, snap, mInfo.numerator, mInfo.denominator);

      const timeSeconds = measureAndPosToTime(measureIndex, snappedPos, measures);

      // Rule 1: Tap existing note -> Delete
      const existingNote = chart.notes.find((n) => {
        if (n.type === 0) return false;
        const nAbs = getAbsoluteMeasurePos(n.measureIndex, n.positionInMeasure, measures);
        const nX = nAbs * pxPerMeasure;
        return Math.abs(nX - targetX) < 18;
      });

      if (existingNote) {
        audioEngine.playHitSound(existingNote.type);
        onDeleteNote(existingNote.id);
        setRollStartPoint(null);
      } else if (selectedNoteType === 5 || selectedNoteType === 6 || selectedNoteType === 7) {
        // Rule 2: Roll / Balloon section placement
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
        // Rule 3: Single Tap Note Placement
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
    <div
      ref={containerRef}
      className="h-[120px] sm:h-[160px] max-h-[35vh] bg-[#141414] border-t border-[#333333] relative select-none touch-none shrink-0 safe-pl safe-pr"
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
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
