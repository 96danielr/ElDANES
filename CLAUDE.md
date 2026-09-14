# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EL DANES (Elite Finance) — a loan management and capital operations system with monthly interest calculations. Spanish-language UI for tracking loans, payments, clients, and financial analytics.

## Tech Stack

- **Frontend:** React 19 + TypeScript 5.8, Vite 6, Tailwind CSS (CDN), Recharts, Lucide icons
- **Backend:** Supabase (PostgreSQL + Edge Functions on Deno runtime)
- **State:** Pure React hooks (useState/useMemo/useEffect) — no external state library
- **Real-time:** Supabase channel subscriptions for live data sync

## Commands

```bash
npm run dev       # Dev server at http://localhost:3000
npm run build     # Production build
npm run preview   # Preview production build
```

No test framework is configured.

Edge Functions are deployed with:
```bash
supabase functions deploy <function-name> --project-ref ougsplrbvypxflyyfojm
```

## Architecture

### Data Flow

`App.tsx` is the single entry point — holds all global state (`clients`, `loans`, `transactions`) and passes props to views. No router; navigation is tab-based via a `currentView` state variable.

A centralized `fetchData()` function loads all three tables from Supabase on mount and on any real-time change event.

### Views (in `views/`)

| View | Purpose |
|------|---------|
| `Dashboard.tsx` | Active loan portfolio with status indicators and quick payment; pencil in the loan modal edits titular name, rate, start date and phone (`onUpdateLoan(loanId, patch)` + `onUpdateClient`) |
| `NewLoan.tsx` | Two-step loan creation (select/create client → configure loan) |
| `ClientsList.tsx` | Client CRUD with active loan validation |
| `Stats.tsx` | Financial analytics with Recharts visualizations |
| `Movimientos.tsx` | Transaction history (last 20) |

### Financial Logic (`utils/finance.ts`)

- **Month-vencido model:** interest is charged for the *previous* month, not the current one
- **Payment distribution:** payments go to pending interest first, then capital reduction
- **Loan status colors:** green (paid this month), yellow (1 month overdue), red (2+ months overdue)
- `calculateLoanSummary()` and `getGeneratedPeriods()` are the core calculation functions

### Edge Functions (`supabase/functions/`)

All write operations go through Edge Functions (not direct client writes):
- `create-loan` — creates loan or injects capital into existing one
- `register-payment` — splits payment between interest and capital, updates loan
- `settle-loan` — liquidates loan atomically (final payment + mark inactive)
- `update-loan` — modifies loan parameters (rate, owner tag, hasletra, startdate). Capital is rejected. A new startdate must not be in the future nor later than the loan's first real payment (interest is recomputed from startdate)

These use `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS.

### Key Files

- `types.ts` — all TypeScript interfaces (`Client`, `Loan`, `Transaction`, `LoanSummary`)
- `lib/supabase.ts` — Supabase client initialization
- `lib/functions.ts` — Edge Function call wrappers
- `hooks/useTheme.ts` — dark/light theme with localStorage persistence
- `components/ConfirmModal.tsx` — global confirmation dialog (danger/warning/info variants)
- `components/Login.tsx` — password gate UI; imports `DNFusionLogo` from `App.tsx`
- `utils/reportPdf.ts` — generates downloadable monthly PDF report using jsPDF + jspdf-autotable; called from `App.tsx` header button

## Database Tables

Three tables: `clients` (id, name, phone, createdat), `loans` (id, clientid, initialcapital, currentcapital, monthlyrate, startdate, isactive, owner), `transactions` (id, loanid, amount, date, description). All date/time fields are Unix timestamps (ms). `owner` is a free-text label used to group/tag loans (displayed as "Etiqueta"). RLS policies are defined in `supabase-policies.sql`.

## Path Alias

`@/*` maps to the project root (configured in both `tsconfig.json` and `vite.config.ts`).

## Authentication

Client-side password gate only — no Supabase auth. `App.tsx` checks `localStorage.getItem('danes_auth') === 'authenticated'` on mount and renders `Login.tsx` if not set. Password validation runs locally in `App.tsx`.

## UI Conventions

- **Theme "Libro mayor nocturno"** (single committed dark look) defined entirely in `index.html` `<style>` block — no separate CSS file. `hooks/useTheme.ts` still toggles a class but no CSS depends on it.
- Palette: page ink `#0E1411`, surface `#171F1B`, cream text `#F2ECDD`; **brass is the only accent** (`--brass #D9A441`, hover `#E8B65A`, deep `#A87A22`). Status: success `#5DBE8A`, warning `#E8853A` (orange, deliberately not gold so it never reads as accent), danger `#E3564F`, info/cyan `#6FB7C9`.
- Solid accent/status fills always carry ink text (`--on-accent #15110A`), never white — enforced by CSS overrides on `.bg-accent`, `.bg-success`, etc. The titular card (`bg-gradient-to-br from-accent`) is overridden to a deep bronze gradient so its white text keeps contrast.
- Fonts: **Fraunces** (headings, `h1–h4`, `.font-display`), **Instrument Sans** (body), **JetBrains Mono** tabular (`.font-mono`, money).
- Atmosphere: fixed radial brass/green glows on `body` plus an SVG grain overlay on `body::before` (z-index 0; app containers use `relative z-10`).
- Loan cards: `.glass-card.glass-green|yellow|red` draw a 3px status stripe on the left edge (`::before`) with a fading tint (`::after`).
- Tailwind CDN with inline config extending CSS-variable RGB tokens (`deep`, `surface`, `elevated`, `accent`, `success`, `warning`, `danger`, `cyan`, `dpurple` = accent alias).
- Utility CSS classes: `.glass-card`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.input-glass`, `.badge-*`, `.metric-card`, `.table-glass`, `.nav-glass`. `bg-white/N` utilities are remapped to cream tints; solid `bg-white` maps to the elevated surface.
- Mobile-first responsive: desktop uses header nav, mobile uses fixed bottom nav
- `DNFusionLogo` (brass coin with serif "D") is a named export from `App.tsx` (imported by `Login.tsx`)
- Visual QA without a session: build a throwaway Vite entry that renders the views with mock data and screenshot it with headless Chrome (`chrome --headless=new --screenshot`); keep it out of git.
