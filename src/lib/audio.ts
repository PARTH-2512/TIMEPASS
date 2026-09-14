/**
 * Procedural synthesized audio chime using standard Web Audio API.
 * No external mp3/wav files required, zero latency, guaranteed safe in browsers.
 */
class SoundManager {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;

  constructor() {
    // Lazy initialize on first interaction
    const saved = localStorage.getItem('anpr_sound_alerts_enabled');
    if (saved !== null) {
      this.soundEnabled = saved === 'true';
    }
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public setEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    localStorage.setItem('anpr_sound_alerts_enabled', String(enabled));
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Plays a dual-tone urgent ANPR alert chime (880Hz -> 1175Hz).
   */
  public playAlertChime(priority: 'high' | 'medium' | 'low' = 'high'): void {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = priority === 'high' ? 'sawtooth' : 'sine';

      // Pitch sweep
      const startFreq = priority === 'high' ? 880 : 660;
      const endFreq = priority === 'high' ? 1320 : 880;

      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.15);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.45);

      // If high priority, repeat secondary high beep
      if (priority === 'high') {
        setTimeout(() => {
          if (!this.soundEnabled) return;
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          const now2 = ctx.currentTime;
          osc2.type = 'sawtooth';
          osc2.frequency.setValueAtTime(1320, now2);
          osc2.frequency.exponentialRampToValueAtTime(1760, now2 + 0.15);
          gain2.gain.setValueAtTime(0.18, now2);
          gain2.gain.exponentialRampToValueAtTime(0.001, now2 + 0.35);
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.start(now2);
          osc2.stop(now2 + 0.35);
        }, 180);
      }
    } catch {
      // Audio playback silently guarded
    }
  }

  /**
   * Soft affirmative click for user interactions (acknowledge, resolve)
   */
  public playSuccessTone(): void {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12); // E5
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // Guarded
    }
  }
}

export const soundManager = new SoundManager();
