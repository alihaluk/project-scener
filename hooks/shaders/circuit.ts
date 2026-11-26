// Circuit: a press on the bare backdrop sends one square pulse out along the
// board's grid, gone within a second.
//
// The app freezes, then stops, a shader where a spot swings lighter and darker
// more than three times a second. A pulse reaches a spot later the farther the
// spot is from the press, so a second press near the first pulse lights the
// same spot again a tenth of a second later, however long after the first press
// it came. So the board remembers: each cell of it keeps when a pulse last lit
// it fully, and a pulse that would light it again within SPACING seconds, there
// or within two cells of it, passes as a faint echo, too faint to count as a
// flash. Every press gets a pulse, up to six a second, and no spot flashes
// however the clicks come.
import { abs, buffer, dot, exp, max, min, mix, picture, pointers, pow, scene, shader, step, time, values, vec2, vec3, vec4, type Buffer } from 'claude-code/shader'

// The look's accent in light mode and in dark, from the plugin.
const tint = values({ r: [0, 1], g: [0, 1], b: [0, 1], dr: [0, 1], dg: [0, 1], db: [0, 1] })

const LUMA = vec3(0.2126, 0.7152, 0.0722)

/** How long a pulse lasts, in seconds. */
const LIFE = 0.8
/** The square's half side as a pulse begins, in points. */
const START = 8
/** How far the square's side travels in its life, in points. */
const REACH = 130
/** How fast the square's side travels, in points a second. */
const SPEED = REACH / LIFE
/** How far ahead of its middle the pulse's line shows, in points. */
const FRONT = 9
/** The least time between two pulses that light a spot fully, in seconds. */
const SPACING = 0.6
/** The side of a cell of the board that keeps its own time, in points. */
const CELL = 12
/** How long before its middle reaches a cell's middle a pulse may show in the cell, in seconds. */
const LEAD = (CELL * 0.71 + FRONT) / SPEED + 0.02
/** The most a faint pulse changes a spot's luminance, 0 to 1: far under a flash. */
const FAINT = 0.03

/** Six numbers, one a pulse. */
type Six = [number, number, number, number, number, number]

/** The pulses' slots, one a texel of `pulses`. */
const SLOTS = [0, 1, 2, 3, 4, 5] as const

/** The cells within two of a cell, whose full pulses it keeps clear of. */
const AROUND = [[-2, -2], [-1, -2], [0, -2], [1, -2], [2, -2], [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1], [-2, 0], [-1, 0], [1, 0], [2, 0], [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1], [-2, 2], [-1, 2], [0, 2], [1, 2], [2, 2]] as const

/** The pulse's color over a spot of the Svg: the accent of the mode it shows. */
const inkOver = (under: vec3): vec3 =>
  vec3(mix(vec3(tint.dr, tint.dg, tint.db), vec3(tint.r, tint.g, tint.b), step(0.45, dot(under, LUMA))))

/**
 * The most a pulse of strength 1 changes a spot's luminance, whether the app
 * blends in sRGB or in linear light: one of strength a changes it a * this at most.
 */
const swingOf = (under: vec3, ink: vec3): number => {
  const lighter = pow(ink, 2.2) - pow(under, 2.2)
  const darker = pow(under, 1.2) * (under - ink) * 2.2

  return max(0.0001, dot(mix(darker, lighter, step(under, ink)), LUMA))
}

/** How far a spot is from a press along the board's grid, in points. */
const squareFrom = (at: vec2, from: vec2): number => {
  const d = vec2(at - from)

  return max(abs(d.x), abs(d.y))
}

// The last six pulses, one a texel: where each began in points, when, and 1 once it has.
const pulses: Buffer = buffer({ size: [6, 1], float: 32, filter: 'nearest' }, p => {
  let oldest = 1000000
  let free = 0

  for (const slot of SLOTS) {
    const pulse = pulses.at(vec2(slot, 0))
    const began = pulse.w > 0.5 ? pulse.z : -100

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
  // A press takes the oldest pulse's slot once that pulse is gone; past six
  // pulses a second, a press gets no pulse.
  const isStart = pressed > 0.5 && time - oldest >= LIFE && abs(p.cell.x - free) < 0.5

  return isStart ? vec4(at.x, at.y, time, 1) : pulses.at(p.cell)
})

// Each cell of the board, this frame: the next pulse it must decide on, of those
// due since it last decided, the earliest: when that pulse began, when it passes
// the cell's middle, when it was due, and 2 if no other full pulse lit the cells
// within two of it in the last SPACING seconds, 1 if one did, 0 with none due.
// Deciding by what is left rather than by the frame's own span keeps every
// pulse decided, however the app spaces its frames.
const plans: Buffer = buffer({ scale: 1 / CELL, float: 32, filter: 'nearest' }, p => {
  const here = spots.at(p.cell)
  const last = here.w > 0.5 ? here.x : -100
  const handled = here.w > 0.5 ? here.z : -100
  const under = scene.sample(p.uv).rgb
  const swing = swingOf(under, inkOver(under))
  // The latest full pulse in the cells around, and the latest of any other pulse.
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
    const pulse = pulses.at(vec2(slot, 0))
    const reached = max(0, squareFrom(p.point, pulse.xy) - START) / SPEED
    const left = 1 - reached / LIFE
    const hit = pulse.z + reached
    const due = max(pulse.z, hit - LEAD)
    const isStrong = pulse.w > 0.5 && reached < LIFE && left * 0.85 * swing >= FAINT

    if (isStrong && due > handled && due <= time && (plan.w < 0.5 || due < plan.z)) {
      const isClear = hit - max(last, latestWhose === pulse.z ? other : latest) >= SPACING

      plan = vec4(pulse.z, hit, due, isClear ? 2 : 1)
    }
  }

  return plan
})

// Each cell of the board: when the last pulse that lit it fully passed its middle,
// when that pulse began, when the last pulse it decided on was due, and 1 once
// set. A cell takes up its plan unless a cell within two of it plans an older
// pulse within SPACING seconds of it in the same frame: cells deciding in one
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

const square = picture(p => {
  // Each pulse's line here now.
  const lit: Six = [0, 0, 0, 0, 0, 0]
  let shown = 0

  for (const slot of SLOTS) {
    const pulse = pulses.at(vec2(slot, 0))
    const age = time - pulse.z

    if (pulse.w > 0.5 && age < LIFE) {
      const far = squareFrom(p.point, pulse.xy)
      const u = age / LIFE
      const edge = far - (START + u * REACH)

      lit[slot] = min(1, exp(-(edge * edge) / 12) * (1 - u) * 0.85)
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
  // At most one pulse lights a spot fully at a time: the one its cell gave the
  // spot to. Any other is held under a change of FAINT: an echo, or one too weak
  // here to flash, as it is.
  let full = 0
  let faint = 0

  for (const slot of SLOTS) {
    const pulse = pulses.at(vec2(slot, 0))

    if (cell.w > 0.5 && cell.y === pulse.z) {
      full = max(full, lit[slot])
    } else {
      faint = max(faint, min(lit[slot], FAINT / swing))
    }
  }
  const shade = full + faint * (1 - full)

  // Premultiplied.
  return vec4(ink * shade, shade)
})

export default shader({ fps: 30, passes: [pulses, plans, spots, square] })
