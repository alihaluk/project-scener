// What each shipped look sounds like in the desktop app, once the person turns
// its sound on with the speaker in the session's title bar. It is numbers, never
// a recording: the app makes the sound itself. Each is kept quiet and sparse,
// since it plays for hours beside someone's work.
//
// The ambience plays while the window is in use, and stops for a prompt, a
// question, dictation or a reply read aloud. The cues are played by the app at
// its own moments: `send`, `done`, `ask`, `error`, and `click` on the bare
// backdrop, whose notes run from the left edge to the right.
import type { ThemeSound } from 'claude-code'

export const SOUNDS: Record<string, ThemeSound> = {
  tide: {
    ambience: {
      layers: [
        // Surf that swells and falls back.
        { wave: 'pink', drone: true, gain: 0.053, filter: { type: 'lowpass', hz: 420, to: 900 }, tremolo: { hz: 0.08, depth: 0.55 } },
        { wave: 'brown', drone: true, gain: 0.029, filter: { type: 'lowpass', hz: 220 } },
      ],
      reverb: 0.25,
    },
    cues: {
      send: { layers: [{ wave: 'sine', notes: ['E5'], glide: 2, attack: 0.01, release: 0.3, gain: 0.064 }] },
      done: { layers: [{ wave: 'bell', notes: ['A4', 'E5'], step: 0.14, release: 1.4, gain: 0.048 }], reverb: 0.3 },
      ask: { layers: [{ wave: 'sine', notes: ['C#5', 'A5'], step: 0.12, release: 0.5, gain: 0.051 }] },
      error: { layers: [{ wave: 'triangle', notes: ['E4', 'C#4'], step: 0.16, release: 0.5, gain: 0.058 }] },
      click: { layers: [{ wave: 'bell', notes: ['A4', 'B4', 'C#5', 'E5', 'F#5', 'A5'], release: 1.2, gain: 0.068 }], reverb: 0.3 },
    },
  },
  night: {
    ambience: {
      layers: [
        { wave: 'sine', notes: ['A2', 'E3'], drone: true, gain: 0.01, filter: { type: 'lowpass', hz: 500 }, tremolo: { hz: 0.05, depth: 0.3 } },
        // A star's high bell, about one every eight seconds.
        { wave: 'bell', notes: ['E6', 'F#6', 'G#6', 'B6', 'C#7'], scatter: 0.12, release: 2.4, gain: 0.013 },
      ],
      reverb: 0.5,
    },
    cues: {
      send: { layers: [{ wave: 'sine', notes: ['B5'], release: 0.4, gain: 0.07 }], reverb: 0.4 },
      done: { layers: [{ wave: 'bell', notes: ['E5', 'B5', 'E6'], step: 0.16, release: 1.8, gain: 0.045 }], reverb: 0.5 },
      ask: { layers: [{ wave: 'bell', notes: ['G#5', 'C#6'], step: 0.14, release: 1, gain: 0.063 }], reverb: 0.4 },
      error: { layers: [{ wave: 'sine', notes: ['E4', 'B3'], step: 0.18, release: 0.6, gain: 0.056 }] },
      click: { layers: [{ wave: 'bell', notes: ['E5', 'F#5', 'G#5', 'B5', 'C#6', 'E6'], release: 1.2, gain: 0.069 }], reverb: 0.35 },
    },
  },
  circuit: {
    ambience: {
      layers: [
        // The board's hum.
        { wave: 'triangle', notes: ['A1'], drone: true, gain: 0.014, filter: { type: 'lowpass', hz: 180 } },
        // A faint blip now and then, as a signal runs a trace.
        { wave: 'square', notes: ['A5', 'E6', 'B6'], scatter: 0.3, attack: 0.002, release: 0.05, gain: 0.008, filter: { type: 'lowpass', hz: 2600 } },
      ],
    },
    cues: {
      send: { layers: [{ wave: 'square', notes: ['A5'], release: 0.06, gain: 0.06, filter: { type: 'lowpass', hz: 3000 } }] },
      // Tool calls come often: the one look that marks them, with a tick.
      tool: { layers: [{ wave: 'triangle', notes: ['E6'], release: 0.04, gain: 0.03 }] },
      done: { layers: [{ wave: 'triangle', notes: ['A5', 'C#6', 'E6'], step: 0.07, release: 0.25, gain: 0.058 }] },
      ask: { layers: [{ wave: 'square', notes: ['E6', 'E6'], step: 0.12, release: 0.06, gain: 0.06, filter: { type: 'lowpass', hz: 3000 } }] },
      error: { layers: [{ wave: 'saw', notes: ['A3'], glide: -3, release: 0.35, gain: 0.069, filter: { type: 'lowpass', hz: 1200 } }] },
      click: { layers: [{ wave: 'triangle', notes: ['A4', 'C5', 'D5', 'E5', 'G5', 'A5'], release: 0.2, gain: 0.066 }] },
    },
  },
  terrain: {
    ambience: {
      layers: [
        // Wind over the ridge, gusting slowly.
        { wave: 'brown', drone: true, gain: 0.08, filter: { type: 'bandpass', hz: 260, to: 620 }, tremolo: { hz: 0.1, depth: 0.45 } },
        { wave: 'pink', drone: true, gain: 0.02, filter: { type: 'highpass', hz: 2400 }, tremolo: { hz: 0.07, depth: 0.6 } },
      ],
      reverb: 0.2,
    },
    cues: {
      send: { layers: [{ wave: 'triangle', notes: ['A4'], release: 0.25, gain: 0.066 }] },
      done: { layers: [{ wave: 'triangle', notes: ['D4', 'A4'], step: 0.2, release: 1, gain: 0.05 }], reverb: 0.35 },
      ask: { layers: [{ wave: 'triangle', notes: ['D5', 'A4'], step: 0.14, release: 0.5, gain: 0.054 }] },
      error: { layers: [{ wave: 'triangle', notes: ['D4', 'A3'], step: 0.18, release: 0.5, gain: 0.066 }] },
      click: { layers: [{ wave: 'triangle', notes: ['D4', 'F4', 'G4', 'A4', 'C5', 'D5'], release: 0.7, gain: 0.07 }], reverb: 0.3 },
    },
  },
  route: {
    ambience: {
      layers: [
        // The city: a low traffic rumble and tyres far off.
        { wave: 'brown', drone: true, gain: 0.049, filter: { type: 'lowpass', hz: 320 } },
        { wave: 'pink', drone: true, gain: 0.014, filter: { type: 'bandpass', hz: 900, to: 1500 } },
        // Now and then, a far-off signal.
        { wave: 'sine', notes: ['C5', 'E5', 'G5'], scatter: 0.05, attack: 0.02, release: 0.8, gain: 0.017 },
      ],
      reverb: 0.3,
    },
    cues: {
      send: { layers: [{ wave: 'sine', notes: ['G5'], glide: 1, release: 0.25, gain: 0.065 }] },
      done: { layers: [{ wave: 'bell', notes: ['C5', 'E5', 'G5'], step: 0.1, release: 1, gain: 0.045 }], reverb: 0.25 },
      ask: { layers: [{ wave: 'sine', notes: ['G5', 'E5'], step: 0.12, release: 0.4, gain: 0.055 }] },
      error: { layers: [{ wave: 'triangle', notes: ['C4', 'G3'], step: 0.16, release: 0.5, gain: 0.065 }] },
      click: { layers: [{ wave: 'sine', notes: ['C5', 'D5', 'E5', 'G5', 'A5', 'C6'], release: 0.5, gain: 0.067 }], reverb: 0.25 },
    },
  },
  forest: {
    ambience: {
      layers: [
        // Wind in the pines, rising and falling.
        { wave: 'pink', drone: true, gain: 0.03, filter: { type: 'lowpass', hz: 900, to: 1600 }, tremolo: { hz: 0.12, depth: 0.5 } },
        { wave: 'brown', drone: true, gain: 0.02, filter: { type: 'lowpass', hz: 200 } },
        // Leaves stirring now and then.
        { wave: 'crackle', scatter: 0.4, attack: 0.01, release: 0.3, gain: 0.01, filter: { type: 'highpass', hz: 1800 } },
        // A far bird, about one every ten seconds.
        { wave: 'sine', notes: ['E6', 'G6', 'A6', 'C7'], scatter: 0.1, glide: 3, attack: 0.01, release: 0.18, gain: 0.012 },
      ],
      reverb: 0.35,
    },
    cues: {
      send: { layers: [{ wave: 'triangle', notes: ['G5'], release: 0.25, gain: 0.062 }] },
      done: { layers: [{ wave: 'bell', notes: ['D5', 'A5'], step: 0.14, release: 1.2, gain: 0.048 }], reverb: 0.3 },
      ask: { layers: [{ wave: 'triangle', notes: ['A5', 'D6'], step: 0.12, release: 0.4, gain: 0.055 }] },
      error: { layers: [{ wave: 'triangle', notes: ['D4', 'A3'], step: 0.18, release: 0.5, gain: 0.062 }] },
      click: { layers: [{ wave: 'triangle', notes: ['D5', 'E5', 'G5', 'A5', 'B5', 'D6'], release: 0.5, gain: 0.066 }], reverb: 0.25 },
    },
  },
  aurora: {
    ambience: {
      layers: [
        // A high, airy pad that barely moves.
        { wave: 'sine', notes: ['E4', 'B4'], drone: true, gain: 0.008, filter: { type: 'lowpass', hz: 1400 }, tremolo: { hz: 0.05, depth: 0.4 } },
        { wave: 'pink', drone: true, gain: 0.01, filter: { type: 'highpass', hz: 3000 }, tremolo: { hz: 0.06, depth: 0.6 } },
        // A cold shimmer, about one every twelve seconds.
        { wave: 'bell', notes: ['B6', 'E7', 'F#7'], scatter: 0.08, release: 3, gain: 0.009 },
      ],
      reverb: 0.6,
    },
    cues: {
      send: { layers: [{ wave: 'sine', notes: ['B5'], release: 0.5, gain: 0.066 }], reverb: 0.5 },
      done: { layers: [{ wave: 'bell', notes: ['E5', 'B5', 'F#6'], step: 0.18, release: 2, gain: 0.044 }], reverb: 0.6 },
      ask: { layers: [{ wave: 'bell', notes: ['F#5', 'B5'], step: 0.14, release: 1, gain: 0.06 }], reverb: 0.5 },
      error: { layers: [{ wave: 'sine', notes: ['E4', 'B3'], step: 0.2, release: 0.6, gain: 0.056 }] },
      click: { layers: [{ wave: 'bell', notes: ['E5', 'F#5', 'B5', 'C#6', 'E6', 'F#6'], release: 1.4, gain: 0.066 }], reverb: 0.5 },
    },
  },
  paper: {
    ambience: {
      layers: [
        // A quiet room.
        { wave: 'brown', drone: true, gain: 0.02, filter: { type: 'lowpass', hz: 180 } },
        // A pen scratching now and then.
        { wave: 'white', scatter: 0.25, attack: 0.002, release: 0.06, gain: 0.006, filter: { type: 'bandpass', hz: 3000, to: 4200 } },
      ],
      reverb: 0.15,
    },
    cues: {
      send: { layers: [{ wave: 'triangle', notes: ['C6'], release: 0.08, gain: 0.055 }] },
      done: { layers: [{ wave: 'triangle', notes: ['G4', 'C5'], step: 0.12, release: 0.6, gain: 0.052 }] },
      ask: { layers: [{ wave: 'triangle', notes: ['E5', 'G5'], step: 0.12, release: 0.3, gain: 0.055 }] },
      error: { layers: [{ wave: 'triangle', notes: ['C4', 'G3'], step: 0.16, release: 0.4, gain: 0.06 }] },
      click: { layers: [{ wave: 'triangle', notes: ['C5', 'D5', 'E5', 'G5', 'A5', 'C6'], release: 0.25, gain: 0.064 }] },
    },
  },
  desert: {
    ambience: {
      layers: [
        // Wind over the dunes, gusting slowly.
        { wave: 'brown', drone: true, gain: 0.07, filter: { type: 'bandpass', hz: 300, to: 700 }, tremolo: { hz: 0.07, depth: 0.5 } },
        // Sand hissing on the gusts.
        { wave: 'pink', drone: true, gain: 0.012, filter: { type: 'highpass', hz: 2600 }, tremolo: { hz: 0.05, depth: 0.7 } },
        // A camel's bell far off, about one every twenty-five seconds.
        { wave: 'bell', notes: ['D4', 'F4', 'A4'], scatter: 0.04, release: 1.6, gain: 0.012 },
      ],
      reverb: 0.3,
    },
    cues: {
      send: { layers: [{ wave: 'sine', notes: ['A4'], glide: -1, release: 0.3, gain: 0.066 }] },
      done: { layers: [{ wave: 'bell', notes: ['D4', 'A4', 'D5'], step: 0.16, release: 1.4, gain: 0.046 }], reverb: 0.35 },
      ask: { layers: [{ wave: 'sine', notes: ['F5', 'D5'], step: 0.12, release: 0.4, gain: 0.055 }] },
      error: { layers: [{ wave: 'triangle', notes: ['D4', 'A3'], step: 0.18, release: 0.5, gain: 0.064 }] },
      click: { layers: [{ wave: 'bell', notes: ['D4', 'E4', 'F4', 'A4', 'C5', 'D5'], release: 1, gain: 0.068 }], reverb: 0.3 },
    },
  },
}
