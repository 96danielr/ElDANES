# Glassmorphism Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Super Mario World pixel theme with a minimalist dark glassmorphism design using violet/indigo accent and DM Sans typography.

**Architecture:** Full CSS replacement in `index.html` (Tailwind config + `<style>` block) plus targeted fixes to hardcoded Mario colors in TSX files. No new files created, no component logic changes.

**Tech Stack:** Tailwind CSS CDN v3, CSS custom properties, `backdrop-filter: blur()`, DM Sans (Google Fonts).

---

## Task 1: Rewrite `index.html` — Tailwind config + Google Fonts + CSS block

**Files:**
- Modify: `index.html` (lines 10–33 Tailwind config, line 37 font link, lines 38–820 style block)

- [ ] **Step 1: Replace Tailwind config block (lines 10–33)**

Replace the entire `<script>tailwind.config = { ... }</script>` block with:

```html
<script>
tailwind.config = {
  theme: {
    extend: {
      colors: {
        deep:     'rgb(var(--deep-rgb) / <alpha-value>)',
        surface:  { DEFAULT: 'rgb(var(--surface-rgb) / <alpha-value>)', hover: 'rgb(var(--surface-hover-rgb) / <alpha-value>)' },
        elevated: 'rgb(var(--elevated-rgb) / <alpha-value>)',
        accent:   { DEFAULT: 'rgb(var(--accent-rgb) / <alpha-value>)', hover: 'rgb(var(--accent-hover-rgb) / <alpha-value>)', glow: 'rgb(var(--accent-rgb) / 0.20)' },
        success:  { DEFAULT: 'rgb(var(--success-rgb) / <alpha-value>)', glow: 'rgb(var(--success-rgb) / 0.15)' },
        warning:  { DEFAULT: 'rgb(var(--warning-rgb) / <alpha-value>)', glow: 'rgb(var(--warning-rgb) / 0.15)' },
        danger:   { DEFAULT: 'rgb(var(--danger-rgb) / <alpha-value>)', glow: 'rgb(var(--danger-rgb) / 0.15)' },
        dpurple:  { DEFAULT: 'rgb(var(--accent-rgb) / <alpha-value>)', glow: 'rgb(var(--accent-rgb) / 0.20)' },
        cyan:     { DEFAULT: 'rgb(var(--cyan-rgb) / <alpha-value>)' },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
    }
  }
}
</script>
```

- [ ] **Step 2: Replace Google Fonts link (line 37)**

Replace:
```html
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap" rel="stylesheet">
```
With:
```html
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap" rel="stylesheet">
```

- [ ] **Step 3: Replace the entire `<style>` block**

Delete everything from `<style>` to `</style>` (lines 38–820) and replace with:

```html
<style>
    /* ========================================
       GLASSMORPHISM THEME — ElDANES
       ======================================== */

    /* RGB channel variables for Tailwind opacity modifier support */
    :root {
        --deep-rgb:         10 15 30;
        --surface-rgb:      255 255 255;       /* used at low opacity */
        --surface-hover-rgb:255 255 255;
        --elevated-rgb:     255 255 255;

        --accent-rgb:       139 92 246;        /* violet #8B5CF6 */
        --accent-hover-rgb: 124 58 237;        /* #7C3AED */
        --success-rgb:      16 185 129;        /* #10B981 */
        --warning-rgb:      245 158 11;        /* #F59E0B */
        --danger-rgb:       239 68 68;         /* #EF4444 */
        --cyan-rgb:         6 182 212;         /* #06B6D4 */

        /* Semantic CSS variables (used directly in TSX via var()) */
        --bg-surface:       rgba(255,255,255,0.08);
        --bg-surface-hover: rgba(255,255,255,0.12);
        --bg-elevated:      rgba(255,255,255,0.12);
        --bg-overlay:       rgba(10,15,30,0.85);
        --bg-deep:          #0A0F1E;

        --accent:           #8B5CF6;
        --accent-hover:     #7C3AED;
        --accent-glow:      rgba(139,92,246,0.20);
        --accent-deep:      #7C3AED;

        --success:          #10B981;
        --success-glow:     rgba(16,185,129,0.15);
        --warning:          #F59E0B;
        --warning-glow:     rgba(245,158,11,0.15);
        --danger:           #EF4444;
        --danger-glow:      rgba(239,68,68,0.15);
        --purple:           #8B5CF6;
        --purple-glow:      rgba(139,92,246,0.20);
        --cyan:             #06B6D4;

        --text-primary:     #F1F5F9;
        --text-secondary:   #94A3B8;
        --text-tertiary:    #64748B;

        --border-subtle:    rgba(255,255,255,0.06);
        --border-default:   rgba(255,255,255,0.10);
        --border-hover:     rgba(255,255,255,0.20);
        --border-accent:    rgba(139,92,246,0.40);

        /* Legacy aliases kept for TSX compatibility */
        --coin:             #8B5CF6;
        --coin-glow:        rgba(139,92,246,0.25);
        --pixel-shadow:     none;
        --pixel-shadow-sm:  none;
        --pixel-shadow-accent: none;
        --pixel-shadow-inset: none;
        --chrome-highlight: rgba(255,255,255,0.10);
        --chrome-shadow:    rgba(0,0,0,0.20);
    }

    *, *::before, *::after { box-sizing: border-box; }

    /* ═══════════════════════════════════════
       BODY
       ═══════════════════════════════════════ */
    body {
        font-family: 'DM Sans', system-ui, sans-serif;
        -webkit-tap-highlight-color: transparent;
        overflow-x: hidden;
        background-color: #0A0F1E;
        background-image:
            radial-gradient(ellipse 900px 700px at 80% -5%, rgba(139,92,246,0.10) 0%, transparent 65%),
            radial-gradient(ellipse 700px 600px at 15% 105%, rgba(99,102,241,0.07) 0%, transparent 65%);
        background-attachment: fixed;
        color: var(--text-primary);
        min-height: 100vh;
        min-height: 100dvh;
        font-size: 15px;
    }

    body::before, body::after { display: none; }

    @media (max-width: 768px) {
        body { background-attachment: scroll; }
    }

    /* ═══════════════════════════════════════
       TYPOGRAPHY
       ═══════════════════════════════════════ */
    h1, h2, h3, h4, .font-display {
        font-family: 'DM Sans', system-ui, sans-serif;
        font-weight: 600;
        color: var(--text-primary);
        line-height: 1.4;
    }

    .font-mono {
        font-family: 'DM Sans', system-ui, sans-serif;
        font-weight: 500;
        font-variant-numeric: tabular-nums;
    }

    input, textarea, select {
        font-size: 16px !important;
        font-family: 'DM Sans', system-ui, sans-serif !important;
    }

    @media screen and (min-width: 768px) {
        input, textarea, select { font-size: inherit !important; }
    }

    /* ═══════════════════════════════════════
       GLASS CARD
       ═══════════════════════════════════════ */
    .glass-card {
        background: rgba(255,255,255,0.08);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255,255,255,0.12);
        border-top-color: rgba(255,255,255,0.20);
        border-radius: 12px;
        transition: border-color 200ms ease-out, box-shadow 200ms ease-out;
        position: relative;
        overflow: hidden;
    }

    .glass-card:hover {
        border-color: rgba(139,92,246,0.40);
        box-shadow: 0 0 24px rgba(139,92,246,0.12);
    }

    .glass-card.glass-green {
        border-color: rgba(16,185,129,0.25);
        border-top-color: rgba(16,185,129,0.40);
    }
    .glass-card.glass-green:hover {
        border-color: rgba(16,185,129,0.50);
        box-shadow: 0 0 20px rgba(16,185,129,0.10);
    }

    .glass-card.glass-red {
        border-color: rgba(239,68,68,0.25);
        border-top-color: rgba(239,68,68,0.40);
    }
    .glass-card.glass-red:hover {
        border-color: rgba(239,68,68,0.50);
        box-shadow: 0 0 20px rgba(239,68,68,0.10);
    }

    .glass-card.glass-yellow {
        border-color: rgba(245,158,11,0.25);
        border-top-color: rgba(245,158,11,0.40);
    }
    .glass-card.glass-yellow:hover {
        border-color: rgba(245,158,11,0.50);
        box-shadow: 0 0 20px rgba(245,158,11,0.10);
    }

    .glass-card.glass-purple {
        border-color: rgba(139,92,246,0.30);
        border-top-color: rgba(139,92,246,0.50);
    }
    .glass-card.glass-purple:hover {
        border-color: rgba(139,92,246,0.60);
        box-shadow: 0 0 20px rgba(139,92,246,0.15);
    }

    .glass-card.glass-blue {
        border-color: rgba(99,102,241,0.25);
        border-top-color: rgba(99,102,241,0.40);
    }
    .glass-card.glass-blue:hover {
        border-color: rgba(99,102,241,0.50);
        box-shadow: 0 0 20px rgba(99,102,241,0.10);
    }

    /* ═══════════════════════════════════════
       NAVIGATION
       ═══════════════════════════════════════ */
    .nav-glass {
        background: rgba(10,15,30,0.80);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-bottom: 1px solid rgba(255,255,255,0.08);
        -webkit-transform: translateZ(0);
        transform: translateZ(0);
        will-change: transform;
    }

    /* ═══════════════════════════════════════
       INPUTS
       ═══════════════════════════════════════ */
    .input-glass {
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.10);
        border-radius: 8px;
        color: var(--text-primary);
        transition: border-color 200ms ease-out, box-shadow 200ms ease-out;
        font-family: 'DM Sans', system-ui, sans-serif;
    }

    .input-glass:focus {
        outline: none;
        border-color: #8B5CF6;
        box-shadow: 0 0 0 3px rgba(139,92,246,0.20);
    }

    .input-glass::placeholder {
        color: var(--text-tertiary);
    }

    /* ═══════════════════════════════════════
       BUTTONS
       ═══════════════════════════════════════ */
    .btn-primary {
        background: #8B5CF6;
        border: none;
        color: #FFFFFF;
        font-weight: 600;
        font-family: 'DM Sans', system-ui, sans-serif;
        font-size: 14px;
        border-radius: 8px;
        cursor: pointer;
        box-shadow: 0 4px 14px rgba(139,92,246,0.40);
        transition: background 200ms ease-out, box-shadow 200ms ease-out, transform 100ms ease-out;
        position: relative;
        overflow: hidden;
    }

    .btn-primary:hover {
        background: #7C3AED;
        box-shadow: 0 6px 20px rgba(139,92,246,0.50);
    }

    .btn-primary:active {
        transform: translateY(1px);
        box-shadow: 0 2px 8px rgba(139,92,246,0.30);
    }

    .btn-primary:disabled {
        opacity: 0.40;
        pointer-events: none;
    }

    .btn-secondary {
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.12);
        color: var(--text-primary);
        font-family: 'DM Sans', system-ui, sans-serif;
        font-weight: 500;
        border-radius: 8px;
        cursor: pointer;
        transition: border-color 200ms ease-out, background 200ms ease-out;
    }

    .btn-secondary:hover {
        border-color: rgba(139,92,246,0.40);
        background: rgba(139,92,246,0.08);
    }

    .btn-danger {
        background: rgba(239,68,68,0.15);
        border: 1px solid rgba(239,68,68,0.30);
        color: #EF4444;
        font-family: 'DM Sans', system-ui, sans-serif;
        font-weight: 500;
        border-radius: 8px;
        cursor: pointer;
        transition: background 200ms ease-out, border-color 200ms ease-out;
    }

    .btn-danger:hover {
        background: rgba(239,68,68,0.25);
        border-color: rgba(239,68,68,0.50);
    }

    /* ═══════════════════════════════════════
       METRIC CARDS
       ═══════════════════════════════════════ */
    .metric-card {
        background: rgba(255,255,255,0.08);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255,255,255,0.12);
        border-top-color: rgba(255,255,255,0.20);
        border-radius: 12px;
        overflow: hidden;
        transition: border-color 200ms ease-out, box-shadow 200ms ease-out;
        position: relative;
    }

    .metric-card::before {
        content: '';
        display: block;
        height: 2px;
        background: var(--accent);
        position: absolute;
        top: 0; left: 0; right: 0;
        pointer-events: none;
    }

    .metric-card.blue::before   { background: #3B82F6; }
    .metric-card.emerald::before { background: #10B981; }
    .metric-card.purple::before { background: #8B5CF6; }
    .metric-card.cyan::before   { background: #06B6D4; }
    .metric-card.yellow::before { background: #F59E0B; }
    .metric-card.red::before    { background: #EF4444; }
    .metric-card.orange::before { background: #F97316; }

    .metric-card:hover {
        border-color: rgba(139,92,246,0.30);
        box-shadow: 0 0 16px rgba(139,92,246,0.08);
    }

    /* ═══════════════════════════════════════
       SCROLLBAR
       ═══════════════════════════════════════ */
    ::-webkit-scrollbar { width: 6px; height: 6px; }

    ::-webkit-scrollbar-track {
        background: rgba(255,255,255,0.04);
    }

    ::-webkit-scrollbar-thumb {
        background: rgba(139,92,246,0.40);
        border-radius: 3px;
    }

    ::-webkit-scrollbar-thumb:hover {
        background: rgba(139,92,246,0.70);
    }

    ::-webkit-scrollbar-corner {
        background: transparent;
    }

    /* Hide number input spinners */
    input::-webkit-outer-spin-button,
    input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }
    input[type=number] { -moz-appearance: textfield; }

    /* ═══════════════════════════════════════
       ANIMATIONS
       ═══════════════════════════════════════ */
    @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
    }

    @keyframes fadeIn {
        from { opacity: 0; }
        to   { opacity: 1; }
    }

    @keyframes slideInFromBottom {
        from { opacity: 0; transform: translateY(16px); }
        to   { opacity: 1; transform: translateY(0); }
    }

    .animate-fade-in-up  { animation: fadeInUp 0.25s ease-out forwards; }
    .animate-fade-in     { animation: fadeIn 0.20s ease-out forwards; }
    .animate-slide-up    { animation: slideInFromBottom 0.28s ease-out forwards; }

    .delay-100 { animation-delay: 100ms; }
    .delay-200 { animation-delay: 200ms; }
    .delay-300 { animation-delay: 300ms; }
    .delay-400 { animation-delay: 400ms; }
    .delay-500 { animation-delay: 500ms; }

    /* ═══════════════════════════════════════
       BADGES
       ═══════════════════════════════════════ */
    .badge {
        display: inline-flex;
        align-items: center;
        padding: 3px 10px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        font-family: 'DM Sans', system-ui, sans-serif;
        letter-spacing: 0.04em;
        border: 1px solid transparent;
    }

    .badge-success {
        background: rgba(16,185,129,0.15);
        color: #34D399;
        border-color: rgba(16,185,129,0.30);
    }

    .badge-warning {
        background: rgba(245,158,11,0.15);
        color: #FBD34D;
        border-color: rgba(245,158,11,0.30);
    }

    .badge-danger {
        background: rgba(239,68,68,0.15);
        color: #F87171;
        border-color: rgba(239,68,68,0.30);
    }

    .badge-info {
        background: rgba(139,92,246,0.15);
        color: #A78BFA;
        border-color: rgba(139,92,246,0.30);
    }

    /* ═══════════════════════════════════════
       MODAL OVERLAY
       ═══════════════════════════════════════ */
    .modal-overlay {
        background: rgba(10,15,30,0.85);
    }

    /* ═══════════════════════════════════════
       TABLE
       ═══════════════════════════════════════ */
    .table-glass {
        background: rgba(255,255,255,0.06);
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.10);
        overflow: hidden;
    }

    .table-glass th {
        background: rgba(255,255,255,0.05);
        color: var(--text-secondary);
        font-weight: 600;
        font-family: 'DM Sans', system-ui, sans-serif;
        text-transform: uppercase;
        font-size: 11px;
        letter-spacing: 0.08em;
        border-bottom: 1px solid rgba(255,255,255,0.08);
    }

    .table-glass tr {
        border-bottom: 1px solid rgba(255,255,255,0.06);
        transition: background 150ms ease-out;
    }

    .table-glass tr:hover {
        background: rgba(139,92,246,0.06);
    }

    .table-glass tr:last-child {
        border-bottom: none;
    }

    /* ═══════════════════════════════════════
       COLORED TEXT — glass-compliant
       ═══════════════════════════════════════ */
    .text-accent  { color: #A78BFA !important; }
    .text-success { color: #34D399 !important; }
    .text-warning { color: #FBD34D !important; }
    .text-danger  { color: #F87171 !important; }
    .text-dpurple { color: #A78BFA !important; }
    .text-cyan    { color: #22D3EE !important; }

    /* ═══════════════════════════════════════
       SELECTION & FOCUS
       ═══════════════════════════════════════ */
    ::selection {
        background: rgba(139,92,246,0.35);
        color: #FFFFFF;
    }

    :focus-visible {
        outline: 2px solid #8B5CF6;
        outline-offset: 2px;
    }

    .recharts-tooltip-wrapper {
        z-index: 100 !important;
    }
</style>
```

- [ ] **Step 4: Verify in browser**

Open `http://localhost:3000`. Expected:
- Dark navy background visible
- No cream/beige colors anywhere
- No pixel fonts
- Cards have glass blur effect
- Violet accent on interactive elements

---

## Task 2: Replace Logo and loading screen in `App.tsx`

**Files:**
- Modify: `App.tsx` (lines 19–91 logo, lines 361–375 loading screen)

- [ ] **Step 1: Replace `DNFusionLogo` component (lines 19–91)**

Replace the entire `DNFusionLogo` function (lines 19–91) with:

```tsx
export const DNFusionLogo = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="logo_ring" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="100%" stopColor="#06B6D4" />
      </linearGradient>
    </defs>
    <circle cx="20" cy="20" r="18" stroke="url(#logo_ring)" strokeWidth="2" fill="rgba(139,92,246,0.12)" />
    <text
      x="20" y="20"
      textAnchor="middle"
      dominantBaseline="central"
      fontFamily="'DM Sans', system-ui, sans-serif"
      fontSize="18"
      fontWeight="700"
      fill="#FFFFFF"
    >D</text>
  </svg>
);
```

- [ ] **Step 2: Replace loading screen (lines 361–375)**

Replace the loading `if` block:
```tsx
if (loading && clients.length === 0) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 relative z-10">
      <div className="relative">
        <DNFusionLogo size={80} className="animate-pulse" />
      </div>
      <div className="flex flex-col items-center gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--text-secondary)]" style={{ textShadow: '1px 1px 0px rgba(255,255,240,0.5)' }}>Cargando Mundo</p>
        <div className="flex gap-1.5">
          <span className="w-3 h-3 bg-[#F8D030] rounded-full animate-bounce" style={{ animationDelay: '0ms', boxShadow: '1px 1px 0px rgba(160,100,0,0.3)' }}></span>
          <span className="w-3 h-3 bg-[#C83018] rounded-full animate-bounce" style={{ animationDelay: '150ms', boxShadow: '1px 1px 0px rgba(100,20,10,0.3)' }}></span>
          <span className="w-3 h-3 bg-[#1E7A3E] rounded-full animate-bounce" style={{ animationDelay: '300ms', boxShadow: '1px 1px 0px rgba(20,60,30,0.3)' }}></span>
        </div>
      </div>
    </div>
  );
```

With:
```tsx
if (loading && clients.length === 0) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 relative z-10">
      <DNFusionLogo size={72} className="animate-pulse" />
      <div className="flex flex-col items-center gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-secondary)]">Cargando</p>
        <div className="flex gap-1.5">
          <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
          <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
          <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
        </div>
      </div>
    </div>
  );
```

- [ ] **Step 3: Commit**

```bash
git add index.html App.tsx
git commit -m "feat: apply glassmorphism theme — CSS + logo"
```

---

## Task 3: Fix hardcoded Mario colors in TSX components

**Files:**
- Modify: `components/Login.tsx`, `components/ConfirmModal.tsx`, `views/Dashboard.tsx`, `views/NewLoan.tsx`, `views/Stats.tsx`, `views/ClientsList.tsx`, `views/Movimientos.tsx`

### Login.tsx

- [ ] **Step 1: Fix `Login.tsx` decorative orbs and top stripe (lines 32–37)**

In `Login.tsx`, replace lines 32–33 (decorative blur orbs):
```tsx
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-warning/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-success/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
```
With:
```tsx
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-accent/8 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-cyan/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
```

Replace line 37 (top accent stripe):
```tsx
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-warning to-success" />
```
With:
```tsx
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-accent via-dpurple to-cyan" />
```

### Stats.tsx — chart colors

- [ ] **Step 2: Fix hardcoded `var(--accent)` in Recharts fill (Stats.tsx ~line 360)**

Find in `Stats.tsx`:
```tsx
fill="var(--accent)"
```
This is fine — it will now correctly use `#8B5CF6`. No change needed.

### ConfirmModal.tsx — bg-elevated

- [ ] **Step 3: Verify `ConfirmModal.tsx` bg-elevated renders dark**

Open `http://localhost:3000`, trigger any confirm dialog. The modal background should be dark glass (`rgba(255,255,255,0.12)` on dark base). If it looks white/opaque, find in `ConfirmModal.tsx`:
```tsx
className="... bg-elevated ..."
```
And replace `bg-elevated` with `bg-[rgba(15,20,40,0.95)]`.

### Global: remove `rounded-xl` override impact

- [ ] **Step 4: Verify border-radius on all rounded-* elements**

The old CSS had `.rounded-xl { border-radius: 0px !important }` which forced all rounded utilities to square. This is now removed. All `rounded-xl`, `rounded-lg`, `rounded-full` in TSX files will now render their natural radius — this is correct for the new design. No changes needed.

- [ ] **Step 5: Final visual check**

Open `http://localhost:3000` and verify:
1. Login screen — dark background, glass card, violet button
2. Dashboard — dark cards with glass effect, violet metric accents, no cream colors
3. Badges — colored with transparency (green/yellow/red), dark background
4. Nav — translucent dark bar, violet active tab
5. Inputs — dark glass style, violet focus ring
6. Stats — charts visible, dark card backgrounds
7. No pixel fonts anywhere

- [ ] **Step 6: Commit**

```bash
git add components/Login.tsx components/ConfirmModal.tsx views/Dashboard.tsx views/NewLoan.tsx views/Stats.tsx views/ClientsList.tsx views/Movimientos.tsx
git commit -m "feat: remove Mario hardcoded colors from TSX components"
```
