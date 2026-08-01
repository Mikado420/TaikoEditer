import fs from 'fs';
import path from 'path';

function createWavBuffer(sampleRate, samples) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Write 16-bit PCM samples
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const intSample = s < 0 ? s * 0x8000 : s * 0x7fff;
    buffer.writeInt16LE(Math.round(intSample), 44 + i * 2);
  }

  return buffer;
}

const sampleRate = 44100;

// 1. Dong (ドン) sound synthesis: deep taiko drum punch
function generateDong() {
  const duration = 0.3;
  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(numSamples);

  let phaseSine = 0;
  let phaseSub = 0;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Pitch drops from 190Hz to 50Hz exponentially
    const freq = 50 + 140 * Math.exp(-t * 25);
    const subFreq = 35 + 50 * Math.exp(-t * 20);

    phaseSine += (2 * Math.PI * freq) / sampleRate;
    phaseSub += (2 * Math.PI * subFreq) / sampleRate;

    const env = Math.exp(-t * 12);
    const body = Math.sin(phaseSine) * 0.7 + Math.sin(phaseSub) * 0.4;
    
    // Initial stick transient hit
    const transient = (Math.random() * 2 - 1) * Math.exp(-t * 150) * 0.4;

    samples[i] = (body + transient) * env * 0.9;
  }
  return createWavBuffer(sampleRate, samples);
}

// 2. Ka (カッ) sound synthesis: crisp rimshot / wood click
function generateKa() {
  const duration = 0.18;
  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(numSamples);

  let phaseChirp = 0;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // High wood chirp 900Hz -> 350Hz
    const freq = 350 + 550 * Math.exp(-t * 40);
    phaseChirp += (2 * Math.PI * freq) / sampleRate;

    const env = Math.exp(-t * 30);
    const chirp = Math.sin(phaseChirp) * 0.5;
    
    // White noise rim snap
    const noise = (Math.random() * 2 - 1) * Math.exp(-t * 50) * 0.6;

    samples[i] = (chirp + noise) * env * 0.85;
  }
  return createWavBuffer(sampleRate, samples);
}

// 3. Balloon (風船を割る音) sound synthesis: sharp pop / balloon burst
function generateBalloon() {
  const duration = 0.25;
  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(numSamples);

  let phaseRes = 0;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    
    // Balloon burst: initial high pressure pop shockwave (1-3ms) + rubber resonance pitch drop
    const initialPop = (Math.random() * 2 - 1) * Math.exp(-t * 250) * 1.0;
    
    // Rubber shell resonance (450Hz down to 80Hz)
    const freq = 80 + 370 * Math.exp(-t * 18);
    phaseRes += (2 * Math.PI * freq) / sampleRate;
    const resonance = Math.sin(phaseRes) * Math.exp(-t * 15) * 0.6;

    samples[i] = (initialPop + resonance) * Math.exp(-t * 10);
  }
  return createWavBuffer(sampleRate, samples);
}

const dongBuf = generateDong();
const kaBuf = generateKa();
const balloonBuf = generateBalloon();

const dirs = ['./public', './public/sounds'];
dirs.forEach((d) => {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
});

fs.writeFileSync('./public/dong.wav', dongBuf);
fs.writeFileSync('./public/ka.wav', kaBuf);
fs.writeFileSync('./public/balloon.wav', balloonBuf);

fs.writeFileSync('./public/sounds/dong.wav', dongBuf);
fs.writeFileSync('./public/sounds/ka.wav', kaBuf);
fs.writeFileSync('./public/sounds/balloon.wav', balloonBuf);

console.log('Successfully generated dong.wav, ka.wav, and balloon.wav');
