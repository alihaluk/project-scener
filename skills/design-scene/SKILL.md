---
name: design-scene
description: Design a custom look for the current project with the project-scener plugin - a moving SVG backdrop and matching colors, saved in the project's .claude folder. Use when the person asks to design, make, create or change a scene, backdrop, look or theme for this project, or to give the project its own colors.
---

# Design a scene for this project

The project-scener plugin draws a look behind the conversation in the Claude desktop and mobile apps. A project gets a look of its own from two files in its `.claude` folder, which you write:

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
  "glass": { "blur": 18, "opacity": 0.62 }
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

Rules for colors that the plugin enforces with a toast when broken:

- `text` on `background` needs strong contrast in both modes (aim for 7:1 or better). Low-contrast pairs are refused by the app and nothing paints.
- Tint the backgrounds toward the accent's hue and keep them quiet: a light `background` near white, a dark one near black. Leave pure `#ffffff` and `#000000` to looks that are about them.
- Keep meaning: `danger` stays a red, `success` a green, `warning` an amber, each tuned toward the look.
- A mode may also give `surface-1`, `surface-2`, `surface-3` (cards, panels, menus: each as light as the page or lighter), `text-secondary` and `text-muted`.

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
3. Ask them to look in both light and dark mode, and adjust from what they say. You cannot see the result yourself.

The person's own `/scene <look>` pick for a project wins over these files; `/scene reset` goes back to them.
