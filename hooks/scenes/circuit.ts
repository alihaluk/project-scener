// A circuit board: traces run in from the edges to a chip, and signals travel them.
import { frame, range, type Scene } from './kit.js'

// Each trace, and how many seconds a signal takes to travel it.
const TRACES = [
  ['M 0 140 H 220 L 300 220 H 520 L 580 160 H 700', 9],
  ['M 0 260 H 140 L 220 340 V 520 L 160 580 H 0', 12],
  ['M 1600 120 H 1380 L 1300 200 H 1100 L 1040 140 H 900', 10],
  ['M 1600 300 H 1460 L 1400 360 V 560 L 1470 630 H 1600', 13],
  ['M 0 820 H 260 L 340 740 H 560', 8],
  ['M 1600 860 H 1340 L 1260 780 H 1060', 8.5],
  ['M 380 1000 V 900 L 440 840 H 620', 7],
  ['M 1220 1000 V 920 L 1160 860 H 980', 7.5],
] as const

const PADS = [
  [220, 430],
  [1400, 460],
  [560, 740],
  [1060, 780],
  [620, 840],
  [980, 860],
] as const

const pins = range(5)
  .map(at => `<rect x="686" y="${104 + at * 22}" width="14" height="10" rx="2"/><rect x="900" y="${104 + at * 22}" width="14" height="10" rx="2"/>`)
  .join('')

export const circuit: Scene = {
  alt: 'A circuit board with traces running to a chip and signals travelling along them',
  draw: palette =>
    frame(palette, {
      paint: (tones, isDark) =>
        `.grid circle{fill:${tones.a};fill-opacity:${isDark ? 0.12 : 0.14}}` +
        `.trace{stroke:${tones.a};stroke-opacity:.28}` +
        `.pad{fill:${tones.bg};stroke:${tones.a};stroke-opacity:.5}.pad-dot{fill:${tones.a};fill-opacity:.6}` +
        `.chip .body{fill:${tones.a};fill-opacity:.1;stroke:${tones.a};stroke-opacity:.5}` +
        `.chip .pins rect{fill:${tones.a};fill-opacity:.45}.chip .mark{fill:${tones.b};fill-opacity:.5}` +
        `.chip .core{fill:${tones.c}}` +
        `.signal{fill:${tones.c}}.s1,.s3,.s5,.s7{fill:${tones.b}}`,
      motion:
        '.grid{fill:url(#grid)}' +
        '.trace{fill:none;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}' +
        '.pad{stroke-width:3}.chip .body{stroke-width:2.5}' +
        '.chip .core{transform-box:fill-box;transform-origin:center;animation:tick 2.4s ease-in-out infinite}' +
        '.signal{opacity:0;animation:run linear infinite}' +
        TRACES.map(
          ([path, seconds], at) =>
            `.s${at}{offset-path:path("${path}");animation-duration:${seconds}s;animation-delay:${at * -1.7}s}`,
        ).join('') +
        '@keyframes run{0%{offset-distance:0%;opacity:0}6%{opacity:.95}92%{opacity:.95}100%{offset-distance:100%;opacity:0}}' +
        '@keyframes tick{50%{opacity:.35;transform:scale(.8)}}',
      defs: '<pattern id="grid" class="grid" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="1.5"/></pattern>',
      body:
        '<rect class="grid" width="1600" height="1000"/>' +
        TRACES.map(([path]) => `<path class="trace" d="${path}"/>`).join('') +
        PADS.map(([x, y]) => `<circle class="pad" cx="${x}" cy="${y}" r="9"/><circle class="pad-dot" cx="${x}" cy="${y}" r="3"/>`).join('') +
        `<g class="chip"><g class="pins">${pins}</g><rect class="body" x="700" y="90" width="200" height="120" rx="10"/>` +
        '<rect class="mark" x="722" y="112" width="70" height="6" rx="3"/><rect class="mark" x="722" y="128" width="44" height="6" rx="3"/>' +
        '<circle class="core" cx="862" cy="172" r="9"/></g>' +
        TRACES.map((_, at) => `<circle class="signal s${at}" r="5.5"/>`).join(''),
    }),
}
