import React, { useEffect, useRef, useState } from 'react';
import {
  ChartEvent,
  MeasureInfo,
  Note,
  NoteType,
  SnapValue,
  TaikoChart,
  ZoomValue,
} from '../../types/chart';
import {
  measureAndPosToTime,
  snapPosition,
  timeToMeasureAndPos,
} from '../../utils/timeMath';
import { audioEngine } from '../../audio/audioEngine';

interface TimelineCanvasProps {
  chart: TaikoChart;
  measures: MeasureInfo[];
  currentTime: number;
  snap: SnapValue;
  zoom: ZoomValue;
  selectedNoteType: NoteType;
  activeTool: 'place' | 'select' | 'delete';
  selectedNoteIds: string[];
  onSelectNotes: (ids: string[]) => void;
  onAddNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
  onMoveNote: (id: string, newMeasure: number, newPos: number) => void;
  onSeekTime: (seconds: number) => void;
  audioPeaks: Float32Array | null;
}

export const TimelineCanvas: React.FC<TimelineCanvasProps> = ({
  chart,
  measures,
  currentTime,
  snap,
  zoom,
  selectedNoteType,
  activeTool,
  selectedNoteIds,
  onSelectNotes,
  onAddNote,
  onDeleteNote,
  onMoveNote,
  onSeekTime,
  audioPeaks,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [touchDistance, setTouchDistance] = useState<number | null>(null);

  // Horizontal scale: pixels per measure
  // Zoom 1.0 = 200px per measure
  const pxPerMeasure = 200 * zoom;

  // Render loop
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

      // Track layout heights inside timeline
      const headerH = 22;
      const waveformH = 26;
      const eventsH = 20;
      const notesLaneY = headerH + waveformH + eventsH + 28;
      const notesLaneH = 40;

      // 1. Draw Track Divider Lines & Backgrounds
      ctx.fillStyle = '#181818';
      ctx.fillRect(0, 0, width, height);

      // Header bg
      ctx.fillStyle = '#202020';
      ctx.fillRect(0, 0, width, headerH);

      // Waveform bg
      ctx.fillStyle = '#141414';
      ctx.fillRect(0, headerH, width, waveformH);

      // Notes Lane bg
      ctx.fillStyle = '#1C1C1C';
      ctx.fillRect(0, headerH + waveformH + eventsH, width, notesLaneH + 16);

      // Track horizontal line dividers
      ctx.strokeStyle = '#3A3A3A';
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.moveTo(0, headerH);
      ctx.lineTo(width, headerH);
      ctx.moveTo(0, headerH + waveformH);
      ctx.lineTo(width, headerH + waveformH);
      ctx.moveTo(0, headerH + waveformH + eventsH);
      ctx.lineTo(width, headerH + waveformH + eventsH);
      ctx.moveTo(0, headerH + waveformH + eventsH + notesLaneH + 16);
      ctx.lineTo(width, headerH + waveformH + eventsH + notesLaneH + 16);
      ctx.stroke();

      // Scroll Offset: Scroll horizontally to keep playhead visible or centered
      const playheadM = timeToMeasureAndPos(currentTime, measures);
      const playheadX =
        (playheadM.measureIndex + playheadM.positionInMeasure) * pxPerMeasure;

      // Center playhead around 20% from left
      const scrollX = Math.max(0, playheadX - width * 0.2);

      ctx.save();
      ctx.translate(-scrollX, 0);

      // 2. Draw Waveform Peaks
      if (audioPeaks && audioPeaks.length > 0) {
        ctx.fillStyle = 'rgba(0, 210, 255, 0.25)';
        const totalDuration = measures.length * (measures[0]?.durationSeconds || 2);
        const peakWidth = (totalDuration * (pxPerMeasure / (measures[0]?.durationSeconds || 2))) / audioPeaks.length;

        for (let i = 0; i < audioPeaks.length; i++) {
          const val = audioPeaks[i];
          const x = i * peakWidth;
          if (x >= scrollX - 50 && x <= scrollX + width + 50) {
            const h = val * (waveformH - 4);
            ctx.fillRect(x, headerH + waveformH / 2 - h / 2, Math.max(1, peakWidth - 0.5), h);
          }
        }
      }

      // 3. Draw Measures & Subdivisions Ticks
      for (let m = 0; m < measures.length; m++) {
        const mInfo = measures[m];
        const mX = m * pxPerMeasure;

        if (mX >= scrollX - pxPerMeasure && mX <= scrollX + width + pxPerMeasure) {
          // Measure Bar Line
          ctx.strokeStyle = mInfo.barlineVisible ? '#555555' : '#333333';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(mX, 0);
          ctx.lineTo(mX, height);
          ctx.stroke();

          // Measure Number Text
          ctx.fillStyle = '#AAAAAA';
          ctx.font = 'bold 10px sans-serif';
          ctx.fillText(`M${m + 1}`, mX + 4, 14);

          // Subdivision Grid Ticks based on Snap
          const ticksCount = Math.max(4, snap);
          ctx.strokeStyle = '#2D2D2D';
          ctx.lineWidth = 1;

          for (let t = 1; t < ticksCount; t++) {
            const tickX = mX + (t / ticksCount) * pxPerMeasure;
            const isQuarter = t % (ticksCount / 4) === 0;

            ctx.beginPath();
            ctx.moveTo(tickX, isQuarter ? headerH : headerH + waveformH + eventsH);
            ctx.lineTo(tickX, height);
            ctx.strokeStyle = isQuarter ? '#3D3D3D' : '#262626';
            ctx.stroke();
          }
        }
      }

      // 4. Draw Events Markers Track
      for (const ev of chart.events) {
        const evX = (ev.measureIndex + ev.positionInMeasure) * pxPerMeasure;
        if (evX >= scrollX - 50 && evX <= scrollX + width + 50) {
          const evY = headerH + waveformH + 12;

          ctx.beginPath();
          ctx.arc(evX, evY, 5, 0, Math.PI * 2);

          switch (ev.type) {
            case 'BPMCHANGE':
              ctx.fillStyle = '#FFB000';
              break;
            case 'SCROLL':
              ctx.fillStyle = '#00B2FF';
              break;
            case 'MEASURE':
              ctx.fillStyle = '#10B981';
              break;
            case 'GOGOSTART':
            case 'GOGOEND':
              ctx.fillStyle = '#F43F5E';
              break;
            default:
              ctx.fillStyle = '#A855F7';
          }
          ctx.fill();

          // Label
          ctx.fillStyle = '#CCCCCC';
          ctx.font = '9px sans-serif';
          const label = ev.value ? `${ev.type}:${ev.value}` : ev.type;
          ctx.fillText(label, evX + 7, evY + 3);
        }
      }

      // 5. Draw Notes Track
      for (const note of chart.notes) {
        if (note.type === 0) continue;

        const noteX = (note.measureIndex + note.positionInMeasure) * pxPerMeasure;

        if (noteX >= scrollX - 50 && noteX <= scrollX + width + 50) {
          const isSelected = selectedNoteIds.includes(note.id);
          const r = note.type === 3 || note.type === 4 || note.type === 6 ? 12 : 9;

          // Draw long roll/balloon tail line
          if (note.type === 5 || note.type === 6 || note.type === 7) {
            const duration = note.durationSeconds || 0.5;
            const endM = timeToMeasureAndPos(note.timeSeconds + duration, measures);
            const endX = (endM.measureIndex + endM.positionInMeasure) * pxPerMeasure;

            ctx.fillStyle = note.type === 7 ? 'rgba(255, 136, 0, 0.7)' : 'rgba(255, 204, 0, 0.7)';
            ctx.fillRect(noteX, notesLaneY - r / 2, Math.max(5, endX - noteX), r);
          }

          // Draw circle note
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
            // Halo glow for selected note
            ctx.beginPath();
            ctx.arc(noteX, notesLaneY, r + 4, 0, Math.PI * 2);
            ctx.strokeStyle = '#FF5A36';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
      }

      // 6. Draw Playhead Needle
      ctx.strokeStyle = '#FF5A36';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();

      // Top triangle cap on needle
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
  ]);

  // Click & Touch Handlers on Canvas
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;

    // Convert pixel click to measure index and position
    const playheadM = timeToMeasureAndPos(currentTime, measures);
    const scrollX = Math.max(0, (playheadM.measureIndex + playheadM.positionInMeasure) * pxPerMeasure - rect.width * 0.2);

    const targetX = clickX + scrollX;
    const exactMeasure = targetX / pxPerMeasure;
    const measureIndex = Math.floor(exactMeasure);
    const rawPos = exactMeasure - measureIndex;
    const snappedPos = snapPosition(rawPos, snap);

    const timeSeconds = measureAndPosToTime(measureIndex, snappedPos, measures);

    // 1. Check if clicking an existing note
    const clickedNote = chart.notes.find((n) => {
      if (n.type === 0) return false;
      const nX = (n.measureIndex + n.positionInMeasure) * pxPerMeasure;
      return Math.abs(nX - targetX) < 18;
    });

    if (clickedNote) {
      if (activeTool === 'delete') {
        onDeleteNote(clickedNote.id);
        return;
      }

      onSelectNotes([clickedNote.id]);
      audioEngine.playHitSound(clickedNote.type);
      setDraggedNoteId(clickedNote.id);
      return;
    }

    // 2. If clicking header or empty spot with Place tool -> Add Note or Seek
    if (activeTool === 'place' && selectedNoteType !== 0) {
      const newNote: Note = {
        id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: selectedNoteType,
        measureIndex,
        positionInMeasure: snappedPos,
        timeSeconds,
        durationSeconds: selectedNoteType === 5 || selectedNoteType === 6 || selectedNoteType === 7 ? 0.5 : undefined,
      };

      onAddNote(newNote);
      audioEngine.playHitSound(selectedNoteType);
    } else {
      // Seek playhead time
      onSeekTime(timeSeconds);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draggedNoteId) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;

    const playheadM = timeToMeasureAndPos(currentTime, measures);
    const scrollX = Math.max(0, (playheadM.measureIndex + playheadM.positionInMeasure) * pxPerMeasure - rect.width * 0.2);

    const targetX = clickX + scrollX;
    const exactMeasure = Math.max(0, targetX / pxPerMeasure);
    const measureIndex = Math.floor(exactMeasure);
    const rawPos = exactMeasure - measureIndex;
    const snappedPos = snapPosition(rawPos, snap);

    onMoveNote(draggedNoteId, measureIndex, snappedPos);
  };

  const handlePointerUp = () => {
    setDraggedNoteId(null);
  };

  return (
    <div
      ref={containerRef}
      className="h-[110px] sm:h-[150px] max-h-[30vh] bg-[#181818] border-t border-[#3A3A3A] relative select-none touch-none shrink-0"
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="w-full h-full block cursor-crosshair"
      />
    </div>
  );
};
