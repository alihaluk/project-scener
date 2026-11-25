// Night sky: a press on the bare backdrop makes a star's glint there, four rays
// and a halo that swell and fade within a second.
//
// The app freezes, then stops, a shader where a spot swings lighter and darker
// more than three times a second. So the presses go through a buffer that starts
// a glint at most once every GAP seconds: clicking faster leaves some presses
// without one, never a flash.
import { abs, buffer, dot, exp, max, min, mix, picture, pointers, scene, shader, smoothstep, step, time, values, vec2, vec3, vec4, type Buffer } from 'claude-code/shader'

// The look's accent in light mode and in dark, from the plugin.
const tint = values({ r: [0, 1], g: [0, 1], b: [0, 1], dr: [0, 1], dg: [0, 1], db: [0, 1] })

const LUMA = vec3(0.2126, 0.7152, 0.0722)

/** The least time between two glints, in seconds. */
const GAP = 0.35
/** How long a glint lasts, in seconds. */
const LIFE = 0.8

// The last three glints, one a texel: where each began in points, when, and 1 once it has.
const stars: Buffer = buffer({ size: [3, 1], float: 32, filter: 'nearest' }, p => {
  let newest = -100
  let oldest = 1000000
  let free = 0

  for (const slot of [0, 1, 2]) {
    const star = stars.at(vec2(slot, 0))
    const began = star.w > 0.5 ? star.z : -100

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

  return isStart ? vec4(at.x, at.y, time, 1) : stars.at(p.cell)
})

const glint = picture(p => {
  let out = vec4(0)

  for (const slot of [0, 1, 2]) {
    const star = stars.at(vec2(slot, 0))
    const age = time - star.z

    if (star.w > 0.5 && age < LIFE) {
      const u = age / LIFE
      const d = vec2(p.point - star.xy)
      const s = 6 + 26 * smoothstep(0, 0.3, u)
      const ax = abs(d.x) / s
      const ay = abs(d.y) / s
      const rays = exp(-ax * 10 - ay * 1.1) + exp(-ay * 10 - ax * 1.1)
      const halo = exp(-dot(d, d) / (s * s * 0.5))
      const w = min(1, (rays * 0.7 + halo * 0.45) * (1 - smoothstep(0.3, 1, u)))

      if (w > 0.003) {
        const isLight = step(0.45, dot(scene.sample(p.uv).rgb, LUMA))
        // By night a pale gold light; by day the accent.
        const night = mix(vec3(tint.dr, tint.dg, tint.db), vec3(1, 0.95, 0.82), 0.6)
        const ink = mix(night, vec3(tint.r, tint.g, tint.b), isLight)

        // Premultiplied, each glint over the ones before it.
        out = vec4(out + vec4(ink, 1) * w * (1 - out.a))
      }
    }
  }

  return out
})

export default shader({ fps: 30, passes: [stars, glint] })
