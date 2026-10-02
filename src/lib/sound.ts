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
