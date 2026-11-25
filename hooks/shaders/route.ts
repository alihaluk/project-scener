// Route: a press on the bare backdrop pings there, as a map marks a place: a
// dot and one ring that widens from it, both gone within a second.
//
// The app freezes, then stops, a shader where a spot swings lighter and darker
// more than three times a second. So the presses go through a buffer that starts
// a ping at most once every GAP seconds: clicking faster leaves some presses
// without one, never a flash.
import { abs, buffer, dot, exp, length, max, min, mix, picture, pointers, scene, shader, smoothstep, step, time, values, vec2, vec3, vec4, type Buffer } from 'claude-code/shader'

// The look's accent in light mode and in dark, from the plugin.
const tint = values({ r: [0, 1], g: [0, 1], b: [0, 1], dr: [0, 1], dg: [0, 1], db: [0, 1] })

const LUMA = vec3(0.2126, 0.7152, 0.0722)

/** The least time between two pings, in seconds. */
const GAP = 0.35
/** How long a ping lasts, in seconds. */
const LIFE = 0.8

// The last three pings, one a texel: where each began in points, when, and 1 once it has.
const pings: Buffer = buffer({ size: [3, 1], float: 32, filter: 'nearest' }, p => {
  let newest = -100
  let oldest = 1000000
  let free = 0

  for (const slot of [0, 1, 2]) {
    const ping = pings.at(vec2(slot, 0))
    const began = ping.w > 0.5 ? ping.z : -100

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

  return isStart ? vec4(at.x, at.y, time, 1) : pings.at(p.cell)
})

const mark = picture(p => {
  let out = vec4(0)

  for (const slot of [0, 1, 2]) {
    const ping = pings.at(vec2(slot, 0))
    const age = time - ping.z

    if (ping.w > 0.5 && age < LIFE) {
      const u = age / LIFE
      const r = length(vec2(p.point - ping.xy))
      const edge = r - (6 + u * 100)
      const ring = exp(-(edge * edge) / 25) * (1 - u)
      const pin = smoothstep(6, 4, r) * (1 - smoothstep(0.5, 1, u))
      const w = min(1, max(ring, pin) * 0.85)

      if (w > 0.003) {
        const isLight = step(0.45, dot(scene.sample(p.uv).rgb, LUMA))
        const ink = mix(vec3(tint.dr, tint.dg, tint.db), vec3(tint.r, tint.g, tint.b), isLight)

        // Premultiplied, each ping over the ones before it.
        out = vec4(out + vec4(ink, 1) * w * (1 - out.a))
      }
    }
  }

  return out
})

export default shader({ fps: 30, passes: [pings, mark] })
