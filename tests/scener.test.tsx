import type { On, ThemeSetArgs } from 'claude-code'
import { expect, test, type Engine } from 'claude-code/testing'

import { resolveLook } from '../hooks/config.js'
import { LOOKS } from '../hooks/looks.js'
import { contrast } from '../hooks/scenes/kit.js'
import { added, withMarks, type Point } from '../hooks/scenes/marks.js'
import { SOUNDS } from '../hooks/sounds.js'

const PROJECT = '/work/shop'

type World = { sets: ThemeSetArgs[]; refused: number; clears: number; toasts: string[]; store: Record<string, unknown> }

/** The app's own answer to a set it won't take, or undefined to take it. */
type Refuse = (args: ThemeSetArgs) => string | undefined

// Everything beneath the plugin: a project folder holding `files`, and a
// record of what the plugin asked the app to draw. `refuse` plays a build
// that turns some sets down, as the app's host check does: the plugin gets
// the reason back as a rejection.
function world(on: On, files: Record<string, string> = {}, picks?: Record<string, string>, refuse?: Refuse): World {
  const seen: World = { sets: [], refused: 0, clears: 0, toasts: [], store: picks ? { picks } : {} }

  on('store.get', (_, e) => ({ value: seen.store[e.key] }))
  on('store.set', (_, e) => {
    seen.store[e.key] = e.value

    return { value: undefined }
  })
  on('command.register', () => ({ value: { command: 'scene' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: PROJECT }))
  on('session.repo', () => ({ value: null }))
  on('fs.exists', (_, e) => ({ value: e.path in files }))
  on('fs.read', (_, e) => {
    const text = files[e.path]

    if (text === undefined) {
      throw new Error('ENOENT')
    }

    return { value: text }
  })
  on('ui.toast', (_, e) => {
    seen.toasts.push(e.text)

    return { value: undefined }
  })
  on('theme.set', (_, e) => {
    const why = refuse?.(e)

    if (why !== undefined) {
      seen.refused++

      return { deny: why }
    }
    seen.sets.push(e)

    return { value: { isDrawn: true, requestId: 'backdrop' } }
  })
  on('theme.clear', () => {
    seen.clears++

    return { value: { isDrawn: false, reason: 'cleared' } }
  })

  return seen
}

// A `/scene <args>` as the person types it at the prompt.
function typed(args = '') {
  return {
    command: 'scene',
    args,
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 80 },
  } as const
}

const START = { cwd: PROJECT, surface: 'desktop', isInteractive: true } as const

function sceneOf(args: ThemeSetArgs | undefined): string | undefined {
  return args?.backdrop !== undefined && 'scene' in args.backdrop ? args.backdrop.scene : undefined
}

test('a fresh project gets no look, and /scene lists the looks', async ($, on) => {
  const seen = world(on)

  await $.session.start(START)
  const { text } = await $.command.run(typed())

  expect(seen.sets.length).toBe(0)
  expect(seen.clears).toBe(0)
  expect(text).toContain('none picked yet')
  expect(text).toContain('`tide`')
})

test('/scene <look> sets it and remembers it for the project', async ($, on) => {
  const seen = world(on)

  await $.session.start(START)
  const { text } = await $.command.run(typed('Tide'))

  expect(text).toContain('Tide (your pick)')
  expect(sceneOf(seen.sets[0])).toBe('tide')
  expect(seen.sets[0]?.colors).toBeDefined()
  expect(seen.store.picks).toEqual({ [PROJECT]: 'tide' })
})

test('a remembered pick is set when the session starts, and /scene sends it again', async ($, on) => {
  const seen = world(on, {}, { [PROJECT]: 'night' })

  await $.session.start(START)
  expect(seen.sets.map(sceneOf)).toEqual(['night'])

  // A client that missed the look gets it from a plain /scene.
  expect((await $.command.run(typed())).text).toContain('This session is open on:')
  expect(seen.sets.map(sceneOf)).toEqual(['night', 'night'])
})

test('/scene off takes the look down, and /scene reset brings the project file back', async ($, on) => {
  const seen = world(on, { [`${PROJECT}/.claude/scene.json`]: '{ "look": "circuit" }' })

  await $.session.start(START)
  expect(sceneOf(seen.sets[0])).toBe('circuit')

  expect((await $.command.run(typed('off'))).text).toContain('you turned it off')
  expect(seen.clears).toBe(1)

  expect((await $.command.run(typed('reset'))).text).toContain('from .claude/scene.json')
  expect(seen.sets.map(sceneOf)).toEqual(['circuit', 'circuit'])
})

test('a project file can bring its own colors and its own SVG', async ($, on) => {
  const seen = world(on, {
    [`${PROJECT}/.claude/scene.json`]: JSON.stringify({
      label: 'Shop',
      scene: 'scene.svg',
      colors: { accent: '#e11d48' },
      glass: { opacity: 0.4 },
    }),
    [`${PROJECT}/.claude/scene.svg`]: '<svg viewBox="0 0 10 10"><circle r="5"/></svg>',
  })

  await $.session.start(START)

  expect(seen.toasts).toEqual([])
  expect(seen.sets[0]?.backdrop).toEqual({ scene: 'project', glass: { blur: 18, opacity: 0.4 } })

  const ui = await $.ui.mount({
    plugin: 'project-scener',
    surface: 'desktop',
    component: 'Backdrop',
    requestId: 'backdrop',
    props: { scene: 'project', plugin: 'project-scener', glass: { blur: 18, opacity: 0.4 } },
  })

  expect(await ui.find({ type: 'Svg' })).toBeDefined()
  await ui.unmount()
})

test('a broken project file says what is wrong, once, and draws nothing', async ($, on) => {
  const seen = world(on, { [`${PROJECT}/.claude/scene.json`]: '{ "look": "lagoon" }' })

  await $.session.start(START)
  const { text } = await $.command.run(typed())

  expect(seen.sets.length).toBe(0)
  expect(seen.toasts.length).toBe(1)
  expect(seen.toasts[0]).toContain('"look" must be one of')
  expect(text).toContain('Problem in .claude/scene.json')
})

test('the default look covers projects with no pick and no file', { options: { defaultLook: 'terrain' } }, async ($, on) => {
  const seen = world(on)

  await $.session.start(START)

  expect(sceneOf(seen.sets[0])).toBe('terrain')
})

test('an unknown look changes nothing', async ($, on) => {
  const seen = world(on)

  await $.session.start(START)
  const { text } = await $.command.run(typed('lagoon'))

  expect(text).toContain('There is no look named "lagoon"')
  expect(seen.sets.length).toBe(0)
  expect(seen.store.picks).toBeUndefined()
})

// A build from before theme sounds and message styles.
const OLD_BUILD: Refuse = args =>
  ['sound', 'style'].find(name => name in args) && 'theme.set does not know the attribute: this build takes backdrop, colors'

test('every shipped look brings a sound, a message style and bubble colors', async ($, on) => {
  const seen = world(on)

  await $.session.start(START)

  for (const look of LOOKS) {
    const { text } = await $.command.run(typed(look.name))
    const set = seen.sets.at(-1)

    expect(set?.sound).toBeDefined()
    expect(set?.style?.UserMessage).toBeDefined()
    expect(set?.colors?.inputs.light?.['bg-user-message']).toMatch(/^#[0-9a-f]{6}$/)
    expect(set?.colors?.inputs.dark?.['bg-user-message']).toMatch(/^#[0-9a-f]{6}$/)
    expect(text).toContain("the speaker in the session's title bar")
  }
})

test("the person's bubble keeps its words at 7:1 in both modes", () => {
  for (const look of LOOKS) {
    const inputs = resolveLook(look).value?.args.colors?.inputs

    for (const mode of [inputs?.light, inputs?.dark]) {
      expect(contrast(mode?.['bg-user-message'] ?? '', mode?.['text-user-message'] ?? '')).toBeGreaterThanOrEqual(7)
    }
  }
})

test('a build that takes neither sound nor style still draws the colors and the scene', async ($, on) => {
  const seen = world(on, {}, { [PROJECT]: 'tide' }, OLD_BUILD)

  await $.session.start(START)
  const { text } = await $.command.run(typed())

  expect(sceneOf(seen.sets[0])).toBe('tide')
  expect(seen.sets[0]?.colors).toBeDefined()
  expect(seen.sets[0]?.sound).toBeUndefined()
  expect(seen.sets[0]?.style).toBeUndefined()
  expect(text).toContain('Its sound and message style were left out: theme.set does not know the attribute')
  expect(text).not.toContain('title bar')
  // A shipped look's sound is nobody's to fix, so it raises no toast.
  expect(seen.toasts).toEqual([])
})

test('a sound the app turns down is left out alone, and the style stays', async ($, on) => {
  const seen = world(on, {}, { [PROJECT]: 'night' }, args =>
    args.sound === undefined ? undefined : 'sound.cues.click would take 38 seconds of audio to render, and the most is 32',
  )

  await $.session.start(START)
  const { text } = await $.command.run(typed())

  expect(seen.sets[0]?.sound).toBeUndefined()
  expect(seen.sets[0]?.style).toBeDefined()
  expect(text).toContain('Its sound was left out: sound.cues.click would take 38 seconds')
})

test("a project file can borrow a shipped look's sound and keep the app's own message style", async ($, on) => {
  const seen = world(on, {
    [`${PROJECT}/.claude/scene.json`]: JSON.stringify({ scene: 'scene.svg', sound: 'night', style: 'none' }),
    [`${PROJECT}/.claude/scene.svg`]: '<svg viewBox="0 0 10 10"><circle r="5"/></svg>',
  })

  await $.session.start(START)

  expect(seen.sets[0]?.sound).toEqual(SOUNDS.night)
  expect(seen.sets[0]?.style).toBeUndefined()
})

test('a project file can write a sound of its own', async ($, on) => {
  const own = { cues: { done: { layers: [{ wave: 'sine', notes: ['C5'] }] } } }
  const seen = world(on, { [`${PROJECT}/.claude/scene.json`]: JSON.stringify({ look: 'route', sound: own, style: false }) })

  await $.session.start(START)

  expect(sceneOf(seen.sets[0])).toBe('route')
  expect(seen.sets[0]?.sound).toEqual(own)
  expect(seen.sets[0]?.style).toBeUndefined()
})

test("a project file's own sound that the app refuses says why in a toast", async ($, on) => {
  const loud = { ambience: { layers: [{ wave: 'pink', drone: true, gain: 7 }] } }
  const seen = world(on, { [`${PROJECT}/.claude/scene.json`]: JSON.stringify({ look: 'tide', sound: loud }) }, undefined, args =>
    JSON.stringify(args.sound) === JSON.stringify(loud) ? 'sound.ambience.layers[0].gain is a number, 0 to 1' : undefined,
  )

  await $.session.start(START)

  expect(sceneOf(seen.sets[0])).toBe('tide')
  expect(seen.sets[0]?.style).toBeDefined()
  expect(seen.toasts).toEqual([
    'project-scener: .claude/scene.json: its sound was left out: sound.ambience.layers[0].gain is a number, 0 to 1',
  ])
})

test('a sound or style field that names no look says what it takes', async ($, on) => {
  const seen = world(on, { [`${PROJECT}/.claude/scene.json`]: '{ "look": "tide", "sound": "lagoon" }' })

  await $.session.start(START)

  expect(seen.sets.length).toBe(0)
  expect(seen.toasts[0]).toContain('"sound" must be one of: tide, night, circuit, terrain, route, none, or an object of its own')
})

test('a look with no message style leaves the bubble colors to the app', async ($, on) => {
  const seen = world(on, { [`${PROJECT}/.claude/scene.json`]: '{ "look": "tide", "style": "none" }' })

  await $.session.start(START)

  expect(seen.sets[0]?.style).toBeUndefined()
  expect(seen.sets[0]?.colors?.inputs.light?.['bg-user-message']).toBeUndefined()
})

test("an older build refusing a file's own style raises no toast", async ($, on) => {
  const seen = world(on, { [`${PROJECT}/.claude/scene.json`]: JSON.stringify({ look: 'night', style: { Heading: { italic: true } } }) }, undefined, OLD_BUILD)

  await $.session.start(START)

  expect(seen.sets[0]?.style).toBeUndefined()
  expect(seen.toasts).toEqual([])
})

const GLASS = { blur: 18, opacity: 0.62 }

// The backdrop as the desktop app draws it, after the look named `scene` was set.
function backdrop($: Engine, scene: string) {
  return $.ui.mount({
    plugin: 'project-scener',
    surface: 'desktop',
    component: 'Backdrop',
    requestId: 'backdrop',
    props: { scene, plugin: 'project-scener', glass: GLASS },
  })
}

test('every shipped look plays its own shader over its scene', async ($, on) => {
  world(on)

  await $.session.start(START)

  for (const look of LOOKS) {
    await $.command.run(typed(look.name))
    const ui = await backdrop($, look.scene)
    const shader = await ui.find({ type: 'Shader' })

    expect(shader?.props.module).toBe(`hooks/shaders/${look.scene}.ts`)
    expect(Object.keys((shader?.props.values ?? {}) as object).sort()).toEqual(['b', 'db', 'dg', 'dr', 'g', 'r'])
    expect(await ui.find({ type: 'Svg' })).toBeDefined()
    await ui.unmount()
  }
})

test("a project's own art draws with no shader", async ($, on) => {
  world(on, {
    [`${PROJECT}/.claude/scene.json`]: '{ "scene": "scene.svg", "colors": { "accent": "#e11d48" } }',
    [`${PROJECT}/.claude/scene.svg`]: '<svg viewBox="0 0 10 10"><circle r="5"/></svg>',
  })

  await $.session.start(START)
  const ui = await backdrop($, 'project')

  expect(await ui.find({ type: 'Shader' })).toBeUndefined()
  expect(await ui.find({ type: 'Svg' })).toBeDefined()
  await ui.unmount()
})

// The app raises a click on the backdrop itself, and a test can't: the marks a
// click leaves are checked here as the hook draws them.
const TONES = resolveLook(LOOKS[1]!).value?.scene?.tones

test('a mark lands where the click was, joined to the one before', () => {
  const source = withMarks('<svg/>', 'night', TONES!, [
    { x: 0.25, y: 0.5 },
    { x: 0.75, y: 0.125 },
  ])

  expect(source).toContain('<svg x="25.00%" y="50.00%" overflow="visible">')
  expect(source).toContain('<line class="mk-path" x1="25.00%" y1="50.00%" x2="75.00%" y2="12.50%"/>')
  expect(source).toContain('prefers-reduced-motion')
})

test('marks keep the newest twelve', () => {
  let points: Point[] = []

  for (let at = 0; at < 15; at++) {
    points = added(points, { x: at / 16, y: 0.5 })
  }

  expect(points.length).toBe(12)
  expect(points[0]?.x).toBe(3 / 16)
})

test('a scene with no marks, or no clicks yet, draws as it is', () => {
  expect(withMarks('<svg/>', 'project', TONES!, [{ x: 0.5, y: 0.5 }])).toBe('<svg/>')
  expect(withMarks('<svg/>', 'tide', TONES!, [])).toBe('<svg/>')
})

test('every shipped scene with a full set of marks stays under the size limit', () => {
  const points = Array.from({ length: 12 }, (_, at) => ({ x: at / 12, y: 0.5 }))

  for (const look of LOOKS) {
    const scene = resolveLook(look).value?.scene

    expect(withMarks(scene?.source ?? '', look.scene, scene?.tones ?? TONES!, points).length).toBeLessThan(131072)
  }
})

test('the settings can turn the sound, the style and the ripples off', { options: { sound: 'off', messageStyle: false, ripples: false } }, async ($, on) => {
  const seen = world(on, {}, { [PROJECT]: 'tide' })

  await $.session.start(START)
  const { text } = await $.command.run(typed())

  expect(seen.sets[0]?.sound).toBeUndefined()
  expect(seen.sets[0]?.style).toBeUndefined()
  expect(seen.sets[0]?.colors?.inputs.light?.['bg-user-message']).toBeUndefined()
  expect(sceneOf(seen.sets[0])).toBe('tide')
  expect(text).not.toContain('title bar')
  expect(text).toContain('Settings: sound off; message style off; marks on click on; ripples off.')

  const ui = await backdrop($, 'tide')

  expect(await ui.find({ type: 'Shader' })).toBeUndefined()
  expect(await ui.find({ type: 'Svg' })).toBeDefined()
  await ui.unmount()
})

test('cues alone keep the short sounds and leave out the ambience', { options: { sound: 'cues only' } }, async ($, on) => {
  const seen = world(on, {}, { [PROJECT]: 'night' })

  await $.session.start(START)

  expect(seen.sets[0]?.sound?.ambience).toBeUndefined()
  expect(seen.sets[0]?.sound?.cues).toEqual(SOUNDS.night?.cues)
})

test('the sound level scales every layer', { options: { soundLevel: 'quiet' } }, async ($, on) => {
  const seen = world(on, {}, { [PROJECT]: 'tide' })

  await $.session.start(START)
  const quiet = seen.sets[0]?.sound?.ambience?.layers[0]?.gain
  const usual = SOUNDS.tide?.ambience?.layers[0]?.gain ?? 0

  expect(Math.abs((quiet ?? 0) - usual / 2)).toBeLessThan(1e-9)
})

test('the defaults keep everything on, and /scene says so', async ($, on) => {
  world(on, {}, { [PROJECT]: 'circuit' })

  await $.session.start(START)
  const { text } = await $.command.run(typed())

  expect(text).toContain('Settings: sound on, normal; message style on; marks on click on; ripples on.')
})
