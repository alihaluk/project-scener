import type { On, ThemeSetArgs } from 'claude-code'
import { expect, test } from 'claude-code/testing'

const PROJECT = '/work/shop'

type World = { sets: ThemeSetArgs[]; clears: number; toasts: string[]; store: Record<string, unknown> }

// Everything beneath the plugin: a project folder holding `files`, and a
// record of what the plugin asked the app to draw.
function world(on: On, files: Record<string, string> = {}, picks?: Record<string, string>): World {
  const seen: World = { sets: [], clears: 0, toasts: [], store: picks ? { picks } : {} }

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
