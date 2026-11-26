---
name: design-scene
description: Design a custom look for the current project with the project-scener plugin - a moving SVG backdrop and matching colors, with a sound, a message style and a ripple on click, saved in the project's .claude folder. Use when the person asks to design, make, create or change a scene, backdrop, look or theme for this project, or to give the project its own colors, sound or message style.
---

# Design a scene for this project

The project-scener plugin draws a look behind the conversation in the Claude desktop app. A project gets a look of its own from two files in its `.claude` folder, which you write:

- `.claude/scene.json`: the colors, and which scene to draw
- `.claude/scene.svg`: the scene, when the project has its own art

The plugin reads them at the start of every turn, so a change shows on the person's next message, or at once when they run `/scene`. Committed to the repository, the look reaches everyone on the team who has the plugin.

## 1. Find what the project looks like

Before drawing, look for the project's own identity: brand colors in a theme file, a tailwind config, CSS variables, a design-tokens file, an app icon or logo, the README. Take the accent from there. Then find one subject that says what the project does (a map for a routing app, a ledger for accounting, a waveform for audio). Where nothing suggests itself, ask the person in one question what they would like to see.

## 2. Write `.claude/scene.json`

The smallest file names a look that ships with the plugin (`tide`, `night`, `circuit`, `terrain`, `route`):

```json
{ "look": "tide" }
```

A shipped scene in the project's own colors (every shipped scene redraws itself in the colors given):

```json
{
  "label": "Storefront",
  "scene": "circuit",
  "colors": { "accent": "#e11d48" }
}
```

The project's own art and full palette:

```json
{
  "label": "Storefront",
  "scene": "scene.svg",
  "alt": "Parcels moving along a conveyor belt",
  "colors": {
    "accent": "#e11d48",
    "danger": "#c0392b",
    "success": "#2e8b57",
    "warning": "#d9930d",
    "pro": "#6d4f94",
    "light": { "background": "#f4ecee", "text": "#2a1a1e" },
    "dark": { "background": "#1a1114", "text": "#f3e6e9" }
  },
  "glass": { "blur": 18, "opacity": 0.62 },
  "sound": "circuit",
  "style": "circuit",
  "ripple": "circuit"
}
```

| Field | What it is |
| --- | --- |
| `look` | A shipped look to start from. Every other field overrides part of it. |
| `label` | The look's name, up to 64 characters. |
| `scene` | A shipped scene's name, an SVG file inside `.claude` (such as `scene.svg`), or `none` for colors alone. |
| `alt` | What the scene shows, for a screen reader. |
| `colors` | Six-digit hex only. `accent`, `danger`, `success`, `warning`, `pro`; and `light` and `dark`, each with `background` and `text`. All optional: what is left out comes from `look`, or from quiet grays tinted toward the accent. |
| `glass` | How the app frosts its panels over the scene: `blur` 0 to 100, `opacity` 0 to 1 (lower shows more of the scene), or `false` for none. |
| `sound` | A shipped look's sound by name, `"none"`, or a sound of the project's own (below). Left out, a shipped scene or `look` brings its own, and the project's own art is silent. |
| `style` | How the desktop app draws messages: a shipped look's style by name, `"none"` for the app's own, or a style of the project's own (below). Left out, it follows `sound`'s rule. |
| `ripple` | What answers a click on the bare backdrop in the desktop app: a shipped look's ripple by name, played over the scene in the project's own accent, or `"none"`. Left out, it follows `sound`'s rule. |

Rules for colors that the plugin enforces with a toast when broken:

- `text` on `background` needs strong contrast in both modes (aim for 7:1 or better). Low-contrast pairs are refused by the app and nothing paints.
- Tint the backgrounds toward the accent's hue and keep them quiet: a light `background` near white, a dark one near black. Leave pure `#ffffff` and `#000000` to looks that are about them.
- Keep meaning: `danger` stays a red, `success` a green, `warning` an amber, each tuned toward the look.
- A mode may also give `surface-1`, `surface-2`, `surface-3` (cards, panels, menus: each as light as the page or lighter), `text-secondary` and `text-muted`.

### Sound, message style and ripple

A look is more than its picture: give every look you design a `sound`, a `style` and a `ripple`, even when the person only asked for a scene. Art of the project's own gets none of them unless the file names them, so leaving them out makes a silent look whose clicks do nothing.

Pick each by the mood of the project from the shipped looks, by name, and say in one line which you chose and why:

| Name | Sound | Message style | Ripple |
| --- | --- | --- | --- |
| `tide` | surf that swells and falls back, bell cues | a well-rounded bubble | one ring spreading like a wave |
| `night` | a low drone with a far star's bell now and then | a bubble with a thin glowing accent border | a star's glint |
| `circuit` | a board's hum and faint blips, a tick for each tool call | square bubble, monospaced headings, framed tool rows | a square pulse out along a grid |
| `terrain` | wind gusting over a ridge | a bubble with a soft shadow, serif headings | an uneven contour line |
| `route` | a low city rumble and a far signal | a speech bubble, its tail at the lower right | a pin's ping and one ring |

The three needn't match: a teal project with a calm feel might take `tide` for all three, a map-heavy one `route`'s ripple with `terrain`'s sound. The ripple plays over the project's own art in its `accent`, so check that the accent reads on the scene in both modes. All three are drawn by the desktop app alone. Write a sound or style of the project's own only when the person asks for it.

A sound is numbers, never a file: the app makes it from layers of tones and noise. It stays off until the person presses the speaker in the session's title bar.

```json
"sound": {
  "ambience": {
    "layers": [{ "wave": "pink", "drone": true, "gain": 0.2, "filter": { "type": "lowpass", "hz": 420, "to": 900 } }]
  },
  "cues": {
    "done": { "layers": [{ "wave": "bell", "notes": ["A4", "E5"], "step": 0.14, "release": 1.2 }] }
  }
}
```

- `ambience` plays while the window is in use. Each layer is a `drone` (`"drone": true`, a steady sound) or a `scatter` (hits that fall at random, 0.02 to 10 a second), with `reverb` 0 to 1 for the whole.
- `cues` are `send`, `tool`, `compact`, `done`, `ask`, `error` and `click` (the bare backdrop clicked; its notes run from the left edge to the right). The app plays them at its own moments. Each has 1 to 8 layers.
- A layer's `wave` is `sine`, `triangle`, `square`, `saw` or `bell` with `notes` (1 to 16, such as `"C5"` or `"F#3"`), or the noise `white`, `pink`, `brown` or `crackle`. It may give `gain` 0 to 1, `pan` -1 to 1, `filter` (`lowpass`, `highpass` or `bandpass` at `hz` 20 to 10,000, moving to `to`), `tremolo` (`hz` 0.05 to 30, `depth` 0 to 1), and outside a drone `step` 0 to 2, `glide` -24 to 24, `attack` 0.002 to 2 and `release` 0.01 to 4.
- A cue must render in under 32 seconds of audio: many notes, long releases and reverb add up, and the app refuses one over that.
- Keep it quiet and sparse, since it plays for hours beside the person's work, and never imitate a system chime.

A style restyles the conversation's own rows. The words stay the app's text, so selecting, copying and screen readers keep working.

```json
"style": {
  "Heading": { "fontFamily": ["serif"] },
  "UserMessage": { "backgroundColor": "bg-user-message", "color": "text-user-message", "radius": 12, "paddingX": 14, "paddingY": 10 }
}
```

- The parts are `Text`, `Heading`, `UserMessage`, `AssistantMessage` and `ToolUse`. Type: `fontFamily` (one of `sans`, `serif`, `mono`, `code`, `cursive`, in a list), `fontSize` 11 to 28, `fontWeight`, `italic`, `letterSpacing` -1 to 4, `lineHeight` 12 to 48 in points. Box: `backgroundColor`, `radius` 0 to 64, `borderColor`, `borderWidth` 0 to 8, `shadow` and padding 0 to 48. A message may also `rotate` -3 to 3 degrees.
- Name colors, such as `surface-1`, `text-primary`, `border-accent`, or the bubble colors `bg-user-message` and `text-user-message` that the plugin works out from `colors`, so one rule serves light and dark.
- The scene shows behind every row, so give any part whose text color you set a solid `backgroundColor`. A rule whose words fall under 3:1 is drawn in the app's own colors.
- Leave `Text` alone unless asked: a font there overrides the person's own font choice.

The app checks a sound or style of the project's own when the look is set. One it refuses is left out with the reason in a toast and in `/scene`, while the colors and the scene still draw.

## 3. Draw `.claude/scene.svg`

One self-contained SVG, drawn behind the whole window:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
  <style>
    .bg { fill: #f4ecee }
    .line { stroke: #e11d48; stroke-opacity: .25; animation: flow 6s linear infinite }
    @keyframes flow { to { stroke-dashoffset: -160 } }
    @media (prefers-color-scheme: dark) {
      .bg { fill: #1a1114 }
      .line { stroke: #ff6b8b }
    }
    @media (prefers-reduced-motion: reduce) { * { animation: none !important } }
  </style>
  <rect class="bg" width="1600" height="1000"/>
  <!-- the scene -->
</svg>
```

- Keep the `viewBox` and `preserveAspectRatio="xMidYMid slice"` so the art fills any window and is cropped at the edges, never stretched.
- Animate with CSS in the SVG's own `<style>` only. It runs no script, loads no image, font or URL, and must stay under 131,072 characters.
- Follow both modes with `@media (prefers-color-scheme: dark)`, and make the first rectangle the same color as the mode's `background`, so the scene and the app's panels read as one surface.
- Stop every animation under `@media (prefers-reduced-motion: reduce)`, and check the scene still reads when still.
- It is a backdrop, not an illustration: text sits on top of it. Keep fills and strokes faint (opacity .05 to .3 for large shapes), save full color for a few small moving accents, and move slowly (6 to 40 seconds a loop).
- Keep the subject out of the middle, where the conversation is, and out of the bottom edge, where the message box is. The corners and the upper sides are the stage.
- A tall phone crops the sides: put nothing essential in the outer fifths, or move it in with `@media (max-aspect-ratio: 4/5)`.
- Draw your own art. Take the spirit of the project, never a company's logo, artwork or font.

## 4. Check it and hand it over

1. Read `scene.json` back as JSON, and check the SVG is well formed and under the size limit.
2. Tell the person to run `/scene`: it applies the files at once and reports any problem in them by name. A problem also shows as a toast.
3. Ask them to look in both light and dark mode, and adjust from what they say. You cannot see the result yourself. Ask them to press the speaker in the session's title bar and listen, and to click the bare backdrop a few times to see the ripple.

The person's own `/scene <look>` pick for a project wins over these files; `/scene reset` goes back to them.
