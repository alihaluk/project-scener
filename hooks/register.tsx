import type { EngineInterface, PluginOptions, Register } from 'claude-code'

import { PROJECT_FILE, isSceneFile, parseProjectFile, resolveLook, resolveProjectFile, type Resolved } from './config.js'
import { LOOKS, lookNamed } from './looks.js'

/** The `$.store` key of the person's own picks: project folder to look name, or OFF. */
const PICKS = 'picks'
const OFF = 'off'

/** Where a project's look came from. */
type Source = 'pick' | 'file' | 'default' | 'off' | 'none'

type Found = { source: Source; look?: Resolved; problem?: string }

// What this mod last set: its key, and the scene the Backdrop hook draws.
// null = nothing of ours stands, so another mod's theme is left alone.
let applied: string | null = null
let scene: Resolved['scene']
let lastProblem: string | undefined

function tidy(path: string): string {
  return path.replaceAll('\\', '/').replace(/\/+$/, '')
}

/**
 * The folder a project's pick is kept under, and the folders its file may be in.
 * A git worktree shares its repository's pick, and falls back to its file.
 */
async function projectOf($: EngineInterface, dir: string): Promise<{ key: string; roots: string[] }> {
  const repo = await $.session.repo().catch(() => null)
  const key = tidy(repo?.root ?? dir)

  return { key, roots: [...new Set([tidy(dir), key])] }
}

async function picksOf($: EngineInterface): Promise<Record<string, string>> {
  const stored = await $.store.get(PICKS).catch(() => undefined)

  return typeof stored === 'object' && stored !== null ? (stored as Record<string, string>) : {}
}

async function fromFile($: EngineInterface, roots: string[]): Promise<Found | undefined> {
  for (const root of roots) {
    const path = `${root}/${PROJECT_FILE}`

    if (!(await $.fs.exists(path).catch(() => false))) {
      continue
    }
    const file = parseProjectFile(await $.fs.read(path))

    if (file.problem !== undefined) {
      return { source: 'file', problem: `${PROJECT_FILE}: ${file.problem}` }
    }
    const svg = isSceneFile(file.value.scene)
      ? await $.fs.read(`${root}/.claude/${file.value.scene}`).catch(() => undefined)
      : undefined

    if (isSceneFile(file.value.scene) && svg === undefined) {
      return { source: 'file', problem: `${PROJECT_FILE}: .claude/${file.value.scene} could not be read` }
    }
    const look = resolveProjectFile(file.value, svg)

    return look.problem === undefined
      ? { source: 'file', look: look.value }
      : { source: 'file', problem: `${PROJECT_FILE}: ${look.problem}` }
  }

  return undefined
}

/** The person's pick first, then the project's file, then their default look. */
async function find($: EngineInterface, dir: string, options: PluginOptions): Promise<Found> {
  const { key, roots } = await projectOf($, dir)
  const pick = (await picksOf($))[key]

  if (pick === OFF) {
    return { source: 'off' }
  }
  const picked = pick === undefined ? undefined : lookNamed(pick)

  if (picked !== undefined) {
    return { source: 'pick', look: resolveLook(picked).value }
  }
  const filed = await fromFile($, roots)

  if (filed !== undefined) {
    return filed
  }
  const usual = lookNamed(String(options.defaultLook ?? ''))

  return usual === undefined ? { source: 'none' } : { source: 'default', look: resolveLook(usual).value }
}

/** Sets the look of the project at `dir`, or takes this mod's own look down. */
async function apply($: EngineInterface, dir: string, options: PluginOptions): Promise<Found & { note?: string }> {
  const found = await find($, dir, options)
  const problem = found.problem ?? found.look?.warning

  if (problem !== undefined && problem !== lastProblem) {
    $.ui.toast(`project-scener: ${problem}`)
  }
  lastProblem = problem

  if (found.look === undefined) {
    if (applied !== null) {
      // Only ever our own look: a clear takes down whatever theme stands.
      await $.theme.clear()
      applied = null
      scene = undefined
    }

    return found
  }
  if (applied === found.look.key) {
    return found
  }
  scene = found.look.scene
  const set = await $.theme.set(found.look.args)
  applied = found.look.key

  return set.isDrawn ? found : { ...found, note: set.reason }
}

function describe(found: Found & { note?: string }): string {
  const where: Record<Source, string> = {
    pick: 'your pick',
    file: `from ${PROJECT_FILE}`,
    default: 'your default look',
    off: 'you turned it off',
    none: 'none picked yet',
  }
  const name = found.look?.label ?? (found.problem === undefined ? 'none' : 'none, because of a problem')
  const lines = [`This project's look: ${name} (${where[found.source]}).`]

  if (found.problem !== undefined) {
    lines.push(`Problem in ${found.problem}.`)
  }
  if (found.note !== undefined) {
    lines.push(`It is saved, but this window does not draw looks (${found.note}). The Claude desktop and mobile apps do.`)
  }

  return lines.join('\n')
}

// A look is decoration: whatever goes wrong here must never hold up a turn.
async function refresh($: EngineInterface, options: PluginOptions): Promise<void> {
  try {
    await apply($, await $.session.cwd(), options)
  } catch {
    // The next event tries again.
  }
}

const HELP = [
  'Looks:',
  ...LOOKS.map(look => `- \`${look.name}\`: ${look.blurb}`),
  '',
  '`/scene <look>` picks a look for this project, `/scene off` turns it off here, and `/scene reset` forgets your pick.',
  'To give a project a look of its own, ask Claude to "design a scene for this project".',
].join('\n')

export const register: Register = (on, options) => {
  on('session.start', async ($, e, next) => {
    await $.command
      .register({
        name: 'scene',
        description: "Pick this project's look: a moving backdrop with matching colors",
        argumentHint: '[look | off | reset]',
        immediate: true,
      })
      .catch(() => undefined)
    await refresh($, options)

    return next(e)
  })

  // The app may open a session in a spare folder and move it to the project
  // afterwards, so the folder is read again when a client attaches and at each turn.
  on('session.attach', async ($, e, next) => {
    await refresh($, options)

    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    await refresh($, options)

    return next(e)
  })

  on('command.run', { command: 'scene' }, async ($, e) => {
    const word = (e.args ?? '').trim().toLowerCase()
    const dir = await $.session.cwd()

    if (word !== '') {
      const picks = await picksOf($)
      const { key } = await projectOf($, dir)
      const { [key]: _, ...others } = picks

      if (word !== 'reset' && word !== OFF && lookNamed(word) === undefined) {
        return { text: `There is no look named "${word}".\n\n${HELP}` }
      }
      await $.store.set(PICKS, word === 'reset' ? others : { ...others, [key]: word })
    }
    const found = await apply($, dir, options)

    return { text: word === '' ? `${describe(found)}\n\n${HELP}` : describe(found) }
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if ((e.surface !== 'desktop' && e.surface !== 'mobile') || scene === undefined || e.props.scene !== scene.id) {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)

    return <Svg source={scene.source} alt={scene.alt} isInteractive />
  })
}
