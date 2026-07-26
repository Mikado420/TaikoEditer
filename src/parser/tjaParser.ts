import { ChartEvent, ChartHeader, Note, NoteType, TaikoChart } from '../types/chart';

type BufferItem =
  | { type: 'note'; char: string }
  | {
      type: 'command';
      name: string;
      arg: string;
      eventId: string;
    };

/**
 * Parses a TJA text format file into a TaikoChart structure with exact intra-measure event positioning.
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
  let measureBuffer: BufferItem[] = [];

  // Helper to commit buffer items on measure delimiter (',')
  const commitMeasureBuffer = (mIdx: number) => {
    const totalNotesInMeasure = measureBuffer.filter((i) => i.type === 'note').length;
    let noteIndex = 0;

    for (const item of measureBuffer) {
      const posInMeasure =
        totalNotesInMeasure > 0 ? noteIndex / totalNotesInMeasure : 0.0;

      if (item.type === 'note') {
        const noteDigit = parseInt(item.char, 10);
        if (!isNaN(noteDigit) && noteDigit > 0 && noteDigit <= 8) {
          notes.push({
            id: `note_${mIdx}_${noteIndex}_${Math.random().toString(36).substring(2, 6)}`,
            type: noteDigit as NoteType,
            measureIndex: mIdx,
            positionInMeasure: posInMeasure,
            timeSeconds: 0,
          });
        }
        noteIndex++;
      } else if (item.type === 'command') {
        const { name, arg, eventId } = item;
        if (name === 'BPMCHANGE') {
          events.push({
            id: eventId,
            type: 'BPMCHANGE',
            measureIndex: mIdx,
            positionInMeasure: posInMeasure,
            timeSeconds: 0,
            value: parseFloat(arg) || 120,
          });
        } else if (name === 'MEASURE') {
          const mParts = arg.split('/');
          if (mParts.length === 2) {
            events.push({
              id: eventId,
              type: 'MEASURE',
              measureIndex: mIdx,
              positionInMeasure: posInMeasure,
              timeSeconds: 0,
              numerator: parseInt(mParts[0], 10) || 4,
              denominator: parseInt(mParts[1], 10) || 4,
            });
          }
        } else if (name === 'SCROLL') {
          events.push({
            id: eventId,
            type: 'SCROLL',
            measureIndex: mIdx,
            positionInMeasure: posInMeasure,
            timeSeconds: 0,
            value: parseFloat(arg) || 1.0,
          });
        } else if (name === 'GOGOSTART') {
          events.push({
            id: eventId,
            type: 'GOGOSTART',
            measureIndex: mIdx,
            positionInMeasure: posInMeasure,
            timeSeconds: 0,
          });
        } else if (name === 'GOGOEND') {
          events.push({
            id: eventId,
            type: 'GOGOEND',
            measureIndex: mIdx,
            positionInMeasure: posInMeasure,
            timeSeconds: 0,
          });
        } else if (name === 'DELAY') {
          events.push({
            id: eventId,
            type: 'DELAY',
            measureIndex: mIdx,
            positionInMeasure: posInMeasure,
            timeSeconds: 0,
            value: parseFloat(arg) || 0,
          });
        } else if (name === 'BARLINEON') {
          events.push({
            id: eventId,
            type: 'BARLINEON',
            measureIndex: mIdx,
            positionInMeasure: posInMeasure,
            timeSeconds: 0,
          });
        } else if (name === 'BARLINEOFF') {
          events.push({
            id: eventId,
            type: 'BARLINEOFF',
            measureIndex: mIdx,
            positionInMeasure: posInMeasure,
            timeSeconds: 0,
          });
        } else if (name === 'LYRIC') {
          events.push({
            id: eventId,
            type: 'LYRIC',
            measureIndex: mIdx,
            positionInMeasure: posInMeasure,
            timeSeconds: 0,
            text: arg,
          });
        }
      }
    }
  };

  // Parse lines
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
      measureBuffer = [];
      continue;
    }

    if (rawLine.toUpperCase().startsWith('#END')) {
      inCommandSection = false;
      break;
    }

    if (inCourse && inCommandSection) {
      if (rawLine.startsWith('#')) {
        const cmdParts = rawLine.slice(1).trim().split(/\s+/);
        const cmdName = cmdParts[0].toUpperCase();
        const cmdArg = cmdParts.slice(1).join(' ');
        const eventId = `ev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        measureBuffer.push({
          type: 'command',
          name: cmdName,
          arg: cmdArg,
          eventId,
        });
      } else {
        const chars = rawLine.split('');
        for (const char of chars) {
          if (char === ',') {
            commitMeasureBuffer(currentMeasureIndex);
            currentMeasureIndex++;
            measureBuffer = [];
          } else if (/[0-8]/.test(char)) {
            measureBuffer.push({ type: 'note', char });
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
