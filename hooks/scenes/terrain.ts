// A contour map: two hills drawn in height lines, a river, and a trail between the summits.
import { frame, type Scene } from './kit.js'

// One height line, about 100 across, drawn again at each scale.
const LINE = 'M 0 -100 C 60 -105, 110 -50, 100 5 S 50 100, -10 98 S -110 50, -100 -10 S -55 -96, 0 -100 Z'
const TRAIL = 'M 300 260 C 520 420, 700 300, 900 470 S 1180 560, 1330 720'

function hill(scales: readonly number[]): string {
  return scales
    .map((scale, at) => `<path class="${at % 3 === 1 ? 'index' : 'line'}" transform="scale(${scale})" d="${LINE}"/>`)
    .join('')
}

export const terrain: Scene = {
  alt: 'A contour map of two hills with a river and a dotted trail between the summits',
  draw: palette =>
    frame(palette, {
      paint: (tones, isDark) =>
        `.line{stroke:${tones.a};stroke-opacity:.16}.index{stroke:${tones.a};stroke-opacity:.3}` +
        `.river{stroke:${tones.b};stroke-opacity:${isDark ? 0.22 : 0.18}}` +
        `.trail{stroke:${tones.c};stroke-opacity:.8}` +
        `.flag{fill:${tones.a}}.pole{stroke:${tones.ink};stroke-opacity:.6}` +
        `.ring{stroke:${tones.c}}.camp{fill:${tones.c}}`,
      motion:
        '.line,.index{fill:none;vector-effect:non-scaling-stroke;stroke-width:1.5}.index{stroke-width:2.5}' +
        '.hill{animation:drift 26s ease-in-out infinite alternate}.h1{animation-delay:-13s}' +
        '.river{fill:none;stroke-width:12;stroke-linecap:round}' +
        '.trail{fill:none;stroke-width:3;stroke-linecap:round;stroke-dasharray:2 13;animation:walk 7s linear infinite}' +
        '.pole{stroke-width:2.5;stroke-linecap:round}' +
        '.ring{fill:none;stroke-width:2;transform-box:fill-box;transform-origin:center;opacity:0;animation:ping 6s ease-out infinite}' +
        '.r1{animation-delay:3s}' +
        '@keyframes drift{from{transform:scale(1) rotate(0deg)}to{transform:scale(1.05) rotate(3deg)}}' +
        '@keyframes walk{to{stroke-dashoffset:-150}}' +
        '@keyframes ping{0%{opacity:.7;transform:scale(.4)}70%{opacity:0;transform:scale(2.2)}100%{opacity:0;transform:scale(2.2)}}',
      body:
        '<path class="river" d="M -20 690 C 200 630, 320 820, 560 780 S 820 900, 1000 1020"/>' +
        `<g transform="translate(300 260)"><g class="hill h0">${hill([0.6, 1.2, 1.9, 2.7, 3.6, 4.6])}</g></g>` +
        `<g transform="translate(1330 720) rotate(40)"><g class="hill h1">${hill([0.5, 1.1, 1.8, 2.6, 3.5, 4.5, 5.6])}</g></g>` +
        `<path class="trail" d="${TRAIL}"/>` +
        '<g transform="translate(300 260)"><line class="pole" x1="0" y1="0" x2="0" y2="-44"/><path class="flag" d="M 0 -44 L 30 -34 L 0 -24 Z"/></g>' +
        '<g transform="translate(1330 720)"><circle class="ring" r="22"/><circle class="ring r1" r="22"/><circle class="camp" r="7"/></g>',
    }),
}
