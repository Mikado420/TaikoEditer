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
            // Create a copy of array buffer for decodeAudioData as it detaches the buffer
            return await ctx.decodeAudioData(buf.slice(0));
          }
        } catch (_) {
          /* try next url */
        }
      }
      return null;
    };

    try {
      const [dong, ka, balloon] = await Promise.all([
        loadSound(['/sounds/dong.ogg', '/dong.ogg', '/sounds/dong.wav', '/dong.wav']),
        loadSound(['/sounds/ka.ogg', '/ka.ogg', '/sounds/ka.wav', '/ka.wav']),
        loadSound(['/sounds/balloon.ogg', '/balloon.ogg', '/sounds/balloon.wav', '/balloon.wav']),
      ]);

      this.dongBuffer = dong || this.createSynthesizedDongBuffer(ctx);
      this.kaBuffer = ka || this.createSynthesizedKaBuffer(ctx);
      this.balloonBuffer = balloon || this.createSynthesizedBalloonBuffer(ctx);
    } catch (_) {
      // Fallback synthesizer if network fetch fails
      this.dongBuffer = this.dongBuffer || this.createSynthesizedDongBuffer(ctx);
      this.kaBuffer = this.kaBuffer || this.createSynthesizedKaBuffer(ctx);
      this.balloonBuffer = this.balloonBuffer || this.createSynthesizedBalloonBuffer(ctx);
    } finally {
      this.isHitSoundsLoading = false;
    }
  }

  // Synthesized AudioBuffer generators as robust fallbacks
  private createSynthesizedDongBuffer(ctx: AudioContext): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const duration = 0.3;
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const channel = buffer.getChannelData(0);

    let phaseSine = 0;
    let phaseSub = 0;
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const freq = 50 + 140 * Math.exp(-t * 25);
      const subFreq = 35 + 50 * Math.exp(-t * 20);
      phaseSine += (2 * Math.PI * freq) / sampleRate;
      phaseSub += (2 * Math.PI * subFreq) / sampleRate;

      const env = Math.exp(-t * 12);
      const body = Math.sin(phaseSine) * 0.7 + Math.sin(phaseSub) * 0.4;
      const transient = (Math.random() * 2 - 1) * Math.exp(-t * 150) * 0.4;
      channel[i] = (body + transient) * env * 0.9;
    }
    return buffer;
  }

  private createSynthesizedKaBuffer(ctx: AudioContext): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const duration = 0.18;
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const channel = buffer.getChannelData(0);

    let phaseChirp = 0;
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const freq = 350 + 550 * Math.exp(-t * 40);
      phaseChirp += (2 * Math.PI * freq) / sampleRate;

      const env = Math.exp(-t * 30);
      const chirp = Math.sin(phaseChirp) * 0.5;
      const noise = (Math.random() * 2 - 1) * Math.exp(-t * 50) * 0.6;
      channel[i] = (chirp + noise) * env * 0.85;
    }
    return buffer;
  }

  private createSynthesizedBalloonBuffer(ctx: AudioContext): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const duration = 0.25;
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const channel = buffer.getChannelData(0);

    let phaseRes = 0;
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const initialPop = (Math.random() * 2 - 1) * Math.exp(-t * 250) * 1.0;
      const freq = 80 + 370 * Math.exp(-t * 18);
      phaseRes += (2 * Math.PI * freq) / sampleRate;
      const resonance = Math.sin(phaseRes) * Math.exp(-t * 15) * 0.6;
      channel[i] = (initialPop + resonance) * Math.exp(-t * 10);
    }
    return buffer;
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

  public clearAudio(): void {
    this.stop();
    this.audioBuffer = null;
    this.waveformPeaks = null;
    this.pauseOffset = 0;
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
    if (ctx.state === 'suspended' || (ctx.state as string) === 'interrupted') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const masterVol = this.sfxVolume;

    // Ensure buffers are available even before async network loading finishes
    if (!this.dongBuffer) this.dongBuffer = this.createSynthesizedDongBuffer(ctx);
    if (!this.kaBuffer) this.kaBuffer = this.createSynthesizedKaBuffer(ctx);
    if (!this.balloonBuffer) this.balloonBuffer = this.createSynthesizedBalloonBuffer(ctx);

    // Helper to play AudioBuffer using a newly instantiated AudioBufferSourceNode every time
    const playBuffer = (buffer: AudioBuffer, volMultiplier = 1.0) => {
      const sourceNode = ctx.createBufferSource();
      sourceNode.buffer = buffer;
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(masterVol * volMultiplier, now);

      sourceNode.connect(gainNode);
      gainNode.connect(ctx.destination);

      sourceNode.start(now);

      sourceNode.onended = () => {
        try {
          sourceNode.disconnect();
          gainNode.disconnect();
        } catch (_) {
          /* ignore cleanup errors */
        }
      };
    };

    // Dong: Type 1 (Don), Type 3 (Big Don), Type 5 (Roll), Type 6 (Big Roll)
    if (type === 1 || type === 3 || type === 5 || type === 6) {
      const isBig = type === 3 || type === 6;
      playBuffer(this.dongBuffer, isBig ? 1.25 : 1.0);
    }
    // Ka: Type 2 (Ka), Type 4 (Big Ka)
    else if (type === 2 || type === 4) {
      const isBig = type === 4;
      playBuffer(this.kaBuffer, isBig ? 1.25 : 1.0);
    }
    // Balloon / Kusudama: Type 7 (Balloon), Type 8 (Kusudama)
    else if (type === 7 || type === 8) {
      playBuffer(this.balloonBuffer, 1.1);
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
