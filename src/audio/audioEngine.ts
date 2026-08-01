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

  private sfxMuted = false;
  private sfxVolume = 0.8;

  private dongBuffer: AudioBuffer | null = null;
  private kaBuffer: AudioBuffer | null = null;
  private balloonBuffer: AudioBuffer | null = null;
  private isHitSoundsLoading = false;

  private waveformPeaks: Float32Array | null = null;
  private onTimeUpdateCallbacks: Set<(time: number) => void> = new Set();
  private animFrameId: number | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const handleResume = () => {
        if (!document.hidden) {
          this.handleResume();
        } else if (this.isPlaying) {
          // Pause gracefully when moving to background
          this.pause();
        }
      };

      document.addEventListener('visibilitychange', handleResume);
      window.addEventListener('pageshow', () => this.handleResume());
      window.addEventListener('focus', () => this.handleResume());
      window.addEventListener('pointerdown', () => this.handleResume());
    }
  }

  public async handleResume(): Promise<void> {
    try {
      if (!this.ctx || this.ctx.state === 'closed') {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended' || (this.ctx.state as string) === 'interrupted') {
        await this.ctx.resume();
      }
      await this.ensureHitSoundsLoaded();
    } catch (_) {
      /* ignore resume errors */
    }
  }

  public initContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended' || (this.ctx.state as string) === 'interrupted') {
      this.ctx.resume().catch(() => {});
    }
    this.ensureHitSoundsLoaded();
    return this.ctx;
  }

  public async ensureHitSoundsLoaded(): Promise<void> {
    if ((this.dongBuffer && this.kaBuffer && this.balloonBuffer) || this.isHitSoundsLoading) return;
    this.isHitSoundsLoading = true;

    const ctx = this.initContext();

    const loadSound = async (urls: string[]): Promise<AudioBuffer | null> => {
      for (const url of urls) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const buf = await res.arrayBuffer();
            return await ctx.decodeAudioData(buf);
          }
        } catch (_) {
          /* try next url */
        }
      }
      return null;
    };

    try {
      const [dong, ka, balloon] = await Promise.all([
        loadSound(['/sounds/dong.wav', '/dong.wav']),
        loadSound(['/sounds/ka.wav', '/ka.wav']),
        loadSound(['/sounds/balloon.wav', '/balloon.wav']),
      ]);

      if (dong) this.dongBuffer = dong;
      if (ka) this.kaBuffer = ka;
      if (balloon) this.balloonBuffer = balloon;
    } catch (_) {
      /* fallback synthesis used if fetch fails */
    } finally {
      this.isHitSoundsLoading = false;
    }
  }

  public async loadAudioFile(file: File): Promise<number> {
    const ctx = this.initContext();
    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    this.pauseOffset = 0;
    this.generateWaveformPeaks(30000);
    return this.audioBuffer.duration;
  }

  public async loadAudioBuffer(buffer: AudioBuffer): Promise<number> {
    this.audioBuffer = buffer;
    this.pauseOffset = 0;
    this.generateWaveformPeaks(30000);
    return buffer.duration;
  }

  public generateWaveformPeaks(samplesCount = 30000): Float32Array {
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
      const end = Math.min(start + step, rawData.length);
      for (let j = start; j < end; j++) {
        const val = Math.abs(rawData[j] || 0);
        if (val > max) max = val;
      }
      peaks[i] = max;
    }

    this.waveformPeaks = peaks;
    return peaks;
  }

  public getWaveformPeaks(samplesCount = 30000): Float32Array | null {
    if (!this.waveformPeaks) {
      return this.generateWaveformPeaks(samplesCount);
    }
    return this.waveformPeaks;
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

  public stop(): void {
    this.pause();
    this.pauseOffset = 0;
    this.notifyTimeUpdate(0);
  }

  public seek(timeSeconds: number): void {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) this.pause();
    this.pauseOffset = Math.max(0, timeSeconds);
    this.notifyTimeUpdate(this.pauseOffset);
    if (wasPlaying) this.play(this.pauseOffset);
  }

  public setPlaybackRate(speed: number): void {
    this.playbackRate = speed;
    if (this.sourceNode) {
      this.sourceNode.playbackRate.value = speed;
    }
  }

  public setSpeed(speed: number): void {
    this.setPlaybackRate(speed);
  }

  public setSfxMuted(muted: boolean): void {
    this.sfxMuted = muted;
  }

  public setSfxVolume(vol: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
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
    if (this.sfxMuted) return;

    const ctx = this.initContext();
    const now = ctx.currentTime;
    const masterVol = this.sfxVolume;

    // Helper to play AudioBuffer
    const playBuffer = (buffer: AudioBuffer, volMultiplier = 1.0) => {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(masterVol * volMultiplier, now);
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start(now);
    };

    // Dong: Type 1 (Don), Type 3 (Big Don), Type 5 (Roll), Type 6 (Big Roll)
    if (type === 1 || type === 3 || type === 5 || type === 6) {
      if (this.dongBuffer) {
        const isBig = type === 3 || type === 6;
        playBuffer(this.dongBuffer, isBig ? 1.25 : 1.0);
        return;
      }
      // Fallback Dong synthesis
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const isBig = type === 3 || type === 6;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(isBig ? 130 : 170, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.12);
      gain.gain.setValueAtTime((isBig ? 0.9 : 0.7) * masterVol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    }
    // Ka: Type 2 (Ka), Type 4 (Big Ka)
    else if (type === 2 || type === 4) {
      if (this.kaBuffer) {
        const isBig = type === 4;
        playBuffer(this.kaBuffer, isBig ? 1.25 : 1.0);
        return;
      }
      // Fallback Ka synthesis
      const isBig = type === 4;
      const vol = (isBig ? 0.8 : 0.6) * masterVol;
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
    }
    // Balloon / Kusudama: Type 7 (Balloon), Type 8 (Kusudama)
    else if (type === 7 || type === 8) {
      if (this.balloonBuffer) {
        playBuffer(this.balloonBuffer, 1.1);
        return;
      }
      // Fallback Balloon synthesis
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
      gain.gain.setValueAtTime(0.7 * masterVol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
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
