// Tide: a press on the bare backdrop sends one ripple across the water, a lit
// crest with a sharp front and a softer back, gone within a second.
//
// Every shader here is TypeScript against 'claude-code/shader'. The engine
// reads it and never runs it; the desktop app plays it on the GPU, and feeds it
// the time and the person's presses itself. y points up.
//
// The app freezes, then stops, a shader where a spot swings lighter and darker
// more than three times a second. A crest reaches a spot later the farther the
// spot is from the press, so a second press near the first ripple's crest
// lights the same water again a tenth of a second later, however long after the
// first press it came. So the water remembers: each cell of it keeps when a
// crest last lit it fully, and a crest that would light it again within SPACING
// seconds, there or within two cells of it, passes as a faint echo, too faint
// to count as a flash. Every press gets a ripple, up to six a second, and no
// spot flashes however the clicks come.
import { abs, buffer, composer, dot, dt, exp, length, max, min, mix, PI, picture, pointers, scene, shader, sin, size, step, time, values, vec2, vec3, vec4, type Buffer } from 'claude-code/shader'

// From the plugin: the look's accent in light mode and in dark, 1 while Claude
// works on a turn, and 1 when a press starts a ripple.
const tint = values({ r: [0, 1], g: [0, 1], b: [0, 1], dr: [0, 1], dg: [0, 1], db: [0, 1], busy: [0, 1], clicks: [0, 1] })

const LUMA = vec3(0.2126, 0.7152, 0.0722)

/** How long a ripple lasts, in seconds. */
const LIFE = 0.8
/** The crest's radius as a ripple begins, in points. */
const START = 14
/** How far the crest travels in its life, in points. */
const REACH = 140
/** How fast the crest travels, in points a second. */
const SPEED = REACH / LIFE
/** How far ahead of its middle the crest's front shows, in points. */
const FRONT = 7
/** The least time between two crests that light a spot fully, in seconds. */
const SPACING = 0.6
/** The side of a cell of water that keeps its own time, in points. */
const CELL = 12
/** How long before its middle reaches a cell's middle a crest may show in the cell, in seconds. */
const LEAD = (CELL * 0.71 + FRONT) / SPEED + 0.02
/** One breath of the prompt box's glow while Claude works, in seconds. */
const BREATH = 3.6
/** How far the glow reaches out from the prompt box, in points. */
const HALO = 30
/** The most the glow changes a spot's luminance, 0 to 1: under a flash, even with an echo. */
const GLOW = 0.06
/** The most a faint crest changes a spot's luminance, 0 to 1: far under a flash. */
const FAINT = 0.03

/** The ripples' slots, one a texel of `rings`. */
const SLOTS = [0, 1, 2, 3, 4, 5] as const

/** The cells within two of a cell, whose full crests it keeps clear of. */
const AROUND = [[-2, -2], [-1, -2], [0, -2], [1, -2], [2, -2], [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1], [-2, 0], [-1, 0], [1, 0], [2, 0], [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1], [-2, 2], [-1, 2], [0, 2], [1, 2], [2, 2]] as const

/** The crest's color over a spot of the Svg: by day the accent, by night a pale light of it. */
const inkOver = (under: vec3): vec3 => {
  const night = mix(vec3(tint.dr, tint.dg, tint.db), vec3(1), 0.35)

  return vec3(mix(night, vec3(tint.r, tint.g, tint.b), step(0.45, dot(under, LUMA))))
}

/**
 * The most a crest of strength 1 changes a spot's luminance, whether the app
 * blends in sRGB or in linear light: one of strength a changes it a * this at most.
 */
const swingOf = (under: vec3, ink: vec3): number => {
  // x * x is above x^2.2, and x * x * x below it, so this is above the true
  // change as the ink lightens a spot; and x above x^1.2 as it darkens one.
  const lighter = ink * ink - under * under * under
  const darker = under * (under - ink) * 2.2

  return max(0.0001, dot(mix(darker, lighter, step(under, ink)), LUMA))
}

// The last six ripples, one a texel: where each began in points, when, and 1 once it has.
const rings: Buffer = buffer({ size: [6, 1], float: 32, filter: 'nearest' }, p => {
  let oldest = 1000000
  let free = 0

  for (const slot of SLOTS) {
    const ring = rings.at(vec2(slot, 0))
    const began = ring.w > 0.5 ? ring.z : -100

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
  // A press takes the oldest ripple's slot once that ripple is gone; past six
  // ripples a second, a press gets no ripple.
  const isStart = pressed > 0.5 && tint.clicks > 0.5 && time - oldest >= LIFE && abs(p.cell.x - free) < 0.5

  return isStart ? vec4(at.x, at.y, time, 1) : rings.at(p.cell)
})

// Each cell of the water, this frame: the next crest it must decide on, of those
// due since it last decided, the earliest: when that crest began, when it passes
// the cell's middle, when it was due, and 2 if no other full crest lit the cells
// within two of it in the last SPACING seconds, 1 if one did, 0 with none due.
// Deciding by what is left rather than by the frame's own span keeps every
// crest decided, however the app spaces its frames.
const plans: Buffer = buffer({ scale: 1 / CELL, float: 32, filter: 'nearest' }, p => {
  const here = spots.at(p.cell)
  const last = here.w > 0.5 ? here.x : -100
  const handled = here.w > 0.5 ? here.z : -100
  const under = scene.sample(p.uv).rgb
  const swing = swingOf(under, inkOver(under))
  // The latest full crest in the cells around, and the latest of any other crest.
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
    const ring = rings.at(vec2(slot, 0))
    const reached = max(0, length(vec2(p.point - ring.xy)) - START) / SPEED
    const left = 1 - reached / LIFE
    const hit = ring.z + reached
    const due = max(ring.z, hit - LEAD)
    const isStrong = ring.w > 0.5 && reached < LIFE && left * left * 0.95 * swing >= FAINT

    if (isStrong && due > handled && due <= time && (plan.w < 0.5 || due < plan.z)) {
      const isClear = hit - max(last, latestWhose === ring.z ? other : latest) >= SPACING

      plan = vec4(ring.z, hit, due, isClear ? 2 : 1)
    }
  }

  return plan
})

// Each cell of the water: when the last crest that lit it fully passed its middle,
// when that crest began, when the last crest it decided on was due, and 1 once
// set. A cell takes up its plan unless a cell within two of it plans an older
// crest within SPACING seconds of it in the same frame: cells deciding in one
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

const ripple = picture(p => {
  // Each ripple's crest here now, full where its cell gave it the spot.
  const cell = spots.sample(p.uv)
  let shown = 0
  let full = 0
  let faint = 0

  for (const slot of SLOTS) {
    const ring = rings.at(vec2(slot, 0))
    const age = time - ring.z

    if (ring.w > 0.5 && age < LIFE) {
      const d = length(vec2(p.point - ring.xy))
      const u = age / LIFE
      const edge = d - (START + u * REACH)
      const width = edge > 0 ? 8 : 22
      const fade = (1 - u) * (1 - u)

      const bright = min(1, exp(-(edge * edge) / width) * fade * 0.95)

      // At most one crest lights a spot fully at a time: the one its cell gave
      // the spot to. Any other is held under a change of FAINT below.
      if (cell.w > 0.5 && cell.y === ring.z) {
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
  const crests = full + faint * (1 - full)
  const shade = crests + min(glow * 0.35, GLOW / swing) * (1 - crests)

  // Premultiplied.
  return vec4(ink * shade, shade)
})

export default shader({ fps: 30, passes: [rings, plans, spots, mood, ripple] })
