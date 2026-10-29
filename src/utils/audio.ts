/**
 * Procedural Web Audio Synthesizer for Aetheria
 * Generates zero-dependency sound effects, footsteps, harvest impacts, construction snaps, and weather
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private isMuted: boolean = false;
  private ambientNoiseSource: AudioBufferSourceNode | null = null;
  private ambientFilter: BiquadFilterNode | null = null;

  private initContext() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      this.ambientGain.connect(this.masterGain);

      this.startAmbientLoop();
    } catch {
      // Audio not permitted or supported
    }
  }

  public resume() {
    if (!this.ctx) {
      this.initContext();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(sfx: number, ambient: number) {
    if (!this.ctx) return;
    if (this.sfxGain) this.sfxGain.gain.setValueAtTime(Math.max(0, Math.min(1, sfx)), this.ctx.currentTime);
    if (this.ambientGain) this.ambientGain.gain.setValueAtTime(Math.max(0, Math.min(1, ambient)), this.ctx.currentTime);
  }

  private startAmbientLoop() {
    if (!this.ctx || !this.ambientGain) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02; // Pink noise
      lastOut = data[i];
      data[i] *= 3.5;
    }

    this.ambientNoiseSource = this.ctx.createBufferSource();
    this.ambientNoiseSource.buffer = buffer;
    this.ambientNoiseSource.loop = true;

    this.ambientFilter = this.ctx.createBiquadFilter();
    this.ambientFilter.type = 'lowpass';
    this.ambientFilter.frequency.setValueAtTime(400, this.ctx.currentTime);

    this.ambientNoiseSource.connect(this.ambientFilter);
    this.ambientFilter.connect(this.ambientGain);
    this.ambientNoiseSource.start();
  }

  public updateWeatherAmbience(weather: string) {
    if (!this.ctx || !this.ambientFilter || !this.ambientGain) return;
    const now = this.ctx.currentTime;
    switch (weather) {
      case 'storm':
        this.ambientFilter.frequency.setTargetAtTime(1200, now, 0.5);
        this.ambientGain.gain.setTargetAtTime(0.5, now, 0.5);
        break;
      case 'rain':
        this.ambientFilter.frequency.setTargetAtTime(800, now, 0.5);
        this.ambientGain.gain.setTargetAtTime(0.35, now, 0.5);
        break;
      case 'snow':
        this.ambientFilter.frequency.setTargetAtTime(300, now, 0.5);
        this.ambientGain.gain.setTargetAtTime(0.2, now, 0.5);
        break;
      default:
        this.ambientFilter.frequency.setTargetAtTime(450, now, 0.5);
        this.ambientGain.gain.setTargetAtTime(0.25, now, 0.5);
        break;
    }
  }

  public playFootstep(surface: 'grass' | 'stone' | 'wood' = 'grass') {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const freq = surface === 'stone' ? 140 : surface === 'wood' ? 100 : 75;
    osc.type = surface === 'stone' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(freq + (Math.random() * 16 - 8), now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.08);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playHarvest(type: 'wood' | 'stone' | 'crystal' = 'wood') {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (type === 'crystal') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880 + Math.random() * 120, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.15);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    } else if (type === 'stone') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180 + Math.random() * 40, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.12);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    } else {
      // Wood chop
      osc.type = 'square';
      osc.frequency.setValueAtTime(220 + Math.random() * 30, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.1);
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    }

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.36);
  }

  public playDestroy() {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.28);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  public playBuildSnap() {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(320, now);
    osc1.frequency.exponentialRampToValueAtTime(480, now + 0.08);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(640, now);
    osc2.frequency.exponentialRampToValueAtTime(960, now + 0.08);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.13);
    osc2.stop(now + 0.13);
  }

  public playTradeChime() {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    freqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const noteTime = now + idx * 0.06;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.18, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.3);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(noteTime);
      osc.stop(noteTime + 0.32);
    });
  }

  public playLevelUp() {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const chord = [440, 554.37, 659.25, 880]; // A major fanfare
    chord.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const start = now + i * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.22, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.6);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(start);
      osc.stop(start + 0.62);
    });
  }

  public playRadioBeep() {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.setValueAtTime(1600, now + 0.04);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playButtonClick() {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }
}

export const sounds = new SoundEngine();
