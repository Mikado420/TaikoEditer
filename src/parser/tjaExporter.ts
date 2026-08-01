import { TaikoChart } from '../types/chart';

/**
 * Converts a TaikoChart object back into standard TJA text format.
 */
export function exportToTja(chart: TaikoChart): string {
  const h = chart.header;
  const lines: string[] = [];

  // Headers
  lines.push(`TITLE:${h.title}`);
  if (h.subtitle) lines.push(`SUBTITLE:-- ${h.subtitle}`);
  lines.push(`BPM:${h.bpm}`);
  lines.push(`WAVE:${h.wave || 'sound.mp3'}`);
  lines.push(`OFFSET:${h.offset}`);
  lines.push(`DEMOSTART:${h.demoStart || 0}`);
  if (h.genre) lines.push(`GENRE:${h.genre}`);
  lines.push(`COURSE:${h.course || 'Oni'}`);
  lines.push(`LEVEL:${h.level || 8}`);
  lines.push(`SCOREINIT:${h.scoreInit || 1000}`);
  lines.push(`SCOREDIFF:${h.scoreDiff || 250}`);
  if (h.balloon && h.balloon.length > 0) {
    lines.push(`BALLOON:${h.balloon.join(',')}`);
  }
  if (h.creator) lines.push(`MAKER:${h.creator}`);

  lines.push('');
  lines.push(`COURSE:${h.course || 'Oni'}`);
  lines.push('#START');

  // Find maximum measure index that has notes or events
  let maxMeasure = 0;
  chart.notes.forEach((n) => {
    if (n.measureIndex > maxMeasure) maxMeasure = n.measureIndex;
  });
  chart.events.forEach((e) => {
    if (e.measureIndex > maxMeasure) maxMeasure = e.measureIndex;
  });

  for (let m = 0; m <= maxMeasure; m++) {
    const measureEvents = chart.events.filter((e) => e.measureIndex === m);
    const measureNotes = chart.notes.filter((n) => n.measureIndex === m);

    // Format an event command string
    const formatEventLine = (ev: (typeof measureEvents)[0]): string => {
      switch (ev.type) {
        case 'BPMCHANGE':
          return `#BPMCHANGE ${ev.value}`;
        case 'MEASURE':
          return `#MEASURE ${ev.numerator || 4}/${ev.denominator || 4}`;
        case 'SCROLL':
          return `#SCROLL ${ev.value}`;
        case 'DELAY':
          return `#DELAY ${ev.value}`;
        case 'GOGOSTART':
          return '#GOGOSTART';
        case 'GOGOEND':
          return '#GOGOEND';
        case 'BARLINEON':
          return '#BARLINEON';
        case 'BARLINEOFF':
          return '#BARLINEOFF';
        case 'LYRIC':
          return `#LYRIC ${ev.text || ''}`;
        default:
          return '';
      }
    };

    if (measureNotes.length === 0) {
      // Check if any events are positioned inside the measure (> 0)
      const hasIntraEvents = measureEvents.some((e) => e.positionInMeasure > 0.01);

      if (!hasIntraEvents) {
        for (const ev of measureEvents) {
          const line = formatEventLine(ev);
          if (line) lines.push(line);
        }
        lines.push('0000,');
      } else {
        // Build 16th grid for measure without notes but with intra-measure events
        const targetLen = 16;
        const grid = new Array(targetLen).fill('0');

        for (let i = 0; i < targetLen; i++) {
          const eventsAtI = measureEvents.filter((ev) => {
            const idx = Math.min(targetLen - 1, Math.round(ev.positionInMeasure * targetLen));
            return idx === i;
          });
          for (const ev of eventsAtI) {
            const line = formatEventLine(ev);
            if (line) lines.push(line);
          }
          lines.push(grid[i]);
        }
        lines.push(',');
      }
    } else {
      // Determine resolution (default 16, or 48 if required)
      let targetLen = 16;
      for (const n of measureNotes) {
        const p = n.positionInMeasure;
        if (Math.abs(p * 48 - Math.round(p * 48)) < 0.001) {
          if (Math.abs(p * 16 - Math.round(p * 16)) > 0.001) {
            targetLen = 48;
          }
        }
      }

      const grid = new Array(targetLen).fill('0');
      for (const n of measureNotes) {
        const idx = Math.min(targetLen - 1, Math.round(n.positionInMeasure * targetLen));
        grid[idx] = String(n.type);
      }

      let currentLineBuffer = '';
      for (let i = 0; i < targetLen; i++) {
        const eventsAtI = measureEvents.filter((ev) => {
          const idx = Math.min(targetLen - 1, Math.round(ev.positionInMeasure * targetLen));
          return idx === i;
        });

        if (eventsAtI.length > 0) {
          if (currentLineBuffer) {
            lines.push(currentLineBuffer);
            currentLineBuffer = '';
          }
          for (const ev of eventsAtI) {
            const line = formatEventLine(ev);
            if (line) lines.push(line);
          }
        }
        currentLineBuffer += grid[i];
      }

      if (currentLineBuffer) {
        lines.push(currentLineBuffer + ',');
      } else {
        lines.push(',');
      }
    }
  }

  lines.push('#END');
  return lines.join('\n');
}
