// Turns a built-in look, or a project's `.claude/scene.json`, into what
// `$.theme.set` takes. No engine calls here: register.tsx reads the files.
import type { ThemeSetArgs } from 'claude-code'

import { ANCHORS, LOOKS, ROLES, SCENES, lookNamed, type Look, type ModeColors, type Palette } from './looks.js'
import { makeColors } from './make-colors.js'
import { mix, type ScenePalette } from './scenes/kit.js'

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
}

/** A look ready to set, and what draws its scene. */
export type Resolved = {
  /** Changes whenever what would be drawn does. */
  key: string
  label: string
  args: ThemeSetArgs
  scene?: { id: string; source: string; alt: string }
  /** Why Desktop would refuse to paint the colors, when it would. */
  warning?: string
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

  if (colors.problem !== undefined || glass.problem !== undefined) {
    return { problem: colors.problem ?? glass.problem ?? '' }
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

type Drawing = { label: string; palette: Palette; scene?: Resolved['scene']; glass?: Glass }

function build(key: string, { label, palette, scene, glass }: Drawing): Parsed<Resolved> {
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
        colors: colors.theme,
        ...(scene && { backdrop: { scene: scene.id, glass: glass === false ? false : { ...GLASS, ...glass } } }),
      },
      ...(scene && { scene }),
      ...(warning !== undefined && { warning }),
    },
  }
}

function drawn(name: string, palette: Palette, alt?: string): Resolved['scene'] {
  const scene = SCENES[name]

  return scene && { id: name, source: scene.draw(tonesOf(palette)), alt: alt ?? scene.alt }
}

/** A look that ships with the plugin, ready to set. */
export function resolveLook(look: Look): Parsed<Resolved> {
  return build(`look:${look.name}`, { label: look.title, palette: look.palette, scene: drawn(look.scene, look.palette) })
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

  if (isSceneFile(name)) {
    const source = (svg ?? '').trim()

    if (!/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(source)) {
      return { problem: `${name} is not an SVG: it must start with <svg` }
    }
    if (source.length > SCENE_LIMIT) {
      return { problem: `${name} is ${source.length} characters, and a scene can be ${SCENE_LIMIT} at most` }
    }

    return build(key, { label, palette, scene: { id: 'project', source, alt: file.alt ?? label }, glass: file.glass })
  }

  return build(key, {
    label,
    palette,
    scene: name === undefined || name === 'none' ? undefined : drawn(name, palette, file.alt),
    glass: file.glass,
  })
}
