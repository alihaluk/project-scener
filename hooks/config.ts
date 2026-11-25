// Turns a built-in look, or a project's `.claude/scene.json`, into what
// `$.theme.set` takes. No engine calls here: register.tsx reads the files.
import type { PluginOptions, ThemeColorInputs, ThemeColors, ThemeSetArgs, ThemeSound, ThemeStyle } from 'claude-code'

import { ANCHORS, LOOKS, ROLES, SCENES, lookNamed, type Look, type ModeColors, type Palette } from './looks.js'
import { makeColors } from './make-colors.js'
import { contrast, mix, type ScenePalette } from './scenes/kit.js'
import { SOUNDS } from './sounds.js'
import { STYLES } from './styles.js'

/** Where a project keeps its look, under the project's root. */
export const PROJECT_FILE = '.claude/scene.json'

/** The most characters a surface draws as one scene. */
const SCENE_LIMIT = 131072

const HEX = /^#[0-9a-f]{6}$/i
const GLASS = { blur: 18, opacity: 0.62 }

type Glass = { blur?: number; opacity?: number; tint?: string } | false

/** A project file once read: every field checked, none filled in. */
export type ProjectFile = {
  look?: Look
  label?: string
  /** A built-in scene's name, `none`, or the path of an SVG beside the file. */
  scene?: string
  alt?: string
  colors?: Partial<Omit<Palette, 'light' | 'dark'>> & { light?: ModeColors; dark?: ModeColors }
  glass?: Glass
  /** A shipped scene's sound, the file's own, or `false` for none. */
  sound?: ThemeSound | false
  /** A shipped scene's message style, the file's own, or `false` for the app's own. */
  style?: ThemeStyle | false
  /** The file wrote a sound or a style of its own, so a refusal is its author's to fix. */
  ownSoundOrStyle?: true
}

/** A look ready to set, and what draws its scene. */
export type Resolved = {
  /** Changes whenever what would be drawn does. */
  key: string
  label: string
  args: ThemeSetArgs
  /** `tones` is a shipped scene's colors, which its marks and shader draw in too. */
  scene?: { id: string; source: string; alt: string; tones?: ScenePalette }
  /** Why Desktop would refuse to paint the colors, when it would. */
  warning?: string
  /** As in ProjectFile: a refused sound or style is the project file's to fix. */
  ownSoundOrStyle?: true
}

export type Parsed<T> = { value: T; problem?: undefined } | { value?: undefined; problem: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isHex(value: unknown): value is string {
  return typeof value === 'string' && HEX.test(value)
}

function modeOf(value: unknown, name: string): Parsed<ModeColors | undefined> {
  if (value === undefined) {
    return { value: undefined }
  }
  if (!isRecord(value) || !isHex(value.background) || !isHex(value.text)) {
    return { problem: `the "${name}" colors need "background" and "text", each six-digit hex like "#1a2b3c"` }
  }
  const mode: ModeColors = { background: value.background, text: value.text }

  for (const anchor of ANCHORS) {
    const color = value[anchor]

    if (color !== undefined && !isHex(color)) {
      return { problem: `"${anchor}" in the "${name}" colors must be six-digit hex like "#1a2b3c"` }
    }
    if (color !== undefined) {
      mode[anchor] = color
    }
  }

  return { value: mode }
}

function colorsOf(value: unknown): Parsed<ProjectFile['colors']> {
  if (value === undefined) {
    return { value: undefined }
  }
  if (!isRecord(value)) {
    return { problem: '"colors" must be an object, like { "accent": "#0e7c86" }' }
  }
  const colors: NonNullable<ProjectFile['colors']> = {}

  for (const role of ROLES) {
    const color = value[role]

    if (color !== undefined && !isHex(color)) {
      return { problem: `the "${role}" color must be six-digit hex like "#1a2b3c"` }
    }
    if (color !== undefined) {
      colors[role] = color
    }
  }
  const light = modeOf(value.light, 'light')
  const dark = modeOf(value.dark, 'dark')

  if (light.problem !== undefined || dark.problem !== undefined) {
    return { problem: light.problem ?? dark.problem ?? '' }
  }

  return { value: { ...colors, ...(light.value && { light: light.value }), ...(dark.value && { dark: dark.value }) } }
}

function glassOf(value: unknown): Parsed<Glass | undefined> {
  if (value === undefined || value === false) {
    return { value }
  }
  if (!isRecord(value)) {
    return { problem: '"glass" must be false or an object, like { "blur": 18, "opacity": 0.6 }' }
  }
  const { blur, opacity, tint } = value

  if (blur !== undefined && (typeof blur !== 'number' || blur < 0 || blur > 100)) {
    return { problem: 'glass.blur must be a number from 0 to 100' }
  }
  if (opacity !== undefined && (typeof opacity !== 'number' || opacity < 0 || opacity > 1)) {
    return { problem: 'glass.opacity must be a number from 0 to 1' }
  }
  if (tint !== undefined && !isHex(tint)) {
    return { problem: 'glass.tint must be six-digit hex like "#1a2b3c"' }
  }

  return {
    value: {
      ...(typeof blur === 'number' && { blur }),
      ...(typeof opacity === 'number' && { opacity }),
      ...(isHex(tint) && { tint }),
    },
  }
}

/**
 * A `sound` or `style` field: a shipped scene's name, `"none"` or `false`, or an
 * object of the file's own. The app checks an object's values when the look is
 * set, and says what to change.
 */
function extraOf<T>(value: unknown, field: string, shipped: Record<string, T>): Parsed<T | false | undefined> {
  const names = `${Object.keys(shipped).join(', ')}, none`

  if (value === undefined) {
    return { value: undefined }
  }
  if (value === false || value === 'none') {
    return { value: false }
  }
  if (typeof value === 'string') {
    const named = shipped[value]

    return named === undefined ? { problem: `"${field}" must be one of: ${names}, or an object of its own` } : { value: named }
  }

  return isRecord(value) ? { value: value as T } : { problem: `"${field}" must be one of: ${names}, or an object of its own` }
}

/** Whether a project file's `scene` names an SVG file and not a built-in scene. */
export function isSceneFile(scene: string | undefined): scene is string {
  return scene !== undefined && scene.toLowerCase().endsWith('.svg')
}

/** Reads the text of a `.claude/scene.json`, saying in one line what is wrong with it. */
export function parseProjectFile(text: string): Parsed<ProjectFile> {
  let data: unknown

  try {
    data = JSON.parse(text)
  } catch {
    return { problem: 'it is not valid JSON' }
  }
  if (!isRecord(data)) {
    return { problem: 'it must hold an object, like { "look": "tide" }' }
  }
  const names = LOOKS.map(look => look.name).join(', ')
  const look = typeof data.look === 'string' ? lookNamed(data.look) : undefined

  if (data.look !== undefined && look === undefined) {
    return { problem: `"look" must be one of: ${names}` }
  }
  for (const field of ['label', 'scene', 'alt'] as const) {
    if (data[field] !== undefined && (typeof data[field] !== 'string' || data[field] === '')) {
      return { problem: `"${field}" must be text` }
    }
  }
  const scene = typeof data.scene === 'string' ? data.scene : undefined

  if (isSceneFile(scene) && (/^([/\\]|[a-z]:)/i.test(scene) || scene.split(/[/\\]/).includes('..'))) {
    return { problem: '"scene" must be an SVG file inside the .claude folder, like "scene.svg"' }
  }
  if (scene !== undefined && !isSceneFile(scene) && scene !== 'none' && SCENES[scene] === undefined) {
    return { problem: `"scene" must be one of: ${Object.keys(SCENES).join(', ')}, none, or an SVG file like "scene.svg"` }
  }
  const colors = colorsOf(data.colors)
  const glass = glassOf(data.glass)
  const sound = extraOf(data.sound, 'sound', SOUNDS)
  const style = extraOf(data.style, 'style', STYLES)

  if (colors.problem !== undefined || glass.problem !== undefined || sound.problem !== undefined || style.problem !== undefined) {
    return { problem: colors.problem ?? glass.problem ?? sound.problem ?? style.problem ?? '' }
  }
  if (look === undefined && scene === undefined && colors.value === undefined) {
    return { problem: `it needs a "look" (${names}), a "scene" or "colors"` }
  }
  const label = typeof data.label === 'string' ? data.label.slice(0, 64) : undefined
  const alt = typeof data.alt === 'string' ? data.alt : undefined

  return {
    value: {
      ...(look && { look }),
      ...(label !== undefined && { label }),
      ...(scene !== undefined && { scene }),
      ...(alt !== undefined && { alt }),
      ...(colors.value && { colors: colors.value }),
      ...(glass.value !== undefined && { glass: glass.value }),
      ...(sound.value !== undefined && { sound: sound.value }),
      ...(style.value !== undefined && { style: style.value }),
      ...((isRecord(data.sound) || isRecord(data.style)) && { ownSoundOrStyle: true as const }),
    },
  }
}

/** A whole palette from as little as an accent: quiet grays tinted toward it. */
function paletteFrom(colors: ProjectFile['colors'], base: Palette | undefined): Palette {
  const accent = colors?.accent ?? base?.accent ?? '#5b6ee1'
  const plain: Palette = base ?? {
    accent,
    danger: '#c0392b',
    success: '#2e8b57',
    warning: '#d9930d',
    pro: '#6d4f94',
    light: { background: mix('#f1f1ef', accent, 0.05), text: mix('#1c1c1c', accent, 0.08) },
    dark: { background: mix('#141414', accent, 0.07), text: mix('#ececec', accent, 0.05) },
  }

  return { ...plain, ...colors, light: colors?.light ?? plain.light, dark: colors?.dark ?? plain.dark }
}

function anchorsOf(mode: ModeColors) {
  const { background, text, ...rest } = mode

  return {
    gray: {
      anchors: {
        'surface-0': background,
        'text-primary': text,
        // Quieter text the design system would otherwise set too faint to paint.
        'text-secondary': mix(text, background, 0.16),
        'text-muted': mix(text, background, 0.28),
        ...rest,
      },
    },
  }
}

function tonesOf(palette: Palette): ScenePalette {
  return {
    light: { bg: palette.light.background, ink: palette.light.text, a: palette.accent, b: palette.pro, c: palette.warning },
    dark: {
      bg: palette.dark.background,
      ink: palette.dark.text,
      // A hue deep enough for a light page is too dim on a dark one.
      a: mix(palette.accent, '#ffffff', 0.28),
      b: mix(palette.pro, '#ffffff', 0.2),
      c: palette.warning,
    },
  }
}

function hash(text: string): string {
  let sum = 5381

  for (let at = 0; at < text.length; at++) {
    sum = (sum * 33 + text.charCodeAt(at)) >>> 0
  }

  return sum.toString(36)
}

type Hex = `#${string}`

/**
 * The person's bubble in one mode: the page tinted toward the accent, only as
 * far as its words stay at 7:1 or better.
 */
function bubbleOf(mode: ModeColors, accent: string): Record<'bg-user-message' | 'text-user-message', Hex> {
  const tinted = [0.16, 0.12, 0.08, 0.04]
    .map(amount => mix(mode.background, accent, amount))
    .find(color => contrast(color, mode.text) >= 7)

  return { 'bg-user-message': (tinted ?? mode.background) as Hex, 'text-user-message': mode.text as Hex }
}

/**
 * The palette with the person's bubble colors added, which makeColors doesn't
 * take, for a look with a `style`. They color the bubble even where a build
 * draws no `style`; a build that doesn't know them leaves them be.
 */
function withBubbles(theme: ThemeColors, palette: Palette): ThemeColors {
  const tones = tonesOf(palette)

  return {
    ...theme,
    inputs: {
      light: { ...theme.inputs.light, ...bubbleOf(palette.light, tones.light.a) },
      dark: { ...theme.inputs.dark, ...bubbleOf(palette.dark, tones.dark.a) },
    },
  }
}

type Drawing = {
  label: string
  palette: Palette
  scene?: Resolved['scene']
  glass?: Glass
  sound?: ThemeSound | false
  style?: ThemeStyle | false
  ownSoundOrStyle?: true
}

function build(key: string, { label, palette, scene, glass, sound, style, ownSoundOrStyle }: Drawing): Parsed<Resolved> {
  let colors: ReturnType<typeof makeColors>

  try {
    colors = makeColors({
      label,
      roles: {
        accent: palette.accent,
        danger: palette.danger,
        success: palette.success,
        warning: palette.warning,
        pro: palette.pro,
      },
      light: anchorsOf(palette.light),
      dark: anchorsOf(palette.dark),
    })
  } catch (error) {
    return { problem: error instanceof Error ? error.message : 'its colors could not be used' }
  }
  const warning = colors.problems.find(line => line.startsWith("Desktop won't paint"))

  return {
    value: {
      key,
      label,
      args: {
        // The bubble colors color the bubble with no style too, so a look without one keeps the app's.
        colors: style ? withBubbles(colors.theme, palette) : colors.theme,
        ...(scene && { backdrop: { scene: scene.id, glass: glass === false ? false : { ...GLASS, ...glass } } }),
        ...(sound && { sound }),
        ...(style && { style }),
      },
      ...(scene && { scene }),
      ...(warning !== undefined && { warning }),
      ...(ownSoundOrStyle && { ownSoundOrStyle }),
    },
  }
}

function drawn(name: string, palette: Palette, alt?: string): Resolved['scene'] {
  const scene = SCENES[name]

  const tones = tonesOf(palette)

  return scene && { id: name, source: scene.draw(tones), alt: alt ?? scene.alt, tones }
}

/** A look that ships with the plugin, ready to set. */
export function resolveLook(look: Look): Parsed<Resolved> {
  return build(`look:${look.name}`, {
    label: look.title,
    palette: look.palette,
    scene: drawn(look.scene, look.palette),
    sound: SOUNDS[look.scene],
    style: STYLES[look.scene],
  })
}

/**
 * A project file's look, ready to set.
 *
 * @param svg the text of the file `scene` names, when it names one
 */
export function resolveProjectFile(file: ProjectFile, svg?: string): Parsed<Resolved> {
  const palette = paletteFrom(file.colors, file.look?.palette)
  const label = file.label ?? file.look?.title ?? 'Project look'
  const key = `file:${hash(JSON.stringify([file.look?.name, file, svg]))}`
  const name = file.scene ?? file.look?.scene
  // A shipped scene brings its own sound and style; art of the project's own takes the look's.
  const kin = name !== undefined && SCENES[name] !== undefined ? name : file.look?.scene
  const extras = {
    sound: file.sound ?? (kin === undefined ? undefined : SOUNDS[kin]),
    style: file.style ?? (kin === undefined ? undefined : STYLES[kin]),
    ...(file.ownSoundOrStyle && { ownSoundOrStyle: file.ownSoundOrStyle }),
  }

  if (isSceneFile(name)) {
    const source = (svg ?? '').trim()

    if (!/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(source)) {
      return { problem: `${name} is not an SVG: it must start with <svg` }
    }
    if (source.length > SCENE_LIMIT) {
      return { problem: `${name} is ${source.length} characters, and a scene can be ${SCENE_LIMIT} at most` }
    }

    return build(key, { label, palette, scene: { id: 'project', source, alt: file.alt ?? label }, glass: file.glass, ...extras })
  }

  return build(key, {
    label,
    palette,
    scene: name === undefined || name === 'none' ? undefined : drawn(name, palette, file.alt),
    glass: file.glass,
    ...extras,
  })
}

/** The person's own settings, from the plugin's options. */
export type Settings = {
  sound: 'on' | 'cues only' | 'off'
  /** How loud, beside the looks' own levels: a factor on every layer's gain. */
  level: 'quiet' | 'normal' | 'loud'
  messageStyle: boolean
  clickMarks: boolean
  ripples: boolean
}

const LEVELS: Record<Settings['level'], number> = { quiet: 0.5, normal: 1, loud: 2 }

function oneOf<T extends string>(value: unknown, values: readonly T[], fallback: T): T {
  return values.find(known => known === value) ?? fallback
}

/** The settings in `options`, each one left unset or unknown at its default. */
export function settingsOf(options: PluginOptions): Settings {
  return {
    sound: oneOf(options.sound, ['on', 'cues only', 'off'] as const, 'on'),
    level: oneOf(options.soundLevel, ['quiet', 'normal', 'loud'] as const, 'normal'),
    messageStyle: options.messageStyle !== false,
    clickMarks: options.clickMarks !== false,
    ripples: options.ripples !== false,
  }
}

type Part = { layers: readonly { gain?: number }[] }

/** A part of a sound with every layer's gain times `level`, at most 1. */
function scaled<T extends Part>(part: T, level: number): T {
  return level === 1 ? part : { ...part, layers: part.layers.map(layer => ({ ...layer, gain: Math.min(1, (layer.gain ?? 0.5) * level) })) }
}

/** A look's sound as the person set it: whole, its cues alone or none, at their level. */
function heard(sound: ThemeSound, { sound: mode, level }: Settings): ThemeSound | undefined {
  const factor = LEVELS[level]
  const cues = Object.fromEntries(
    Object.entries(sound.cues ?? {}).flatMap(([moment, cue]) => (cue === undefined ? [] : [[moment, scaled(cue, factor)]])),
  ) as NonNullable<ThemeSound['cues']>
  const ambience = mode === 'on' && sound.ambience !== undefined ? scaled(sound.ambience, factor) : undefined
  const hasCues = Object.keys(cues).length > 0

  if (mode === 'off' || (ambience === undefined && !hasCues)) {
    return undefined
  }

  return { ...(ambience && { ambience }), ...(hasCues && { cues }) }
}

const BUBBLE_COLORS = ['bg-user-message', 'text-user-message']

/** The palette without the bubble colors, which color messages even with no style. */
function withoutBubbles(colors: ThemeColors): ThemeColors {
  const plain = (mode: ThemeColorInputs | undefined) =>
    mode && (Object.fromEntries(Object.entries(mode).filter(([token]) => !BUBBLE_COLORS.includes(token))) as ThemeColorInputs)

  return { ...colors, inputs: { light: plain(colors.inputs.light), dark: plain(colors.inputs.dark) } }
}

/** A look as the person's settings have it: its sound and its message style kept, changed or left out. */
export function withSettings(look: Resolved, settings: Settings): Resolved {
  const { sound, style, colors, ...rest } = look.args
  const kept = sound && heard(sound, settings)
  const styled = settings.messageStyle ? style : undefined

  return {
    ...look,
    args: {
      ...rest,
      ...(colors && { colors: styled ? colors : withoutBubbles(colors) }),
      ...(kept && { sound: kept }),
      ...(styled && { style: styled }),
    },
  }
}
