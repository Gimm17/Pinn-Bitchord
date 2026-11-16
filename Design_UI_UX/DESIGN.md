---
name: Komorebi Acoustic Studio
colors:
  surface: '#fcf9f1'
  surface-dim: '#dddad2'
  surface-bright: '#fcf9f1'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3eb'
  surface-container: '#f1eee6'
  surface-container-high: '#ebe8e0'
  surface-container-highest: '#e5e2da'
  on-surface: '#1c1c17'
  on-surface-variant: '#42474f'
  inverse-surface: '#31312b'
  inverse-on-surface: '#f4f1e8'
  outline: '#727781'
  outline-variant: '#c2c7d1'
  surface-tint: '#2a6198'
  primary: '#115086'
  on-primary: '#ffffff'
  primary-container: '#3368a0'
  on-primary-container: '#d5e5ff'
  inverse-primary: '#a0c9ff'
  secondary: '#22657f'
  on-secondary: '#ffffff'
  secondary-container: '#a2e0fe'
  on-secondary-container: '#20647e'
  tertiary: '#3d524f'
  on-tertiary: '#ffffff'
  tertiary-container: '#556a67'
  on-tertiary-container: '#d2e9e5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d2e4ff'
  primary-fixed-dim: '#a0c9ff'
  on-primary-fixed: '#001c37'
  on-primary-fixed-variant: '#01497f'
  secondary-fixed: '#bee9ff'
  secondary-fixed-dim: '#92cfec'
  on-secondary-fixed: '#001f2a'
  on-secondary-fixed-variant: '#004d64'
  tertiary-fixed: '#d0e7e3'
  tertiary-fixed-dim: '#b4cbc7'
  on-tertiary-fixed: '#0a1f1d'
  on-tertiary-fixed-variant: '#364b48'
  background: '#fcf9f1'
  on-background: '#1c1c17'
  surface-variant: '#e5e2da'
typography:
  display-lg:
    fontFamily: Epilogue
    fontSize: 44px
    fontWeight: '600'
    lineHeight: 52px
    letterSpacing: -0.03em
  display-md:
    fontFamily: Epilogue
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Epilogue
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Epilogue
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Epilogue
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Space Grotesk
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Space Grotesk
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Space Grotesk
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Space Grotesk
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.02em
  label-md:
    fontFamily: Space Grotesk
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: Space Grotesk
    fontSize: 9px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.08em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-compact: 0.75rem
  margin: 1.75rem
  margin-window: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.875rem
  space-lg: 1.5rem
  space-xl: 2.25rem
---

## Brand & Style

This design system synthesizes Japandi minimalism with precision industrial hardware design (reminiscent of Teenage Engineering, Dieter Rams, and high-end Tokyo bespoke audio equipment). The experience rejects flat, soulless SaaS conventions in favor of tactile physical materiality, unhurried negative space, and micro-mechanical feedback.

### Emotional Tone & Philosophy
- **Tactile Precision:** Interface elements behave like calibrated aluminum, sandblasted acrylic, and mechanical detents rather than ethereal digital layers.
- **Wabi-Sabi Modernity:** An organic, serene balance where warm porcelain ceramics embrace cool mint-cyan frosted glass and deep maritime pigments.
- **Editorial Intent:** Generous, deliberate white space with confident typographical hierarchy that frames album artwork, frequency analyzers, and playback queues as curated exhibition pieces.

### Target Environment
Designed specifically as an ultra-premium desktop workstation app (macOS / native desktop environments) for audiophiles, vinyl collectors, and sound designers seeking contemplative, sensory listening rituals.

## Colors

The palette establishes an organic canvas layered with industrial precision accents and frosted crystalline planes.

### Palette Architecture
- **Base Canvas (`#F2EFE7`):** Warm porcelain alabaster. Serves as the structural chassis of the window, offering tactile ceramic warmth over clinical cool whites.
- **Frosted Surfaces (`#C8DFDB`):** Soft frosted sage/mint-cyan. Used for acrylic container panels, transport rails, sidebar decks, and dial track backgrounds. When layered, it features subtle 18% translucency with backdrop filtration.
- **Primary Artisan Ocean (`#3368A0`):** Deep oceanic lacquer. Anchors key active states, primary toggles, playback buttons, and focused deck borders.
- **Sky Cerulean (`#66A3BF`):** Secondary accent. Applied to scrubbers, equalizer meters, volume fills, active tag chips, and fine positional pointers.
- **Text & High-Contrast Anchors:**
  - `Ink Slate Primary` (`#14202c`): Maximum contrast headlines, track names, and precision readout figures.
  - `Navy Charcoal Secondary` (`#26384a`): Body labels, artist metadata, active tab labels.
  - `Muted Maritime` (`#5c6f84`): Timestamps, sample rate indicators, inactive glyphs, subtle borders.
- **Hardware Accents & Highlights:**
  - `Bevel Specular White` (`rgba(255, 255, 255, 0.75)`): Applied to top inner borders to simulate machined, chamfered acrylic edges.
  - `Recessed Shadow Tint` (`rgba(20, 32, 44, 0.06)`): Precision drop and inset shadow tone.

## Typography

The type system fuses the structured, editorial curves of **Epilogue** with the calibrated, monospaced-adjacent cadence of **Space Grotesk**.

- **Epilogue (Headlines & Display):** Imparts an artistic record-sleeve aura. Its sharp terminals and rhythmic geometry elevate artist titles, release notes, and album names.
- **Space Grotesk (Body, Telemetry & Controls):** Delivers technical legibility resembling silkscreened audio hardware faceplates. Space Grotesk maintains tabular precision for scrubbing clocks (`03:42 / 07:15`), bitrate meters (`FLAC 192kHz / 24-bit`), and deck parameters.
- **Micro Labels:** All `label-sm` entries render in full capitals with wide letter-spacing (`0.08em`) to mirror stamped equipment chassis instructions.

## Layout & Spacing

The desktop architecture adopts a strict modular chassis: a 3-pane responsive desktop grid framed by a fixed global perimeter.

### Grid & Pane Anatomy
- **Left Dock (Navigation / Library Hierarchy):** Fixed width of `260px` to maintain stable physical proportion across resizing.
- **Center Canvas (Stage / Turntable / Track Matrix):** Fluid column that stretches while preserving golden-ratio padding (`margin-window: 1.75rem`).
- **Right Inspector (Queue / Hardware Parametric EQ / Stems):** Collapsible drawer with a default width of `320px`.
- **Bottom Mechanical Rail (Playback & Transport Console):** Fixed height (`84px`) anchored directly along the bottom axis with continuous inner glass containment.

### Responsive Breakpoints & Reflow
- **Compact Desktop (<1100px):** The Right Inspector collapses into an overlay drawer; middle track grids shift from 4 cards per row to 3.
- **Standard Desktop (1100px - 1440px):** 3-pane structure in full view with standard `gutter: 1.25rem`.
- **Wide Studio (>1440px):** Central stage caps at a maximum readable width of `1280px` centered within porcelain margin rails.

## Elevation & Depth

Visual depth avoids excessive blurs and high-contrast digital drop shadows. Instead, it relies on physical **acrylic layering**, **recessed channels**, and **micro-chamfered highlights**.

### The 4 Tactile Strata
1. **Chassis Bed (`#F2EFE7`):** Non-elevated, flat matte finish that absorbs ambient window light.
2. **Machined Inset (`Recessed`):** Used for scrubbers, level wells, and search apertures.
   - `box-shadow: inset 0 1px 3px rgba(20, 32, 44, 0.12), inset 0 0 0 1px rgba(20, 32, 44, 0.05);`
3. **Frosted Acrylic Tile (`Level 1`):** Panels, track rows, and card decks.
   - Background: `rgba(200, 223, 219, 0.55)`
   - Backdrop filter: `blur(16px) saturate(140%)`
   - Shadow: `0 4px 16px -2px rgba(92, 111, 132, 0.08), 0 1px 2px rgba(20, 32, 44, 0.04)`
   - Top Edge Highlight: `1px solid rgba(255, 255, 255, 0.7)`
4. **Mechanical Floating Hardware (`Level 2` - Knobs, Faders, Flyouts):**
   - Background: `#F2EFE7` (solid porcelain caps) or `#3368A0` (anodized primary controls)
   - Shadow: `0 8px 24px -4px rgba(20, 32, 44, 0.14), 0 2px 6px rgba(20, 32, 44, 0.06)`
   - Bevel: `inset 0 1px 0 rgba(255, 255, 255, 0.6), inset 0 -1px 0 rgba(20, 32, 44, 0.1)`

## Shapes

The design uses **Soft (`1`)** roundedness. Radii strictly follow engineered injection-molded tolerances rather than pillowy or bubbly forms.

- **Standard Elements (Buttons, Inputs, Row items):** `0.25rem` (4px). Creates crisp, mechanical silhouettes with just enough softening to mimic machined matte resin.
- **Panels & Module Canvases (`rounded-lg`):** `0.5rem` (8px). Encapsulates track tables, EQ visualizers, and playback consoles.
- **Hardware Dial Endcaps (`rounded-xl`):** `0.75rem` (12px). Applied exclusively to vinyl sleeve wrappers and dedicated control caps.
- **Exception Rule:** Linear transport scrubbers, status LEDs, and step-sequencer pins utilize circular radii (`9999px`) to maintain physical mechanical fidelity.

## Components

### Buttons & Transport Controls
- **Primary Play/Engage Button:** Circular or soft-cornered (`0.25rem`) finished in deep ocean blue (`#3368A0`). Uses a subtle top chamfer (`inset 0 1px 0 rgba(255,255,255,0.3)`) and crisp white icon. Active press state triggers a `1px` downward translation with an inset shadow (`inset 0 2px 4px rgba(20, 32, 44, 0.3)`).
- **Secondary & Auxiliary Keys:** Frosted mint surface (`#C8DFDB`) with ink slate text (`#14202c`). Hover state shifts background to a higher opacity (`rgba(200, 223, 219, 0.9)`) with a fine `#66A3BF` outline.

### Scrubber Rails & Rotary Dials
- **Scrubber Track:** Recessed slot (`height: 4px`) tinted in `#5c6f84` at 15% opacity. The active playback duration fills with Sky Cerulean (`#66A3BF`).
- **Playhead Thumb:** A knurled brass-and-porcelain indicator square (`8px x 14px`) with a vertical center slit.
- **Parametric Dials:** Circular dial wells with concentric ring markings and a `#3368A0` radial indicator needle accompanied by tabular micro-labels (`label-sm`).

### Track Lists & Data Grids
- **Rows:** Alternating rows leverage soft transparency; hover displays a frosted tint (`rgba(200, 223, 219, 0.4)`) with an anchor border in `#66A3BF` on the active item's left edge.
- **Metadata Columns:** Track title rendered in `headline-sm` (`#14202c`), album and artist in `body-md` (`#5c6f84`), duration and bit depth in monospaced `label-md` (`#26384a`).

### Cards & Vinyl Sleeves
- **Album Sleeves:** Crisp cards (`0.5rem` radius) framed in a 1px border of `#F2EFE7`. They cast a subtle, warm maritime shadow with a 2px offset faux-groove vinyl disc peeking from the right margin during hover interactions.

### Inputs & Selectors
- **Search & Filter Modules:** Recessed ceramic channels (`#EAE6DC`) with 1px border (`#C8DFDB`). Placeholder rendered in `#5c6f84`. Focus state expands the inner sky cerulean glow without heavy rings.

### Badges, Tags & Chips
- **Format Chips (e.g., DSD, FLAC, MQA):** Precision milled tags with `#C8DFDB` background, `#14202c` text, and a micro 1px border of `#66A3BF` at 30% opacity.