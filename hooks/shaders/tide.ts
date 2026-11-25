// Tide: a press on the bare backdrop sends one ripple across the water, a lit
// crest with a shadowed trough behind it, gone within a second.
//
// Every shader here is TypeScript against 'claude-code/shader'. The engine reads
// it and never runs it; the desktop app plays it on the GPU, and feeds it the
// time and the person's presses itself. y points up.
import { dot, exp, length, min, mix, picture, pointers, scene, shader, step, values, vec2, vec3, vec4 } from 'claude-code/shader'

// The look's accent in light mode and in dark, from the plugin.
const tint = values({ r: [0, 1], g: [0, 1], b: [0, 1], dr: [0, 1], dg: [0, 1], db: [0, 1] })

const LUMA = vec3(0.2126, 0.7152, 0.0722)

const ripple = picture(p => {
  let out = vec4(0)

  for (const press of pointers) {
    // A press on the bare backdrop, for the second after it.
    if (press.down > 0.5 && press.over < 0.5 && press.age < 1) {
      const edge = length(vec2(p.point - press.at)) - (16 + press.age * 160)
      const fade = (1 - press.age) * (1 - press.age)
      const crest = exp(-((edge - 3) * (edge - 3)) / 18) * fade
      const trough = exp(-((edge + 4) * (edge + 4)) / 24) * fade

      if (crest + trough > 0.003) {
        const isLight = step(0.45, dot(scene.sample(p.uv).rgb, LUMA))
        // By day the crest is the accent; by night a pale light of it.
        const night = mix(vec3(tint.dr, tint.dg, tint.db), vec3(1), 0.35)
        const ink = mix(night, vec3(tint.r, tint.g, tint.b), isLight)
        const lit = min(1, crest * 0.9)
        const shade = min(1, trough * 0.25)

        // Premultiplied: the crest adds its light, the trough darkens what is under it.
        out = vec4(ink * lit, lit + shade * (1 - lit))
      }
    }
  }

  return out
})

export default shader({ fps: 30, passes: [ripple] })
