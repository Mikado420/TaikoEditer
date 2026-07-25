import { ChartEvent, ChartHeader, Note, NoteType, TaikoChart } from '../types/chart';

/**
 * Parses a TJA text format file into a TaikoChart structure.
 */
export function parseTja(tjaContent: string): TaikoChart {
  const lines = tjaContent.split(/\r?\n/);

  const header: ChartHeader = {
    title: 'New Chart',
    subtitle: '',
    wave: '',
    offset: 0,
    demoStart: 0,
    genre: '',
    course: 'Oni',
    level: 8,
    scoreInit: 1000,
    scoreDiff: 250,
    balloon: [],
    creator: '',
    bpm: 120,
  };

  let inCourse = false;
  let inCommandSection = false;

  const notes: Note[] = [];
  const events: ChartEvent[] = [];

  let currentMeasureIndex = 0;
  let measureNoteBuffer: { char: string; rawLine: string }[] = [];

  // Parse header lines and find target course
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine || rawLine.startsWith('//')) continue;

    if (!inCommandSection) {
      const matchHeader = rawLine.match(/^([A-Z0-9]+)\s*:\s*(.*)$/i);
      if (matchHeader) {
        const key = matchHeader[1].toUpperCase();
        const value = matchHeader[2].trim();

        switch (key) {
          case 'TITLE':
            header.title = value;
            break;
          case 'SUBTITLE':
            header.subtitle = value.replace(/^--\s*/, '');
            break;
          case 'WAVE':
            header.wave = value;
            break;
          case 'OFFSET':
            header.offset = parseFloat(value) || 0;
            break;
          case 'DEMOSTART':
            header.demoStart = parseFloat(value) || 0;
            break;
          case 'GENRE':
            header.genre = value;
            break;
          case 'COURSE':
            header.course = value;
            break;
          case 'LEVEL':
            header.level = parseInt(value, 10) || 8;
            break;
          case 'BPM':
            header.bpm = parseFloat(value) || 120;
            break;
          case 'SCOREINIT':
            header.scoreInit = parseInt(value, 10) || 1000;
            break;
          case 'SCOREDIFF':
            header.scoreDiff = parseInt(value, 10) || 250;
            break;
          case 'BALLOON':
            header.balloon = value
              .split(/[,:]/)
              .map((v) => parseInt(v.trim(), 10))
              .filter((v) => !isNaN(v));
            break;
          case 'MAKER':
          case 'CREATOR':
            header.creator = value;
            break;
        }
      }
    }

    if (rawLine.toUpperCase().startsWith('#START')) {
      inCommandSection = true;
      inCourse = true;
      currentMeasureIndex = 0;
      measureNoteBuffer = [];
      continue;
    }

    if (rawLine.toUpperCase().startsWith('#END')) {
      inCommandSection = false;
      break; // Finish parsing first course for simplicity
    }

    if (inCourse && inCommandSection) {
      if (rawLine.startsWith('#')) {
        // Event command tag inside course
        const cmdParts = rawLine.slice(1).trim().split(/\s+/);
        const cmdName = cmdParts[0].toUpperCase();
        const cmdArg = cmdParts.slice(1).join(' ');

        // Position of command within current measure buffer
        // If buffer has items, position = buffer.length / estimate
        // For simplicity, event before measure end attaches at measureIndex with position = 0 or relative to buffer
        const pos = measureNoteBuffer.length > 0 ? 0.0 : 0.0;

        const eventId = `ev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        if (cmdName === 'BPMCHANGE') {
          events.push({
            id: eventId,
            type: 'BPMCHANGE',
            measureIndex: currentMeasureIndex,
            positionInMeasure: pos,
            timeSeconds: 0,
            value: parseFloat(cmdArg) || 120,
          });
        } else if (cmdName === 'MEASURE') {
          const mParts = cmdArg.split('/');
          if (mParts.length === 2) {
            events.push({
              id: eventId,
              type: 'MEASURE',
              measureIndex: currentMeasureIndex,
              positionInMeasure: pos,
              timeSeconds: 0,
              numerator: parseInt(mParts[0], 10) || 4,
              denominator: parseInt(mParts[1], 10) || 4,
            });
          }
        } else if (cmdName === 'SCROLL') {
          events.push({
            id: eventId,
            type: 'SCROLL',
            measureIndex: currentMeasureIndex,
            positionInMeasure: pos,
            timeSeconds: 0,
            value: parseFloat(cmdArg) || 1.0,
          });
        } else if (cmdName === 'GOGOSTART') {
          events.push({ id: eventId, type: 'GOGOSTART', measureIndex: currentMeasureIndex, positionInMeasure: pos, timeSeconds: 0 });
        } else if (cmdName === 'GOGOEND') {
          events.push({ id: eventId, type: 'GOGOEND', measureIndex: currentMeasureIndex, positionInMeasure: pos, timeSeconds: 0 });
        } else if (cmdName === 'DELAY') {
          events.push({ id: eventId, type: 'DELAY', measureIndex: currentMeasureIndex, positionInMeasure: pos, timeSeconds: 0, value: parseFloat(cmdArg) || 0 });
        } else if (cmdName === 'BARLINEON') {
          events.push({ id: eventId, type: 'BARLINEON', measureIndex: currentMeasureIndex, positionInMeasure: pos, timeSeconds: 0 });
        } else if (cmdName === 'BARLINEOFF') {
          events.push({ id: eventId, type: 'BARLINEOFF', measureIndex: currentMeasureIndex, positionInMeasure: pos, timeSeconds: 0 });
        } else if (cmdName === 'LYRIC') {
          events.push({ id: eventId, type: 'LYRIC', measureIndex: currentMeasureIndex, positionInMeasure: pos, timeSeconds: 0, text: cmdArg });
        }
      } else {
        // Line containing note digits (0-8) and possibly ',' at the end
        const chars = rawLine.split('');
        for (const char of chars) {
          if (char === ',') {
            // End of measure reached! Flush measureNoteBuffer
            const totalInMeasure = measureNoteBuffer.length;
            if (totalInMeasure > 0) {
              measureNoteBuffer.forEach((item, idx) => {
                const noteDigit = parseInt(item.char, 10);
                if (!isNaN(noteDigit) && noteDigit > 0 && noteDigit <= 8) {
                  const posInMeasure = idx / totalInMeasure;
                  notes.push({
                    id: `note_${currentMeasureIndex}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
                    type: noteDigit as NoteType,
                    measureIndex: currentMeasureIndex,
                    positionInMeasure: posInMeasure,
                    timeSeconds: 0,
                  });
                }
              });
            }
            currentMeasureIndex++;
            measureNoteBuffer = [];
          } else if (/[0-8]/.test(char)) {
            measureNoteBuffer.push({ char, rawLine });
          }
        }
      }
    }
  }

  return {
    id: `chart_${Date.now()}`,
    header,
    notes,
    events,
    updatedAt: Date.now(),
  };
}
