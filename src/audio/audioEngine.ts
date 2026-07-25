/**
 * WebAudio API Engine for Taiko Chart Editor
 * Handles song audio playback, synthesized drum sound effects, speed control, and waveform extraction.
 */

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;

  private isPlaying = false;
  private startTime = 0; // AudioContext currentTime when playback started
  private pauseOffset = 0; // Position in audio in seconds when paused
  private playbackRate = 1.0;

  private waveformPeaks: Float32Array | null = null;
  private onTimeUpdateCallbacks: Set<(time: number) => void> = new Set();
  private animFrameId: number | null = null;

  constructor() {
    // AudioContext will be initialized on first user gesture
  }

  public initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public async loadAudioFile(file: File): Promise<number> {
    const ctx = this.initContext();
    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    this.pauseOffset = 0;
    this.generateWaveformPeaks(1000);
    return this.audioBuffer.duration;
  }

  public async loadAudioBuffer(buffer: AudioBuffer): Promise<number> {
    this.audioBuffer = buffer;
    this.pauseOffset = 0;
    this.generateWaveformPeaks(1000);
    return buffer.duration;
  }

  public generateWaveformPeaks(samplesCount = 1000): Float32Array {
    if (!this.audioBuffer) {
      this.waveformPeaks = new Float32Array(samplesCount).fill(0);
      return this.waveformPeaks;
    }

    const rawData = this.audioBuffer.getChannelData(0);
    const step = Math.floor(rawData.length / samplesCount);
    const peaks = new Float32Array(samplesCount);

    for (let i = 0; i < samplesCount; i++) {
      let max = 0;
      const start = i * step;
      for (let j = 0; j < step; j++) {
        const val = Math.abs(rawData[start + j] || 0);
        if (val > max) max = val;
      }
      peaks[i] = max;
    }

    this.waveformPeaks = peaks;
    return peaks;
  }

  public getPeaks(): Float32Array | null {
    return this.waveformPeaks;
  }

  public play(fromTimeSeconds?: number): void {
    const ctx = this.initContext();
    if (this.isPlaying) this.pause();

    if (fromTimeSeconds !== undefined) {
      this.pauseOffset = Math.max(0, fromTimeSeconds);
    }

    if (this.audioBuffer) {
      this.sourceNode = ctx.createBufferSource();
      this.sourceNode.buffer = this.audioBuffer;
      this.sourceNode.playbackRate.value = this.playbackRate;
      this.sourceNode.connect(ctx.destination);

      this.startTime = ctx.currentTime - this.pauseOffset / this.playbackRate;
      this.sourceNode.start(0, this.pauseOffset);

      this.sourceNode.onended = () => {
        if (this.isPlaying && this.getCurrentTime() >= (this.audioBuffer?.duration || 0)) {
          this.pause();
        }
      };
    } else {
      // Synthetic timer play if no audio file loaded
      this.startTime = ctx.currentTime - this.pauseOffset / this.playbackRate;
    }

    this.isPlaying = true;
    this.startLoop();
  }

  public pause(): void {
    if (this.isPlaying) {
      this.pauseOffset = this.getCurrentTime();
      this.isPlaying = false;
      if (this.sourceNode) {
        try {
          this.sourceNode.stop();
          this.sourceNode.disconnect();
        } catch (_) {
          /* ignore */
        }
        this.sourceNode = null;
      }
      this.stopLoop();
    }
  }

  public seek(timeSeconds: number): void {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) this.pause();
    this.pauseOffset = Math.max(0, timeSeconds);
    this.notifyTimeUpdate(this.pauseOffset);
    if (wasPlaying) this.play(this.pauseOffset);
  }

  public setSpeed(speed: number): void {
    this.playbackRate = speed;
    if (this.sourceNode) {
      this.sourceNode.playbackRate.value = speed;
    }
  }

  public getCurrentTime(): number {
    if (!this.isPlaying) return this.pauseOffset;
    if (!this.ctx) return this.pauseOffset;

    const elapsed = (this.ctx.currentTime - this.startTime) * this.playbackRate;
    return Math.max(0, elapsed);
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getDuration(): number {
    return this.audioBuffer ? this.audioBuffer.duration : 180;
  }

  public playHitSound(type: number): void {
    const ctx = this.initContext();
    const now = ctx.currentTime;

    if (type === 1 || type === 3) {
      // Don (1) or Big Don (3) - Red Drum
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const isBig = type === 3;
      const baseFreq = isBig ? 130 : 170;
      const vol = isBig ? 0.9 : 0.7;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.12);

      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 2 || type === 4) {
      // Ka (2) or Big Ka (4) - Blue Rimshot
      const isBig = type === 4;
      const vol = isBig ? 0.8 : 0.6;

      // High pitch oscillator
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(isBig ? 600 : 850, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);

      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);

      // Noise burst for rim attack
      const bufferSize = ctx.sampleRate * 0.05;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1200;

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(vol * 0.5, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      noise.start(now);
    }
  }

  public subscribeTimeUpdate(callback: (time: number) => void): () => void {
    this.onTimeUpdateCallbacks.add(callback);
    return () => {
      this.onTimeUpdateCallbacks.delete(callback);
    };
  }

  private notifyTimeUpdate(time: number): void {
    this.onTimeUpdateCallbacks.forEach((cb) => cb(time));
  }

  private startLoop(): void {
    const loop = () => {
      if (this.isPlaying) {
        this.notifyTimeUpdate(this.getCurrentTime());
        this.animFrameId = requestAnimationFrame(loop);
      }
    };
    this.stopLoop();
    this.animFrameId = requestAnimationFrame(loop);
  }

  private stopLoop(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }
}

export const audioEngine = new AudioEngine();
