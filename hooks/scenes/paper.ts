// Ink on paper: ruled lines, a sketched sun, birds drawn in a stroke, and
// hills a pen keeps drawing along the foot.
import { frame, range, type Scene } from './kit.js'

const HILLS = 'M -20 840 C 160 780, 300 790, 420 820 S 700 760, 860 800 S 1150 860, 1300 790 S 1540 780, 1620 810'
const BACK = 'M -20 760 C 140 720, 260 740, 380 730 S 620 680, 760 720 S 1000 700, 1150 735 S 1450 700, 1620 740'

/** A bird as a pen draws it: two curved strokes meeting at a point. */
const BIRD = 'M -14 0 Q -7 -7 0 0 Q 7 -7 14 0'

const BIRDS = [
  [200, 170, 2.2], [290, 220, 1.6], [150, 250, 1.8], [370, 150, 1.4], [330, 290, 1.2],
] as const

export const paper: Scene = {
  alt: 'Ink sketches on ruled paper: a sun drawn in strokes, birds in flight, and hills along the foot',
  draw: palette =>
    frame(palette, {
      paint: (tones, isDark) =>
        `.rule{stroke:${tones.b};stroke-opacity:${isDark ? 0.08 : 0.07}}.margin{stroke:${tones.c};stroke-opacity:${isDark ? 0.22 : 0.18}}` +
        `.ink{stroke:${tones.a};stroke-opacity:${isDark ? 0.75 : 0.62}}.soft{stroke:${tones.a};stroke-opacity:${isDark ? 0.42 : 0.34}}` +
        `.sun{stroke:${tones.c};stroke-opacity:${isDark ? 0.7 : 0.6}}.wash{fill:${tones.c};fill-opacity:${isDark ? 0.08 : 0.1}}` +
        `.bird{stroke:${tones.ink};stroke-opacity:${isDark ? 0.62 : 0.55}}`,
      motion:
        '.rule,.margin{stroke-width:1.5}.ink,.soft,.sun,.bird{fill:none;stroke-linecap:round;stroke-linejoin:round}' +
        '.ink{stroke-width:3}.soft{stroke-width:2}.sun{stroke-width:2.5}.bird{stroke-width:2.2}' +
        '.rays{transform-origin:1320px 200px;animation:turn 90s linear infinite}@keyframes turn{to{transform:rotate(360deg)}}' +
        '.pen{stroke-dasharray:1900;animation:draw 18s ease-in-out infinite}' +
        '@keyframes draw{0%{stroke-dashoffset:1900}45%{stroke-dashoffset:0}80%{stroke-dashoffset:0}100%{stroke-dashoffset:-1900}}' +
        '.flock{animation:flock 40s ease-in-out infinite alternate}@keyframes flock{to{transform:translate(160px,-30px)}}' +
        '.flap{transform-box:fill-box;transform-origin:center;animation:flap 1.6s ease-in-out infinite}' +
        range(BIRDS.length)
          .map(at => `.w${at}{animation-delay:${(-at * 0.31).toFixed(2)}s}`)
          .join('') +
        '@keyframes flap{50%{transform:scaleY(.55)}}',
      still: '.pen{stroke-dashoffset:0}',
      body:
        range(24)
          .map(at => `<path class="rule" d="M 0 ${60 + at * 40} H 1600"/>`)
          .join('') +
        '<path class="margin" d="M 96 0 V 1000"/>' +
        '<circle class="wash" cx="1320" cy="200" r="64"/><circle class="sun" cx="1320" cy="200" r="46"/>' +
        `<g class="rays">${range(12)
          .map(at => {
            const angle = (at * Math.PI) / 6

            return `<path class="sun" d="M ${(1320 + Math.cos(angle) * 62).toFixed(1)} ${(200 + Math.sin(angle) * 62).toFixed(1)} L ${(1320 + Math.cos(angle) * 84).toFixed(1)} ${(200 + Math.sin(angle) * 84).toFixed(1)}"/>`
          })
          .join('')}</g>` +
        `<g class="flock">${BIRDS.map(
          ([x, y, scale], at) =>
            `<g transform="translate(${x} ${y}) scale(${scale})"><path class="bird flap w${at}" d="${BIRD}"/></g>`,
        ).join('')}</g>` +
        `<path class="soft" d="${BACK}"/><path class="ink pen" d="${HILLS}"/>` +
        range(16)
          .map(at => `<path class="soft" d="M ${120 + at * 90} ${880 + (at % 3) * 6} l 18 -16"/>`)
          .join(''),
    }),
}
