// The looks that ship with the plugin: each a scene and a palette made for it.
// To add one: draw a scene in hooks/scenes/, list it in SCENES, give it a sound
// in sounds.ts and a style in styles.ts under the scene's name, and add a look here.
import { aurora } from './scenes/aurora.js'
import { circuit } from './scenes/circuit.js'
import { desert } from './scenes/desert.js'
import { forest } from './scenes/forest.js'
import type { Scene } from './scenes/kit.js'
import { night } from './scenes/night.js'
import { paper } from './scenes/paper.js'
import { route } from './scenes/route.js'
import { terrain } from './scenes/terrain.js'
import { tide } from './scenes/tide.js'

/** Optional finer surfaces and text tones; left out, they follow `background` and `text`. */
type Anchor = 'surface-1' | 'surface-2' | 'surface-3' | 'text-secondary' | 'text-muted'

/** One mode's page and text, six-digit hex. */
export type ModeColors = { background: string; text: string } & Partial<Record<Anchor, string>>

export const ROLES = ['accent', 'danger', 'success', 'warning', 'pro'] as const;
export const ANCHORS = ['surface-1', 'surface-2', 'surface-3', 'text-secondary', 'text-muted'] as const;

type Role = (typeof ROLES)[number];

export type Palette = Record<Role, string> & { light: ModeColors; dark: ModeColors };

export type Look = {
  /** What `/scene <name>` and a project file's `look` take. */
  name: string
  title: string
  /** One line for the list. */
  blurb: string
  /** A key of SCENES. */
  scene: string
  palette: Palette
}

export const SCENES: Record<string, Scene> = { route, tide, night, circuit, terrain, forest, aurora, paper, desert }

export const LOOKS: readonly Look[] = [
  {
    name: 'tide',
    title: 'Tide',
    blurb: 'a slow sea swell and a small boat, in teal',
    scene: 'tide',
    palette: {
      accent: '#0e7c86',
      danger: '#c0392b',
      success: '#2e8b57',
      warning: '#d98e1f',
      pro: '#4a6fd0',
      light: {
        background: '#e6f0ef',
        'surface-1': '#eef5f4',
        'surface-2': '#f7fbfa',
        text: '#14282a',
        'text-secondary': '#3a5356',
        'text-muted': '#55696b',
      },
      dark: {
        background: '#0d1a1c',
        'surface-1': '#132427',
        'surface-2': '#182c30',
        'surface-3': '#1d3438',
        text: '#e3f1f0',
        'text-secondary': '#b9d0cf',
        'text-muted': '#93adac',
      },
    },
  },
  {
    name: 'night',
    title: 'Night sky',
    blurb: 'twinkling stars, constellations and a crescent moon, in indigo',
    scene: 'night',
    palette: {
      accent: '#5b6ee1',
      danger: '#d0455a',
      success: '#3f9b6c',
      warning: '#e0a93b',
      pro: '#b06fd8',
      light: {
        background: '#e9ebf6',
        'surface-1': '#f0f1f9',
        'surface-2': '#f8f8fc',
        text: '#171a30',
        'text-secondary': '#3d4160',
        'text-muted': '#585c7a',
      },
      dark: {
        background: '#0c0e1c',
        'surface-1': '#131629',
        'surface-2': '#191d33',
        'surface-3': '#1e233c',
        text: '#e8eaf8',
        'text-secondary': '#c0c4de',
        'text-muted': '#9a9fbf',
      },
    },
  },
  {
    name: 'circuit',
    title: 'Circuit',
    blurb: 'a circuit board with signals travelling its traces, in green',
    scene: 'circuit',
    palette: {
      accent: '#1f8a4c',
      danger: '#c8452f',
      success: '#2f8f6b',
      warning: '#c9951a',
      pro: '#2b8fb3',
      light: {
        background: '#e8f1ea',
        'surface-1': '#eff6f1',
        'surface-2': '#f8fbf8',
        text: '#15251b',
        'text-secondary': '#3b5143',
        'text-muted': '#56695c',
      },
      dark: {
        background: '#0c1710',
        'surface-1': '#122017',
        'surface-2': '#17281d',
        'surface-3': '#1c3023',
        text: '#e2f1e6',
        'text-secondary': '#b8d0bf',
        'text-muted': '#92ad9a',
      },
    },
  },
  {
    name: 'terrain',
    title: 'Terrain',
    blurb: 'a contour map with a trail between two summits, in warm earth',
    scene: 'terrain',
    palette: {
      accent: '#b4562a',
      danger: '#b8323a',
      success: '#5d8a3c',
      warning: '#c78a12',
      pro: '#7a5fa8',
      light: {
        background: '#f1eadf',
        'surface-1': '#f6f0e7',
        'surface-2': '#fbf8f2',
        text: '#2a2118',
        'text-secondary': '#54483a',
        'text-muted': '#6b5e4f',
      },
      dark: {
        background: '#1c1611',
        'surface-1': '#251d17',
        'surface-2': '#2d241d',
        'surface-3': '#352b22',
        text: '#f1e8da',
        'text-secondary': '#d0c3b1',
        'text-muted': '#ad9f8c',
      },
    },
  },
  {
    name: 'route',
    title: 'Route',
    blurb: 'a delivery van driving a city route, in violet',
    scene: 'route',
    palette: {
      accent: '#512bd4',
      danger: '#c0392b',
      success: '#2e8b57',
      warning: '#f7b548',
      pro: '#28c2d1',
      light: {
        background: '#ece9f5',
        'surface-1': '#f3f1f9',
        'surface-2': '#f9f8fc',
        text: '#1d1830',
        'text-secondary': '#463f5e',
        'text-muted': '#5f5878',
      },
      dark: {
        background: '#14111f',
        'surface-1': '#1b1729',
        'surface-2': '#221d33',
        'surface-3': '#29233c',
        text: '#ece8f7',
        'text-secondary': '#c6bfdc',
        'text-muted': '#a39bbd',
      },
    },
  },
  {
    name: 'forest',
    title: 'Forest',
    blurb: 'pines on misty ridges at dusk, with fireflies, in moss green',
    scene: 'forest',
    palette: {
      accent: '#4b7f2e',
      danger: '#b8452f',
      success: '#2f8a4f',
      warning: '#d6a12b',
      pro: '#5e7fa6',
      light: {
        background: '#ebf0e4',
        'surface-1': '#f1f5ec',
        'surface-2': '#f8faf5',
        text: '#1b2617',
        'text-secondary': '#3f4d39',
        'text-muted': '#5a6853',
      },
      dark: {
        background: '#0e140c',
        'surface-1': '#151d12',
        'surface-2': '#1a2417',
        'surface-3': '#202c1c',
        text: '#e5eedf',
        'text-secondary': '#bccbb4',
        'text-muted': '#97a88f',
      },
    },
  },
  {
    name: 'aurora',
    title: 'Aurora',
    blurb: 'northern lights swaying over a snowy ridge, in green and violet',
    scene: 'aurora',
    palette: {
      accent: '#178f7a',
      danger: '#c94a5a',
      success: '#2e9d5a',
      warning: '#e0a13c',
      pro: '#8e5fd0',
      light: {
        background: '#e8f0f2',
        'surface-1': '#eff5f6',
        'surface-2': '#f7fafb',
        text: '#13222a',
        'text-secondary': '#3a4d56',
        'text-muted': '#566870',
      },
      dark: {
        background: '#0a1018',
        'surface-1': '#111a24',
        'surface-2': '#16212d',
        'surface-3': '#1b2835',
        text: '#e2ecf3',
        'text-secondary': '#b9c9d6',
        'text-muted': '#93a6b5',
      },
    },
  },
  {
    name: 'paper',
    title: 'Paper',
    blurb: 'ink sketches on ruled paper: a sun, birds and hills, in sepia',
    scene: 'paper',
    palette: {
      accent: '#7a5230',
      danger: '#b23a2e',
      success: '#4d7f3a',
      warning: '#c98a1e',
      pro: '#3d5a8a',
      light: {
        background: '#f3eee3',
        'surface-1': '#f7f3ea',
        'surface-2': '#fbf9f4',
        text: '#2a2118',
        'text-secondary': '#51453a',
        'text-muted': '#6c6055',
      },
      dark: {
        background: '#17140f',
        'surface-1': '#1f1b15',
        'surface-2': '#26211a',
        'surface-3': '#2d271f',
        text: '#efe6d6',
        'text-secondary': '#cdc0ac',
        'text-muted': '#a89b87',
      },
    },
  },
  {
    name: 'desert',
    title: 'Desert',
    blurb: 'dunes under a low sun, heat shimmer and a caravan, in sand and terracotta',
    scene: 'desert',
    palette: {
      accent: '#b9772b',
      danger: '#c0392b',
      success: '#5a8a3e',
      warning: '#e0a13a',
      pro: '#b25a3c',
      light: {
        background: '#f5eadb',
        'surface-1': '#f8f0e4',
        'surface-2': '#fcf7f0',
        text: '#2c1f12',
        'text-secondary': '#56432f',
        'text-muted': '#715d47',
      },
      dark: {
        background: '#1b130b',
        'surface-1': '#231a10',
        'surface-2': '#2b2014',
        'surface-3': '#33271a',
        text: '#f2e6d3',
        'text-secondary': '#d4c2a6',
        'text-muted': '#ae9b80',
      },
    },
  },
]

export function lookNamed(name: string): Look | undefined {
  return LOOKS.find(look => look.name === name)
}
