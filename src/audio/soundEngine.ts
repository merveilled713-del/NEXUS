import type { FamilyId } from '../catalog/types';

/**
 * NEXUS — Web Audio Procedural Synthesizer (Étape 5)
 * Zéro dépendance externe, silencieux sans erreur en environnement sans audio.
 */

export type SoundCue =
  | 'CARD_PLAY'
  | 'CARD_DRAW'
  | 'IMPULSION'
  | 'SURCHARGE'
  | 'INVERSION'
  | 'BOUCLIER'
  | 'PORTAIL'
  | 'NEXUS_CALL'
  | 'VICTORY'
  | 'DEFEAT'
  | 'UI_CLICK';

const FAMILY_BASE_FREQUENCIES: Readonly<Record<FamilyId, number>> = {
  AUBE: 523.25, // C5
  BRAISE: 392.0, // G4
  ONDE: 440.0, // A4
  OMBRE: 293.66, // D4
  ECLAIR: 659.25, // E5
  CRISTAL: 587.33, // D5
};

class NexusSoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private volume = 0.65;

  public configure(options: { readonly muted: boolean; readonly volume: number }): void {
    this.muted = options.muted;
    this.volume = Math.max(0, Math.min(1, options.volume));
  }

  private getContext(): AudioContext | null {
    if (this.muted || this.volume <= 0 || typeof window === 'undefined') {
      return null;
    }
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) {
      return null;
    }
    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => undefined);
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    durationSec: number,
    type: OscillatorType,
    gainPeak: number,
    delaySec = 0,
    slideToFreq?: number,
  ): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideToFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideToFreq), now + durationSec);
    }

    const finalGain = Math.max(0.001, gainPeak * this.volume);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(finalGain, now + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationSec + 0.02);
  }

  public play(cue: SoundCue, family?: FamilyId | null): void {
    if (this.muted || this.volume <= 0) {
      return;
    }

    const base = family ? FAMILY_BASE_FREQUENCIES[family] : 440;

    switch (cue) {
      case 'UI_CLICK':
        this.playTone(620, 0.055, 'triangle', 0.12, 0, 740);
        break;
      case 'CARD_PLAY':
        this.playTone(base, 0.12, 'triangle', 0.18, 0, base * 1.25);
        this.playTone(base * 1.5, 0.14, 'sine', 0.11, 0.04);
        break;
      case 'CARD_DRAW':
        this.playTone(310, 0.09, 'sine', 0.14, 0, 460);
        break;
      case 'IMPULSION':
        this.playTone(220, 0.16, 'sawtooth', 0.18, 0, 110);
        this.playTone(440, 0.14, 'triangle', 0.14, 0.06, 290);
        break;
      case 'SURCHARGE':
        this.playTone(180, 0.24, 'sawtooth', 0.2, 0, 85);
        this.playTone(360, 0.22, 'square', 0.12, 0.05, 160);
        this.playTone(540, 0.18, 'triangle', 0.12, 0.12);
        break;
      case 'INVERSION':
        this.playTone(360, 0.18, 'sine', 0.16, 0, 620);
        this.playTone(620, 0.18, 'sine', 0.14, 0.09, 360);
        break;
      case 'BOUCLIER':
        this.playTone(280, 0.16, 'triangle', 0.18, 0, 220);
        this.playTone(560, 0.14, 'sine', 0.12, 0.04);
        break;
      case 'PORTAIL':
        this.playTone(base, 0.28, 'sine', 0.16, 0, base * 1.5);
        this.playTone(base * 1.25, 0.3, 'triangle', 0.13, 0.07, base * 2);
        this.playTone(base * 1.5, 0.32, 'sine', 0.1, 0.14);
        break;
      case 'NEXUS_CALL':
        this.playTone(587.33, 0.12, 'triangle', 0.2, 0);
        this.playTone(880, 0.22, 'sine', 0.18, 0.08);
        break;
      case 'VICTORY':
        this.playTone(523.25, 0.16, 'triangle', 0.18, 0);
        this.playTone(659.25, 0.16, 'triangle', 0.18, 0.11);
        this.playTone(783.99, 0.22, 'triangle', 0.18, 0.22);
        this.playTone(1046.5, 0.38, 'sine', 0.2, 0.34);
        break;
      case 'DEFEAT':
        this.playTone(392, 0.2, 'triangle', 0.16, 0, 349);
        this.playTone(311.13, 0.26, 'sine', 0.16, 0.16, 261.63);
        break;
    }
  }
}

export const soundEngine = new NexusSoundEngine();
