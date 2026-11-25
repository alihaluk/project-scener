// Circuit: a press on the bare backdrop sends one square pulse out along the
// board's grid, gone within a second.
import { abs, dot, exp, max, min, mix, picture, pointers, scene, shader, step, values, vec2, vec3, vec4 } from 'claude-code/shader'

// The look's accent in light mode and in dark, from the plugin.
const tint = values({ r: [0, 1], g: [0, 1], b: [0, 1], dr: [0, 1], dg: [0, 1], db: [0, 1] })

const LUMA = vec3(0.2126, 0.7152, 0.0722)

const pulse = picture(p => {
  let out = vec4(0)

  for (const press of pointers) {
    if (press.down > 0.5 && press.over < 0.5 && press.age < 1) {
      const d = vec2(p.point - press.at)
      const edge = max(abs(d.x), abs(d.y)) - (8 + press.age * 130)
      const w = exp(-(edge * edge) / 12) * (1 - press.age)

      if (w > 0.003) {
        const isLight = step(0.45, dot(scene.sample(p.uv).rgb, LUMA))
        const ink = mix(vec3(tint.dr, tint.dg, tint.db), vec3(tint.r, tint.g, tint.b), isLight)

        out = vec4(vec4(ink, 1) * min(1, w * 0.85))
      }
    }
  }

  return out
})

export default shader({ fps: 30, passes: [pulse] })
