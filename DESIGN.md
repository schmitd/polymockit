---
name: Polymockit
description: A restrained fantasy prediction-market desk for private leagues.
colors:
  canvas: "oklch(14% 0.018 232)"
  surface: "oklch(19% 0.02 232)"
  surface-raised: "oklch(23% 0.022 232)"
  surface-sunken: "oklch(16% 0.018 232)"
  text: "oklch(91% 0.018 232)"
  text-muted: "oklch(68% 0.024 232)"
  line: "oklch(34% 0.024 232)"
  accent: "oklch(76% 0.14 74)"
  accent-strong: "oklch(84% 0.16 78)"
  success: "oklch(76% 0.15 153)"
  danger: "oklch(71% 0.17 20)"
  warning: "oklch(78% 0.15 84)"
typography:
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 650
    lineHeight: 1.2
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 650
    lineHeight: 1.2
  mono:
    fontFamily: "'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
  button-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
  input:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
---

# Design System: Polymockit

## 1. Overview

**Creative North Star: "Commissioner Desk"**

Polymockit uses a compact, operational interface for fantasy market leagues. The system is dark because users compare live market data, standings, and trade controls in repeated sessions where contrast and scan speed matter more than page atmosphere.

The design rejects neon crypto terminals, glassmorphism, gradient buttons, and generic SaaS metric cards. It uses solid layers, restrained amber action color, and tabular rhythm so the interface feels trustworthy without becoming sterile.

**Key Characteristics:**
- Dense, scannable panels with clear section headers.
- One action accent, reserved for primary actions and selected state.
- Monospace only for codes, values, timestamps, and market prices.
- Shape vocabulary capped at 6px, 8px, 10px, and 12px radii.

## 2. Colors

The palette is a cool exchange slate with a measured amber accent.

### Primary
- **House Amber** (`oklch(76% 0.14 74)`): primary actions, selected controls, active chips, and focus rings.

### Secondary
- **Ledger Green** (`oklch(76% 0.15 153)`): positive PnL and successful outcomes only.
- **Risk Red** (`oklch(71% 0.17 20)`): errors, negative PnL, and destructive warnings.

### Neutral
- **Night Canvas** (`oklch(14% 0.018 232)`): app background.
- **Desk Surface** (`oklch(19% 0.02 232)`): main panels.
- **Raised Surface** (`oklch(23% 0.022 232)`): controls and selected rows.
- **Divider Slate** (`oklch(34% 0.024 232)`): borders and separators.

### Named Rules

**The No Glow Rule.** Amber does not glow, blur, or gradient. Its rarity is what gives it authority.

## 3. Typography

**Display Font:** System UI stack
**Body Font:** System UI stack
**Label/Mono Font:** IBM Plex Mono for numeric and code data

**Character:** Native, compact, and legible. Product labels use weight and spacing, not novelty type.

### Hierarchy
- **Title** (650, 20px, 1.2): app title and panel titles.
- **Heading** (650, 16px, 1.25): section headers inside panels.
- **Body** (400, 15px, 1.5): explanatory text and normal rows.
- **Label** (650, 12px, 1.2): overlines and small UI labels.
- **Mono** (500, 12px, 1.4): prices, invite codes, timestamps, and counts.

### Named Rules

**The Data Voice Rule.** Use monospace for values users compare. Do not use it for whole paragraphs.

## 4. Elevation

Depth is conveyed by tonal layering and borders. Shadows are subtle and structural, reserved for app chrome and overlays. Panels should not look like floating glass.

### Shadow Vocabulary
- **Panel Shadow** (`0 18px 48px oklch(6% 0.012 232 / 0.24)`): app header and overlay only.

### Named Rules

**The Flat-by-Default Rule.** Rows and controls change tone on hover or selection; they do not lift.

## 5. Components

### Buttons
- **Shape:** compact rectangle with 8px radius.
- **Primary:** amber fill, dark text, 44px minimum touch height.
- **Hover / Focus:** tonal shift plus visible outline. No translate or brightness tricks.
- **Secondary:** raised slate fill with slate border.

### Chips
- **Style:** compact pill with border and mono-friendly label.
- **State:** selected chips use amber tint and amber border. Inactive chips stay neutral.

### Cards / Containers
- **Corner Style:** 12px for panels, 8px to 10px for rows.
- **Background:** solid slate surfaces.
- **Shadow Strategy:** no row shadows. Panel shadow only for top-level chrome.
- **Border:** one-pixel divider slate.
- **Internal Padding:** 12px for dense panels, 16px for forms and overlays.

### Inputs / Fields
- **Style:** sunken slate fill, 1px border, 8px radius, 44px minimum height.
- **Focus:** amber outline and border.
- **Error / Disabled:** muted opacity with retained contrast.

### Navigation
- **Style:** segmented control in the header.
- **State:** active segment uses amber fill, inactive segments use raised slate.

## 6. Do's and Don'ts

Do keep market, league, and trade controls visually distinct. Do make values align and scan cleanly. Do use empty states that tell the next action.

Do not use glassmorphism, gradient buttons, hero metrics, decorative glows, or repeated card grids. Do not use full-saturation colors for inactive states. Do not create a modal when inline state will do.
