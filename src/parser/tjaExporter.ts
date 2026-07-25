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
    // 1. Output events at start of measure or inside measure
    const measureEvents = chart.events.filter((e) => e.measureIndex === m);
    for (const ev of measureEvents) {
      switch (ev.type) {
        case 'BPMCHANGE':
          lines.push(`#BPMCHANGE ${ev.value}`);
          break;
        case 'MEASURE':
          lines.push(`#MEASURE ${ev.numerator || 4}/${ev.denominator || 4}`);
          break;
        case 'SCROLL':
          lines.push(`#SCROLL ${ev.value}`);
          break;
        case 'DELAY':
          lines.push(`#DELAY ${ev.value}`);
          break;
        case 'GOGOSTART':
          lines.push('#GOGOSTART');
          break;
        case 'GOGOEND':
          lines.push('#GOGOEND');
          break;
        case 'BARLINEON':
          lines.push('#BARLINEON');
          break;
        case 'BARLINEOFF':
          lines.push('#BARLINEOFF');
          break;
        case 'LYRIC':
          lines.push(`#LYRIC ${ev.text || ''}`);
          break;
      }
    }

    // 2. Build note string for measure m
    const measureNotes = chart.notes.filter((n) => n.measureIndex === m);

    if (measureNotes.length === 0) {
      lines.push('0000,');
    } else {
      // Determine resolution needed (e.g. 4, 8, 12, 16, 24, 32, 48)
      let targetLen = 16; // default 16th notes
      // Check if any note requires higher resolution
      for (const n of measureNotes) {
        const p = n.positionInMeasure;
        if (Math.abs(p * 48 - Math.round(p * 48)) < 0.001) {
          if (Math.abs(p * 16 - Math.round(p * 16)) > 0.001) {
            targetLen = 48; // 48th notes required
          }
        }
      }

      const grid = new Array(targetLen).fill('0');
      for (const n of measureNotes) {
        const idx = Math.min(targetLen - 1, Math.round(n.positionInMeasure * targetLen));
        grid[idx] = String(n.type);
      }

      lines.push(grid.join('') + ',');
    }
  }

  lines.push('#END');
  return lines.join('\n');
}
