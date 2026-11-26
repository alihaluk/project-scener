// Night sky: a press on the bare backdrop makes a star's glint there, four rays
// and a halo that swell and fade within a second.
//
// The app freezes, then stops, a shader where a spot swings lighter and darker
// more than three times a second. So the sky remembers: each cell of it keeps
// when a glint last lit it fully, and a glint that would light it again within
// SPACING seconds, there or within two cells of it, shows as a faint echo, too
// faint to count as a flash. Every press gets a glint, up to six a second, and
// no spot flashes however the clicks come.
import { abs, buffer, dot, exp, max, min, mix, picture, pointers, pow, scene, shader, smoothstep, step, time, values, vec2, vec3, vec4, type Buffer } from 'claude-code/shader'

// The look's accent in light mode and in dark, from the plugin.
const tint = values({ r: [0, 1], g: [0, 1], b: [0, 1], dr: [0, 1], dg: [0, 1], db: [0, 1] })

const LUMA = vec3(0.2126, 0.7152, 0.0722)

/** How long a glint lasts, in seconds. */
const LIFE = 0.8
/** How far into its life a glint is fullest, 0 to 1: it swells until then, and fades after. */
const SWELL = 0.3
/** The glint's size as it begins and at its fullest, in points. */
const SMALL = 6
const LARGE = 32
/** The least time between two glints that light a spot fully, in seconds. */
const SPACING = 0.6
/** The side of a cell of the sky that keeps its own time, in points. */
const CELL = 12
/** The most a faint glint changes a spot's luminance, 0 to 1: far under a flash. */
const FAINT = 0.03

/** Six numbers, one a glint. */
type Six = [number, number, number, number, number, number]

/** The glints' slots, one a texel of `stars`. */
const SLOTS = [0, 1, 2, 3, 4, 5] as const

/** The cells within two of a cell, whose full glints it keeps clear of. */
const AROUND = [[-2, -2], [-1, -2], [0, -2], [1, -2], [2, -2], [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1], [-2, 0], [-1, 0], [1, 0], [2, 0], [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1], [-2, 2], [-1, 2], [0, 2], [1, 2], [2, 2]] as const

/** The glint's color over a spot of the Svg: by night a pale gold light, by day the accent. */
const inkOver = (under: vec3): vec3 => {
  const night = mix(vec3(tint.dr, tint.dg, tint.db), vec3(1, 0.95, 0.82), 0.6)

  return vec3(mix(night, vec3(tint.r, tint.g, tint.b), step(0.45, dot(under, LUMA))))
}

/**
 * The most a glint of strength 1 changes a spot's luminance, whether the app
 * blends in sRGB or in linear light: one of strength a changes it a * this at most.
 */
const swingOf = (under: vec3, ink: vec3): number => {
  const lighter = pow(ink, 2.2) - pow(under, 2.2)
  const darker = pow(under, 1.2) * (under - ink) * 2.2

  return max(0.0001, dot(mix(darker, lighter, step(under, ink)), LUMA))
}

/** A glint of size s, `d` points from its middle: its four rays and its halo. */
const glintAt = (d: vec2, s: number): number => {
  const ax = abs(d.x) / s
  const ay = abs(d.y) / s
  const rays = exp(-ax * 10 - ay * 1.1) + exp(-ay * 10 - ax * 1.1)
  const halo = exp(-dot(d, d) / (s * s * 0.5))

  return rays * 0.7 + halo * 0.45
}

// The last six glints, one a texel: where each began in points, when, and 1 once it has.
const stars: Buffer = buffer({ size: [6, 1], float: 32, filter: 'nearest' }, p => {
  let oldest = 1000000
  let free = 0

  for (const slot of SLOTS) {
    const star = stars.at(vec2(slot, 0))
    const began = star.w > 0.5 ? star.z : -100

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
  // A press takes the oldest glint's slot once that glint is gone; past six
  // glints a second, a press gets no glint.
  const isStart = pressed > 0.5 && time - oldest >= LIFE && abs(p.cell.x - free) < 0.5

  return isStart ? vec4(at.x, at.y, time, 1) : stars.at(p.cell)
})

// Each cell of the sky, this frame: the next glint it must decide on, of those
// due since it last decided, the earliest: when that glint began, when it passes
// the cell's middle, when it was due, and 2 if no other full glint lit the cells
// within two of it in the last SPACING seconds, 1 if one did, 0 with none due.
// Deciding by what is left rather than by the frame's own span keeps every
// glint decided, however the app spaces its frames. A glint lights all its cells at once, so each cell takes it up as it begins.
const plans: Buffer = buffer({ scale: 1 / CELL, float: 32, filter: 'nearest' }, p => {
  const here = spots.at(p.cell)
  const last = here.w > 0.5 ? here.x : -100
  const handled = here.w > 0.5 ? here.z : -100
  const under = scene.sample(p.uv).rgb
  const swing = swingOf(under, inkOver(under))
  // The latest full glint in the cells around, and the latest of any other glint.
  let latest = -100
  let latestWhose = -2
  let other = -100

  for (const [dx, dy] of AROUND) {
    const beside = spots.at(p.cell + vec2(dx, dy))

    if (beside.w > 0.5) {
      if (beside.y === latestWhose) {
        latest = max(latest, beside.x)
      } else if (beside.x > latest) {
        other = latest
        latest = beside.x
        latestWhose = beside.y
      } else {
        other = max(other, beside.x)
      }
    }
  }
  let plan = vec4(0)

  for (const slot of SLOTS) {
    const star = stars.at(vec2(slot, 0))
    // The spot of the cell nearest the glint's middle, where its rays are brightest.
    const d = vec2(max(vec2(0), abs(vec2(p.point - star.xy)) - CELL / 2))
    const hit = star.z + SWELL * LIFE
    const due = star.z
    const isStrong = star.w > 0.5 && min(1, glintAt(d, LARGE)) * swing >= FAINT

    if (isStrong && due > handled && due <= time && (plan.w < 0.5 || due < plan.z)) {
      const isClear = hit - max(last, latestWhose === star.z ? other : latest) >= SPACING

      plan = vec4(star.z, hit, due, isClear ? 2 : 1)
    }
  }

  return plan
})

// Each cell of the sky: when the last glint that lit it fully passed its middle,
// when that glint began, when the last glint it decided on was due, and 1 once
// set. A cell takes up its plan unless a cell within two of it plans an older
// glint within SPACING seconds of it in the same frame: cells deciding in one
// frame cannot see each other's state, but they see each other's plans.
const spots: Buffer = buffer({ scale: 1 / CELL, float: 32, filter: 'nearest' }, p => {
  const here = spots.at(p.cell)
  let last = here.w > 0.5 ? here.x : -100
  let whose = here.w > 0.5 ? here.y : -1
  let handled = here.w > 0.5 ? here.z : -100
  const plan = plans.at(p.cell)

  if (plan.w > 0.5) {
    let isFull = plan.w > 1.5

    for (const [dx, dy] of AROUND) {
      const beside = plans.at(p.cell + vec2(dx, dy))

      if (beside.w > 1.5 && beside.x < plan.x && abs(beside.y - plan.y) < SPACING) {
        isFull = false
      }
    }
    if (isFull) {
      last = plan.y
      whose = plan.x
    }
    handled = plan.z
  }

  return vec4(last, whose, handled, 1)
})

const glint = picture(p => {
  // Each glint here now.
  const lit: Six = [0, 0, 0, 0, 0, 0]
  let shown = 0

  for (const slot of SLOTS) {
    const star = stars.at(vec2(slot, 0))
    const age = time - star.z

    if (star.w > 0.5 && age < LIFE) {
      const u = age / LIFE
      const d = vec2(p.point - star.xy)
      const s = SMALL + (LARGE - SMALL) * smoothstep(0, SWELL, u)

      lit[slot] = min(1, glintAt(d, s) * (1 - smoothstep(SWELL, 1, u)))
      shown = max(shown, lit[slot])
    }
  }
  if (shown < 0.003) {
    return vec4(0)
  }
  const under = scene.sample(p.uv).rgb
  const ink = inkOver(under)
  const swing = swingOf(under, ink)
  const cell = spots.sample(p.uv)
  // At most one glint lights a spot fully at a time: the one its cell gave the
  // spot to. Any other is held under a change of FAINT: an echo, or one too weak
  // here to flash, as it is.
  let full = 0
  let faint = 0

  for (const slot of SLOTS) {
    const star = stars.at(vec2(slot, 0))

    if (cell.w > 0.5 && cell.y === star.z) {
      full = max(full, lit[slot])
    } else {
      faint = max(faint, min(lit[slot], FAINT / swing))
    }
  }
  const shade = full + faint * (1 - full)

  // Premultiplied.
  return vec4(ink * shade, shade)
})

export default shader({ fps: 30, passes: [stars, plans, spots, glint] })
