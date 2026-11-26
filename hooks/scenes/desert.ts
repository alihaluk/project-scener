// A desert afternoon: dunes in layers under a low sun, heat shimmering over
// them, and a small caravan crossing a crest.
import { frame, range, type Scene } from './kit.js'

const DUNES = [
  // The caravan's crest, nearly level so it walks on the sand all the way across.
  'M -20 1000 L -20 694 C 300 682, 600 684, 900 690 S 1400 686, 1620 692 V 1000 Z',
  'M -20 1000 L -20 780 C 240 740, 520 720, 760 760 S 1180 800, 1420 760 S 1580 740, 1620 750 V 1000 Z',
  'M -20 1000 L -20 880 C 260 840, 560 870, 820 860 S 1260 820, 1620 870 V 1000 Z',
] as const

/** A camel walking right, its feet at the origin, about 36 long. */
const CAMEL =
  'M -16 0 L -14 -14 Q -16 -22 -8 -24 Q -4 -32 2 -24 Q 6 -30 10 -24 L 14 -22 Q 18 -32 20 -34 L 24 -33 L 22 -30 L 18 -20 L 16 -14 L 15 0 L 13 0 L 12 -12 L -6 -12 L -8 0 L -10 0 L -11 -13 L -14 0 Z'

const SHIMMER = [
  [180, 600, 260], [520, 618, 200], [880, 596, 240], [1180, 612, 220],
] as const

export const desert: Scene = {
  alt: 'Dunes in layers under a low sun, with heat shimmering over them and a caravan crossing a crest',
  draw: palette =>
    frame(palette, {
      paint: (tones, isDark) =>
        `.d0{fill:${tones.c};fill-opacity:${isDark ? 0.12 : 0.16}}.d1{fill:${tones.a};fill-opacity:${isDark ? 0.2 : 0.2}}` +
        `.d2{fill:${tones.b};fill-opacity:${isDark ? 0.26 : 0.22}}` +
        `.sun{fill:${tones.c};fill-opacity:${isDark ? 0.45 : 0.55}}` +
        `.glare-in{stop-color:${tones.c};stop-opacity:${isDark ? 0.18 : 0.26}}.glare-out{stop-color:${tones.c};stop-opacity:0}` +
        `.heat{stroke:${tones.c};stroke-opacity:${isDark ? 0.18 : 0.22}}.camel{fill:${tones.ink};fill-opacity:${isDark ? 0.45 : 0.4}}`,
      defs: '<radialGradient id="glare"><stop offset="0" class="glare-in"/><stop offset="1" class="glare-out"/></radialGradient>',
      motion:
        '.heat{fill:none;stroke-width:2;stroke-linecap:round;animation:heat 9s ease-in-out infinite alternate}' +
        '.h1{animation-delay:-3s}.h2{animation-delay:-6s}.h3{animation-delay:-1.5s}' +
        '@keyframes heat{to{transform:translateX(36px)}}' +
        '.glare{fill:url(#glare);transform-box:fill-box;transform-origin:center;animation:glare 12s ease-in-out infinite}@keyframes glare{50%{transform:scale(1.08)}}' +
        '.caravan{animation:walk 90s linear infinite;animation-delay:-36s}@keyframes walk{from{transform:translateX(-260px)}to{transform:translateX(1860px)}}' +
        '.sway{animation:sway 1.8s ease-in-out infinite}@keyframes sway{50%{transform:translateY(-1.5px)}}' +
        range(4)
          .map(at => `.k${at}{animation-delay:${(-at * 0.45).toFixed(2)}s}`)
          .join(''),
      still: '.caravan{transform:translateX(560px)}',
      body:
        '<circle class="glare" cx="1290" cy="230" r="190"/><circle class="sun" cx="1290" cy="230" r="70"/>' +
        SHIMMER.map(
          ([x, y, width], at) =>
            `<path class="heat h${at}" d="M ${x} ${y} q ${width / 8} -8 ${width / 4} 0 t ${width / 4} 0 t ${width / 4} 0 t ${width / 4} 0"/>`,
        ).join('') +
        `<path class="d0" d="${DUNES[0]}"/>` +
        `<g class="caravan">${range(4)
          .map(at => `<g transform="translate(${at * 46} ${688 - (at % 2) * 2})"><path class="camel sway k${at}" d="${CAMEL}"/></g>`)
          .join('')}</g>` +
        `<path class="d1" d="${DUNES[1]}"/><path class="d2" d="${DUNES[2]}"/>`,
    }),
}
