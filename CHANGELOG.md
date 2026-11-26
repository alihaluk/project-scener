# Changelog

What changed in each version of Project Scener. Update an installed copy with `claude plugin update project-scener@project-scener`, then `/reload-plugins` or a new session.

## Unreleased

- **Four new looks:** `forest`, `aurora`, `paper` and `desert`, each with its own scene, colors, sound, message style and ripple.
- **A glow while Claude works:** while a turn runs, a soft glow in the look's accent breathes around the prompt box. Turn it off with `/scene glow off`.
- **`/scene` sent first:** as a session's first message, `/scene` no longer says nothing draws the look. It says the desktop app will once it shows the session, or that a terminal draws no looks.
- **Lighter ripples:** the shaders do about an eighth less work a frame, so slower Macs draw the ripples a little sharper.
- **Designing a scene:** Claude now draws the scene in light and dark mode in a headless browser, checks it, and shows you the pictures before handing it over.
- **For contributors:** `node tests/flash-sim.mjs` checks every look's ripple against the desktop app's flash limit, reading the numbers from the shaders themselves.

## 1.5.1, 2026-11-26

- The design-scene skill, the README and the marketplace listing say looks are drawn by the desktop app alone: the mobile app does not draw them.
- The Turkish part of the README covers the sound, the message style and the ripples.

## 1.5.0, 2026-11-26

- A project's `.claude/scene.json` takes `"ripple"`: a shipped look's ripple by name, played over the project's own art in its accent, or `"none"`.
- The design-scene skill gives every look it designs a sound, a message style and a ripple, and says why it chose each.
- The plugin's own project look is refreshed: the five looks run through a lit projector gate, each frame in its own look's colors.

## 1.4.0, 2026-11-26

- The ripples no longer freeze on a second click. A ripple lights a spot fully only when no other did there in the last 0.6 seconds, and passes as a faint echo otherwise. Every click gets a ripple, up to six a second.
- The marks a click left on the backdrop are gone, with their `/scene marks` setting: each one sent the scene again, and the desktop app took the jump of its animations for a flash.

## 1.3.0, 2026-11-26

- `/scene <setting> <value>` changes the plugin's options from the desktop app too, like `/scene ripples off`.
- First attempt at keeping the ripples from flashing: one crest a press, at most one ripple every 0.35 seconds.

## 1.2.0, 2026-11-26

- A press on the bare backdrop plays a short ripple in the desktop app, from a shader of each look's own.
- Every look's sound is set to one measured level.
- New options: the sound (on, its cues alone, or off), its level, the message style and the ripples.

## 1.1.0, 2026-11-25

- Each look has a quiet sound of its own, behind the speaker in the session's title bar, and its own message style.
- A project file can borrow a shipped look's sound or style, write its own, or have none.
- The plugin's repository has a look of its own: a filmstrip of the five looks.

## 1.0.2, 2026-11-14

- The look is sent again when an app joins a running session, and `/scene` says where the session is open.

## 1.0.1, 2026-11-14

- Ready for the plugin directory: a listing icon, privacy and support sections, and plainer error messages for a project file's colors.

## 1.0.0, 2026-11-14

- Five looks, `tide`, `night`, `circuit`, `terrain` and `route`: a moving backdrop with matching colors, picked with `/scene` or carried in a project's `.claude/scene.json`.
