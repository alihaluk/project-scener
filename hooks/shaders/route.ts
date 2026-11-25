// Route: a press on the bare backdrop pings there, as a map marks a place: a
// dot and one ring that widens from it, both gone within a second.
import { dot, exp, length, max, min, mix, picture, pointers, scene, shader, smoothstep, step, values, vec2, vec3, vec4 } from 'claude-code/shader'

// The look's accent in light mode and in dark, from the plugin.
const tint = values({ r: [0, 1], g: [0, 1], b: [0, 1], dr: [0, 1], dg: [0, 1], db: [0, 1] })

const LUMA = vec3(0.2126, 0.7152, 0.0722)

const ping = picture(p => {
  let out = vec4(0)

  for (const press of pointers) {
    if (press.down > 0.5 && press.over < 0.5 && press.age < 1) {
      const r = length(vec2(p.point - press.at))
      const edge = r - (6 + press.age * 100)
      const ring = exp(-(edge * edge) / 25) * (1 - press.age)
      const pin = smoothstep(6, 4, r) * (1 - smoothstep(0.5, 1, press.age))
      const w = max(ring, pin)

      if (w > 0.003) {
        const isLight = step(0.45, dot(scene.sample(p.uv).rgb, LUMA))
        const ink = mix(vec3(tint.dr, tint.dg, tint.db), vec3(tint.r, tint.g, tint.b), isLight)

        out = vec4(vec4(ink, 1) * min(1, w * 0.85))
      }
    }
  }

  return out
})

export default shader({ fps: 30, passes: [ping] })
