---
name: Luminous Learning
colors:
  surface: '#fdf8ff'
  surface-dim: '#ddd8e4'
  surface-bright: '#fdf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f7f1fd'
  surface-container: '#f1ecf8'
  surface-container-high: '#ebe6f2'
  surface-container-highest: '#e5e0ec'
  on-surface: '#1c1b23'
  on-surface-variant: '#474554'
  inverse-surface: '#312f38'
  inverse-on-surface: '#f4effb'
  outline: '#787585'
  outline-variant: '#c9c4d6'
  surface-tint: '#5c47cd'
  primary: '#5a45cb'
  on-primary: '#ffffff'
  primary-container: '#7360e5'
  on-primary-container: '#fffbff'
  inverse-primary: '#c8bfff'
  secondary: '#8f4e00'
  on-secondary: '#ffffff'
  secondary-container: '#fc9d41'
  on-secondary-container: '#6b3900'
  tertiary: '#006a35'
  on-tertiary: '#ffffff'
  tertiary-container: '#008645'
  on-tertiary-container: '#f6fff4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5deff'
  primary-fixed-dim: '#c8bfff'
  on-primary-fixed: '#190064'
  on-primary-fixed-variant: '#442bb5'
  secondary-fixed: '#ffdcc2'
  secondary-fixed-dim: '#ffb77a'
  on-secondary-fixed: '#2e1500'
  on-secondary-fixed-variant: '#6d3a00'
  tertiary-fixed: '#7efba4'
  tertiary-fixed-dim: '#61de8a'
  on-tertiary-fixed: '#00210c'
  on-tertiary-fixed-variant: '#005228'
  background: '#fdf8ff'
  on-background: '#1c1b23'
  surface-variant: '#e5e0ec'
typography:
  display-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Be Vietnam Pro
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-base:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-caps:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  container-margin: 16px
  gutter: 12px
---

## Brand & Style

The design system is crafted to evoke a sense of **encouragement, clarity, and academic confidence**. It targets a dual audience: students seeking an engaging, non-intimidating learning environment and parents/educators looking for professional, data-driven insights.

The visual style is a blend of **Modern Softness and Gentle Tactility**. It utilizes a "Playful Professional" aesthetic鈥攁voiding the austerity of traditional enterprise apps while maintaining enough structure to convey authority in educational diagnostics. Key characteristics include:
- **Approachability:** Softened corners and friendly mascot interactions.
- **Clarity:** A focus on information hierarchy to ensure diagnostic reports are digestible.
- **Engagement:** Subtle gradients and depth effects that make the interface feel alive and reactive to student progress.

## Colors

The palette is centered around a vibrant **Primary Purple**, chosen for its association with wisdom and creativity. This is balanced by a **Soft Lavender background** that reduces eye strain and distinguishes the app from "standard" white-label tools.

- **Primary (#7C69EF):** Used for main actions, headers, and key branding moments.
- **Secondary Orange (#FF9F43):** Acts as a high-visibility accent for status warnings, "in progress" states, or secondary highlights.
- **Tertiary Green (#27AE60):** Reserved for "Success," "Correct Answer," and "Achievement" states.
- **Neutral Palette:** Utilizes deep charcoals for text to maintain high legibility, avoiding pure black to keep the interface soft.

## Typography

This design system prioritizes **readability and warmth**. We use **Be Vietnam Pro** for headlines to provide a modern, friendly character, while **Plus Jakarta Sans** handles body text with its exceptionally clear, rounded letterforms that are accessible for younger readers.

Large numeric data or score summaries should use the semi-bold weights of the headline font to emphasize progress. Line heights are intentionally generous to improve focus and prevent the "wall of text" feeling often found in academic materials.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a focus on vertical stackability, ideal for mobile-first educational reporting.

- **Containers:** All main content is housed in cards with a standard 16px side margin.
- **Rhythm:** A 4px baseline grid ensures consistent vertical rhythm. Content blocks within reports (e.g., "Original Question" vs "AI Analysis") are separated by `lg` (24px) spacing to provide clear mental breaks between concepts.
- **Touch Targets:** Interactive elements like multiple-choice chips or navigation arrows maintain a minimum 44px hit area regardless of visual size.

## Elevation & Depth

We use **Tonal Layering and Soft Ambient Shadows** to create a sense of organized depth.

- **Level 1 (Surface):** The lavender background acts as the canvas.
- **Level 2 (Cards):** Primary containers use a pure white surface with a very soft, diffused shadow (Blur: 15px, Opacity: 4%, Color: Primary Tint). This makes the cards appear to "float" gently.
- **Level 3 (Active Elements):** Buttons and active chips use a slightly more pronounced shadow or a subtle inner-glow to signify interactability.
- **Mascot Integration:** The owl mascot and specific 3D-styled icons can break the "card plane" to add a sense of whimsey and verticality.

## Shapes

The shape language is **Rounded and Friendly**. We avoid sharp edges to keep the experience feeling safe and inviting for students.

- **Standard Cards:** 16px (rounded-lg) corner radius.
- **Input Fields & Buttons:** 12px (soft-medium) radius to distinguish from the container.
- **Tags/Chips:** 24px (pill-shaped) for a distinct "bubble" feel that invites tapping.
- **Mascot Elements:** Always use organic, soft curves with no harsh geometric intersections.

## Components

### Buttons
- **Primary:** Solid Primary Purple with white text. Slightly larger padding (12px vertical) for a "squishy," comfortable feel.
- **Secondary:** Ghost style with a Primary Purple border and tinted background (5% opacity).

### Cards
- **Report Cards:** White background, 16px padding. Includes a subtle "header-bar" (a 4px vertical line) on the left to denote different sections (e.g., Purple for AI, Green for Correct).

### Progress & Status
- **Success Chips:** Small pill-shaped badges using Tertiary Green with 10% opacity background and dark green text.
- **Alert Chips:** Secondary Orange background for "Needs Review" or "Unmastered" topics.

### Interaction Elements
- **Selection Chips:** For multiple-choice questions. High-contrast border on selection with a subtle scale-up animation (1.02x) to provide physical feedback.
- **Mascot Dialogue:** Speech bubbles use a 12px radius with a small tail pointing to the mascot, utilizing a subtle Primary-tinted gradient.