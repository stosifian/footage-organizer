# Handoff: FootageOrganizer Design Refresh (Graphite·Violet + Azure/Signal themes)

## Overview
This refreshes the entire visual system of the FootageOrganizer renderer: a
true-neutral **graphite** surface ramp, a vivid **violet** accent (replacing the
stock blue), a **magenta** "magic" action color, **Hanken Grotesk** for UI text
and **JetBrains Mono** for technical metadata, re-harmonized tag colors, and two
alternate themes (**Azure**, **Signal**) the user can switch between live.

The look and behavior of the app are otherwise unchanged — this is a reskin, not
a feature change.

## About the design files
The bundled `design-reference.html` is a **design reference created in HTML** — a
self-contained, fully-interactive prototype of the library view showing the
intended look and the live theme switcher. It is **not** code to ship. Your task
is to apply the refreshed design **in the existing renderer codebase**
(React 19 + Tailwind v4, `src/renderer/src/`) using its established patterns.
Open `design-reference.html` in any browser, click **Open Directory** to load the
sample library, and use the **bottom-left switcher** to compare Violet / Azure /
Signal.

## Fidelity
**High-fidelity.** Colors, typography, radii, and the theme system are final.
Match them exactly using the provided token files. The two ready-to-use source
files (`index.css`, `preset-tags.ts`) are drop-in replacements for files that
already exist in the repo.

---

## Integration — 4 steps

### Step 1 — Replace `src/renderer/src/index.css`  *(does ~80% of the reskin)*
Use the provided **`index.css`**. It keeps your existing variable names
(`--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--border-color`,
`--text-primary`, `--text-secondary`, `--accent`) so every current
`var(--…)`/`bg-[var(--…)]` usage reskins instantly — and adds:
- the full surface/text/accent ramps, magic, semantic, and tag tokens;
- a Tailwind v4 `@theme` block exposing utilities: `bg-accent`, `bg-accent-hover`,
  `text-accent-on`, `bg-magic`, `bg-surface`, `bg-elevated`, `text-ink`,
  `text-muted`, `bg-ok/warn/err`, plus `font-ui` / `font-mono`;
- the `html[data-theme="azure"]` and `html[data-theme="signal"]` override blocks;
- the Hanken Grotesk + JetBrains Mono `@import` and the body font swap.

### Step 2 — Replace `src/renderer/src/constants/preset-tags.ts`
Use the provided **`preset-tags.ts`**. The `color` / `bgColor` / `borderColor`
fields now hold **CSS variable values** (not Tailwind class strings), so the
re-harmonized hues apply and auto-retint per theme. Because they're values, apply
them with inline `style` instead of `className`. Find where the tag config is
rendered (the tag chip / pill component) and change, e.g.:

```diff
- <span className={`... ${config.color} ${config.bgColor} ${config.borderColor}`}>
+ <span
+   className="... rounded-full border"
+   style={{ color: config.color, background: config.bgColor, borderColor: config.borderColor }}
+ >
    {value}
  </span>
```

A sixth category, `keyword` (emerald), is included for free-form scene keywords —
remove it if your data model has none.

### Step 3 — Repoint hard-coded accent / magic utilities
Components currently use literal Tailwind palette classes for the accent and the
"Tag All" action. Replace them with the new token utilities so they follow the
theme. Search the renderer for these and swap:

| Find (approx.)                          | Replace with        |
|-----------------------------------------|---------------------|
| `bg-blue-600`, `bg-blue-500`            | `bg-accent`         |
| `hover:bg-blue-700`                     | `hover:bg-accent-hover` |
| `text-blue-500` / `text-blue-400` (accent, **not** tag text) | `text-accent` |
| `ring-blue-500`, `border-blue-500` (focus) | `ring-accent`, `border-accent` |
| `bg-violet-700` (Tag All)               | `bg-magic`          |
| `hover:bg-violet-800`                   | `hover:bg-magic-hover` |
| primary-button text `text-white`        | `text-accent-on` *(so Signal's lime button gets dark text)* |

Leave semantic greens/ambers/reds as-is, or move them to `text-ok/warn/err` if you
want them theme-consistent. **Do not** rewrite the tag-text blues/oranges/etc. —
those are handled in Step 2.

### Step 4 — Add the theme switcher
Use the provided **`useTheme.ts`** (suggested path
`src/renderer/src/hooks/useTheme.ts`). It persists the choice to `localStorage`
and sets `data-theme` on `<html>`. The file includes a ready segmented-control
component — drop it in the header toolbar (next to the settings gear) or the
Settings dialog. Default (no attribute) = Violet.

---

## Design tokens

**Surfaces (Violet default → Azure → Signal)**
| Token | Violet | Azure | Signal |
|---|---|---|---|
| base    | `#0e0e10` | `#0c0e11` | `#0b0b0c` |
| surface | `#17171a` | `#15171b` | `#151517` |
| elevated| `#202024` | `#1e2126` | `#1f1f22` |
| hover   | `#2a2a30` | `#282c33` | `#29292e` |
| border  | `#2a2a30` | `#282c33` | `#29292e` |

**Text:** primary `#e8e8ea` · bright `#cacace` · secondary `#94949c` · label `#76767e` · tertiary `#5f5f67` · faint `#4e4e56` · ghost `#3e3e46` *(Azure/Signal shift these slightly — see index.css)*

**Accent**
| | Violet | Azure | Signal |
|---|---|---|---|
| accent / strong | `#7c66f0` | `#3897e6` | `#a3cf1e` |
| hover | `#6a52e0` | `#2680d4` | `#8eb510` |
| text (link) | `#b0a4fb` | `#8ccbf6` | `#cdef62` |
| on-accent (button text) | `#ffffff` | `#ffffff` | `#131806` |
| magic / hover | `#d946a8` / `#c026a0` | `#9b7bf2` / `#8463e6` | `#c084fc` / `#a855f7` |

**Semantic:** success `#4ade80` · warning `#facc15` · danger `#f87171`

**Tags (re-harmonized — one oklch family, `oklch(0.82 0.135 H)`):** texture H=250 · energy H=55 · mood H=305 · light H=85 · location H=195 · keyword H=155. Each chip = text at that hue, bg = 15% of text mixed into `--bg-surface`, border = 32% — defined as `--tag-*` vars in index.css; they retint automatically per theme.

**Radii (Violet → Azure → Signal):** xs `4/6/2` · sm `7/9/4` · md `9/12/5` · lg `12/16/8` px. Pills/tags/status chips stay fully rounded.

**Type:** UI = `"Hanken Grotesk"` (400/500/600/700) with the OS stack as fallback. Mono = `"JetBrains Mono"` (400/500/600). Table/controls live at 11–14px; weights 400/500/600.

## Assets
No image/logo assets. Icons remain **lucide** (`lucide-react`, already in the
repo). The app mark is the lucide `video`/`clapperboard` glyph + "FootageOrganizer"
wordmark. Fonts load from Google Fonts via the `@import` in `index.css` (swap for
self-hosted/`@fontsource` if the app must run offline — see Caveats).

## Caveats
- **`oklch()` + `color-mix()`** are used for the tag family. Chromium (Electron's
  renderer) supports both — fine for this app. If you ever target older engines,
  pre-compute the tag hex values.
- **Offline fonts.** Electron apps are often offline; if so, replace the Google
  Fonts `@import` with `@fontsource/hanken-grotesk` + `@fontsource/jetbrains-mono`
  (npm) and import them in your entry, keeping the `--font-ui`/`--font-mono` stacks.
- **`@theme` overrides.** The alternate-theme blocks re-declare the `--color-*`
  custom properties; Tailwind utilities read them via `var()`, so theme switching
  works without rebuilding. Keep Tailwind v4.

## Files in this bundle
- `index.css` — drop-in for `src/renderer/src/index.css`
- `preset-tags.ts` — drop-in for `src/renderer/src/constants/preset-tags.ts`
- `useTheme.ts` — theme hook + example switcher component
- `design-reference.html` — interactive visual reference (open in a browser; switcher bottom-left)
- `README.md` — this file
