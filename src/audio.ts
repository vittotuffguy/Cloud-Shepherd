/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Procedural gentle Web Audio API synthesizer for Cloud Shepherd
class SoundEngine {
  private ctx: AudioContext | null = null;
  private isEnabled: boolean = false;
  private rainGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private rainSource: AudioBufferSourceNode | null = null;
  private windSource: AudioBufferSourceNode | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.setupContinuousAudio();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggle(): boolean {
    this.isEnabled = !this.isEnabled;
    if (this.isEnabled) {
      this.initContext();
      if (this.rainGain && this.ctx) {
        this.rainGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
      }
      if (this.windGain && this.ctx) {
        this.windGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
      }
      this.playNote(523.25, 'sine', 0.15, 0.4); // C5 welcome chime
    } else {
      if (this.rainGain && this.ctx) {
        this.rainGain.gain.setValueAtTime(0, this.ctx.currentTime);
      }
      if (this.windGain && this.ctx) {
        this.windGain.gain.setValueAtTime(0, this.ctx.currentTime);
      }
    }
    return this.isEnabled;
  }

  public getEnabled(): boolean {
    return this.isEnabled;
  }

  private setupContinuousAudio() {
    if (!this.ctx) return;

    // Generate gentle noise buffer for rain & wind
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Brown/Pink filter approximation
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 2.5; // boost
    }

    // Rain continuous loop with lowpass filter
    const rainFilter = this.ctx.createBiquadFilter();
    rainFilter.type = 'lowpass';
    rainFilter.frequency.setValueAtTime(800, this.ctx.currentTime);

    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.rainSource = this.ctx.createBufferSource();
    this.rainSource.buffer = noiseBuffer;
    this.rainSource.loop = true;
    this.rainSource.connect(rainFilter);
    rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.ctx.destination);
    this.rainSource.start();

    // Wind continuous loop with bandpass filter
    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.setValueAtTime(320, this.ctx.currentTime);
    windFilter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.windSource = this.ctx.createBufferSource();
    this.windSource.buffer = noiseBuffer;
    this.windSource.loop = true;
    this.windSource.connect(windFilter);
    windFilter.connect(this.windGain);
    this.windGain.connect(this.ctx.destination);
    this.windSource.start();
  }

  public updateAmbience(rainIntensity: number, windStrength: number) {
    if (!this.isEnabled || !this.ctx || !this.rainGain || !this.windGain) return;
    const now = this.ctx.currentTime;
    const targetRain = Math.min(0.08, rainIntensity * 0.06);
    const targetWind = Math.min(0.05, (windStrength > 0.3 ? 0.04 : 0.015));

    this.rainGain.gain.setTargetAtTime(targetRain, now, 0.4);
    this.windGain.gain.setTargetAtTime(targetWind, now, 0.5);
  }

  public playSpawnChime(pitchIndex: number = 0) {
    if (!this.isEnabled) return;
    this.initContext();
    // Peaceful Pentatonic scale frequencies
    const pentatonic = [392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00];
    const freq = pentatonic[Math.abs(pitchIndex) % pentatonic.length];
    this.playNote(freq, 'sine', 0.12, 0.6);
  }

  public playDisperseChime() {
    if (!this.isEnabled) return;
    this.initContext();
    this.playNote(440, 'triangle', 0.08, 0.4, 0.7);
  }

  public playGentleLightning() {
    if (!this.isEnabled || !this.ctx) return;
    this.initContext();
    // Soft, deep peaceful warm rumble / low chime (very quiet and soothing)
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 1.2);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(160, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.06, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 1.5);
  }

  private playNote(freq: number, type: OscillatorType, maxGain: number, duration: number, pitchBendRatio: number = 1.0) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (pitchBendRatio !== 1.0) {
      osc.frequency.exponentialRampToValueAtTime(freq * pitchBendRatio, now + duration);
    }

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(maxGain, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.05);
  }
}

export const sound = new SoundEngine();
