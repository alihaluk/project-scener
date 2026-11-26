// Route: a press on the bare backdrop pings there, as a map marks a place: a
// dot and one ring that widens from it, both gone within a second.
//
// The app freezes, then stops, a shader where a spot swings lighter and darker
// more than three times a second. A ring reaches a spot later the farther the
// spot is from the press, so a second press near the first ring lights the same
// spot again a tenth of a second later, however long after the first press it
// came. So the map remembers: each cell of it keeps when a ping last lit it
// fully, and a ping that would light it again within SPACING seconds, there or
// within two cells of it, shows as a faint echo, too faint to count as a flash.
// Every press gets a ping, up to six a second, and no spot flashes however the
// clicks come.
import { abs, buffer, composer, dot, dt, exp, length, max, min, mix, PI, picture, pointers, scene, shader, sin, size, smoothstep, step, time, values, vec2, vec3, vec4, type Buffer } from 'claude-code/shader'

// From the plugin: the look's accent in light mode and in dark, 1 while Claude
// works on a turn, and 1 when a press starts a ripple.
const tint = values({ r: [0, 1], g: [0, 1], b: [0, 1], dr: [0, 1], dg: [0, 1], db: [0, 1], busy: [0, 1], clicks: [0, 1] })

const LUMA = vec3(0.2126, 0.7152, 0.0722)

/** How long a ping lasts, in seconds. */
const LIFE = 0.8
/** The ring's radius as a ping begins, and the dot's, in points. */
const START = 6
/** How far the ring travels in its life, in points. */
const REACH = 100
/** How fast the ring travels, in points a second. */
const SPEED = REACH / LIFE
/** How far ahead of its middle the ring shows, in points. */
const FRONT = 12
/** The least time between two pings that light a spot fully, in seconds. */
const SPACING = 0.6
/** The side of a cell of the map that keeps its own time, in points. */
const CELL = 12
/** How long before its middle reaches a cell's middle a ring may show in the cell, in seconds. */
const LEAD = (CELL * 0.71 + FRONT) / SPEED + 0.02
/** One breath of the prompt box's glow while Claude works, in seconds. */
const BREATH = 3.6
/** How far the glow reaches out from the prompt box, in points. */
const HALO = 30
/** The most the glow changes a spot's luminance, 0 to 1: under a flash, even with an echo. */
const GLOW = 0.06
/** The most a faint ping changes a spot's luminance, 0 to 1: far under a flash. */
const FAINT = 0.03

/** The pings' slots, one a texel of `pings`. */
const SLOTS = [0, 1, 2, 3, 4, 5] as const

/** The cells within two of a cell, whose full pings it keeps clear of. */
const AROUND = [[-2, -2], [-1, -2], [0, -2], [1, -2], [2, -2], [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1], [-2, 0], [-1, 0], [1, 0], [2, 0], [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1], [-2, 2], [-1, 2], [0, 2], [1, 2], [2, 2]] as const

/** The ping's color over a spot of the Svg: the accent of the mode it shows. */
const inkOver = (under: vec3): vec3 =>
  vec3(mix(vec3(tint.dr, tint.dg, tint.db), vec3(tint.r, tint.g, tint.b), step(0.45, dot(under, LUMA))))

/**
 * The most a ping of strength 1 changes a spot's luminance, whether the app
 * blends in sRGB or in linear light: one of strength a changes it a * this at most.
 */
const swingOf = (under: vec3, ink: vec3): number => {
  // x * x is above x^2.2, and x * x * x below it, so this is above the true
  // change as the ink lightens a spot; and x above x^1.2 as it darkens one.
  const lighter = ink * ink - under * under * under
  const darker = under * (under - ink) * 2.2

  return max(0.0001, dot(mix(darker, lighter, step(under, ink)), LUMA))
}

// The last six pings, one a texel: where each began in points, when, and 1 once it has.
const pings: Buffer = buffer({ size: [6, 1], float: 32, filter: 'nearest' }, p => {
  let oldest = 1000000
  let free = 0

  for (const slot of SLOTS) {
    const ping = pings.at(vec2(slot, 0))
    const began = ping.w > 0.5 ? ping.z : -100

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
  // A press takes the oldest ping's slot once that ping is gone; past six pings
  // a second, a press gets no ping.
  const isStart = pressed > 0.5 && tint.clicks > 0.5 && time - oldest >= LIFE && abs(p.cell.x - free) < 0.5

  return isStart ? vec4(at.x, at.y, time, 1) : pings.at(p.cell)
})

// Each cell of the map, this frame: the next ping it must decide on, of those
// due since it last decided, the earliest: when that ping began, when it passes
// the cell's middle, when it was due, and 2 if no other full ping lit the cells
// within two of it in the last SPACING seconds, 1 if one did, 0 with none due.
// Deciding by what is left rather than by the frame's own span keeps every
// ping decided, however the app spaces its frames.
const plans: Buffer = buffer({ scale: 1 / CELL, float: 32, filter: 'nearest' }, p => {
  const here = spots.at(p.cell)
  const last = here.w > 0.5 ? here.x : -100
  const handled = here.w > 0.5 ? here.z : -100
  const under = scene.sample(p.uv).rgb
  const swing = swingOf(under, inkOver(under))
  // The latest full ping in the cells around, and the latest of any other ping.
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
    const ping = pings.at(vec2(slot, 0))
    const reached = max(0, length(vec2(p.point - ping.xy)) - START) / SPEED
    const left = 1 - reached / LIFE
    const hit = ping.z + reached
    const due = max(ping.z, hit - LEAD)
    const isStrong = ping.w > 0.5 && reached < LIFE && left * 0.85 * swing >= FAINT

    if (isStrong && due > handled && due <= time && (plan.w < 0.5 || due < plan.z)) {
      const isClear = hit - max(last, latestWhose === ping.z ? other : latest) >= SPACING

      plan = vec4(ping.z, hit, due, isClear ? 2 : 1)
    }
  }

  return plan
})

// Each cell of the map: when the last ping that lit it fully passed its middle,
// when that ping began, when the last ping it decided on was due, and 1 once
// set. A cell takes up its plan unless a cell within two of it plans an older
// ping within SPACING seconds of it in the same frame: cells deciding in one
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

// How awake the prompt box's glow is, 0 to 1: it eases toward the plugin's
// `busy` over about a second, so a turn's start and end never jump.
const mood: Buffer = buffer({ size: [1, 1], float: 16, filter: 'nearest' }, () => {
  const was = mood.at(vec2(0)).x

  return vec4(was + (tint.busy - was) * min(1, dt * 1.5), 0, 0, 1)
})

const mark = picture(p => {
  // Each ping's ring and dot here now, full where its cell gave it the spot.
  const cell = spots.sample(p.uv)
  let shown = 0
  let full = 0
  let faint = 0

  for (const slot of SLOTS) {
    const ping = pings.at(vec2(slot, 0))
    const age = time - ping.z

    if (ping.w > 0.5 && age < LIFE) {
      const u = age / LIFE
      const r = length(vec2(p.point - ping.xy))
      const edge = r - (START + u * REACH)
      const ring = exp(-(edge * edge) / 25) * (1 - u)
      const pin = smoothstep(6, 4, r) * (1 - smoothstep(0.5, 1, u))

      const bright = min(1, max(ring, pin) * 0.85)

      // At most one ping lights a spot fully at a time: the one its cell gave
      // the spot to. Any other is held under a change of FAINT below.
      if (cell.w > 0.5 && cell.y === ping.z) {
        full = max(full, bright)
      } else {
        faint = max(faint, bright)
      }
      shown = max(shown, bright)
    }
  }
  // While Claude works, a soft breath of the accent around the prompt box.
  const awake = mood.at(vec2(0)).x
  let glow = 0

  if (awake > 0.003 && composer.z > composer.x) {
    const box = vec4(composer.x * size.x, composer.y * size.y, composer.z * size.x, composer.w * size.y)
    const out = max(vec2(box.x - p.point.x, box.y - p.point.y), vec2(p.point.x - box.z, p.point.y - box.w))
    const far = length(max(out, vec2(0)))

    glow = awake * (0.6 + 0.4 * sin((time * 2 * PI) / BREATH)) * exp(-far / HALO)
  }
  if (shown < 0.003 && glow < 0.003) {
    return vec4(0)
  }
  const under = scene.sample(p.uv).rgb
  const ink = inkOver(under)
  const swing = swingOf(under, ink)
  // An echo, or one too weak here to flash, as it is.
  faint = min(faint, FAINT / swing)
  const rings = full + faint * (1 - full)
  const shade = rings + min(glow * 0.35, GLOW / swing) * (1 - rings)

  // Premultiplied.
  return vec4(ink * shade, shade)
})

export default shader({ fps: 30, passes: [pings, plans, spots, mood, mark] })
