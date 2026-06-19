# How to hand this off to Claude Code

## 1. Place the folder
Drop this entire `design_handoff_violet_reskin/` folder at the **root of your
`footage-organizer` checkout**, then open that repo in Claude Code (`claude`).
You can delete the folder after the work is merged.

## 2. Paste this prompt into Claude Code

---

Read `design_handoff_violet_reskin/README.md` in full, then implement the design
refresh it describes. This is a high-fidelity reskin of the existing renderer —
apply it in our React 19 + Tailwind v4 codebase, don't ship the HTML.

Follow the README's 4 steps in order, **one git commit per step**:

1. Replace `src/renderer/src/index.css` with the bundle's `index.css`.
2. Replace `src/renderer/src/constants/preset-tags.ts` with the bundle's
   `preset-tags.ts`, then update the tag-chip component to apply
   `config.color/bgColor/borderColor` via inline `style` instead of `className`
   (the README has the diff).
3. Do the accent/magic utility find-and-replace across the renderer using the
   README's table (`bg-blue-600` → `bg-accent`, `bg-violet-700` → `bg-magic`,
   primary-button `text-white` → `text-accent-on`, etc.). **Show me the full list
   of matches before changing them.** Do NOT touch tag-text blues/oranges/etc. —
   those are tag colors handled in step 2; only repoint accent/focus blues and the
   Tag All violet.
4. Add `useTheme.ts` as `src/renderer/src/hooks/useTheme.ts` and mount the example
   `ThemeSwitcher` in the header toolbar next to the settings gear.

Compare your result against `design_handoff_violet_reskin/design-reference.html`.
Then run the app (`npm run dev`) so I can review, and list any spots where you had
to make a judgment call.

---

## 3. If the app must run offline
Add to the prompt: *"Swap the Google Fonts `@import` in index.css for
`@fontsource/hanken-grotesk` + `@fontsource/jetbrains-mono` (npm) imported in the
entry file, keeping the `--font-ui`/`--font-mono` stacks."*

## 4. Verify
Run the app, click through the library, and toggle the new theme switcher
(Violet → Azure → Signal). Cross-check colors, corners, and tag chips against
`design-reference.html` open in a browser side by side.

The README is self-contained — Claude Code needs nothing from the original design
conversation.
