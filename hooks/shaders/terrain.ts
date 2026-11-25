// Terrain: a press on the bare backdrop sends out one contour line, a ring a
// little uneven as the map's are, gone within a second.
import { atan, dot, exp, length, min, mix, picture, pointers, scene, shader, sin, step, values, vec2, vec3, vec4 } from 'claude-code/shader'

// The look's accent in light mode and in dark, from the plugin.
const tint = values({ r: [0, 1], g: [0, 1], b: [0, 1], dr: [0, 1], dg: [0, 1], db: [0, 1] })

const LUMA = vec3(0.2126, 0.7152, 0.0722)

const contour = picture(p => {
  let out = vec4(0)

  for (const press of pointers) {
    if (press.down > 0.5 && press.over < 0.5 && press.age < 1) {
      const d = vec2(p.point - press.at)
      const r = length(d) * (1 + 0.08 * sin(atan(d.y, d.x) * 5 + 1.3))
      const edge = r - (10 + press.age * 120)
      const fade = (1 - press.age) * (1 - press.age)
      const w = exp(-(edge * edge) / 20) * fade

      if (w > 0.003) {
        const isLight = step(0.45, dot(scene.sample(p.uv).rgb, LUMA))
        const ink = mix(vec3(tint.dr, tint.dg, tint.db), vec3(tint.r, tint.g, tint.b), isLight)

        out = vec4(vec4(ink, 1) * min(1, w * 0.8))
      }
    }
  }

  return out
})

export default shader({ fps: 30, passes: [contour] })
