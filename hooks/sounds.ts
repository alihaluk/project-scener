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
        { wave: 'pink', drone: true, gain: 0.22, filter: { type: 'lowpass', hz: 420, to: 900 }, tremolo: { hz: 0.08, depth: 0.55 } },
        { wave: 'brown', drone: true, gain: 0.12, filter: { type: 'lowpass', hz: 220 } },
      ],
      reverb: 0.25,
    },
    cues: {
      send: { layers: [{ wave: 'sine', notes: ['E5'], glide: 2, attack: 0.01, release: 0.3, gain: 0.22 }] },
      done: { layers: [{ wave: 'bell', notes: ['A4', 'E5'], step: 0.14, release: 1.4, gain: 0.3 }], reverb: 0.3 },
      ask: { layers: [{ wave: 'sine', notes: ['C#5', 'A5'], step: 0.12, release: 0.5, gain: 0.25 }] },
      error: { layers: [{ wave: 'triangle', notes: ['E4', 'C#4'], step: 0.16, release: 0.5, gain: 0.25 }] },
      click: { layers: [{ wave: 'bell', notes: ['A4', 'B4', 'C#5', 'E5', 'F#5', 'A5'], release: 1.2, gain: 0.25 }], reverb: 0.3 },
    },
  },
  night: {
    ambience: {
      layers: [
        { wave: 'sine', notes: ['A2', 'E3'], drone: true, gain: 0.08, filter: { type: 'lowpass', hz: 500 }, tremolo: { hz: 0.05, depth: 0.3 } },
        // A star's high bell, about one every eight seconds.
        { wave: 'bell', notes: ['E6', 'F#6', 'G#6', 'B6', 'C#7'], scatter: 0.12, release: 2.4, gain: 0.1 },
      ],
      reverb: 0.5,
    },
    cues: {
      send: { layers: [{ wave: 'sine', notes: ['B5'], release: 0.4, gain: 0.18 }], reverb: 0.4 },
      done: { layers: [{ wave: 'bell', notes: ['E5', 'B5', 'E6'], step: 0.16, release: 1.8, gain: 0.25 }], reverb: 0.5 },
      ask: { layers: [{ wave: 'bell', notes: ['G#5', 'C#6'], step: 0.14, release: 1, gain: 0.22 }], reverb: 0.4 },
      error: { layers: [{ wave: 'sine', notes: ['E4', 'B3'], step: 0.18, release: 0.6, gain: 0.25 }] },
      click: { layers: [{ wave: 'bell', notes: ['E5', 'F#5', 'G#5', 'B5', 'C#6', 'E6'], release: 1.2, gain: 0.22 }], reverb: 0.35 },
    },
  },
  circuit: {
    ambience: {
      layers: [
        // The board's hum.
        { wave: 'triangle', notes: ['A1'], drone: true, gain: 0.07, filter: { type: 'lowpass', hz: 180 } },
        // A faint blip now and then, as a signal runs a trace.
        { wave: 'square', notes: ['A5', 'E6', 'B6'], scatter: 0.3, attack: 0.002, release: 0.05, gain: 0.04, filter: { type: 'lowpass', hz: 2600 } },
      ],
    },
    cues: {
      send: { layers: [{ wave: 'square', notes: ['A5'], release: 0.06, gain: 0.12, filter: { type: 'lowpass', hz: 3000 } }] },
      // Tool calls come often: the one look that marks them, with a tick.
      tool: { layers: [{ wave: 'triangle', notes: ['E6'], release: 0.04, gain: 0.06 }] },
      done: { layers: [{ wave: 'triangle', notes: ['A5', 'C#6', 'E6'], step: 0.07, release: 0.25, gain: 0.2 }] },
      ask: { layers: [{ wave: 'square', notes: ['E6', 'E6'], step: 0.12, release: 0.06, gain: 0.12, filter: { type: 'lowpass', hz: 3000 } }] },
      error: { layers: [{ wave: 'saw', notes: ['A3'], glide: -3, release: 0.35, gain: 0.14, filter: { type: 'lowpass', hz: 1200 } }] },
      click: { layers: [{ wave: 'triangle', notes: ['A4', 'C5', 'D5', 'E5', 'G5', 'A5'], release: 0.2, gain: 0.2 }] },
    },
  },
  terrain: {
    ambience: {
      layers: [
        // Wind over the ridge, gusting slowly.
        { wave: 'brown', drone: true, gain: 0.2, filter: { type: 'bandpass', hz: 260, to: 620 }, tremolo: { hz: 0.1, depth: 0.45 } },
        { wave: 'pink', drone: true, gain: 0.05, filter: { type: 'highpass', hz: 2400 }, tremolo: { hz: 0.07, depth: 0.6 } },
      ],
      reverb: 0.2,
    },
    cues: {
      send: { layers: [{ wave: 'triangle', notes: ['A4'], release: 0.25, gain: 0.2 }] },
      done: { layers: [{ wave: 'triangle', notes: ['D4', 'A4'], step: 0.2, release: 1, gain: 0.25 }], reverb: 0.35 },
      ask: { layers: [{ wave: 'triangle', notes: ['D5', 'A4'], step: 0.14, release: 0.5, gain: 0.22 }] },
      error: { layers: [{ wave: 'triangle', notes: ['D4', 'A3'], step: 0.18, release: 0.5, gain: 0.25 }] },
      click: { layers: [{ wave: 'triangle', notes: ['D4', 'F4', 'G4', 'A4', 'C5', 'D5'], release: 0.7, gain: 0.22 }], reverb: 0.3 },
    },
  },
  route: {
    ambience: {
      layers: [
        // The city: a low traffic rumble and tyres far off.
        { wave: 'brown', drone: true, gain: 0.14, filter: { type: 'lowpass', hz: 320 } },
        { wave: 'pink', drone: true, gain: 0.04, filter: { type: 'bandpass', hz: 900, to: 1500 } },
        // Now and then, a far-off signal.
        { wave: 'sine', notes: ['C5', 'E5', 'G5'], scatter: 0.05, attack: 0.02, release: 0.8, gain: 0.05 },
      ],
      reverb: 0.3,
    },
    cues: {
      send: { layers: [{ wave: 'sine', notes: ['G5'], glide: 1, release: 0.25, gain: 0.2 }] },
      done: { layers: [{ wave: 'bell', notes: ['C5', 'E5', 'G5'], step: 0.1, release: 1, gain: 0.25 }], reverb: 0.25 },
      ask: { layers: [{ wave: 'sine', notes: ['G5', 'E5'], step: 0.12, release: 0.4, gain: 0.22 }] },
      error: { layers: [{ wave: 'triangle', notes: ['C4', 'G3'], step: 0.16, release: 0.5, gain: 0.25 }] },
      click: { layers: [{ wave: 'sine', notes: ['C5', 'D5', 'E5', 'G5', 'A5', 'C6'], release: 0.5, gain: 0.22 }], reverb: 0.25 },
    },
  },
}
