// What a click on the bare backdrop leaves in each shipped scene: a mark where
// it landed, kept until the look changes. Clicks reach the plugin from the
// desktop and the mobile apps alike (`ui.pointer`), so the marks work where no
// shader plays. They are drawn in the window's own points over the scene, so a
// mark lands where the click was, whatever the window's shape.
import { layered, type ScenePalette, type Tones } from './kit.js'

/** Where a click landed: 0 to 1 across the backdrop, and down it. */
export type Point = { x: number; y: number }

/** The most marks a scene keeps; past it the oldest goes. */
export const MARK_LIMIT = 12

type Marks = {
  /** The color rules of one mode. */
  paint: (tones: Tones, isDark: boolean) => string
  /** Rules with no color in them. */
  motion: string
  /** One mark, drawn around (0, 0) in points. */
  mark: string
  /** Joins each mark to the one before it, with a `.mk-path` line. */
  isJoined?: true
}

const SETS: Record<string, Marks> = {
  // A buoy bobbing where the water was touched.
  tide: {
    paint: (tones, isDark) =>
      `.mk-hull{fill:${tones.a}}.mk-top{fill:${tones.c}}` +
      `.mk-ring{fill:none;stroke:${tones.a};stroke-opacity:${isDark ? 0.4 : 0.3}}`,
    motion: '.mk-bob{animation:mk-bob 5s ease-in-out infinite}@keyframes mk-bob{50%{transform:translateY(3px)}}',
    mark:
      '<g class="mk-bob"><ellipse class="mk-ring" cx="0" cy="3" rx="17" ry="4"/>' +
      '<path class="mk-hull" d="M-7 0h14l-3 7h-8z"/><rect class="mk-top" x="-1" y="-13" width="2" height="13"/>' +
      '<circle class="mk-top" cx="0" cy="-14" r="3"/></g>',
  },
  // A new star, joined to the last one into a constellation of the person's own.
  night: {
    paint: (tones, isDark) =>
      `.mk-star{fill:${tones.c}}.mk-path{stroke:${tones.b};stroke-opacity:${isDark ? 0.55 : 0.45}}`,
    motion:
      '.mk-path{stroke-width:1.5;stroke-linecap:round}' +
      '.mk-star{transform-box:fill-box;transform-origin:center;animation:mk-shine 6s ease-in-out infinite}' +
      '@keyframes mk-shine{50%{transform:scale(1.35);opacity:.7}}',
    mark: '<path class="mk-star" d="M0-8L1.8-1.8L8 0L1.8 1.8L0 8L-1.8 1.8L-8 0L-1.8-1.8Z"/>',
    isJoined: true,
  },
  // A via on the board, its pad pulsing slowly.
  circuit: {
    paint: (tones, isDark) =>
      `.mk-via{fill:${tones.a}}.mk-pad{fill:none;stroke:${tones.a}}` +
      `.mk-stub{stroke:${tones.a};stroke-opacity:${isDark ? 0.5 : 0.4}}`,
    motion:
      '.mk-pad{stroke-width:2;animation:mk-pulse 3s ease-in-out infinite}.mk-stub{stroke-width:2;stroke-linecap:round}' +
      '@keyframes mk-pulse{50%{stroke-opacity:.35}}',
    mark: '<path class="mk-stub" d="M10 0h14M-10 0h-14M0 10v14M0-10v-14"/><circle class="mk-pad" r="9"/><circle class="mk-via" r="4.5"/>',
  },
  // A waypoint flag, joined to the last one by a dotted trail.
  terrain: {
    paint: (tones, isDark) =>
      `.mk-flag{fill:${tones.c}}.mk-pole{stroke:${tones.ink};stroke-opacity:${isDark ? 0.7 : 0.6}}` +
      `.mk-base{fill:${tones.a}}.mk-path{stroke:${tones.c};stroke-opacity:.85}`,
    motion:
      '.mk-pole{stroke-width:1.5}.mk-path{stroke-width:1.8;stroke-linecap:round;stroke-dasharray:3 5}' +
      '.mk-flag{transform-box:fill-box;transform-origin:left center;animation:mk-wave 4s ease-in-out infinite}' +
      '@keyframes mk-wave{50%{transform:scaleX(.82)}}',
    mark: '<path class="mk-pole" d="M0 0V-22"/><path class="mk-flag" d="M0-22l13 4.5-13 4.5z"/><circle class="mk-base" r="3"/>',
    isJoined: true,
  },
  // A delivery stop, joined to the last one by the route the van will drive.
  route: {
    paint: tones => `.mk-pin{fill:${tones.a}}.mk-hole{fill:${tones.bg}}.mk-path{stroke:${tones.a};stroke-opacity:.6}`,
    motion:
      '.mk-path{stroke-width:2.5;stroke-linecap:round;stroke-dasharray:8 7;animation:mk-drive 6s linear infinite}' +
      '@keyframes mk-drive{to{stroke-dashoffset:-60}}',
    mark: '<path class="mk-pin" d="M0 0C-6-7-8-11-8-15A8 8 0 0 1 8-15C8-11 6-7 0 0Z"/><circle class="mk-hole" cy="-15" r="3"/>',
    isJoined: true,
  },
}

/** The marks with one more at `point`, the oldest gone past the limit. */
export function added(points: readonly Point[], point: Point): Point[] {
  return [...points, point].slice(-MARK_LIMIT)
}

/** Whether clicks leave marks in this scene. */
export function isMarked(scene: string): boolean {
  return SETS[scene] !== undefined
}

const at = (value: number) => `${(Math.min(1, Math.max(0, value)) * 100).toFixed(2)}%`

/** The scene `source` with the marks of `points` over it, or the source alone. */
export function withMarks(source: string, scene: string, palette: ScenePalette, points: readonly Point[]): string {
  const set = SETS[scene]

  if (set === undefined || points.length === 0) {
    return source
  }
  const paths = set.isJoined
    ? points
        .slice(1)
        .map((point, index) => {
          const from = points[index] ?? point

          return `<line class="mk-path" x1="${at(from.x)}" y1="${at(from.y)}" x2="${at(point.x)}" y2="${at(point.y)}"/>`
        })
        .join('')
    : ''
  const marks = points.map(point => `<svg x="${at(point.x)}" y="${at(point.y)}" overflow="visible">${set.mark}</svg>`).join('')
  const style =
    `${set.paint(palette.light, false)}${set.motion}` +
    `@media (prefers-color-scheme: dark){${set.paint(palette.dark, true)}}` +
    '@media (prefers-reduced-motion: reduce){.mk *{animation:none !important}}'

  return layered(source, `<style>${style}</style><g class="mk">${paths}${marks}</g>`)
}
