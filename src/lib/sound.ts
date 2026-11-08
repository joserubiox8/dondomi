/**
 * DonDomi - Sintetizador de Alertas de Audio para Cocina (/merchant)
 * Utiliza Web Audio API nativo sin requerir archivos de audio externos.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Toca un timbre de campana de restaurante de 3 tonos (Do - Mi - Sol)
 */
export function playOrderAlertSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const startTime = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime + idx * 0.15);

      gain.gain.setValueAtTime(0.3, startTime + idx * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + idx * 0.15 + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime + idx * 0.15);
      osc.stop(startTime + idx * 0.15 + 0.45);
    });
  } catch (err) {
    console.warn('No se pudo reproducir el sonido de alerta:', err);
  }
}

/**
 * Campanada doble cristalina de cocina / restaurante ("Ding-Ding!")
 * Sintetizada en Web Audio API con armónicos de campana de bronce.
 */
export function playKitchenBellChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const playStrike = (startTime: number, baseFreq: number) => {
      // Tono principal
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(baseFreq, startTime);

      // Armónico metálico superior
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(baseFreq * 2.76, startTime);

      // Envolvente de decaimiento
      gain1.gain.setValueAtTime(0.4, startTime);
      gain1.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.65);

      gain2.gain.setValueAtTime(0.15, startTime);
      gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.35);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc1.start(startTime);
      osc1.stop(startTime + 0.7);

      osc2.start(startTime);
      osc2.stop(startTime + 0.4);
    };

    const now = ctx.currentTime;
    playStrike(now, 1046.5);         // C6
    playStrike(now + 0.22, 1318.5);   // E6
  } catch (err) {
    console.warn('No se pudo reproducir el timbre de cocina:', err);
  }
}

