import type { EngineInterface, PluginOptions, Register, ThemeResult } from 'claude-code'

import {
  PROJECT_FILE,
  isSceneFile,
  parseProjectFile,
  resolveLook,
  resolveProjectFile,
  settingsOf,
  withSettings,
  type Resolved,
  type Settings,
} from './config.js'
import { LOOKS, lookNamed } from './looks.js'
import { fractions, type ScenePalette } from './scenes/kit.js'

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
  const first = await find($, dir, options)
  // The person's settings say how much of the look's sound and style to send.
  const found = first.look === undefined ? first : { ...first, look: withSettings(first.look, settingsOf(options)) }
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

function onOff(value: boolean): string {
  return value ? 'on' : 'off'
}

/** The person's settings in one line, and where they change them. */
function settingsLine(settings: Settings): string {
  const sound = settings.sound === 'off' ? 'off' : `${settings.sound}, ${settings.level}`

  return (
    `Settings: sound ${sound}; message style ${onOff(settings.messageStyle)}; ` +
    `ripples ${onOff(settings.ripples)}. ` +
    'Change one with `/scene <setting> <value>`, like `/scene ripples off`.'
  )
}

/** A plugin option that `/scene <setting> <value>` changes, and the words it takes. */
type Option = { field: string; label: string; values: Record<string, string | boolean> }

const ON_OFF = { on: true, off: false }

/** By the word after `/scene`. Each is a field of the plugin's `userConfig`. */
const OPTIONS: Record<string, Option> = {
  sound: { field: 'sound', label: 'Sound', values: { on: 'on', cues: 'cues only', 'cues only': 'cues only', off: 'off' } },
  level: { field: 'soundLevel', label: 'Sound level', values: { quiet: 'quiet', normal: 'normal', loud: 'loud' } },
  style: { field: 'messageStyle', label: 'Message style', values: ON_OFF },
  ripples: { field: 'ripples', label: 'Ripples', values: ON_OFF },
  default: {
    field: 'defaultLook',
    label: 'Default look',
    values: Object.fromEntries(['none', ...LOOKS.map(look => look.name)].map(name => [name, name])),
  },
}

function has<T>(record: Record<string, T>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key)
}

/** What a field holds now, as the plugin reads it. */
function valueOf(field: string, options: PluginOptions): string | boolean {
  const settings = settingsOf(options)
  const now: Record<string, string | boolean> = {
    sound: settings.sound,
    soundLevel: settings.level,
    messageStyle: settings.messageStyle,
    ripples: settings.ripples,
    defaultLook: lookNamed(String(options.defaultLook ?? ''))?.name ?? 'none',
  }

  return now[field] ?? ''
}

/** The `/config` row of one of this plugin's fields, or undefined where the build has none. */
async function rowOf($: EngineInterface, field: string): Promise<string | undefined> {
  let rows: Awaited<ReturnType<EngineInterface['config']['list']>> = []

  try {
    rows = await $.config.list()
  } catch {
    // A build with no settings menu for plugins: nothing to change here.
  }
  // `project-scener.<field>`, or with the marketplace's name after an `@`.
  const ours = rows.filter(row => /^project-scener(@[^.]+)?\./.test(row.key) && row.key.endsWith(`.${field}`))

  return (ours.find(row => row.key === `project-scener.${field}`) ?? ours[0])?.key
}

/**
 * `/scene <setting> <value>`: writes the plugin's option as `/config` would,
 * so it holds for every project and session. Answers what to say, and the
 * options as they now stand when it changed one.
 */
async function setOption(
  $: EngineInterface,
  name: string,
  word: string,
  options: PluginOptions,
): Promise<{ text: string; options?: PluginOptions }> {
  const option = OPTIONS[name] as Option
  const words = Object.keys(option.values).filter(key => key !== 'cues only')
  const now = valueOf(option.field, options)
  const shown = words.find(key => option.values[key] === now) ?? String(now)

  if (!has(option.values, word)) {
    const asked = word === '' ? '' : `"${word}" is not one of them. `

    return { text: `${option.label} is ${shown}. \`/scene ${name}\` takes: ${words.join(', ')}. ${asked}`.trim() }
  }
  const value = option.values[word] as string | boolean
  const key = await rowOf($, option.field)

  if (key === undefined) {
    return {
      text: `This Claude Code can't change the plugin's options from a command. Change ${option.label} in \`/config\` in a terminal session.`,
    }
  }
  const result = await $.config.set({ key, value }).catch((error: unknown) => ({
    deny: error instanceof Error ? error.message : String(error),
  }))

  if (result.deny !== undefined) {
    return { text: `${option.label} stays ${shown}: ${result.deny}` }
  }

  return { text: `${option.label}: ${word}, for every project.`, options: { ...options, [option.field]: value } }
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
  '',
  'Settings, for every project:',
  '- `/scene sound on|cues|off`: the look\'s sound, its short cues alone, or none',
  '- `/scene level quiet|normal|loud`: how loud it is',
  "- `/scene style on|off`: your messages in the look's own bubbles",
  '- `/scene ripples on|off`: a ripple where you press it',
  '- `/scene default <look>|none`: the look of projects you have not picked one for',
].join('\n')

export const register: Register = (on, initial) => {
  // A change of the plugin's options loads the module again with the new ones.
  // `/scene <setting> <value>` also takes them up here at once, should it not.
  let options = initial
  let settings = settingsOf(options)

  on('session.start', async ($, e, next) => {
    await $.command
      .register({
        name: 'scene',
        description: "Pick this project's look: a moving backdrop with matching colors",
        argumentHint: '[look | off | reset | <setting> <value>]',
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
    const [name = '', ...rest] = word.split(/\s+/)
    const dir = await $.session.cwd()

    if (has(OPTIONS, name)) {
      const changed = await setOption($, name, rest.join(' '), options)

      if (changed.options === undefined) {
        return { text: changed.text }
      }
      options = changed.options
      settings = settingsOf(options)
      // The look again with its sound and style as now set, and the backdrop
      // again for the ripples.
      await apply($, dir, options, true).catch(() => undefined)
      $.ui.invalidate('ui.render')

      return { text: `${changed.text}\n${settingsLine(settings)}` }
    }
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
    const said =
      `${describe(found)}\nThis session is open on: ${surfaces.length === 0 ? 'nothing that draws' : surfaces.join(', ')}.\n` +
      settingsLine(settings)

    return { text: word === '' ? `${said}\n\n${HELP}` : said }
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if ((e.surface !== 'desktop' && e.surface !== 'mobile') || scene === undefined || e.props.scene !== scene.id) {
      return next(e)
    }
    const { Shader, Svg } = $.ui.resolve(e)
    const { ripple, tones } = scene
    const svg = <Svg source={scene.source} alt={scene.alt} isInteractive />
    const tint = tones && ripple !== undefined && settings.ripples ? tintOf(tones) : undefined

    // With ripples off, for a look with no ripple, or on a build older than
    // 2.1.326 that has no Shader: the Svg alone, which is also what any surface
    // shows when its shader cannot play. A shipped scene's ripple can also play
    // over a project's own art, in the project's colors. A press needs no hook: the app plays the
    // ripple on the GPU as it lands, and the scene is never sent again for it.
    if (tint === undefined || (Shader as typeof Shader | undefined) === undefined) {
      return svg
    }
    // Each module is a literal in its element, as the engine reads it off the source.
    switch (ripple) {
      case 'tide':
        return <Shader module="./shaders/tide.ts" values={tint}>{svg}</Shader>
      case 'night':
        return <Shader module="./shaders/night.ts" values={tint}>{svg}</Shader>
      case 'circuit':
        return <Shader module="./shaders/circuit.ts" values={tint}>{svg}</Shader>
      case 'terrain':
        return <Shader module="./shaders/terrain.ts" values={tint}>{svg}</Shader>
      case 'route':
        return <Shader module="./shaders/route.ts" values={tint}>{svg}</Shader>
      default:
        return svg
    }
  })
}

/** A scene's accent in light and in dark mode, as its shader's `values` take it. */
function tintOf({ light, dark }: ScenePalette): Record<'r' | 'g' | 'b' | 'dr' | 'dg' | 'db', number> {
  const [r, g, b] = fractions(light.a)
  const [dr, dg, db] = fractions(dark.a)

  return { r, g, b, dr, dg, db }
}
