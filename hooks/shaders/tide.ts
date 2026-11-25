// Tide: a press on the bare backdrop sends one ripple across the water, a lit
// crest with a sharp front and a softer back, gone within a second.
//
// Every shader here is TypeScript against 'claude-code/shader'. The engine reads
// it and never runs it; the desktop app plays it on the GPU, and feeds it the
// time and the person's presses itself. y points up.
//
// The app freezes, then stops, a shader where a spot swings lighter and darker
// more than three times a second. So each press sends one crest and no trough,
// and the presses go through a buffer that starts a ripple at most once every
// GAP seconds: clicking faster leaves some presses without one, never a flash.
import { abs, buffer, dot, exp, length, max, min, mix, picture, pointers, scene, shader, step, time, values, vec2, vec3, vec4, type Buffer } from 'claude-code/shader'

// The look's accent in light mode and in dark, from the plugin.
const tint = values({ r: [0, 1], g: [0, 1], b: [0, 1], dr: [0, 1], dg: [0, 1], db: [0, 1] })

const LUMA = vec3(0.2126, 0.7152, 0.0722)

/** The least time between two ripples, in seconds. */
const GAP = 0.35
/** How long a ripple lasts, in seconds. */
const LIFE = 0.8

// The last three ripples, one a texel: where each began in points, when, and 1 once it has.
const rings: Buffer = buffer({ size: [3, 1], float: 32, filter: 'nearest' }, p => {
  let newest = -100
  let oldest = 1000000
  let free = 0

  for (const slot of [0, 1, 2]) {
    const ring = rings.at(vec2(slot, 0))
    const began = ring.w > 0.5 ? ring.z : -100

    newest = max(newest, began)

    if (began < oldest) {
      oldest = began
      free = slot
    }
  }
  // A press on the bare backdrop, on its first frame.
  let pressed = 0
  let at = vec2(0)

  for (const press of pointers) {
    if (press.down > 0.5 && press.over < 0.5 && press.age < 0.0005) {
      pressed = 1
      at = press.at
    }
  }
  const isStart = pressed > 0.5 && time - newest >= GAP && abs(p.cell.x - free) < 0.5

  return isStart ? vec4(at.x, at.y, time, 1) : rings.at(p.cell)
})

const ripple = picture(p => {
  let out = vec4(0)

  for (const slot of [0, 1, 2]) {
    const ring = rings.at(vec2(slot, 0))
    const age = time - ring.z

    if (ring.w > 0.5 && age < LIFE) {
      const u = age / LIFE
      const edge = length(vec2(p.point - ring.xy)) - (14 + u * 140)
      const width = edge > 0 ? 8 : 22
      const fade = (1 - u) * (1 - u)
      const crest = exp(-(edge * edge) / width) * fade

      if (crest > 0.003) {
        const isLight = step(0.45, dot(scene.sample(p.uv).rgb, LUMA))
        // By day the crest is the accent; by night a pale light of it.
        const night = mix(vec3(tint.dr, tint.dg, tint.db), vec3(1), 0.35)
        const ink = mix(night, vec3(tint.r, tint.g, tint.b), isLight)
        const lit = min(1, crest * 0.95)

        // Premultiplied, each ripple over the ones before it.
        out = vec4(out + vec4(ink * lit, lit) * (1 - out.a))
      }
    }
  }

  return out
})

export default shader({ fps: 30, passes: [rings, ripple] })
