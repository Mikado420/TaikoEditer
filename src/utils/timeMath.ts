import { ChartEvent, ChartHeader, MeasureInfo, SnapValue } from '../types/chart';

/**
 * Calculates time mapping for all measures based on header values and events.
 * Returns measure start times, durations, active BPM, scroll, and measure ratios.
 */
export function calculateMeasures(
  header: ChartHeader,
  events: ChartEvent[],
  minMeasures = 64
): MeasureInfo[] {
  // Sort events by measure index and position
  const sortedEvents = [...events].sort((a, b) => {
    if (a.measureIndex !== b.measureIndex) return a.measureIndex - b.measureIndex;
    return a.positionInMeasure - b.positionInMeasure;
  });

  // Find maximum measure index in events
  const maxEventMeasure = events.reduce((max, ev) => Math.max(max, ev.measureIndex), 0);
  const totalMeasures = Math.max(minMeasures, maxEventMeasure + 32);

  const measures: MeasureInfo[] = [];

  let currentBpm = header.bpm > 0 ? header.bpm : 120;
  let currentScroll = 1.0;
  let currentNum = 4;
  let currentDen = 4;
  let currentBarline = true;
  let currentGogo = false;

  // Chart start time in seconds (TJA OFFSET: -X means measure 0 starts at +X seconds in audio)
  let currentTime = -header.offset;
  let cumulativeMeasurePos = 0;

  for (let m = 0; m < totalMeasures; m++) {
    // Collect events in this measure
    const measureEvents = sortedEvents.filter((e) => e.measureIndex === m);

    let measureBeats = (currentNum / currentDen) * 4;
    let lastPos = 0;
    let accumulatedDuration = 0;

    for (const ev of measureEvents) {
      const posDelta = ev.positionInMeasure - lastPos;
      if (posDelta > 0) {
        accumulatedDuration += posDelta * measureBeats * (60 / currentBpm);
      }
      lastPos = ev.positionInMeasure;

      if (ev.type === 'BPMCHANGE' && ev.value && ev.value > 0) {
        currentBpm = ev.value;
      } else if (ev.type === 'MEASURE' && ev.numerator && ev.denominator) {
        currentNum = ev.numerator;
        currentDen = ev.denominator;
        measureBeats = (currentNum / currentDen) * 4;
      } else if (ev.type === 'SCROLL' && ev.value !== undefined) {
        currentScroll = ev.value;
      } else if (ev.type === 'BARLINEON') {
        currentBarline = true;
      } else if (ev.type === 'BARLINEOFF') {
        currentBarline = false;
      } else if (ev.type === 'GOGOSTART') {
        currentGogo = true;
      } else if (ev.type === 'GOGOEND') {
        currentGogo = false;
      } else if (ev.type === 'DELAY' && ev.value) {
        accumulatedDuration += ev.value;
      }
    }

    // Remaining duration after last event in measure
    const remainingPos = 1.0 - lastPos;
    if (remainingPos > 0) {
      accumulatedDuration += remainingPos * measureBeats * (60 / currentBpm);
    }

    const measureRatio = currentNum / currentDen;

    measures.push({
      index: m,
      timeSeconds: currentTime,
      durationSeconds: Math.max(0.01, accumulatedDuration),
      bpm: currentBpm,
      scroll: currentScroll,
      numerator: currentNum,
      denominator: currentDen,
      barlineVisible: currentBarline,
      isGogo: currentGogo,
      startMeasurePos: cumulativeMeasurePos,
      measureLengthRatio: measureRatio,
    });

    currentTime += accumulatedDuration;
    cumulativeMeasurePos += measureRatio;
  }

  return measures;
}

/**
 * Calculates the absolute cumulative position (in 4/4 standard measure units)
 * for a given measure index and position within measure.
 */
export function getAbsoluteMeasurePos(
  measureIndex: number,
  positionInMeasure: number,
  measures: MeasureInfo[]
): number {
  if (!measures || measures.length === 0) return measureIndex + positionInMeasure;

  if (measureIndex < 0) {
    const ratio0 = measures[0]?.measureLengthRatio || 1.0;
    return (measureIndex + positionInMeasure) * ratio0;
  }

  if (measureIndex >= measures.length) {
    const lastM = measures[measures.length - 1];
    const extraMeasureCount = measureIndex - lastM.index;
    const extraPos = extraMeasureCount + positionInMeasure;
    return lastM.startMeasurePos + extraPos * lastM.measureLengthRatio;
  }

  const m = measures[measureIndex];
  return m.startMeasurePos + positionInMeasure * m.measureLengthRatio;
}

/**
 * Converts an absolute cumulative position (in 4/4 measure units) back to measure index and positionInMeasure.
 */
export function absMeasurePosToMeasureAndPos(
  absPos: number,
  measures: MeasureInfo[]
): { measureIndex: number; positionInMeasure: number } {
  if (!measures || measures.length === 0) {
    const mIdx = Math.max(0, Math.floor(absPos));
    const pos = Math.max(0, Math.min(1.0, absPos - mIdx));
    return { measureIndex: mIdx, positionInMeasure: pos };
  }

  if (absPos <= 0) {
    return { measureIndex: 0, positionInMeasure: 0 };
  }

  for (let i = 0; i < measures.length; i++) {
    const m = measures[i];
    const endPos = m.startMeasurePos + m.measureLengthRatio;
    if (absPos >= m.startMeasurePos && absPos < endPos) {
      const pos = (absPos - m.startMeasurePos) / m.measureLengthRatio;
      return { measureIndex: i, positionInMeasure: Math.max(0, Math.min(1.0, pos)) };
    }
  }

  const lastM = measures[measures.length - 1];
  const endLast = lastM.startMeasurePos + lastM.measureLengthRatio;
  const extraAbs = absPos - endLast;
  const extraCount = Math.floor(extraAbs / lastM.measureLengthRatio);
  const remPos = (extraAbs % lastM.measureLengthRatio) / lastM.measureLengthRatio;

  return {
    measureIndex: lastM.index + 1 + extraCount,
    positionInMeasure: Math.max(0, Math.min(1.0, remPos)),
  };
}

/**
 * Converts a measure index and position (or float measure value) to absolute time in seconds.
 */
export function measureAndPosToTime(
  measureIndex: number,
  positionInMeasure: number,
  measures: MeasureInfo[]
): number {
  if (!measures || measures.length === 0) return 0;

  const totalMVal = measureIndex + positionInMeasure;

  if (totalMVal <= 0) {
    const m0 = measures[0];
    return m0.timeSeconds + totalMVal * m0.durationSeconds;
  }

  const mIdx = Math.floor(totalMVal);
  const pos = totalMVal - mIdx;

  if (mIdx >= measures.length) {
    const lastM = measures[measures.length - 1];
    const extraM = totalMVal - lastM.index;
    return lastM.timeSeconds + extraM * lastM.durationSeconds;
  }

  const m = measures[mIdx];
  return m.timeSeconds + pos * m.durationSeconds;
}

/**
 * Converts absolute time in seconds to measure index and position inside measure.
 */
export function timeToMeasureAndPos(
  timeSeconds: number,
  measures: MeasureInfo[]
): { measureIndex: number; positionInMeasure: number } {
  if (!measures || measures.length === 0) return { measureIndex: 0, positionInMeasure: 0 };

  const m0 = measures[0];
  if (timeSeconds <= m0.timeSeconds) {
    const diff = timeSeconds - m0.timeSeconds;
    const pos = diff / m0.durationSeconds;
    return { measureIndex: 0, positionInMeasure: pos };
  }

  for (let i = 0; i < measures.length; i++) {
    const m = measures[i];
    const endTime = m.timeSeconds + m.durationSeconds;

    if (timeSeconds >= m.timeSeconds && timeSeconds < endTime) {
      const pos = (timeSeconds - m.timeSeconds) / m.durationSeconds;
      return { measureIndex: i, positionInMeasure: pos };
    }
  }

  // If time exceeds last measure
  const lastM = measures[measures.length - 1];
  const diff = timeSeconds - lastM.timeSeconds;
  const pos = diff / lastM.durationSeconds;
  return { measureIndex: lastM.index, positionInMeasure: pos };
}

/**
 * Snaps a 0..1 position within a measure according to the snap fraction and time signature.
 */
export function snapPosition(
  positionInMeasure: number,
  snap: SnapValue,
  numerator = 4,
  denominator = 4
): number {
  if (!snap || snap <= 0) return positionInMeasure;
  const ticksInMeasure = Math.max(numerator, Math.round(snap * (numerator / denominator)));
  const snapped = Math.round(positionInMeasure * ticksInMeasure) / ticksInMeasure;
  return Math.max(0, Math.min(1.0, snapped));
}

/**
 * Formats seconds into MM:SS.mmm string
 */
export function formatTimeString(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00.000';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  const mStr = String(mins).padStart(2, '0');
  const sStr = String(secs).padStart(2, '0');
  const msStr = String(millis).padStart(3, '0');

  return `${mStr}:${sStr}.${msStr}`;
}

/**
 * Calculates the active SCROLL multiplier at a specific beat position (measureIndex + positionInMeasure).
 * Uses absolute beat position to ensure SCROLL is applied per-note rather than per-measure.
 */
export function getScrollAtPosition(
  measureIndex: number,
  positionInMeasure: number,
  events: ChartEvent[]
): number {
  if (!events || events.length === 0) return 1.0;
  const targetPos = measureIndex + positionInMeasure;
  let activeScroll = 1.0;
  let maxMatchedPos = -1;

  for (const ev of events) {
    if (ev.type === 'SCROLL' && ev.value !== undefined) {
      const evPos = ev.measureIndex + ev.positionInMeasure;
      if (evPos <= targetPos && evPos >= maxMatchedPos) {
        maxMatchedPos = evPos;
        activeScroll = ev.value;
      }
    }
  }

  return activeScroll;
}

export interface GogoInterval {
  startAbsPos: number;
  endAbsPos: number;
}

/**
 * Returns all Gogo intervals in terms of absolute measure units [startAbsPos, endAbsPos].
 */
export function getGogoIntervals(
  events: ChartEvent[],
  measures: MeasureInfo[]
): GogoInterval[] {
  const gogoEvents = (events || [])
    .filter((e) => e.type === 'GOGOSTART' || e.type === 'GOGOEND')
    .map((e) => ({
      type: e.type,
      absPos: getAbsoluteMeasurePos(e.measureIndex, e.positionInMeasure, measures),
    }))
    .sort((a, b) => a.absPos - b.absPos);

  if (gogoEvents.length > 0) {
    const intervals: GogoInterval[] = [];
    let currentStart: number | null = null;

    for (const ev of gogoEvents) {
      if (ev.type === 'GOGOSTART') {
        if (currentStart === null) {
          currentStart = ev.absPos;
        }
      } else if (ev.type === 'GOGOEND') {
        if (currentStart !== null) {
          intervals.push({ startAbsPos: currentStart, endAbsPos: ev.absPos });
          currentStart = null;
        }
      }
    }

    if (currentStart !== null) {
      const maxAbs =
        measures.length > 0
          ? measures[measures.length - 1].startMeasurePos +
            measures[measures.length - 1].measureLengthRatio
          : 999;
      intervals.push({ startAbsPos: currentStart, endAbsPos: maxAbs });
    }

    return intervals;
  }

  const intervals: GogoInterval[] = [];
  let currentStart: number | null = null;
  let currentEnd = 0;

  for (const m of measures) {
    if (m.isGogo) {
      if (currentStart === null) {
        currentStart = m.startMeasurePos;
      }
      currentEnd = m.startMeasurePos + m.measureLengthRatio;
    } else {
      if (currentStart !== null) {
        intervals.push({ startAbsPos: currentStart, endAbsPos: currentEnd });
        currentStart = null;
      }
    }
  }

  if (currentStart !== null) {
    intervals.push({ startAbsPos: currentStart, endAbsPos: currentEnd });
  }

  return intervals;
}


