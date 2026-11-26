// A forest at dusk: three ridges of pines, mist drifting between them, and
// fireflies glowing slowly over the trees.
import { frame, range, seeded, type Scene } from './kit.js'

// Back to front: the ridge's height at each end and in the middle, and how tall its pines stand.
const RIDGES = [
  { left: 690, middle: 640, right: 700, pine: 54 },
  { left: 790, middle: 740, right: 770, pine: 70 },
  { left: 900, middle: 860, right: 880, pine: 92 },
] as const

/** Where a ridge's crest is at `x`: a slow curve through its three heights. */
function crest(ridge: (typeof RIDGES)[number], x: number): number {
  const t = x / 1600

  return (1 - t) * (1 - t) * ridge.left + 2 * t * (1 - t) * (2 * ridge.middle - (ridge.left + ridge.right) / 2) + t * t * ridge.right
}

/** One pine: three stacked triangles on a short trunk, its foot at (x, y). */
function pine(x: number, y: number, height: number): string {
  const w = height * 0.34
  const tiers = [0, 0.3, 0.55]
    .map((at, tier) => {
      const top = y - height * (1 - at * 0.55) - height * 0.08
      const base = y - height * at * 0.75 - height * 0.12
      const half = w * (1 - tier * 0.22)

      return `M ${x.toFixed(1)} ${top.toFixed(1)} L ${(x + half).toFixed(1)} ${base.toFixed(1)} L ${(x - half).toFixed(1)} ${base.toFixed(1)} Z`
    })
    .join(' ')

  return `${tiers} M ${(x - 2).toFixed(1)} ${y.toFixed(1)} h 4 v ${(-height * 0.14).toFixed(1)} h -4 Z`
}

function ridge(at: number): string {
  const line = RIDGES[at] as (typeof RIDGES)[number]
  const next = seeded(11 + at * 7)
  const ground = range(17)
    .map(step => `L ${step * 100} ${crest(line, step * 100).toFixed(1)}`)
    .join(' ')
  const trees = range(Math.round(30 + at * 6))
    .map(() => {
      const x = next() * 1640 - 20

      return pine(x, crest(line, x) + 6, line.pine * (0.65 + next() * 0.55))
    })
    .join(' ')

  return `<path class="r${at}" d="M -20 1000 L -20 ${crest(line, 0).toFixed(1)} ${ground} L 1620 ${crest(line, 1600).toFixed(1)} V 1000 Z ${trees}"/>`
}

const FIREFLIES = [
  [210, 360], [330, 470], [140, 560], [420, 610], [1240, 380], [1380, 470], [1300, 600],
  [1470, 300], [980, 560], [610, 660], [760, 590], [1120, 650],
] as const

export const forest: Scene = {
  alt: 'Three ridges of pines at dusk, with mist drifting between them and fireflies glowing over the trees',
  draw: palette =>
    frame(palette, {
      paint: (tones, isDark) =>
        `.r0{fill:${tones.a};fill-opacity:${isDark ? 0.14 : 0.1}}.r1{fill:${tones.a};fill-opacity:${isDark ? 0.22 : 0.16}}` +
        `.r2{fill:${tones.a};fill-opacity:${isDark ? 0.32 : 0.24}}` +
        `.mist-in{stop-color:${isDark ? tones.b : '#ffffff'};stop-opacity:${isDark ? 0.16 : 0.6}}` +
        `.mist-out{stop-color:${isDark ? tones.b : '#ffffff'};stop-opacity:0}` +
        `.moon{fill:${tones.c};fill-opacity:${isDark ? 0.3 : 0.18}}` +
        `.fly{fill:${tones.c}}.halo{fill:${tones.c};fill-opacity:${isDark ? 0.16 : 0.1}}`,
      defs: '<radialGradient id="mist"><stop offset="0" class="mist-in"/><stop offset="1" class="mist-out"/></radialGradient>',
      motion:
        '.mist{fill:url(#mist);animation:mist 44s ease-in-out infinite alternate}.m1{animation-duration:58s;animation-direction:alternate-reverse}' +
        '@keyframes mist{to{transform:translateX(140px)}}' +
        '.fly{opacity:.75;animation:glow 6s ease-in-out infinite}.halo{animation:glow 6s ease-in-out infinite}' +
        '.drift{animation:drift 14s ease-in-out infinite alternate}' +
        range(FIREFLIES.length)
          .map(at => `.f${at},.f${at} *{animation-delay:${(-at * 1.37).toFixed(2)}s}`)
          .join('') +
        '@keyframes glow{50%{opacity:.2}}' +
        '@keyframes drift{to{transform:translate(18px,-14px)}}',
      still: '.fly{opacity:.75}',
      body:
        '<circle class="moon" cx="1330" cy="170" r="54"/>' +
        ridge(0) +
        '<ellipse class="mist" cx="350" cy="735" rx="620" ry="60"/>' +
        ridge(1) +
        '<ellipse class="mist m1" cx="1250" cy="840" rx="640" ry="66"/>' +
        ridge(2) +
        FIREFLIES.map(
          ([x, y], at) =>
            `<g transform="translate(${x} ${y})"><g class="drift f${at}"><circle class="halo" r="11"/><circle class="fly" r="3"/></g></g>`,
        ).join(''),
    }),
}
