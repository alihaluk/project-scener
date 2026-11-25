// Circuit: a press on the bare backdrop sends one square pulse out along the
// board's grid, gone within a second.
//
// The app freezes, then stops, a shader where a spot swings lighter and darker
// more than three times a second. So the presses go through a buffer that starts
// a pulse at most once every GAP seconds: clicking faster leaves some presses
// without one, never a flash.
import { abs, buffer, dot, exp, max, min, mix, picture, pointers, scene, shader, step, time, values, vec2, vec3, vec4, type Buffer } from 'claude-code/shader'

// The look's accent in light mode and in dark, from the plugin.
const tint = values({ r: [0, 1], g: [0, 1], b: [0, 1], dr: [0, 1], dg: [0, 1], db: [0, 1] })

const LUMA = vec3(0.2126, 0.7152, 0.0722)

/** The least time between two pulses, in seconds. */
const GAP = 0.35
/** How long a pulse lasts, in seconds. */
const LIFE = 0.8

// The last three pulses, one a texel: where each began in points, when, and 1 once it has.
const pulses: Buffer = buffer({ size: [3, 1], float: 32, filter: 'nearest' }, p => {
  let newest = -100
  let oldest = 1000000
  let free = 0

  for (const slot of [0, 1, 2]) {
    const pulse = pulses.at(vec2(slot, 0))
    const began = pulse.w > 0.5 ? pulse.z : -100

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

  return isStart ? vec4(at.x, at.y, time, 1) : pulses.at(p.cell)
})

const square = picture(p => {
  let out = vec4(0)

  for (const slot of [0, 1, 2]) {
    const pulse = pulses.at(vec2(slot, 0))
    const age = time - pulse.z

    if (pulse.w > 0.5 && age < LIFE) {
      const u = age / LIFE
      const d = vec2(p.point - pulse.xy)
      const edge = max(abs(d.x), abs(d.y)) - (8 + u * 130)
      const w = min(1, exp(-(edge * edge) / 12) * (1 - u) * 0.85)

      if (w > 0.003) {
        const isLight = step(0.45, dot(scene.sample(p.uv).rgb, LUMA))
        const ink = mix(vec3(tint.dr, tint.dg, tint.db), vec3(tint.r, tint.g, tint.b), isLight)

        // Premultiplied, each pulse over the ones before it.
        out = vec4(out + vec4(ink, 1) * w * (1 - out.a))
      }
    }
  }

  return out
})

export default shader({ fps: 30, passes: [pulses, square] })
