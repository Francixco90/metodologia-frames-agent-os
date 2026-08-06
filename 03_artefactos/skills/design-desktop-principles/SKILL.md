---
name: design-desktop-principles
description: This skill should be used when the operator requests desktop-specific UX guidance — hover states, pointer precision, keyboard shortcuts, multi-window flows, or focus management for macOS, Windows, Linux, or web desktop surfaces. It delivers prose guidance and pseudocode snippets for local evaluation only; it never executes code, runs a desktop shell, or auto-launches build tooling.
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# design-desktop-principles

Derivada de genjutsu/_jutsu/desktop-principles/SKILL.md (AThevon/genjutsu, MIT, commit 08a792f).

> Desktop UX context. Loaded when a desktop surface is in scope (macOS, Windows, Linux desktop, web desktop). Prose + pseudocode only; see §Runtime Boundary.

---

## Hover States Are Mandatory

On desktop, hover is the primary affordance signal — the inverse of mobile. A pointer resting on a target with no immediate visual feedback reads as broken; users lean on `:hover` to confirm an element is interactive before committing. Every clickable surface needs a distinct hover style, with a transition in the 100–200ms band so the change is perceptible without feeling sluggish.

CSS pointer-affordance shape (pseudocode, rhyming with native patterns):

```css
.surface {
  background: var(--surface);
  transition:
    background 120ms ease-out,
    transform 120ms ease-out;
}
.surface:hover {
  background: var(--surface-hover);
  transform: translateY(-1px);
}
.surface:active {
  transform: translateY(0);
}
```

SwiftUI shape: `.onHover` drives a `@State` flag, `.hoverEffect(.highlight)` adds iPadOS pointer support (no-op on macOS), `.animation(.easeOut(duration: 0.12), value: hovering)` keeps the change in the 100–200ms band.

Compose Desktop shape: `Modifier.hoverable(interactionSource)` paired with `collectIsHoveredAsState()`; swap the background by the hovered flag.

coverage_gap: platform-specific hover tokens (Fluent 2, GNOME HIG) are not enumerated here — surface as a gap if the operator needs the full token set.

---

## Pointer Precision (WCAG 2.5.8 24x24 floor)

Mouse and trackpad pointers are far more accurate than thumbs, so desktop targets can be smaller than the 44pt mobile minimum. Common ranges: 24–32px for icon buttons, 28–36px for toolbar items. WCAG 2.5.8 (AA, target size minimum) sets the absolute floor at **24x24 CSS pixels** for non-mobile pointer input. Targets below 24px need spacing or must be grouped with a sibling that meets the floor.

Fitts's Law in practice: acquisition time shrinks with size and grows with distance. Screen edges and corners are infinite-depth targets — the cursor stops there regardless of overshoot. Anchor high-frequency global controls (close window, system menu, dock) in corners and along edges. macOS menubar and Windows taskbar are textbook applications: edge-anchored, zero-overshoot acquisition.

fail-closed: if a target cannot meet the 24x24 floor, surface the gap; do not silently shrink and ship.

---

## Keyboard Shortcuts (first-class)

Desktop users expect parity with native conventions. Missing `⌘+F` in a list-heavy app is not minimalism, it is a bug.

| Action                     | macOS                | Windows / Linux            |
| -------------------------- | -------------------- | -------------------------- |
| New                        | `⌘+N`                | `Ctrl+N`                   |
| Close window               | `⌘+W`                | `Ctrl+W`                   |
| Quit app                   | `⌘+Q`                | `Alt+F4`                   |
| Settings / Preferences     | `⌘+,`                | `Ctrl+,`                   |
| Find                       | `⌘+F`                | `Ctrl+F`                   |
| Toggle (comment, sidebar…) | `⌘+/`                | `Ctrl+/`                   |
| Save                       | `⌘+S`                | `Ctrl+S`                   |
| Command palette            | `⌘+K` or `⌘+Shift+P` | `Ctrl+K` or `Ctrl+Shift+P` |

Web detection: prefer `event.metaKey` on macOS, `event.ctrlKey` elsewhere; resolve the platform via `navigator.platform` with a `navigator.userAgent` fallback. SwiftUI: `.keyboardShortcut("n", modifiers: .command)` binds menu commands. Compose Desktop: `onKeyEvent` + `KeyShortcut(Key.N, meta = true)` inside a `MenuBar`.

---

## Multi-Window

Desktop users keep windows side by side. A new window is the right answer when:

- A task runs long enough that the user wants to keep working in the main window (rendering, export, sync log).
- The user is comparing two parallel contexts (two documents, two chats, two issues).
- The app is document-based and each document is a peer (Pages, Figma files, Xcode projects).

A new window is the wrong answer for transient confirmations, brief settings panels, or anything that can live in a sheet or popover.

SwiftUI: `WindowGroup("Document")` for peer document windows, `Window("Inspector", id: "inspector")` for singletons, `Settings { SettingsView() }` for the `⌘+,` target on macOS. Compose Desktop: `Window(onCloseRequest = …)` composables inside an `application { … }` scope.

State sharing: windows are views over the same model. Hold the source of truth in a singleton or a DI-scoped object (SwiftUI `@Observable` injected via environment, Compose `koin` or a `viewModel`-equivalent). Never duplicate state per window — reconciling diverging copies is a graveyard of bugs.

coverage_gap: platform window-management APIs (stage modes, window tabs, multiple displays) are not enumerated here — surface as a gap if the operator needs the full surface.

---

## Focus Management

Keyboard navigation is first-class on desktop. Tab order must be sane, focus rings must be visible, and removing a focus ring without an alternative is an accessibility regression.

SwiftUI: `@FocusState` drives field focus; `@FocusState private var focused: Field?` with an enum of fields. Compose Desktop: `FocusRequester` per field, `KeyboardActions(onNext = …)` / `onDone = …`, `LaunchedEffect(Unit) { firstField.requestFocus() }` for initial focus. Web: `:focus-visible` keeps the ring for keyboard users while leaving mouse clicks ring-free; never `outline: none` without an alternative.

```css
/* Never bare outline:none without an alternative. */
.surface:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
```

`tabindex="0"` puts a non-interactive element in tab order; `tabindex="-1"` removes it from tab order but keeps it focusable programmatically.

---

## Information Density

Desktop users sit on a 13–32 inch screen with a precise pointer and full keyboard, and want to parse more per viewport than on mobile. Use an 8px base grid (vs 4–8px mobile), persistent sidebars instead of bottom tabs, command palettes (`⌘K`) for power users, and dense data tables when warranted. Linear, Things 3, Notion: information-rich without feeling cramped.

---

## Subtle Animations Doctrine

Desktop apps are stared at for hours; animations delightful once become unbearable on the hundredth repetition. Prefer short functional motion: opacity and small translations under 200ms, no bounces or playful overshoots on routine interactions. Save expressive motion for one-shot moments (onboarding, success states), never daily UI.

fail-closed: if an animation is decorative rather than functional, gate it behind operator confirmation; do not ship ambient motion by default.

---

## Anti-Patterns (BAD / GOOD)

1. **Hiding navigation behind a hamburger on desktop** — a 1440px viewport has infinite room; collapse the sidebar only if the user asks. Prefer a persistent sidebar with a collapse toggle.
2. **No keyboard shortcut for a primary action** — `⌘N` is a baseline, not a nice-to-have; surface the shortcut in the menu and mirror it on the toolbar tooltip. Bind globally.
3. **Removing focus rings without an alternative** — `button:focus { outline: none; }` with nothing behind it strands keyboard users. Use `:focus-visible` so mouse clicks stay ring-free while keyboard navigation stays visible.

---

## Runtime Boundary

execution_scope: local-evaluation. This skill describes capability in prose and pseudocode; it never executes code, runs a desktop shell, launches a build, or opens a window without explicit operator confirmation. See `receipts/runtime-boundary.yml`.

coverage_gap: if a target platform (Fluent 2, GNOME HIG, KDE) needs a token-level spec, surface the gap rather than inferring it.

---

## Sources

- Apple Human Interface Guidelines (macOS): https://developer.apple.com/design/human-interface-guidelines/macos
- Microsoft Fluent Design 2: https://fluent2.microsoft.design/
- GNOME Human Interface Guidelines: https://developer.gnome.org/hig/
