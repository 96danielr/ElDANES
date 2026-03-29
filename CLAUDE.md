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
| `Dashboard.tsx` | Active loan portfolio with status indicators and quick payment |
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
- `update-loan` — modifies loan parameters (rate, capital)

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

- **Glassmorphism dark theme** defined entirely in `index.html` `<style>` block — no separate CSS file
- Accent purple `#8B5CF6`, cyan `#06B6D4`, background `#0A0F1E`
- Font: DM Sans (Google Fonts CDN)
- Tailwind CDN with inline config extending CSS variable-based color tokens (`deep`, `surface`, `elevated`, `accent`, `success`, `warning`, `danger`, `cyan`)
- Utility CSS classes: `.glass-card`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.input-glass`, `.badge-*`, `.metric-card`, `.table-glass`, `.nav-glass`
- Mobile-first responsive: desktop uses header nav, mobile uses fixed bottom nav
- `DNFusionLogo` SVG component is a named export from `App.tsx` (imported by `Login.tsx`)
