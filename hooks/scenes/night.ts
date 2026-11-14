// A night sky: stars that twinkle, two constellations that trace themselves, a
// crescent moon, and now and then a shooting star. By day it reads as a star chart.
import { frame, range, seeded, type Scene } from './kit.js'

const random = seeded(7)

const stars = range(120)
  .map(() => {
    const x = Math.round(random() * 1600)
    const y = Math.round(random() * 1000)
    const radius = (0.8 + random() * 1.7).toFixed(1)

    return `<circle class="t${Math.floor(random() * 5)}" cx="${x}" cy="${y}" r="${radius}"/>`
  })
  .join('')

// Each constellation: the lines between its stars, then the stars.
const FIGURES = [
  {
    lines: ['150,190 250,120 360,170 430,90', '360,170 400,280 300,330'],
    stars: [
      [150, 190],
      [250, 120],
      [360, 170],
      [430, 90],
      [400, 280],
      [300, 330],
    ],
  },
  {
    lines: ['1170,650 1270,570 1390,610 1460,510 1545,560', '1390,610 1420,730'],
    stars: [
      [1170, 650],
      [1270, 570],
      [1390, 610],
      [1460, 510],
      [1545, 560],
      [1420, 730],
    ],
  },
] as const

const figures = FIGURES.map(
  (figure, at) =>
    `<g class="fig f${at}">` +
    figure.lines.map(points => `<polyline pathLength="1" points="${points}"/>`).join('') +
    figure.stars.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.5"/>`).join('') +
    '</g>',
).join('')

export const night: Scene = {
  alt: 'A night sky of twinkling stars, two constellations, a crescent moon and a shooting star',
  draw: palette =>
    frame(palette, {
      paint: (tones, isDark) =>
        `.stars circle{fill:${isDark ? tones.ink : tones.a}}` +
        `.fig polyline{stroke:${tones.b};stroke-opacity:${isDark ? 0.5 : 0.4}}` +
        `.fig circle{fill:${tones.c}}` +
        `.moon{fill:${tones.c};fill-opacity:${isDark ? 0.85 : 0.6}}` +
        `.shoot line{stroke:${isDark ? tones.ink : tones.a}}` +
        `.hill{fill:${tones.a};fill-opacity:${isDark ? 0.12 : 0.07}}`,
      motion:
        '.stars circle{animation:twinkle 5s ease-in-out infinite}' +
        range(5)
          .map(at => `.t${at}{animation-delay:${at * -1.3}s;animation-duration:${4 + at}s}`)
          .join('') +
        '.fig polyline{fill:none;stroke-width:1.5;stroke-linecap:round;stroke-dasharray:1;animation:trace 18s ease-in-out infinite}' +
        '.fig circle{transform-box:fill-box;transform-origin:center;animation:shine 6s ease-in-out infinite}' +
        '.f1 polyline,.f1 circle{animation-delay:-9s}' +
        '.shoot{opacity:0;animation:shoot 16s ease-in infinite}' +
        '.shoot line{stroke-width:2.5;stroke-linecap:round}' +
        '@keyframes twinkle{0%,100%{opacity:.85}50%{opacity:.2}}' +
        '@keyframes trace{0%{stroke-dashoffset:1}35%,75%{stroke-dashoffset:0}100%{stroke-dashoffset:-1}}' +
        '@keyframes shine{50%{transform:scale(1.5)}}' +
        '@keyframes shoot{0%,88%{transform:translate(1480px,40px) rotate(143deg);opacity:0}90%{opacity:.9}' +
        '100%{transform:translate(1040px,372px) rotate(143deg);opacity:0}}',
      body:
        `<g class="stars">${stars}</g>${figures}` +
        '<path class="moon" transform="translate(1390 170) rotate(-28)" d="M 0 -48 A 48 48 0 1 0 0 48 A 62 62 0 0 1 0 -48 Z"/>' +
        '<g class="shoot"><line x1="0" y1="0" x2="-120" y2="0" stroke-opacity=".35"/><line x1="0" y1="0" x2="-40" y2="0"/></g>' +
        '<path class="hill" d="M 0 1000 V 900 C 180 840, 320 900, 500 880 S 820 800, 1040 870 S 1400 820, 1600 880 V 1000 Z"/>' +
        '<path class="hill" d="M 0 1000 V 950 C 260 900, 480 960, 760 930 S 1260 900, 1600 945 V 1000 Z"/>',
    }),
}
