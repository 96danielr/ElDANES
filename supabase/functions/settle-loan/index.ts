// Edge Function: Liquidar préstamo
// El total a liquidar se recalcula EN EL SERVIDOR; si difiere materialmente
// del esperado por el cliente (datos desactualizados), responde 409 con el
// valor correcto. La escritura es atómica e idempotente vía settle_loan_atomic.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { calculatePendingInterest } from '../_shared/finance.ts';

const TOLERANCE = 1; // $1 por redondeo

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { loanId, totalDue } = await req.json();

    if (!loanId) return jsonResponse({ error: 'loanId es requerido' }, 400);
    // Cero es válido: crédito totalmente pagado se cierra sin cobro.
    const expected = Number(totalDue);
    if (!Number.isFinite(expected) || expected < 0) {
      return jsonResponse({ error: 'totalDue debe ser un número mayor o igual a 0' }, 400);
    }

    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('*')
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      return jsonResponse({ error: 'Préstamo no encontrado' }, 404);
    }
    if (!loan.isactive) {
      return jsonResponse({ error: 'El préstamo ya está liquidado' }, 400);
    }

    const { data: txs, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('loanid', loanId);

    if (txError) {
      return jsonResponse({ error: 'Error al leer transacciones', details: txError.message }, 500);
    }

    const pendingInterest = calculatePendingInterest(loan, txs ?? [], Date.now());
    const serverTotal = Number(loan.currentcapital) + pendingInterest;

    if (Math.abs(serverTotal - expected) > TOLERANCE) {
      return jsonResponse({
        error: `El total a liquidar cambió: el servidor calcula $${Math.round(serverTotal).toLocaleString()}. Refresca e intenta de nuevo.`,
        serverTotal,
      }, 409);
    }

    const { data: result, error: rpcError } = await supabase.rpc('settle_loan_atomic', {
      p_loan_id: loanId,
      p_amount: serverTotal,
      p_description: serverTotal > 0 ? 'PAGO DE LIQUIDACIÓN TOTAL' : 'CIERRE DE CRÉDITO (saldo en cero)',
    });

    if (rpcError) {
      const msg = rpcError.message?.trim();
      if (msg === 'ALREADY_SETTLED') return jsonResponse({ error: 'El préstamo ya está liquidado' }, 400);
      if (msg === 'LOAN_NOT_FOUND') return jsonResponse({ error: 'Préstamo no encontrado' }, 404);
      return jsonResponse({ error: 'Error al liquidar', details: rpcError.message }, 500);
    }

    return jsonResponse({
      success: true,
      message: serverTotal > 0 ? 'Crédito liquidado con éxito' : 'Crédito cerrado — saldo en cero',
      loan: result.loan,
      transaction: result.transaction,
    });
  } catch (error) {
    return jsonResponse({ error: 'Error interno del servidor', details: error.message }, 500);
  }
});
