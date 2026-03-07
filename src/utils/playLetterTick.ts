const PENTATONIC_STEPS = [0, 2, 4, 7, 9] as const;

/**
 * Plays a short tick sound for a letter using Web Audio API.
 * The pitch is determined by mapping the letter to a pentatonic scale.
 */
export function playLetterTick(context: AudioContext, letter: string): void {
  const now = context.currentTime;

  const letterIndex = (letter.charCodeAt(0) - 65 + 26) % 26;
  const step = PENTATONIC_STEPS[letterIndex % PENTATONIC_STEPS.length] ?? 0;
  const octave = Math.floor(letterIndex / PENTATONIC_STEPS.length) % 2;
  const frequency = 880 * 2 ** ((step + octave * 12) / 12);

  const bodyOsc = context.createOscillator();
  const shimmerOsc = context.createOscillator();
  const bodyGain = context.createGain();
  const shimmerGain = context.createGain();
  const masterGain = context.createGain();
  const highpass = context.createBiquadFilter();

  bodyOsc.type = "sine";
  shimmerOsc.type = "triangle";
  bodyOsc.frequency.setValueAtTime(frequency, now);
  shimmerOsc.frequency.setValueAtTime(frequency * 2, now);

  highpass.type = "highpass";
  highpass.frequency.setValueAtTime(780, now);
  highpass.Q.setValueAtTime(0.7, now);

  bodyGain.gain.setValueAtTime(0.0001, now);
  bodyGain.gain.exponentialRampToValueAtTime(0.013, now + 0.003);
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

  shimmerGain.gain.setValueAtTime(0.0001, now);
  shimmerGain.gain.exponentialRampToValueAtTime(0.0045, now + 0.0025);
  shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.022);

  masterGain.gain.setValueAtTime(0.9, now);

  bodyOsc.connect(bodyGain);
  shimmerOsc.connect(shimmerGain);
  bodyGain.connect(masterGain);
  shimmerGain.connect(masterGain);
  masterGain.connect(highpass);
  highpass.connect(context.destination);

  bodyOsc.start(now);
  shimmerOsc.start(now);
  bodyOsc.stop(now + 0.034);
  shimmerOsc.stop(now + 0.028);
}
