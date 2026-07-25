import { TaikoChart } from '../types/chart';

export const SAMPLE_CHARTS: TaikoChart[] = [
  {
    id: 'sample_saitama_2000',
    header: {
      title: 'Saitama 2000 (Sample)',
      subtitle: '太鼓の達人 サンプル譜面',
      wave: 'saitama_sample.mp3',
      offset: 0,
      demoStart: 10,
      genre: 'Namco Original',
      course: 'Oni',
      level: 10,
      scoreInit: 800,
      scoreDiff: 200,
      balloon: [5, 10, 15],
      creator: 'Namco / Editor Demo',
      bpm: 200,
    },
    notes: [
      // Measure 0
      { id: 'n0_1', type: 1, measureIndex: 0, positionInMeasure: 0.0, timeSeconds: 0 },
      { id: 'n0_2', type: 1, measureIndex: 0, positionInMeasure: 0.25, timeSeconds: 0 },
      { id: 'n0_3', type: 2, measureIndex: 0, positionInMeasure: 0.5, timeSeconds: 0 },
      { id: 'n0_4', type: 2, measureIndex: 0, positionInMeasure: 0.75, timeSeconds: 0 },
      // Measure 1
      { id: 'n1_1', type: 1, measureIndex: 1, positionInMeasure: 0.0, timeSeconds: 0 },
      { id: 'n1_2', type: 2, measureIndex: 1, positionInMeasure: 0.125, timeSeconds: 0 },
      { id: 'n1_3', type: 1, measureIndex: 1, positionInMeasure: 0.25, timeSeconds: 0 },
      { id: 'n1_4', type: 2, measureIndex: 1, positionInMeasure: 0.375, timeSeconds: 0 },
      { id: 'n1_5', type: 3, measureIndex: 1, positionInMeasure: 0.5, timeSeconds: 0 },
      { id: 'n1_6', type: 4, measureIndex: 1, positionInMeasure: 0.75, timeSeconds: 0 },
      // Measure 2 (Gogo start)
      { id: 'n2_1', type: 1, measureIndex: 2, positionInMeasure: 0.0, timeSeconds: 0 },
      { id: 'n2_2', type: 1, measureIndex: 2, positionInMeasure: 0.125, timeSeconds: 0 },
      { id: 'n2_3', type: 1, measureIndex: 2, positionInMeasure: 0.25, timeSeconds: 0 },
      { id: 'n2_4', type: 2, measureIndex: 2, positionInMeasure: 0.375, timeSeconds: 0 },
      { id: 'n2_5', type: 1, measureIndex: 2, positionInMeasure: 0.5, timeSeconds: 0 },
      { id: 'n2_6', type: 2, measureIndex: 2, positionInMeasure: 0.625, timeSeconds: 0 },
      { id: 'n2_7', type: 1, measureIndex: 2, positionInMeasure: 0.75, timeSeconds: 0 },
      { id: 'n2_8', type: 2, measureIndex: 2, positionInMeasure: 0.875, timeSeconds: 0 },
      // Measure 3 (Roll & Balloon)
      { id: 'n3_1', type: 5, measureIndex: 3, positionInMeasure: 0.0, timeSeconds: 0, durationSeconds: 0.6 },
      { id: 'n3_2', type: 8, measureIndex: 3, positionInMeasure: 0.5, timeSeconds: 0 },
      { id: 'n3_3', type: 7, measureIndex: 3, positionInMeasure: 0.5, timeSeconds: 0, durationSeconds: 0.5, hitsRequired: 5 },
      { id: 'n3_4', type: 8, measureIndex: 3, positionInMeasure: 0.9, timeSeconds: 0 },
    ],
    events: [
      { id: 'e1', type: 'GOGOSTART', measureIndex: 2, positionInMeasure: 0.0, timeSeconds: 0 },
      { id: 'e2', type: 'GOGOEND', measureIndex: 4, positionInMeasure: 0.0, timeSeconds: 0 },
      { id: 'e3', type: 'BPMCHANGE', measureIndex: 4, positionInMeasure: 0.0, timeSeconds: 0, value: 210 },
      { id: 'e4', type: 'SCROLL', measureIndex: 4, positionInMeasure: 0.0, timeSeconds: 0, value: 1.25 },
    ],
    updatedAt: Date.now(),
  },
  {
    id: 'sample_natsumatsuri',
    header: {
      title: '夏祭り (Natsumatsuri Sample)',
      subtitle: 'J-POP サンプル譜面',
      wave: 'natsumatsuri.mp3',
      offset: 0.5,
      demoStart: 20,
      genre: 'J-POP',
      course: 'Hard',
      level: 6,
      scoreInit: 700,
      scoreDiff: 150,
      balloon: [10],
      creator: 'Editor Demo',
      bpm: 141,
    },
    notes: [
      { id: 'ns_1', type: 1, measureIndex: 0, positionInMeasure: 0.0, timeSeconds: 0 },
      { id: 'ns_2', type: 2, measureIndex: 0, positionInMeasure: 0.5, timeSeconds: 0 },
      { id: 'ns_3', type: 1, measureIndex: 1, positionInMeasure: 0.0, timeSeconds: 0 },
      { id: 'ns_4', type: 1, measureIndex: 1, positionInMeasure: 0.25, timeSeconds: 0 },
      { id: 'ns_5', type: 2, measureIndex: 1, positionInMeasure: 0.5, timeSeconds: 0 },
      { id: 'ns_6', type: 2, measureIndex: 1, positionInMeasure: 0.75, timeSeconds: 0 },
    ],
    events: [],
    updatedAt: Date.now(),
  },
];

export function createBlankChart(): TaikoChart {
  return {
    id: `chart_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    header: {
      title: '新規太鼓譜面',
      subtitle: '',
      wave: '',
      offset: 0,
      demoStart: 0,
      genre: 'アニメ',
      course: 'Oni',
      level: 8,
      scoreInit: 1000,
      scoreDiff: 250,
      balloon: [5, 10],
      creator: 'User',
      bpm: 120,
    },
    notes: [],
    events: [],
    updatedAt: Date.now(),
  };
}
