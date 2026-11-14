// What every scene is built from: the colors a scene may use, and the frame
// that turns a scene's parts into one SVG that follows light and dark mode.

/** The colors of one mode: the page, the text, and three hues. */
export type Tones = {
  /** The page behind everything (the look's `background`). */
  bg: string
  /** The text color, for the few lines a scene draws in ink. */
  ink: string
  /** The accent. */
  a: string
  /** A second hue (the look's `pro`). */
  b: string
  /** A warm highlight (the look's `warning`). */
  c: string
}

export type ScenePalette = { light: Tones; dark: Tones }

export type Scene = {
  /** What the scene shows, for a screen reader. */
  alt: string
  draw: (palette: ScenePalette) => string
}

type Parts = {
  /** The color rules of one mode; called once for light and once for dark. */
  paint: (tones: Tones, isDark: boolean) => string
  /** Rules with no color in them: geometry, animations, keyframes. */
  motion: string
  /** Rules for a reader who asked for no motion, after animations are off. */
  still?: string
  defs?: string
  body: string
}

const HEX = /^#[0-9a-f]{6}$/i

function channels(hex: string): [number, number, number] {
  const value = HEX.test(hex) ? hex : '#808080'

  return [1, 3, 5].map(at => parseInt(value.slice(at, at + 2), 16)) as [number, number, number]
}

/** `from` moved `amount` (0 to 1) of the way to `to`, as six-digit hex. */
export function mix(from: string, to: string, amount: number): string {
  const start = channels(from)
  const end = channels(to)

  return (
    '#' +
    start
      .map((channel, at) => Math.round(channel + ((end[at] ?? channel) - channel) * amount))
      .map(channel => channel.toString(16).padStart(2, '0'))
      .join('')
  )
}

/** `count` whole numbers from 0. */
export function range(count: number): number[] {
  return Array.from({ length: count }, (_, at) => at)
}

/** Numbers between 0 and 1 that are the same on every run, so a scene is too. */
export function seeded(seed: number): () => number {
  let state = seed

  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296

    return state / 4294967296
  }
}

function ground(id: string, tones: Tones, isDark: boolean): string {
  const [from, to] = isDark
    ? [mix(tones.bg, tones.a, 0.14), mix(tones.bg, '#000000', 0.3)]
    : [mix(tones.bg, '#ffffff', 0.6), mix(tones.bg, tones.a, 0.07)]

  return (
    `<radialGradient id="${id}" cx="15%" cy="10%" r="110%">` +
    `<stop offset="0" stop-color="${from}"/><stop offset=".6" stop-color="${tones.bg}"/>` +
    `<stop offset="1" stop-color="${to}"/></radialGradient>`
  )
}

/** One SVG, 1600 by 1000, cropped to fill any screen. */
export function frame({ light, dark }: ScenePalette, parts: Parts): string {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">',
    '<style>',
    `.bg{fill:url(#bgL)}${parts.paint(light, false)}`,
    parts.motion,
    `@media (prefers-color-scheme: dark){.bg{fill:url(#bgD)}${parts.paint(dark, true)}}`,
    `@media (prefers-reduced-motion: reduce){*{animation:none !important}${parts.still ?? ''}}`,
    '</style>',
    `<defs>${ground('bgL', light, false)}${ground('bgD', dark, true)}${parts.defs ?? ''}</defs>`,
    '<rect class="bg" width="1600" height="1000"/>',
    parts.body,
    '</svg>',
  ].join('')
}
