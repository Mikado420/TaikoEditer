import React, { useEffect, useRef, useState } from 'react';
import {
  MeasureInfo,
  Note,
  NoteType,
  SnapValue,
  TaikoChart,
  ZoomValue,
} from '../types/chart';
import { getScrollAtPosition, measureAndPosToTime, snapPosition, timeToMeasureAndPos } from '../utils/timeMath';
import { audioEngine } from '../audio/audioEngine';

interface UnifiedEditorCanvasProps {
  chart: TaikoChart;
  measures: MeasureInfo[];
  currentTime: number;
  isPlaying: boolean;
  renderMode?: 'edit' | 'play';
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
  renderMode: propRenderMode,
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
  const renderMode = propRenderMode || (isPlaying ? 'play' : 'edit');
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

  // Base layout pixels per measure (Official Taiko density: 16th notes tile seamlessly edge-to-edge)
  const basePxPerMeasure = 784;
  const pxPerMeasure = basePxPerMeasure * zoom;

  // Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Active measure info
      const activeMeasure =
        measures.find(
          (m) =>
            currentTime >= m.timeSeconds &&
            currentTime < m.timeSeconds + m.durationSeconds
        ) || measures[0] || { bpm: chart.header.bpm || 120, scroll: 1.0, isGogo: false };

      const isGogo = activeMeasure.isGogo;
      const isPlayGogo = renderMode === 'play' && isGogo;

      // 1. Stage Background (Pure deep dark background matching reference screenshot)
      if (isPlayGogo) {
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#2D0500');
        grad.addColorStop(0.5, '#591000');
        grad.addColorStop(1, '#1E0300');
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = '#070709';
      }
      ctx.fillRect(0, 0, width, height);

      // Fixed Layout Metrics: keep lane scale and judge line fixed
      const miniMapHeight = 22;
      const laneHeight = 116;
      const laneY = height * 0.52;
      const laneTopY = laneY - laneHeight / 2;
      const notesY = laneTopY + laneHeight / 2;

      // Note Sizes (Fixed standard & big ratios)
      const radiusStandard = 24.5; // Diameter = 49px (exactly equals 16th note step 784/16 = 49px)
      const radiusBig = 36;        // Diameter = 72px

      // Fixed Judge Line offset from left edge (does not stretch or shift when screen width changes)
      const judgeX = 180;

      // -------------------------------------------------------------
      // Top Mini-Map (Sub-track overview bar showing all notes)
      // -------------------------------------------------------------
      const miniMapTopY = laneTopY - miniMapHeight - 4;
      ctx.fillStyle = '#0C0C10';
      ctx.fillRect(0, miniMapTopY, width, miniMapHeight);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, miniMapTopY, width, miniMapHeight);

      // Mini-map notes & measure markers
      const totalMeasures = Math.max(1, measures.length);
      const miniMapWidthPerMeasure = width / Math.max(8, totalMeasures);

      // Render barlines in mini-map
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      for (let m = 0; m <= totalMeasures; m++) {
        const mx = m * miniMapWidthPerMeasure;
        ctx.beginPath();
        ctx.moveTo(mx, miniMapTopY);
        ctx.lineTo(mx, miniMapTopY + miniMapHeight);
        ctx.stroke();
      }

      // Render mini note dots
      for (const note of chart.notes) {
        if (note.type === 0) continue;
        const noteMVal = note.measureIndex + note.positionInMeasure;
        const nx = noteMVal * miniMapWidthPerMeasure;
        const ny = miniMapTopY + miniMapHeight / 2;
        const isBig = note.type === 3 || note.type === 4 || note.type === 6;
        const nr = isBig ? 3.5 : 2.2;

        ctx.beginPath();
        ctx.arc(nx, ny, nr, 0, Math.PI * 2);

        if (note.type === 1 || note.type === 3) {
          ctx.fillStyle = '#F04C28';
        } else if (note.type === 2 || note.type === 4) {
          ctx.fillStyle = '#38BDF8';
        } else if (note.type === 5 || note.type === 6) {
          ctx.fillStyle = '#FACC15';
        } else {
          ctx.fillStyle = '#FB923C';
        }
        ctx.fill();
      }

      // Current playback view frame indicator on Mini-Map
      const currentM = timeToMeasureAndPos(currentTime, measures);
      const currentPosVal = currentM.measureIndex + currentM.positionInMeasure;
      const playHeadMiniX = currentPosVal * miniMapWidthPerMeasure;

      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(playHeadMiniX, miniMapTopY);
      ctx.lineTo(playHeadMiniX, miniMapTopY + miniMapHeight);
      ctx.stroke();

      // -------------------------------------------------------------
      // 2. Main Taiko Lane Strip
      // -------------------------------------------------------------
      ctx.fillStyle = isPlayGogo ? '#220600' : '#121215';
      ctx.fillRect(0, laneTopY, width, laneHeight);
      ctx.strokeStyle = isPlayGogo ? '#FF4400' : '#3F3F46';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(0, laneTopY, width, laneHeight);

      // -------------------------------------------------------------
      // 4. Judgment Ring (Golden Ring Frame matching reference screenshot)
      // -------------------------------------------------------------
      // Outer Golden Circle
      ctx.beginPath();
      ctx.arc(judgeX, notesY, radiusBig + 5, 0, Math.PI * 2);
      ctx.strokeStyle = '#EAB308';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Inner Golden Circle
      ctx.beginPath();
      ctx.arc(judgeX, notesY, radiusStandard + 3, 0, Math.PI * 2);
      ctx.strokeStyle = '#EAB308';
      ctx.lineWidth = 2.0;
      ctx.stroke();

      // Center Dot Marker
      ctx.beginPath();
      ctx.arc(judgeX, notesY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#94A3B8';
      ctx.fill();

      // Left Playback Hexagon Icon (Reference Match)
      const hexX = judgeX - radiusBig - 22;
      if (hexX > 20) {
        ctx.save();
        ctx.beginPath();
        const hexR = 14;
        for (let i = 0; i < 6; i++) {
          const a = (i * 60 * Math.PI) / 180;
          const hx = hexX + hexR * Math.cos(a);
          const hy = notesY + hexR * Math.sin(a);
          if (i === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.fillStyle = '#334155';
        ctx.fill();
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Inner play triangle icon inside hexagon
        ctx.beginPath();
        ctx.moveTo(hexX - 3, notesY - 5);
        ctx.lineTo(hexX + 5, notesY);
        ctx.lineTo(hexX - 3, notesY + 5);
        ctx.closePath();
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.restore();
      }

      // -------------------------------------------------------------
      // 5. Grid Lines & Measure Barlines (SCROLL applied during play)
      // -------------------------------------------------------------
      for (let m = 0; m < measures.length; m++) {
        const mScroll = isPlaying ? getScrollAtPosition(m, 0, chart.events) : 1.0;
        const mX = judgeX + (m - currentPosVal) * pxPerMeasure * mScroll;

        if (mX >= -100 && mX <= width + 100) {
          // Major Measure Line
          if (measures[m].barlineVisible) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(mX, laneTopY);
            ctx.lineTo(mX, laneTopY + laneHeight);
            ctx.stroke();

            // Measure Number Label
            ctx.fillStyle = '#A1A1AA';
            ctx.font = 'bold 11px sans-serif';
            ctx.fillText(`${m + 1}`, mX + 5, laneTopY + 14);
          }

          // Sub-grid ticks according to Snap
          const ticksCount = Math.max(4, snap);
          for (let t = 1; t < ticksCount; t++) {
            const posInM = t / ticksCount;
            const tickScroll = isPlaying ? getScrollAtPosition(m, posInM, chart.events) : 1.0;
            const tickMVal = m + posInM;
            const tickX = judgeX + (tickMVal - currentPosVal) * pxPerMeasure * tickScroll;
            const isQuarter = t % (ticksCount / 4) === 0;

            if (tickX >= -20 && tickX <= width + 20) {
              ctx.beginPath();
              ctx.moveTo(tickX, laneTopY);
              ctx.lineTo(tickX, laneTopY + laneHeight);
              ctx.strokeStyle = isQuarter ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)';
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }
        }
      }

      // -------------------------------------------------------------
      // 6. Draw Events (#SCROLL, #BPMCHANGE, #GOGO)
      // -------------------------------------------------------------
      for (const ev of chart.events) {
        const evScroll = isPlaying ? getScrollAtPosition(ev.measureIndex, ev.positionInMeasure, chart.events) : 1.0;
        const evMVal = ev.measureIndex + ev.positionInMeasure;
        const evX = judgeX + (evMVal - currentPosVal) * pxPerMeasure * evScroll;

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

          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(evX, laneTopY);
          ctx.lineTo(evX, laneTopY + laneHeight);
          ctx.stroke();

          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(evX, laneTopY - 6, 3.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.font = '9px sans-serif';
          ctx.fillText(ev.value ? `${ev.type}:${ev.value}` : ev.type, evX + 5, laneTopY - 4);
        }
      }

      // -------------------------------------------------------------
      // 7. Active Pending Roll Start Point Line
      // -------------------------------------------------------------
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

      // -------------------------------------------------------------
      // 8. Hit Sound Scheduler & Notes Rendering
      // -------------------------------------------------------------
      if (isPlaying) {
        const fromT = lastTimeRef.current;
        const toT = currentTime;

        if (toT > fromT) {
          for (const note of chart.notes) {
            if (note.type === 0) continue;
            const nTime = measureAndPosToTime(note.measureIndex, note.positionInMeasure, measures);
            if (
              nTime >= fromT - 0.015 &&
              nTime <= toT + 0.015 &&
              !playedNoteIdsRef.current.has(note.id)
            ) {
              playedNoteIdsRef.current.add(note.id);
              audioEngine.playHitSound(note.type);
            }
          }
        }
        lastTimeRef.current = currentTime;
      }

      // Notes ordered front-to-back (near judgeX rendered on top)
      const renderNotes = [...chart.notes]
        .filter((n) => n.type !== 0)
        .sort((a, b) => {
          const posA = a.measureIndex + a.positionInMeasure;
          const posB = b.measureIndex + b.positionInMeasure;
          return posB - posA;
        });

      for (const note of renderNotes) {
        const noteTime = measureAndPosToTime(note.measureIndex, note.positionInMeasure, measures);
        const noteScroll = getScrollAtPosition(note.measureIndex, note.positionInMeasure, chart.events);
        const effectiveScroll = isPlaying ? noteScroll : 1.0;

        const noteMVal = note.measureIndex + note.positionInMeasure;
        const noteX = judgeX + (noteMVal - currentPosVal) * pxPerMeasure * effectiveScroll;

        if (noteX >= -120 && noteX <= width + 120) {
          const isSelected = selectedNoteIds.includes(note.id);
          const isBig = note.type === 3 || note.type === 4 || note.type === 6;
          const r = isBig ? radiusBig : radiusStandard;

          // Draw long roll / balloon body
          if (note.type === 5 || note.type === 6 || note.type === 7) {
            const duration = note.durationSeconds || 0.5;
            const endM = timeToMeasureAndPos(noteTime + duration, measures);
            const endMVal = endM.measureIndex + endM.positionInMeasure;
            const endScroll = getScrollAtPosition(endM.measureIndex, endM.positionInMeasure, chart.events);
            const effectiveEndScroll = isPlaying ? endScroll : 1.0;
            const endX = judgeX + (endMVal - currentPosVal) * pxPerMeasure * effectiveEndScroll;

            const bodyColor = note.type === 7 ? '#FB923C' : '#FACC15';
            ctx.fillStyle = bodyColor;
            
            // Capsule body shape
            ctx.beginPath();
            ctx.arc(noteX, notesY, r, Math.PI / 2, -Math.PI / 2);
            ctx.lineTo(endX, notesY - r);
            ctx.arc(endX, notesY, r, -Math.PI / 2, Math.PI / 2);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // Inner white body line
            ctx.beginPath();
            ctx.arc(noteX, notesY, r * 0.65, Math.PI / 2, -Math.PI / 2);
            ctx.lineTo(endX, notesY - r * 0.65);
            ctx.arc(endX, notesY, r * 0.65, -Math.PI / 2, Math.PI / 2);
            ctx.closePath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }

          // Note Head Circle
          ctx.beginPath();
          ctx.arc(noteX, notesY, r, 0, Math.PI * 2);

          let noteColor = '#F04C28';
          let innerDarkColor = '#991B1B';

          switch (note.type) {
            case 1:
            case 3:
              noteColor = '#F04C28';
              innerDarkColor = '#991B1B';
              break;
            case 2:
            case 4:
              noteColor = '#38BDF8';
              innerDarkColor = '#0369A1';
              break;
            case 5:
            case 6:
              noteColor = '#FACC15';
              innerDarkColor = '#CA8A04';
              break;
            case 7:
              noteColor = '#FB923C';
              innerDarkColor = '#C2410C';
              break;
            case 8:
              noteColor = '#FACC15';
              innerDarkColor = '#CA8A04';
              break;
          }

          ctx.fillStyle = noteColor;
          ctx.fill();

          ctx.strokeStyle = isSelected ? '#FFFFFF' : '#000000';
          ctx.lineWidth = isSelected ? 3.5 : 2.5;
          ctx.stroke();

          // Inner white detail ring for DON / KAT
          if (note.type === 1 || note.type === 2 || note.type === 3 || note.type === 4) {
            ctx.beginPath();
            ctx.arc(noteX, notesY, r * 0.66, 0, Math.PI * 2);
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = isBig ? 2.5 : 2.0;
            ctx.stroke();

            // Authentic Tomoe (3-Swirl Emblem) in center for genuine Taiko aesthetic
            ctx.save();
            ctx.fillStyle = innerDarkColor;
            const tomoeR = r * 0.32;
            for (let i = 0; i < 3; i++) {
              const angle = (i * 120 * Math.PI) / 180;
              ctx.save();
              ctx.translate(noteX, notesY);
              ctx.rotate(angle);
              ctx.beginPath();
              ctx.arc(0, -tomoeR * 0.6, tomoeR * 0.55, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            }
            ctx.restore();
          }

          // Highlight selection ring
          if (isSelected) {
            ctx.beginPath();
            ctx.arc(noteX, notesY, r + 4, 0, Math.PI * 2);
            ctx.strokeStyle = '#FF5A36';
            ctx.lineWidth = 2.5;
            ctx.stroke();
          }
        }
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (rect.width > 0 && rect.height > 0) {
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
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
      const judgeX = 180;

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
