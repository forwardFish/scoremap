---
name: AI Insight Pro
colors:
  surface: '#fef7ff'
  surface-dim: '#ded8df'
  surface-bright: '#fef7ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f8f2f9'
  surface-container: '#f2ecf3'
  surface-container-high: '#ece6ed'
  surface-container-highest: '#e6e1e8'
  on-surface: '#1d1b20'
  on-surface-variant: '#474555'
  inverse-surface: '#322f35'
  inverse-on-surface: '#f5eff6'
  outline: '#787586'
  outline-variant: '#c9c4d7'
  surface-tint: '#5b41dc'
  primary: '#593fda'
  on-primary: '#ffffff'
  primary-container: '#725bf4'
  on-primary-container: '#fffbff'
  inverse-primary: '#c8bfff'
  secondary: '#5e5b79'
  on-secondary: '#ffffff'
  secondary-container: '#ded9fd'
  on-secondary-container: '#605d7c'
  tertiary: '#006a34'
  on-tertiary: '#ffffff'
  tertiary-container: '#008644'
  on-tertiary-container: '#f6fff3'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5deff'
  primary-fixed-dim: '#c8bfff'
  on-primary-fixed: '#190064'
  on-primary-fixed-variant: '#4220c4'
  secondary-fixed: '#e4dfff'
  secondary-fixed-dim: '#c7c3e6'
  on-secondary-fixed: '#1a1833'
  on-secondary-fixed-variant: '#464460'
  tertiary-fixed: '#6dfe9c'
  tertiary-fixed-dim: '#4de082'
  on-tertiary-fixed: '#00210c'
  on-tertiary-fixed-variant: '#005227'
  background: '#fef7ff'
  on-background: '#1d1b20'
  surface-variant: '#e6e1e8'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.5px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-padding: 20px
  stack-gap: 16px
  inline-gap: 12px
  section-margin: 32px
---

## Brand & Style

The design system is centered around an **Intellectual & Playful AI** personality, specifically targeting students and parents. It aims to evoke feelings of encouragement, clarity, and technological sophistication.

The visual style is a blend of **Modern / Corporate** structure and **Soft Tactile** elements. It utilizes high-quality 3D assets and character illustrations to humanize the data-driven nature of AI analysis. The UI is characterized by high-radius containers, generous whitespace, and a luminous lavender-themed color palette that feels friendly yet authoritative.

## Colors

The palette is dominated by a vibrant primary purple, used for critical actions and brand identity. This is supported by a range of tinted lavenders for backgrounds and surfaces to maintain a cohesive, soft environment.

- **Primary:** `#7C66FF` (Main CTA, active states, progress indicators).
- **Secondary/Surface:** `#F8F7FF` (Main background) and `#E0DBFF` (Subtle highlights, secondary buttons).
- **Success:** `#4ADE80` (Status badges, completed steps).
- **Neutral:** `#1D1B20` (Primary text) and `#615E71` (Secondary/Caption text).
- **Accents:** Gradients transitioning from `#7C66FF` to `#A294FF` are used to add depth to buttons and primary headers.

## Typography

The typography uses **Plus Jakarta Sans** for its modern, friendly, and geometric characteristics that align perfectly with an AI-driven educational tool.

- **Hierarchy:** Strong contrast between bold headers and clean, legible body text.
- **Emphasis:** Important data points (like percentage scores) should use the Display LG style with increased weight.
- **Color:** Headlines use the deep neutral (`#1D1B20`), while helper text uses a medium-grey lavender (`#615E71`) to reduce visual noise.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a focus on vertical stacking. Elements are grouped into distinct semantic cards to handle data complexity.

- **Margins:** A consistent 20px side margin is used for mobile views.
- **Padding:** Main cards utilize 24px internal padding to provide "breathing room" for 3D assets and text blocks.
- **Rhythm:** An 8px base grid governs all spacing, ensuring vertical consistency between related content blocks.

## Elevation & Depth

Hierarchy is established through **Tonal Layers** and **Ambient Shadows**.

- **Surface Levels:** The base background is a very light lavender tint. Primary content sits on pure white cards.
- **Shadows:** Cards use a "Floating Soft" shadow: `0px 10px 30px rgba(124, 102, 255, 0.08)`. This tinting ensures the shadow feels integrated with the purple brand color rather than looking "dirty."
- **3D Depth:** Illustrations and icons use 3D rendering with soft specular highlights to create a sense of tangibility.

## Shapes

The design system employs an **Extra-Rounded** shape language to appear approachable and safe.

- **Primary Cards:** 24px - 32px corner radius.
- **Buttons:** Fully pill-shaped (radius: 100px) or 16px for secondary actions.
- **Input Fields:** 12px - 16px radius.
- **Visual Continuity:** Circular motifs are used in progress bars and avatar frames to reinforce the soft, organic feel.

## Components

### Buttons
- **Primary:** Gradient fill (`#7C66FF` to `#A294FF`), white text, pill-shaped, with a subtle drop shadow.
- **Secondary:** White background with a 1px border of `#7C66FF` or a light lavender fill.
- **Ghost:** Transparent background with purple text for low-priority actions.

### Cards
- Always white background with the standard "Floating Soft" shadow.
- Internal headers should be bold with a small icon or 3D illustration placeholder.

### Progress Indicators
- Large circular rings with a 12pt stroke.
- Background of the ring should be the secondary color, with the progress filled in the primary purple.

### List Items
- Grouped within cards. Separated by subtle 1px dividers in light lavender (`#F0EEFF`).
- Right-aligned chevrons to indicate drill-down capabilities.

### Chips / Tags
- Used for status (e.g., "AI Analysis Complete").
- Soft green background (`#EFFFF4`) with green text for positive states; light purple for neutral categories.