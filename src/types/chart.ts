/**
 * Taiko Chart Data Definitions & Types
 */

export type NoteType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface Note {
  id: string;
  type: NoteType;
  measureIndex: number; // 0-based
  positionInMeasure: number; // 0.0 to 1.0 fraction of measure length
  timeSeconds: number; // absolute audio time in seconds
  durationSeconds?: number; // duration for roll/balloon
  endMeasureIndex?: number;
  endPositionInMeasure?: number;
  hitsRequired?: number; // balloon count
  selected?: boolean;
}

export type EventType =
  | 'BPMCHANGE'
  | 'SCROLL'
  | 'MEASURE'
  | 'DELAY'
  | 'GOGOSTART'
  | 'GOGOEND'
  | 'BARLINEON'
  | 'BARLINEOFF'
  | 'BRANCHSTART'
  | 'BRANCHEND'
  | 'SECTION'
  | 'LEVELHOLD'
  | 'LYRIC';

export interface ChartEvent {
  id: string;
  type: EventType;
  measureIndex: number; // 0-based
  positionInMeasure: number; // 0.0 to 1.0 fraction
  timeSeconds: number; // absolute time in seconds
  value?: number; // BPM value or Scroll speed value or Delay seconds
  text?: string; // Lyric text or branch parameters
  numerator?: number; // Measure numerator (e.g. 4)
  denominator?: number; // Measure denominator (e.g. 4)
}

export interface ChartHeader {
  title: string;
  subtitle: string;
  wave: string;
  offset: number; // TJA offset in seconds
  demoStart: number;
  genre: string;
  course: string; // Easy, Normal, Hard, Oni, Edit/Ura
  level: number;
  scoreInit: number;
  scoreDiff: number;
  balloon: number[];
  creator: string;
  bpm: number; // Base initial BPM
}

export interface MeasureInfo {
  index: number;
  timeSeconds: number;
  durationSeconds: number;
  bpm: number;
  scroll: number;
  numerator: number;
  denominator: number;
  barlineVisible: boolean;
  isGogo: boolean;
  startMeasurePos: number; // cumulative start position in standard 4/4 measure units
  measureLengthRatio: number; // numerator / denominator (e.g. 4/4 = 1.0, 3/4 = 0.75, 7/8 = 0.875)
}

export interface TaikoChart {
  id: string;
  header: ChartHeader;
  notes: Note[];
  events: ChartEvent[];
  updatedAt: number;
}

export type SnapValue = 1 | 2 | 3 | 4 | 6 | 8 | 12 | 16 | 24 | 32 | 48 | 64 | number;

export type ZoomValue = 0.25 | 0.5 | 0.75 | 1.0 | 1.5 | 2.0 | 4.0 | 8.0;

export interface EditorState {
  currentChart: TaikoChart;
  selectedNoteType: NoteType;
  activeTool: 'place' | 'select' | 'delete';
  snap: SnapValue;
  zoom: ZoomValue;
  playbackSpeed: number; // 0.25 to 2.0
  isPlaying: boolean;
  currentTime: number; // in seconds
  selectedNoteIds: string[];
  selectedEventIds: string[];
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  autoSaveStatus: 'saved' | 'saving' | 'error';
  audioFileName: string | null;
  audioDuration: number;
  isAudioLoaded: boolean;
}
