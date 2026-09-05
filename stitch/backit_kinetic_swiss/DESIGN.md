---
name: BackIt Kinetic Swiss
colors:
  surface: '#fbf9f4'
  surface-dim: '#dbdad5'
  surface-bright: '#fbf9f4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3ee'
  surface-container: '#efeee9'
  surface-container-high: '#eae8e3'
  surface-container-highest: '#e4e2dd'
  on-surface: '#1b1c19'
  on-surface-variant: '#444748'
  inverse-surface: '#30312d'
  inverse-on-surface: '#f2f1eb'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c8c6c5'
  secondary: '#6d5e00'
  on-secondary: '#ffffff'
  secondary-container: '#f9da00'
  on-secondary-container: '#6d5f00'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1b1c18'
  on-tertiary-container: '#84847e'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c8c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474646'
  secondary-fixed: '#ffe243'
  secondary-fixed-dim: '#e3c600'
  on-secondary-fixed: '#211b00'
  on-secondary-fixed-variant: '#524700'
  tertiary-fixed: '#e4e2dc'
  tertiary-fixed-dim: '#c8c6c0'
  on-tertiary-fixed: '#1b1c18'
  on-tertiary-fixed-variant: '#474742'
  background: '#fbf9f4'
  on-background: '#1b1c19'
  surface-variant: '#e4e2dd'
typography:
  display-hero:
    fontFamily: Anton
    fontSize: 84px
    fontWeight: '400'
    lineHeight: 84px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Anton
    fontSize: 44px
    fontWeight: '400'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: Anton
    fontSize: 56px
    fontWeight: '400'
    lineHeight: 58px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Anton
    fontSize: 32px
    fontWeight: '400'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Anton
    fontSize: 40px
    fontWeight: '400'
    lineHeight: 44px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-mono-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
  badge-numeral:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '700'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  space-2xs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
  space-3xl: 4.5rem
  space-4xl: 6rem
  gutter-desktop: 1.5rem
  gutter-mobile: 1rem
  content-max-width: 75rem
---

## Brand & Style

This design system blends Swiss brutalism with contemporary high-stakes fintech confidence. Built around stark visual tension, it contrasts warm, organic ivory tones with pitch obsidian blacks and an unapologetic, high-voltage canary yellow. The tone is authoritative, punchy, and engineered: massive compressed typography makes immediate declarations, while hyper-structured rounded cards and monospaced micro-data establish operational precision.

The aesthetic avoids unnecessary ornament in favor of raw graphic impact, high spatial discipline, and tactical clarity. It serves power users, global digital nomads, and modern backers who expect high speed, uncompromising legibility, and an unmistakable brand silhouette that commands trust through sheer visual strength.

## Colors

The palette operates on three deliberate planes:
- **Primary Obsidian (`#111111`)**: Deep carbon black used for commanding typography, inverted hero blocks, and dark surface states. Deep variant `#0A0A0A` serves as root backdrop in dark zones; elevated dark cards rest on `#1C1C1A`.
- **Secondary Electric Canary (`#FFDF00`)**: A saturated, razor-sharp yellow engineered for maximum focal gravity. Applied to primary CTAs, numbered status pins, and spotlight banner containers.
- **Tertiary Warm Chalk / Cream (`#F4F2EB` / `#ECE9DF`)**: The foundational canvas color. Replaces sterile cool white with a tactile, editorial warmth that softens the eye without dampening the pitch-black contrast.
- **Supportive Neutrals**: Muted body text (`#504F4C`), hairline card borders (`#E2DFD4` on light surfaces, `#282826` on dark surfaces), and pure functional accents.

## Typography

The typography strategy is intentionally bifurcated:
- **Display & Headlines**: Set in all-caps condensed grotesque type with compressed tracking and line heights matching the font size 1:1. Headlines behave like physical architecture—heavy, unyielding, and front-and-center.
- **Body & Structural Text**: Handled by a geometric grotesque sans-serif with neutral proportions, offering effortless readability across dense transactional summaries and multi-row feature cards.
- **Data & Micro-Accents**: Rendered in a fixed-width monospace face for step identifiers (`01`, `02`), ticker amounts, ISO currencies, timestamps, and hash receipts.

## Layout & Spacing

Layout adheres to a modular 12-column grid system capped at a maximum width of 1200px (`75rem`), framed with generous alternating block sections:
- **Section Rhythm**: Sections pivot decisively between cream surfaces (`#F4F2EB`), full obsidian fields (`#111111`), and vivid canary blocks (`#FFDF00`). Each section transition features vertical padding between `4.5rem` and `6rem`.
- **Card Grids**: Feature modules arrange into balanced 3-column rows on desktop (spanning 4 columns each), collapsing to 2 columns on tablet, and single-column full-width stacks on mobile.
- **Inner Padding**: Standard container cards use `1.5rem` internal padding; compact notification and ledger items scale to `1rem`.

## Elevation & Depth

Visual hierarchy prioritizes crisp surface demarcation over fuzzy blur elevation:
- **Card Separation**: Achieved via 1px structural hairline outlines (`#E2DFD4` on light mode; `#262624` on dark mode) combined with tonal surface stepping rather than floating shadows.
- **Tactile Overlays**: Floating interaction cards and physical wallet mockups utilize a single ultra-crisp directional shadow: `0 8px 0px #111111` or soft diffuse ambient depth: `0 16px 36px -8px rgba(0, 0, 0, 0.12)`.
- **Z-Index Layering**: Overlapping card visual decks stack physical card layers using a consistent 12px vertical offset and slight scale down (`scale(0.97)`), recreating the physical feel of cards fanned inside a leather or metal sleeve.

## Shapes

The geometric signature is grounded in smooth continuous curvature paired with pure circular primitives:
- **Card Enclosures**: Standard card shells use a `1rem` (16px) corner radius, softening the bold, condensed typography.
- **Pills & Badges**: Interactive buttons, category pills, and numeric step indicators are fully circular or pill-shaped (`9999px`).
- **Tactile Inputs & Slots**: Embedded device screens and mini transaction components adopt a `1.25rem` radius to mirror physical mobile device glass.

## Components

- **Action Buttons**: Fully rounded pill silhouettes (`padding: 0.75rem 1.75rem`). Primary buttons sport electric canary yellow (`#FFDF00`) with carbon black text (`#111111`) and font-weight 700. Secondary buttons feature solid carbon black with white text or hairline-bordered ghost variations.
- **Numbered Indicator Badges**: Signature circular badges (`28px x 28px` or `32px x 32px`) filled with vibrant canary yellow, featuring centered monospaced two-digit numbering (`01`, `02`, `03`) in 700-weight black ink.
- **Information & Metric Cards**: Rounded rectangular containers filled with stark white (`#FFFFFF`) or off-white (`#ECE9DF`) on light sections, and deep charcoal (`#1A1A18`) on dark sections. Headers inside cards begin with the numeric badge followed by bold condensed headlines and concise descriptive copy.
- **Transaction Ledger Rows**: Linear transaction feed elements with leading icon avatar bubbles (40px circular with minimal line icons), bold partner/vendor labels, subordinate monospaced date stamps, and bold monospaced delta amounts (e.g., `-$25.00`).
- **Flag & Country Discs**: Circular country tokens (44px) aligned in rhythmic horizontal carousel rows with crisp 1px borders, visualizing frictionless global interoperability.
- **Input Fields**: Crisp pill or smooth rounded forms (`rounded-xl`), neutral off-white fill, zero blur shadows, high-contrast dark border focus state with a 2px outline offset.