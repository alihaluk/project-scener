// Checks that no click pattern makes a look's ripple flash, the way the
// desktop app judges it: the app freezes, then stops, a shader where a spot
// swings lighter and darker more than three times a second.
//
// The shaders run on the GPU and nothing here can run them, so this is a port
// of their logic to JavaScript. It reads each shader's numbers (LIFE, SPACING,
// CELL, LEAD and the rest) from the file itself, so a change to one is checked
// as written. A change to a shader's shape or its cells' rules has to be made
// here too.
//
//   node tests/flash-sim.mjs            every look, both modes
//   node tests/flash-sim.mjs tide       one look
//
// It exits with 1 when any spot flashes too often.
import { readFileSync } from 'node:fs'

const HERE = new URL('../hooks/shaders/', import.meta.url)
const LUMA = [0.2126, 0.7152, 0.0722]
const MODES = {
  dark: { bg: [0.06, 0.11, 0.12], ink: [0.6, 0.78, 0.8] },
  light: { bg: [0.93, 0.95, 0.95], ink: [0.05, 0.45, 0.42] },
}
// The app's limit is more than three flashes a second. Two flashes closer than
// this are a double flash, whatever the count.
const MOST_IN_A_SECOND = 3
const CLOSEST = 0.25

/** The `const NAME = expression` numbers of a shader file, worked out in order. */
function numbersOf(look) {
  const text = readFileSync(new URL(`${look}.ts`, HERE), 'utf8')
  const scope = {}

  for (const [, name, expression] of text.matchAll(/^const ([A-Z]+) = ([^\n]+)$/gm)) {
    if (/^[\d\s.+\-*/()A-Z_]+$/.test(expression)) {
      scope[name] = Function(...Object.keys(scope), `return (${expression})`)(...Object.values(scope))
    }
  }

  return scope
}

const smooth = (from, to, x) => {
  const t = Math.min(1, Math.max(0, (x - from) / (to - from)))

  return t * t * (3 - 2 * t)
}

/**
 * Each look's shape: how far a spot is from the press as the ripple measures
 * it, how lit the ripple is there now, and how strong it is as it passes.
 */
function shapes(n) {
  const ring = (far, lit, peak, stretch = 1) => ({
    race: (n.CELL * 2 * 1.42 * stretch) / n.SPEED + 0.05,
    cell(dx, dy, began) {
      const reached = Math.max(0, far(dx, dy) - n.START) / n.SPEED

      return reached < n.LIFE ? { hit: began + reached, due: Math.max(began, began + reached - n.LEAD), peak: peak(1 - reached / n.LIFE) } : null
    },
    lit(dx, dy, age) {
      const d = far(dx, dy)
      const u = age / n.LIFE

      return lit(d - (n.START + u * n.REACH), u, d)
    },
  })
  const round = (dx, dy) => Math.hypot(dx, dy)

  return {
    tide: () => ring(round, (e, u) => Math.min(1, Math.exp(-(e * e) / (e > 0 ? 8 : 22)) * (1 - u) ** 2 * 0.95), l => Math.min(1, l * l * 0.95)),
    circuit: () =>
      ring((dx, dy) => Math.max(Math.abs(dx), Math.abs(dy)), (e, u) => Math.min(1, Math.exp(-(e * e) / 12) * (1 - u) * 0.85), l => l * 0.85),
    terrain: () =>
      ring(
        (dx, dy) => Math.hypot(dx, dy) * (1 + 0.08 * Math.sin(Math.atan2(dy, dx) * 5 + 1.3)),
        (e, u) => Math.min(1, Math.exp(-(e * e) / 20) * (1 - u) ** 2 * 0.8),
        l => l * l * 0.8,
        1.2,
      ),
    route: () =>
      ring(round, (e, u, r) => Math.min(1, Math.max(Math.exp(-(e * e) / 25) * (1 - u), smooth(6, 4, r) * (1 - smooth(0.5, 1, u))) * 0.85), l => l * 0.85),
    aurora: () =>
      ring(
        (dx, dy) => Math.hypot(dx * n.STRETCH, dy),
        (e, u) => Math.min(1, Math.exp(-(e * e) / (e > 0 ? 10 : 30)) * (1 - u) ** 2 * 0.8),
        l => l * l * 0.8,
        n.STRETCH,
      ),
    desert: () =>
      ring(
        (dx, dy) => Math.hypot(dx, dy * n.STRETCH),
        (e, u) => Math.min(1, Math.exp(-(e * e) / (e > 0 ? 6 : 26)) * (1 - u) ** 2 * 0.85),
        l => l * l * 0.85,
        n.STRETCH,
      ),
    paper: () =>
      ring(
        round,
        (e, u) => Math.min(1, (smooth(4, -4, e) * 0.45 + Math.exp(-(e * e) / 6) * 0.35) * (1 - smooth(n.DRY, 1, u))),
        l => (1 - smooth(n.DRY, 1, 1 - l)) * 0.8,
      ),
    forest: () => {
      const glow = (dx, dy, s) => {
        const far = dx * dx + dy * dy

        return Math.exp(-far / (s * s * 0.5)) * 0.55 + Math.exp(-far / 18) * 0.6
      }

      return {
        cell(dx, dy, began) {
          const up = dy - Math.min(Math.max(dy, 0), n.RISE)
          const near = [Math.max(0, Math.abs(dx) - n.CELL / 2), Math.max(0, Math.abs(up) - n.CELL / 2)]

          return { hit: began + n.SWELL * n.LIFE, due: began, peak: Math.min(1, glow(near[0], near[1], n.LARGE)) }
        },
        lit(dx, dy, age) {
          const u = age / n.LIFE
          const s = n.SMALL + (n.LARGE - n.SMALL) * smooth(0, n.SWELL, u)

          return Math.min(1, glow(dx, dy - n.RISE * u, s) * (1 - smooth(n.SWELL, 1, u)))
        },
      }
    },
    night: () => {
      const glint = (dx, dy, s) => {
        const ax = Math.abs(dx) / s
        const ay = Math.abs(dy) / s

        return (Math.exp(-ax * 10 - ay * 1.1) + Math.exp(-ay * 10 - ax * 1.1)) * 0.7 + Math.exp(-(dx * dx + dy * dy) / (s * s * 0.5)) * 0.45
      }

      return {
        race: 0.05,
        cell(dx, dy, began) {
          const near = [Math.max(0, Math.abs(dx) - n.CELL / 2), Math.max(0, Math.abs(dy) - n.CELL / 2)]

          return { hit: began + n.SWELL * n.LIFE, due: began, peak: Math.min(1, glint(near[0], near[1], n.LARGE)) }
        },
        lit(dx, dy, age) {
          const u = age / n.LIFE
          const s = n.SMALL + (n.LARGE - n.SMALL) * smooth(0, n.SWELL, u)

          return Math.min(1, glint(dx, dy, s) * (1 - smooth(n.SWELL, 1, u)))
        },
      }
    },
  }
}

function run(look, mode, presses, { width = 300, height = 200, step = 3, fps = 30, seconds = 5, jitter = 0.03 } = {}) {
  const n = numbersOf(look)
  const shape = shapes(n)[look]()
  const { bg, ink } = MODES[mode]
  const luminance = color => color.reduce((sum, value, at) => sum + LUMA[at] * value ** 2.2, 0)
  const shown = alpha => luminance(bg.map((value, at) => value + (ink[at] - value) * alpha))
  // As the shaders bound it: above the true change, with products alone.
  const swing = LUMA.reduce(
    (sum, weight, at) => sum + weight * (ink[at] >= bg[at] ? ink[at] ** 2 - bg[at] ** 3 : bg[at] * (bg[at] - ink[at]) * 2.2),
    0,
  )
  const slots = Array.from({ length: 6 }, () => null)
  const columns = Math.ceil(width / n.CELL)
  const rows = Math.ceil(height / n.CELL)
  let cells = Array.from({ length: columns * rows }, () => ({ last: -100, whose: -1, handled: -100 }))
  const frames = []
  let seed = 7
  let next = 0
  let time = 0

  while (time < seconds) {
    let press = null

    while (next < presses.length && presses[next].t <= time) {
      press = presses[next++]
    }
    if (press) {
      let oldest = 1e6
      let free = 0

      slots.forEach((ring, at) => {
        const began = ring ? ring.began : -100

        if (began < oldest) {
          oldest = began
          free = at
        }
      })
      if (time - oldest >= n.LIFE) {
        slots[free] = { x: press.x, y: press.y, began: time }
      }
    }
    // plans: each cell's next crest due, and whether no full crest near it is too recent
    const reach = 2
    const plans = cells.map((cell, at) => {
      const x = ((at % columns) + 0.5) * n.CELL
      const y = (Math.floor(at / columns) + 0.5) * n.CELL
      let best = null

      for (const ring of slots) {
        const passing = ring && shape.cell(x - ring.x, y - ring.y, ring.began)

        if (passing && passing.peak * swing >= n.FAINT && passing.due > cell.handled && passing.due <= time && (!best || passing.due < best.due)) {
          best = { ...passing, began: ring.began }
        }
      }
      if (best) {
        let latest = cell.last

        for (let dy = -reach; dy <= reach; dy++) {
          for (let dx = -reach; dx <= reach; dx++) {
            const cx = (at % columns) + dx
            const cy = Math.floor(at / columns) + dy
            const near = cells[cy * columns + cx]

            if ((dx || dy) && cx >= 0 && cy >= 0 && cx < columns && cy < rows && near.whose !== best.began) {
              latest = Math.max(latest, near.last)
            }
          }
        }
        best.clear = best.hit - latest >= n.SPACING
      }

      return best
    })
    // spots: take up a clear plan unless a cell near it plans an older crest
    cells = cells.map((cell, at) => {
      const plan = plans[at]

      if (!plan) {
        return cell
      }
      let full = plan.clear

      for (let dy = -reach; dy <= reach; dy++) {
        for (let dx = -reach; dx <= reach; dx++) {
          const cx = (at % columns) + dx
          const cy = Math.floor(at / columns) + dy
          const near = plans[cy * columns + cx]

          if ((dx || dy) && cx >= 0 && cy >= 0 && cx < columns && cy < rows && near?.clear && near.began < plan.began && Math.abs(near.hit - plan.hit) < n.SPACING) {
            full = false
          }
        }
      }

      return full ? { last: plan.hit, whose: plan.began, handled: plan.due } : { ...cell, handled: plan.due }
    })
    const image = []

    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const cell = cells[Math.floor(y / n.CELL) * columns + Math.floor(x / n.CELL)]
        let full = 0
        let faint = 0

        for (const ring of slots) {
          const age = ring ? time - ring.began : -1

          if (age >= 0 && age < n.LIFE) {
            const lit = shape.lit(x - ring.x, y - ring.y, age)

            if (cell.whose === ring.began) {
              full = Math.max(full, lit)
            } else {
              faint = Math.max(faint, Math.min(lit, n.FAINT / swing))
            }
          }
        }
        image.push(shown(full + faint * (1 - full)))
      }
    }
    frames.push({ time, image })
    seed = (seed * 16807) % 2147483647
    time += 1 / fps + (seed / 2147483647) * jitter
  }

  return { frames, columns: Math.ceil(width / step), rows: Math.ceil(height / step) }
}

/** When each flash at a spot ends: a swing of 0.1 or more up, then as far down. */
function flashes(series, times) {
  const ends = []
  let low = series[0]
  let high = series[0]
  let way = 0

  for (let at = 1; at < series.length; at++) {
    const value = series[at]

    if (way === 1) high = Math.max(high, value)
    else if (way === -1) low = Math.min(low, value)
    else {
      low = Math.min(low, value)
      high = Math.max(high, value)
    }
    if (way !== 1 && value - low >= 0.1) {
      way = 1
      high = value
    } else if (way !== -1 && high - value >= 0.1) {
      if (way === 1) ends.push(times[at])
      way = -1
      low = value
    }
  }

  return ends
}

function judge({ frames, columns, rows }, patch) {
  const times = frames.map(frame => frame.time)
  const side = Math.max(1, Math.round(patch / 3))
  let closest = Infinity
  let most = 0

  for (let top = 0; top + side <= rows; top += Math.max(1, side >> 1)) {
    for (let left = 0; left + side <= columns; left += Math.max(1, side >> 1)) {
      const series = frames.map(frame => {
        let sum = 0

        for (let y = top; y < top + side; y++) for (let x = left; x < left + side; x++) sum += frame.image[y * columns + x]

        return sum / (side * side)
      })
      const ends = flashes(series, times)

      for (let at = 1; at < ends.length; at++) closest = Math.min(closest, ends[at] - ends[at - 1])
      for (let at = 0; at < ends.length; at++) {
        let count = 0

        for (let later = at; later < ends.length && ends[later] - ends[at] < 1; later++) count++
        most = Math.max(most, count)
      }
    }
  }

  return { closest, most }
}

const random = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647
const SCENARIOS = {
  'a second click near the first crest': [
    { t: 0.6, x: 120, y: 100 },
    { t: 1.03, x: 205, y: 110 },
    { t: 1.45, x: 170, y: 140 },
  ],
  'one spot, every 0.4 s': Array.from({ length: 10 }, (_, at) => ({ t: 0.3 + at * 0.4, x: 150, y: 100 })),
  'one spot, every 0.15 s': Array.from({ length: 28 }, (_, at) => ({ t: 0.3 + at * 0.15, x: 150, y: 100 })),
  'clicks all over': (() => {
    const next = random(99)
    let t = 0.2

    return Array.from({ length: 24 }, () => ({ t: (t += 0.06 + next() * 0.25), x: 30 + next() * 240, y: 25 + next() * 150 }))
  })(),
}

const looks = process.argv.slice(2).length > 0 ? process.argv.slice(2) : Object.keys(shapes({}))
let failed = 0

for (const look of looks) {
  for (const mode of Object.keys(MODES)) {
    for (const [name, presses] of Object.entries(SCENARIOS)) {
      const result = run(look, mode, presses)
      const checks = [3, 12, 24].map(patch => judge(result, patch))
      const closest = Math.min(...checks.map(check => check.closest))
      const most = Math.max(...checks.map(check => check.most))
      const isBad = most > MOST_IN_A_SECOND || closest < CLOSEST

      failed += isBad ? 1 : 0
      console.log(
        `${isBad ? 'FAIL' : 'ok  '} ${look.padEnd(8)} ${mode.padEnd(6)} ${name.padEnd(36)} most ${most} a second, closest ${
          closest === Infinity ? '-' : `${closest.toFixed(2)} s`
        }`,
      )
    }
  }
}
process.exit(failed > 0 ? 1 : 0)
