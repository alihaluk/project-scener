// Night sky: a press on the bare backdrop makes a star's glint there, four rays
// and a halo that swell and fade within a second.
import { abs, dot, exp, min, mix, picture, pointers, scene, shader, smoothstep, step, values, vec2, vec3, vec4 } from 'claude-code/shader'

// The look's accent in light mode and in dark, from the plugin.
const tint = values({ r: [0, 1], g: [0, 1], b: [0, 1], dr: [0, 1], dg: [0, 1], db: [0, 1] })

const LUMA = vec3(0.2126, 0.7152, 0.0722)

const glint = picture(p => {
  let out = vec4(0)

  for (const press of pointers) {
    if (press.down > 0.5 && press.over < 0.5 && press.age < 1) {
      const d = vec2(p.point - press.at)
      const s = 6 + 26 * smoothstep(0, 0.3, press.age)
      const ax = abs(d.x) / s
      const ay = abs(d.y) / s
      const rays = exp(-ax * 10 - ay * 1.1) + exp(-ay * 10 - ax * 1.1)
      const halo = exp(-dot(d, d) / (s * s * 0.5))
      const w = min(1, (rays * 0.7 + halo * 0.45) * (1 - smoothstep(0.3, 1, press.age)))

      if (w > 0.003) {
        const isLight = step(0.45, dot(scene.sample(p.uv).rgb, LUMA))
        // By night a pale gold light; by day the accent.
        const night = mix(vec3(tint.dr, tint.dg, tint.db), vec3(1, 0.95, 0.82), 0.6)
        const ink = mix(night, vec3(tint.r, tint.g, tint.b), isLight)

        out = vec4(vec4(ink, 1) * w)
      }
    }
  }

  return out
})

export default shader({ fps: 30, passes: [glint] })
