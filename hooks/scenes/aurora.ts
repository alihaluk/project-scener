// Northern lights: curtains of light swaying slowly over a snowy ridge, under stars.
import { frame, range, seeded, type Scene } from './kit.js'

/**
 * One curtain of light as auroras hang: thin rays side by side, each bright at
 * its foot and fading upward, their feet along a slow wave.
 */
function curtain(foot: number, height: number, phase: number, waves: number, seed: number): string {
  const next = seeded(seed)

  return range(206)
    .map(step => {
      const x = step * 8 - 20
      const at = x / 100
      const y = foot + Math.sin(at * waves + phase) * 46 + Math.sin(at * 0.9 + phase * 2) * 18
      const tall = height * (0.55 + 0.45 * Math.sin(at * 0.7 + phase) ** 2) * (0.8 + next() * 0.4)

      return `<rect x="${x}" y="${(y - tall).toFixed(1)}" width="6" height="${tall.toFixed(1)}"/>`
    })
    .join('')
}

const STARS = (() => {
  const next = seeded(23)

  return range(46).map(() => [next() * 1600, next() * 520, 0.8 + next() * 1.6] as const)
})()

const RIDGE =
  'M -20 1000 L -20 790 L 140 730 L 260 770 L 420 680 L 560 760 L 700 720 L 860 800 L 1010 700 L 1150 650 L 1290 730 L 1430 690 L 1620 760 V 1000 Z'
const SNOW =
  'M 380 704 L 420 680 L 470 708 L 440 712 Z M 1110 672 L 1150 650 L 1205 682 L 1170 688 Z M 1400 706 L 1430 690 L 1470 712 L 1440 714 Z'

export const aurora: Scene = {
  alt: 'Curtains of northern lights swaying over a snowy ridge under a sky of stars',
  draw: palette =>
    frame(palette, {
      paint: (tones, isDark) =>
        `.foot{stop-color:${tones.a};stop-opacity:${isDark ? 0.5 : 0.3}}.fade{stop-color:${tones.a};stop-opacity:0}` +
        `.foot2{stop-color:${tones.b};stop-opacity:${isDark ? 0.42 : 0.22}}.fade2{stop-color:${tones.b};stop-opacity:0}` +
        `.star{fill:${isDark ? '#ffffff' : tones.ink};fill-opacity:${isDark ? 0.7 : 0.18}}` +
        `.ridge{fill:${isDark ? '#000000' : tones.ink};fill-opacity:${isDark ? 0.45 : 0.1}}.snow{fill:#ffffff;fill-opacity:${isDark ? 0.14 : 0.8}}`,
      defs:
        '<linearGradient id="lightA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="fade"/><stop offset=".8" class="foot"/><stop offset="1" class="fade"/></linearGradient>' +
        '<linearGradient id="lightB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="fade2"/><stop offset=".8" class="foot2"/><stop offset="1" class="fade2"/></linearGradient>',
      motion:
        '.c0{fill:url(#lightA);animation:sway 26s ease-in-out infinite alternate}' +
        '.c1{fill:url(#lightB);animation:sway 34s ease-in-out infinite alternate-reverse}' +
        '.c2{fill:url(#lightA);animation:sway 21s ease-in-out infinite alternate;animation-delay:-9s}' +
        '.breathe{animation:breathe 11s ease-in-out infinite}.b1{animation-delay:-5s}' +
        '.star{animation:twinkle 7s ease-in-out infinite}' +
        range(4)
          .map(at => `.s${at}{animation-delay:${-at * 1.8}s}`)
          .join('') +
        '@keyframes sway{from{transform:translateX(-50px) skewX(-3deg)}to{transform:translateX(50px) skewX(3deg)}}' +
        '@keyframes breathe{50%{opacity:.55}}' +
        '@keyframes twinkle{50%{opacity:.35}}',
      body:
        STARS.map(([x, y, r], at) => `<circle class="star s${at % 4}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}"/>`).join('') +
        `<g class="breathe"><g class="c1">${curtain(400, 220, 2.1, 0.42, 5)}</g></g>` +
        `<g class="breathe b1"><g class="c0">${curtain(330, 260, 0.4, 0.55, 9)}</g></g>` +
        `<g class="breathe"><g class="c2">${curtain(240, 170, 4.2, 0.7, 13)}</g></g>` +
        `<path class="ridge" d="${RIDGE}"/><path class="snow" d="${SNOW}"/>`,
    }),
}
