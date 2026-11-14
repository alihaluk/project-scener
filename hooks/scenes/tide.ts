// A slow sea: four layers of swell under a low sun, and one small boat.
import { frame, range, type Scene } from './kit.js'

// Back to front: where the crest line sits, its height, its length, seconds per length.
const WAVES = [
  { y: 640, height: 26, length: 500, seconds: 38 },
  { y: 720, height: 32, length: 400, seconds: 26 },
  { y: 800, height: 24, length: 320, seconds: 18 },
  { y: 880, height: 18, length: 400, seconds: 14 },
] as const

function swell({ y, height, length }: (typeof WAVES)[number]): string {
  const crests = range(Math.ceil(1600 / length) + 2)
    .map(() => `q ${length / 4} ${-height} ${length / 2} 0 t ${length / 2} 0`)
    .join(' ')

  return `M ${-length} ${y} ${crests} V 1000 H ${-length} Z`
}

const SHIMMER = [
  [1250, 598, 140],
  [1290, 622, 90],
  [1230, 664, 120],
  [1300, 690, 70],
  [1260, 748, 100],
] as const

export const tide: Scene = {
  alt: 'A slow sea swell under a low sun, with a small sailboat riding the waves',
  draw: palette =>
    frame(palette, {
      paint: (tones, isDark) =>
        `.w0{fill:${tones.a};fill-opacity:.09}.w1{fill:${tones.b};fill-opacity:.1}` +
        `.w2{fill:${tones.a};fill-opacity:.14}.w3{fill:${tones.a};fill-opacity:.2}` +
        `.sun{fill:${tones.c};fill-opacity:${isDark ? 0.55 : 0.7}}.ring{stroke:${tones.c}}` +
        `.shim line{stroke:${tones.c}}` +
        `.hull{fill:${tones.a}}.sail{fill:${isDark ? tones.ink : '#ffffff'};stroke:${tones.a};stroke-opacity:.5}`,
      motion:
        WAVES.map(
          ({ length, seconds }, at) =>
            `.w${at}{animation:roll${at} ${seconds}s linear infinite${at % 2 === 1 ? ' reverse' : ''}}` +
            `@keyframes roll${at}{to{transform:translateX(${length}px)}}`,
        ).join('') +
        '.ring{fill:none;stroke-width:2;transform-box:fill-box;transform-origin:center;opacity:0;animation:glow 12s ease-out infinite}' +
        '.r1{animation-delay:4s}.r2{animation-delay:8s}' +
        '.shim line{stroke-width:3;stroke-linecap:round;stroke-opacity:.5;animation:glint 5s ease-in-out infinite}' +
        range(5)
          .map(at => `.shim line:nth-child(${at + 1}){animation-delay:${at * -1.1}s}`)
          .join('') +
        '.sail{stroke-width:1.5}' +
        '.boat{transform-box:fill-box;transform-origin:center bottom;animation:bob 7s ease-in-out infinite}' +
        '@keyframes glow{0%{opacity:.5;transform:scale(1)}80%{opacity:0;transform:scale(2.6)}100%{opacity:0;transform:scale(2.6)}}' +
        '@keyframes glint{50%{stroke-opacity:.12}}' +
        '@keyframes bob{0%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(9px) rotate(3deg)}100%{transform:translateY(0) rotate(-3deg)}}',
      body:
        range(3)
          .map(at => `<circle class="ring r${at}" cx="1320" cy="200" r="72"/>`)
          .join('') +
        '<circle class="sun" cx="1320" cy="200" r="72"/>' +
        `<path class="w0" d="${swell(WAVES[0])}"/>` +
        `<g class="shim">${SHIMMER.map(([x, y, width]) => `<line x1="${x}" y1="${y}" x2="${x + width}" y2="${y}"/>`).join('')}</g>` +
        `<path class="w1" d="${swell(WAVES[1])}"/>` +
        '<g transform="translate(250 716)"><g class="boat"><path class="sail" d="M 2 -78 L 2 -12 L 46 -12 Z"/>' +
        '<path class="sail" d="M -4 -62 L -4 -12 L -30 -12 Z"/><path class="hull" d="M -46 -6 H 58 L 42 14 H -32 Z"/></g></g>' +
        `<path class="w2" d="${swell(WAVES[2])}"/><path class="w3" d="${swell(WAVES[3])}"/>`,
    }),
}
