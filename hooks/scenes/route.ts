// A delivery route through a city grid: a van follows the road past five stops.
import { frame, range, type Scene } from './kit.js'

const ROAD =
  'M 40 1000 C 70 820, 30 660, 140 520 S 110 270, 260 170 S 520 70, 760 110 S 1100 50, 1300 140 S 1530 270, 1480 460 S 1570 780, 1560 1000'

const STOPS = [
  [140, 520],
  [260, 170],
  [760, 110],
  [1300, 140],
  [1480, 460],
] as const

const BLOCKS = [
  [8, 608],
  [108, 308],
  [308, 8],
  [608, 208],
  [1008, 8],
  [1208, 208],
  [1408, 608],
  [1508, 308],
  [8, 108],
  [1408, 8],
] as const

const streets = [
  ...range(17).map(at => `<line x1="${at * 100}" y1="0" x2="${at * 100}" y2="1000"/>`),
  ...range(11).map(at => `<line x1="0" y1="${at * 100}" x2="1600" y2="${at * 100}"/>`),
].join('')

const blocks = BLOCKS.map(([x, y]) => `<rect x="${x}" y="${y}" width="84" height="84" rx="6"/>`).join('')

const stops = STOPS.map(
  ([x, y], at) =>
    `<g class="p${at}" transform="translate(${x} ${y})"><circle class="halo" r="10"/>` +
    '<path class="drop" d="M0 0 C -9 -12, -12 -18, -12 -24 A 12 12 0 1 1 12 -24 C 12 -18, 9 -12, 0 0 Z"/>' +
    '<circle class="dot" cy="-24" r="4.5"/></g>',
).join('')

export const route: Scene = {
  alt: 'A delivery van following a route through city streets, past five stops',
  draw: palette =>
    frame(palette, {
      paint: (tones, isDark) =>
        `.st line{stroke:${tones.a};stroke-opacity:.07}` +
        `.bl rect{fill:${tones.a};fill-opacity:.045}` +
        `.road{stroke:${tones.a};stroke-opacity:.18}` +
        `.trail{stroke:${tones.a};stroke-opacity:.55}` +
        `.drop{fill:${tones.a};fill-opacity:.8}` +
        `.p2 .drop,.p4 .drop{fill:${tones.b}}` +
        `.dot{fill:${isDark ? tones.bg : '#ffffff'}}` +
        `.halo{fill:${tones.c}}` +
        `.van .body{fill:${tones.c}}.van .cab{fill:${tones.a}}`,
      motion:
        '.st line{stroke-width:2}' +
        '.road{fill:none;stroke-width:14;stroke-linecap:round}' +
        '.trail{fill:none;stroke-width:3;stroke-linecap:round;stroke-dasharray:2 14;animation:flow 6s linear infinite}' +
        '.halo{fill-opacity:0;animation:pulse 10s ease-out infinite}' +
        range(5)
          .map(at => `.p${at} .halo{animation-delay:${at * 2}s}`)
          .join('') +
        `.van{offset-path:path("${ROAD}");offset-rotate:auto;animation:drive 40s linear infinite}` +
        '@keyframes flow{to{stroke-dashoffset:-160}}' +
        '@keyframes pulse{0%{fill-opacity:.55;transform:scale(.6)}18%{fill-opacity:0;transform:scale(4)}100%{fill-opacity:0;transform:scale(4)}}' +
        '@keyframes drive{to{offset-distance:100%}}',
      still: '.van{offset-distance:38%}',
      body:
        `<g class="bl">${blocks}</g><g class="st">${streets}</g>` +
        `<path class="road" d="${ROAD}"/><path class="trail" d="${ROAD}"/>${stops}` +
        '<g class="van"><rect class="body" x="-16" y="-9" width="22" height="18" rx="3"/>' +
        '<rect class="cab" x="6" y="-8" width="11" height="16" rx="3"/></g>',
    }),
}
