import type { EngineInterface, PluginOptions, Register, ThemeResult } from 'claude-code'

import { PROJECT_FILE, isSceneFile, parseProjectFile, resolveLook, resolveProjectFile, type Resolved } from './config.js'
import { LOOKS, lookNamed } from './looks.js'

/** The `$.store` key of the person's own picks: project folder to look name, or OFF. */
const PICKS = 'picks'
const OFF = 'off'

/** Where a project's look came from. */
type Source = 'pick' | 'file' | 'default' | 'off' | 'none'

type Found = { source: Source; look?: Resolved; problem?: string }

type Extra = 'sound' | 'style'

/** What a set left out, and the app's reason, in its own words. */
type Dropped = { what: Extra[]; why: string }

/** What came of a set: a client's note when none draws it, and what was left out. */
type Outcome = Found & { note?: string; dropped?: Dropped }

// What this mod last set: its key, and the scene the Backdrop hook draws.
// null = nothing of ours stands, so another mod's theme is left alone.
let applied: string | null = null
let scene: Resolved['scene']
let lastProblem: string | undefined
let lastDropped: string | undefined

/** "sound", "message style", or both, for a sentence. */
function named(what: Extra[]): string {
  return what.map(extra => (extra === 'sound' ? 'sound' : 'message style')).join(' and ')
}

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

/**
 * Sets a look. A build that doesn't take `sound` or `style`, or a value out of
 * range or too costly, refuses the whole set, so the look is set again without
 * the sound, then without the style, then without both: the colors and the
 * scene still draw.
 */
async function setLook($: EngineInterface, look: Resolved): Promise<{ set: ThemeResult; dropped?: Dropped }> {
  const { sound, style, ...plain } = look.args
  const present: Extra[] = [...(sound ? (['sound'] as const) : []), ...(style ? (['style'] as const) : [])]
  const one: Extra[][] = present.length === 2 ? [['sound'], ['style']] : []
  const tries: Extra[][] = [[], ...one, ...(present.length > 0 ? [present] : [])]
  let first: unknown
  let refusal: unknown

  for (const what of tries) {
    try {
      const set = await $.theme.set({
        ...plain,
        ...(sound && !what.includes('sound') && { sound }),
        ...(style && !what.includes('style') && { style }),
      })

      return what.length === 0 ? { set } : { set, dropped: { what, why: reasonOf(refusal) } }
    } catch (error) {
      // The refusal just before the try that works names what that try left out.
      first ??= error
      refusal = error
    }
  }

  throw first
}

/** The app's reason for refusing a set, without the call's own name around it. */
function reasonOf(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error)

  return text.replace(/^[\w.-]+: (\$\.)?theme\.set: /, '').replace(/ \(host check\)$/, '')
}

/** Sets the look of the project at `dir`, or takes this mod's own look down. */
async function apply($: EngineInterface, dir: string, options: PluginOptions, again = false): Promise<Outcome> {
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
      lastDropped = undefined
    }

    return found
  }
  // `again` sends the same look once more, for a client that has just attached.
  if (applied === found.look.key && !again) {
    return found
  }
  scene = found.look.scene
  const { set, dropped } = await setLook($, found.look)

  applied = found.look.key

  // Only a project file's own sound or style is worth a toast: its author can fix it.
  // A build too old for sound or style is not theirs to fix, so it raises none.
  const said = dropped && `its ${named(dropped.what)} ${dropped.what.length > 1 ? 'were' : 'was'} left out: ${dropped.why}`
  const isOld = dropped !== undefined && /does not know the attribute/.test(dropped.why)

  if (said !== undefined && found.look.ownSoundOrStyle && !isOld && said !== lastDropped) {
    $.ui.toast(`project-scener: ${PROJECT_FILE}: ${said}`)
  }
  lastDropped = said

  return { ...found, ...(!set.isDrawn && { note: set.reason }), ...(dropped !== undefined && { dropped }) }
}

function describe(found: Outcome): string {
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
    lines.push(`It is saved, but nothing that draws looks has this session open (${found.note}).`)
  }
  const { what = [], why } = found.dropped ?? {}

  if (why !== undefined) {
    const name = named(what)

    lines.push(`Its ${name} ${what.length > 1 ? 'were' : 'was'} left out: ${why}`)
  }
  if (found.look?.args.sound !== undefined && !what.includes('sound')) {
    lines.push("It has a sound: in the desktop app, the speaker in the session's title bar turns it on.")
  }

  return lines.join('\n')
}

// A look is decoration: whatever goes wrong here must never hold up a turn.
async function refresh($: EngineInterface, options: PluginOptions, again = false): Promise<void> {
  try {
    await apply($, await $.session.cwd(), options, again)
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
  // A client that joins a session already running is sent the look again.
  on('session.attach', async ($, e, next) => {
    const joined = await next(e)

    await refresh($, options, true)

    return joined
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
    const found = await apply($, dir, options, true)
    const surfaces = await $.session.surfaces().catch(() => [])
    const said = `${describe(found)}\nThis session is open on: ${surfaces.length === 0 ? 'nothing that draws' : surfaces.join(', ')}.`

    return { text: word === '' ? `${said}\n\n${HELP}` : said }
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if ((e.surface !== 'desktop' && e.surface !== 'mobile') || scene === undefined || e.props.scene !== scene.id) {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)

    return <Svg source={scene.source} alt={scene.alt} isInteractive />
  })
}
