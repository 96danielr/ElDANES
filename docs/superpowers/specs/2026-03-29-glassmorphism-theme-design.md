# Glassmorphism Theme Redesign — ElDANES

**Date:** 2026-03-29
**Approach:** Full CSS replacement (Option A) — rewrite `index.html` CSS block + adjust hardcoded classes in `.tsx` files.

---

## 1. Motivation

Replace the Super Mario World pixel theme with a minimalist modern glassmorphism design. Goals:
- High visibility for financial data
- Premium dark fintech aesthetic
- Eliminate all retro/pixel-specific code (fonts, animations, sprites, bevel borders)

---

## 2. Design Tokens (CSS Variables)

```css
/* Backgrounds */
--bg-base:          #0A0F1E;                    /* Deep dark navy */
--bg-surface:       rgba(255,255,255,0.08);     /* Glass cards */
--bg-elevated:      rgba(255,255,255,0.12);     /* Modals, dropdowns */
--bg-overlay:       rgba(10,15,30,0.85);        /* Nav, overlays */

/* Accent — Violet/Indigo */
--accent:           #8B5CF6;
--accent-light:     #A78BFA;
--accent-hover:     #7C3AED;
--accent-glow:      rgba(139,92,246,0.20);
--accent-border:    rgba(139,92,246,0.40);

/* Semantic */
--success:          #10B981;
--success-light:    #34D399;
--success-glow:     rgba(16,185,129,0.15);
--warning:          #F59E0B;
--warning-light:    #FBD34D;
--warning-glow:     rgba(245,158,11,0.15);
--danger:           #EF4444;
--danger-light:     #F87171;
--danger-glow:      rgba(239,68,68,0.15);

/* Text */
--text-primary:     #F1F5F9;
--text-secondary:   #94A3B8;
--text-tertiary:    #64748B;

/* Borders */
--border:           rgba(255,255,255,0.10);
--border-hover:     rgba(255,255,255,0.20);
--border-accent:    rgba(139,92,246,0.40);

/* Radius */
--radius-card:      12px;
--radius-btn:       8px;
--radius-badge:     6px;
```

---

## 3. Typography

**Font:** DM Sans (Google Fonts) — replaces Press Start 2P + VT323.

| Role | Weight | Color | Notes |
|------|--------|-------|-------|
| Page titles (h1) | 600 | `--text-primary` | |
| Section titles (h2) | 600 | `--text-primary` | |
| Labels/sublabels | 500 | `--text-secondary` | uppercase, letter-spacing 0.08em |
| Body / data | 400 | `--text-primary` | |
| Large metric numbers | 700 | `#FFFFFF` | Dashboard KPIs |
| Placeholder | 400 | `--text-tertiary` | |

No pixel fonts. No text-shadow emboss effects.

---

## 4. Components

### Glass Card (`.glass-card`)
```css
background: rgba(255,255,255,0.08);
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);
border: 1px solid rgba(255,255,255,0.12);
border-top-color: rgba(255,255,255,0.20);   /* subtle top highlight */
border-radius: 12px;
transition: border-color 200ms ease-out, box-shadow 200ms ease-out;
```
Hover:
```css
border-color: rgba(139,92,246,0.40);
box-shadow: 0 0 20px rgba(139,92,246,0.15);
```

Color variants (`.glass-green`, `.glass-red`, `.glass-yellow`) use tinted borders + glow matching semantic colors.

### Metric Cards (`.metric-card`)
Glass card base + 2px top border line in accent color variant. Large white number + secondary label. No watermark, no texture.

### Buttons

**`.btn-primary`**
```css
background: #8B5CF6;
color: #FFFFFF;
border-radius: 8px;
box-shadow: 0 4px 14px rgba(139,92,246,0.40);
transition: background 200ms ease-out, box-shadow 200ms ease-out;
```
Hover: `background: #7C3AED`, stronger glow.

**`.btn-secondary`**
```css
background: rgba(255,255,255,0.08);
border: 1px solid rgba(255,255,255,0.12);
color: var(--text-primary);
border-radius: 8px;
```
Hover: border → `--border-accent`.

**`.btn-danger`**
```css
background: rgba(239,68,68,0.15);
border: 1px solid rgba(239,68,68,0.30);
color: #EF4444;
border-radius: 8px;
```

### Inputs (`.input-glass`)
```css
background: rgba(255,255,255,0.06);
border: 1px solid rgba(255,255,255,0.10);
border-radius: 8px;
color: var(--text-primary);
```
Focus:
```css
border-color: #8B5CF6;
box-shadow: 0 0 0 3px rgba(139,92,246,0.20);
outline: none;
```

### Badges
| Variant | Background | Text | Border |
|---------|-----------|------|--------|
| `.badge-success` | `rgba(16,185,129,0.15)` | `#34D399` | `rgba(16,185,129,0.30)` |
| `.badge-warning` | `rgba(245,158,11,0.15)` | `#FBD34D` | `rgba(245,158,11,0.30)` |
| `.badge-danger` | `rgba(239,68,68,0.15)` | `#F87171` | `rgba(239,68,68,0.30)` |
| `.badge-info` | `rgba(139,92,246,0.15)` | `#A78BFA` | `rgba(139,92,246,0.30)` |

### Navigation (`.nav-glass`)
```css
background: rgba(10,15,30,0.80);
backdrop-filter: blur(20px);
border-bottom: 1px solid rgba(255,255,255,0.08);
```
Active tab: `color: #A78BFA` + 2px bottom line `background: #8B5CF6`. Inactive: `color: --text-tertiary`.

---

## 5. Background & Decorative Elements

**Body background:**
```css
background-color: #0A0F1E;
background-image:
  radial-gradient(ellipse 800px 600px at 75% 0%, rgba(139,92,246,0.08) 0%, transparent 70%),
  radial-gradient(ellipse 600px 500px at 20% 100%, rgba(99,102,241,0.06) 0%, transparent 70%);
```

No SVG sprites. No Mario assets. No brick textures.

**Scrollbar:**
```css
width: 6px;
track: rgba(255,255,255,0.04);
thumb: rgba(139,92,246,0.40);
thumb-hover: rgba(139,92,246,0.70);
border-radius: 3px;
```

**Text selection:**
```css
background: rgba(139,92,246,0.30);
color: #FFFFFF;
```

---

## 6. Logo (DNFusionLogo in App.tsx)

Replace pixel coin SVG with:
- Circle with `stroke` gradient violet → cyan (`#8B5CF6` → `#06B6D4`), `strokeWidth: 2`
- Letter "D" centered, `DM Sans 700`, white
- No 3D layers, no pixel effects
- Size preserved (~32–40px)

---

## 7. Animations

All `steps()` timing replaced with `ease-out`. Duration: 200ms standard, 300ms for fade-ins.

```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

Remove: `pixelPulse`, `coinShimmer`, `coinBounce`, all stepped animations.

---

## 8. What Gets Removed

| Element | Location |
|---------|----------|
| Google Fonts: Press Start 2P, VT323 | `index.html` |
| All `steps()` animations | `index.html` |
| Pixel shadows (`3px 3px 0px`) | `index.html` |
| 4px bevel borders (highlight/shadow sides) | `index.html` |
| Mario SVG sprites (8 background sprites) | `index.html` |
| `border-radius: 0px` global override | `index.html` |
| Mario color gradient top stripes | `index.html` |
| `coinShimmer`, `coinBounce`, `pixelPulse` keyframes | `index.html` |
| Hardcoded Mario colors in `.tsx` files | 7 `.tsx` files |
| Pixel coin SVG logo | `App.tsx` |

---

## 9. Files Affected

| File | Change |
|------|--------|
| `index.html` | Full CSS block rewrite (~400 lines → ~250 lines) |
| `App.tsx` | New logo SVG + any hardcoded color/class fixes |
| `views/Dashboard.tsx` | Replace Mario-specific classes and hardcoded colors |
| `views/NewLoan.tsx` | Replace Mario-specific classes |
| `views/Stats.tsx` | Replace Mario-specific classes and hardcoded colors |
| `views/ClientsList.tsx` | Replace Mario-specific classes |
| `views/Movimientos.tsx` | Replace Mario-specific classes |
| `components/Login.tsx` | Replace Mario-specific classes |
| `components/ConfirmModal.tsx` | Replace Mario-specific classes |

---

## 10. Success Criteria

- No pixel fonts visible anywhere
- No Mario colors (cream, brown, pixel red) visible anywhere
- All cards render with glass effect (backdrop-filter blur)
- Violet accent consistent across buttons, active states, focus rings, hover glows
- All text passes WCAG AA contrast on `#0A0F1E` background
- Animations are smooth (no stepped/discrete feel)
- App fully functional — no broken layouts or missing states
