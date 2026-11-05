/**
 * Low-latency Web Audio API synthesizer for Retro Snake Game
 * Zero external asset dependencies, zero network latency, 100% reliable offline
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  
  private isBgmPlaying = false;
  private bgmTimer: number | null = null;
  private currentStep = 0;
  
  private sfxEnabled = true;
  private bgmEnabled = true;
  private sfxVol = 0.8;
  private bgmVol = 0.35;
  private haptics = true;

  constructor() {
    // AudioContext will be initialized on user gesture
  }

  public init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(this.sfxEnabled ? this.sfxVol : 0, this.ctx.currentTime);
        this.sfxGain.connect(this.masterGain);

        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.setValueAtTime(this.bgmEnabled ? this.bgmVol : 0, this.ctx.currentTime);
        this.bgmGain.connect(this.masterGain);
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public updateConfig(config: { sfxEnabled: boolean; bgmEnabled: boolean; sfxVolume: number; bgmVolume: number; hapticEnabled: boolean }) {
    this.sfxEnabled = config.sfxEnabled;
    this.bgmEnabled = config.bgmEnabled;
    this.sfxVol = config.sfxVolume;
    this.bgmVol = config.bgmVolume;
    this.haptics = config.hapticEnabled;

    if (this.ctx) {
      const now = this.ctx.currentTime;
      if (this.sfxGain) {
        this.sfxGain.gain.setValueAtTime(this.sfxEnabled ? this.sfxVol : 0, now);
      }
      if (this.bgmGain) {
        this.bgmGain.gain.setValueAtTime(this.bgmEnabled ? this.bgmVol : 0, now);
      }
    }

    if (!this.bgmEnabled && this.isBgmPlaying) {
      this.pauseBgm();
    }
  }

  public triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'double' = 'light') {
    if (!this.haptics || typeof navigator === 'undefined' || !navigator.vibrate) return;
    try {
      switch (type) {
        case 'light':
          navigator.vibrate(12);
          break;
        case 'medium':
          navigator.vibrate(28);
          break;
        case 'heavy':
          navigator.vibrate([40, 30, 60]);
          break;
        case 'double':
          navigator.vibrate([15, 40, 15]);
          break;
      }
    } catch {
      // Ignored if browser restricts vibration
    }
  }

  // Play button click blip
  public playButtonClick() {
    this.init();
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;

    this.triggerHaptic('light');

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.04);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  // Play pin collection chime
  public playPinCollect(isGolden = false, combo = 1) {
    this.init();
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;

    this.triggerHaptic(isGolden ? 'heavy' : 'medium');

    const now = this.ctx.currentTime;
    const baseFreq = isGolden ? 587.33 : 440; // D5 or A4
    const semitoneMultiplier = Math.min(combo * 1.5, 12);
    const startFreq = baseFreq * Math.pow(2, semitoneMultiplier / 12);

    const notes = isGolden 
      ? [startFreq, startFreq * 1.25, startFreq * 1.5, startFreq * 2.0]
      : [startFreq, startFreq * 1.334, startFreq * 1.68];

    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteTime = now + idx * 0.045;

      osc.type = isGolden ? 'sine' : 'square';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(isGolden ? 0.3 : 0.15, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.1);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(noteTime);
      osc.stop(noteTime + 0.12);
    });
  }

  // Subtle move tick (direction change)
  public playTurnTick() {
    this.init();
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.02);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.025);
  }

  // Level up fanfare
  public playLevelUp() {
    this.init();
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;

    this.triggerHaptic('double');

    const now = this.ctx.currentTime;
    // C5, E5, G5, C6
    const freqs = [523.25, 659.25, 783.99, 1046.5];

    freqs.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteTime = now + idx * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.25, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(noteTime);
      osc.stop(noteTime + 0.2);
    });
  }

  // Game over crash & buzz
  public playGameOver() {
    this.init();
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;

    this.triggerHaptic('heavy');

    const now = this.ctx.currentTime;

    // Descending glitch wave
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.linearRampToValueAtTime(110, now + 0.35);
    osc.frequency.linearRampToValueAtTime(45, now + 0.6);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.7);
  }

  // Pause / resume toggle tone
  public playPause(isPaused: boolean) {
    this.init();
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;

    this.triggerHaptic('light');

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const start = isPaused ? 440 : 660;
    const end = isPaused ? 330 : 880;

    osc.frequency.setValueAtTime(start, now);
    osc.frequency.exponentialRampToValueAtTime(end, now + 0.08);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playPauseToggle(isPaused: boolean) {
    this.playPause(isPaused);
  }

  // Synthesized 8-Bit Retro Background Music Loop
  public startBgm() {
    this.init();
    if (!this.bgmEnabled) return;

    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.bgmGain.gain.setValueAtTime(this.bgmVol, this.ctx.currentTime);
    }

    if (this.isBgmPlaying) return;

    this.isBgmPlaying = true;
    this.currentStep = 0;
    this.runBgmLoop();
  }

  public resumeBgm() {
    this.init();
    if (!this.bgmEnabled || this.isBgmPlaying) return;

    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.bgmGain.gain.setValueAtTime(this.bgmVol, this.ctx.currentTime);
    }

    this.isBgmPlaying = true;
    this.runBgmLoop();
  }

  public pauseBgm() {
    this.isBgmPlaying = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.bgmGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
  }

  public stopBgm() {
    this.pauseBgm();
    this.currentStep = 0;
  }

  public isPlayingBgm(): boolean {
    return this.isBgmPlaying;
  }

  private runBgmLoop = () => {
    if (!this.isBgmPlaying || !this.bgmEnabled || !this.ctx || !this.bgmGain) {
      this.isBgmPlaying = false;
      return;
    }

    // Melodic bass & arpeggio sequence in A minor
    // 16-step pattern
    const bassNotes = [
      220.0, 0, 220.0, 0, 
      261.63, 0, 293.66, 0, 
      196.0, 0, 196.0, 0, 
      246.94, 0, 220.0, 0
    ];

    const leadNotes = [
      440.0, 523.25, 659.25, 523.25,
      587.33, 659.25, 783.99, 659.25,
      392.0, 493.88, 587.33, 493.88,
      523.25, 587.33, 659.25, 440.0
    ];

    const step = this.currentStep % 16;
    const now = this.ctx.currentTime;
    const stepDuration = 0.16; // ~94 BPM 16th notes

    // Play bass voice
    const bassFreq = bassNotes[step];
    if (bassFreq > 0) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(bassFreq / 2, now); // 1 octave lower

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 0.9);

      osc.connect(gain);
      gain.connect(this.bgmGain);

      osc.start(now);
      osc.stop(now + stepDuration);
    }

    // Play lead voice every alternating step for syncopation
    if (step % 2 === 0) {
      const leadFreq = leadNotes[step];
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(leadFreq, now);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 1.5);

      osc.connect(gain);
      gain.connect(this.bgmGain);

      osc.start(now);
      osc.stop(now + stepDuration * 1.6);
    }

    this.currentStep = (this.currentStep + 1) % 16;

    // Schedule next tick
    this.bgmTimer = window.setTimeout(this.runBgmLoop, stepDuration * 1000);
  };
}

export const soundEngine = new SoundEngine();
