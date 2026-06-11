// Tests for supabase/functions/_shared/finance.ts (single source of truth
// for interest calculation, shared by frontend and Edge Functions).
// Transpiles the TS module with esbuild, then asserts known scenarios.
import { build } from 'esbuild';
import { strict as assert } from 'node:assert';
import { pathToFileURL } from 'node:url';
import { mkdirSync, rmSync } from 'node:fs';

const OUT_DIR = '.claude/tmp-test';
mkdirSync(OUT_DIR, { recursive: true });
await build({
  entryPoints: ['supabase/functions/_shared/finance.ts'],
  bundle: true,
  format: 'esm',
  outfile: `${OUT_DIR}/finance.mjs`,
  logLevel: 'silent',
});
const fin = await import(pathToFileURL(`${OUT_DIR}/finance.mjs`).href);

const MS = (iso) => Date.parse(iso);
const loan = (over = {}) => ({
  id: 'L1', clientid: 'C1', initialcapital: 1_000_000, currentcapital: 1_000_000,
  monthlyrate: 10, startdate: MS('2026-01-15T12:00:00Z'), isactive: true, ...over,
});
const tx = (date, description, amount = 0) => ({
  id: 't' + date, loanid: 'L1', amount, date: MS(date), description,
});

let n = 0;
const t = (name, fn) => { fn(); n++; console.log(`ok ${n} - ${name}`); };

t('3 anniversaries, no payments → pending 300k', () => {
  const s = fin.computeInterestState(loan(), [], MS('2026-04-20T12:00:00Z'));
  assert.equal(s.interestOwed, 300_000);
  assert.equal(s.pendingInterest, 300_000);
});

t('interest payment reduces pending', () => {
  const txs = [tx('2026-02-20T12:00:00Z', 'Pago Intereses', 100_000)];
  const s = fin.computeInterestState(loan(), txs, MS('2026-04-20T12:00:00Z'));
  assert.equal(s.pendingInterest, 200_000);
});

t('capital injection — current production semantics (documented)', () => {
  // NOTA: create-loan ya suma la inyección a initialcapital en BD, y la
  // simulación la vuelve a sumar al procesar la tx. El período PRE-inyección
  // se calcula sobre el capital final (1.5M, no 1M). Comportamiento idéntico
  // a utils/finance.ts y .claude/simulate.py — se preserva a propósito.
  const txs = [tx('2026-02-20T12:00:00Z', 'INYECCIÓN CAPITAL (+500000)', 0)];
  const l = loan({ currentcapital: 1_500_000, initialcapital: 1_500_000 });
  // Feb 15 sobre 1.5M = 150k; ancla a 1.5M; Mar 15 + Apr 15 = 150k c/u → 450k
  const s = fin.computeInterestState(l, txs, MS('2026-04-20T12:00:00Z'));
  assert.equal(s.interestOwed, 450_000);
});

t('abono a capital reduces base for later periods', () => {
  const txs = [tx('2026-02-20T12:00:00Z', 'Abono a Capital', 500_000)];
  const l = loan({ currentcapital: 500_000 });
  // Feb 15 on 1M = 100k; Mar 15 + Apr 15 on 500k = 50k each → 200k
  const s = fin.computeInterestState(l, txs, MS('2026-04-20T12:00:00Z'));
  assert.equal(s.interestOwed, 200_000);
  assert.equal(s.pendingInterest, 200_000);
});

t('mixed payment splits interest-first', () => {
  const txs = [tx('2026-02-20T12:00:00Z', 'Abono Mixto (Int + Cap)', 150_000)];
  const l = loan({ currentcapital: 950_000 });
  // Feb 15 owed 100k → 100k to interest, 50k to capital.
  // Mar 15 + Apr 15 on 950k = 95k each → owed 290k, paid 100k → pending 190k
  const s = fin.computeInterestState(l, txs, MS('2026-04-20T12:00:00Z'));
  assert.equal(s.pendingInterest, 190_000);
});

t('end-of-month start clamps anniversary day', () => {
  const l = loan({ startdate: MS('2026-01-31T12:00:00Z') });
  // 2026 is not a leap year → Feb anniversary on Feb 28
  const s1 = fin.computeInterestState(l, [], MS('2026-02-27T12:00:00Z'));
  assert.equal(s1.interestOwed, 0);
  const s2 = fin.computeInterestState(l, [], MS('2026-03-01T12:00:00Z'));
  assert.equal(s2.interestOwed, 100_000);
});

t('capital anchors to DB currentcapital when diverged', () => {
  // BD dice 800k pero las txs implican 1M → el ancla se aplica tras procesar
  // las txs (aquí: ninguna), así que TODO el interés se genera sobre 800k.
  const l = loan({ currentcapital: 800_000 });
  const s = fin.computeInterestState(l, [], MS('2026-02-16T12:00:00Z'));
  assert.equal(s.interestOwed, 80_000); // Feb 15 sobre 800k anclado
  assert.equal(s.runningCapital, 800_000);
});

t('calculatePendingInterest helper matches', () => {
  const p = fin.calculatePendingInterest(loan(), [], MS('2026-04-20T12:00:00Z'));
  assert.equal(p, 300_000);
});

t('breakdown: mixed payment splits interest-first', () => {
  const txs = [
    tx('2026-01-15T13:00:00Z', 'APERTURA DE CRÉDITO', 0),
    tx('2026-02-20T12:00:00Z', 'Abono Mixto (Int + Cap)', 150_000),
  ];
  const b = fin.computePaymentBreakdown(loan({ currentcapital: 950_000 }), txs);
  assert.equal(b.length, 2);
  assert.equal(b[0].kind, 'apertura');
  assert.equal(b[1].kind, 'mixto');
  assert.equal(b[1].toInterest, 100_000); // Feb 15 owed 100k
  assert.equal(b[1].toCapital, 50_000);
});

t('breakdown: liquidation splits pending interest + capital', () => {
  // owed Feb 100k, nothing paid; settle Feb 20 for 1.1M → 100k interest + 1M capital
  const txs = [tx('2026-02-20T12:00:00Z', 'PAGO DE LIQUIDACIÓN TOTAL', 1_100_000)];
  const b = fin.computePaymentBreakdown(loan({ currentcapital: 0, isactive: false }), txs);
  assert.equal(b.length, 1);
  assert.equal(b[0].kind, 'liquidacion');
  assert.equal(b[0].toInterest, 100_000);
  assert.equal(b[0].toCapital, 1_000_000);
});

t('breakdown: interest, capital and injection kinds', () => {
  const txs = [
    tx('2026-02-16T12:00:00Z', 'Pago Intereses', 100_000),
    tx('2026-02-17T12:00:00Z', 'Abono a Capital', 200_000),
    tx('2026-02-18T12:00:00Z', 'INYECCIÓN CAPITAL (+500000)', 0),
  ];
  const b = fin.computePaymentBreakdown(loan({ currentcapital: 1_300_000 }), txs);
  assert.equal(b[0].kind, 'interes');
  assert.equal(b[0].toInterest, 100_000);
  assert.equal(b[1].kind, 'capital');
  assert.equal(b[1].toCapital, 200_000);
  assert.equal(b[2].kind, 'inyeccion');
  assert.equal(b[2].injectedAmount, 500_000);
});

rmSync(OUT_DIR, { recursive: true, force: true });
console.log(`\n${n} tests passed`);
