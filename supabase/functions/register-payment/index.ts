// Edge Function: Registrar pago
// El interés pendiente se calcula EN EL SERVIDOR (no se confía en el cliente).
// La escritura (transacción + capital) es atómica vía RPC register_payment_atomic.
// paymentType: 'interest' (solo interés), 'capital' (solo capital), 'mixed' (interés primero, sobrante a capital)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { calculatePendingInterest } from '../_shared/finance.ts';

const RPC_ERRORS: Record<string, { status: number; message: string }> = {
  LOAN_NOT_FOUND: { status: 404, message: 'Préstamo no encontrado' },
  LOAN_INACTIVE: { status: 400, message: 'El préstamo está liquidado' },
  INVALID_AMOUNT: { status: 400, message: 'Monto inválido' },
  INVALID_SPLIT: { status: 400, message: 'Distribución de pago inválida' },
  CAPITAL_EXCEEDED: { status: 400, message: 'El abono a capital excede el capital actual' },
  DUPLICATE_PAYMENT: { status: 400, message: 'Pago duplicado detectado (mismo monto en los últimos segundos)' },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { loanId, amount, paymentType } = await req.json();

    if (!loanId) return jsonResponse({ error: 'loanId es requerido' }, 400);
    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return jsonResponse({ error: 'El monto debe ser un número mayor a 0' }, 400);
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
      return jsonResponse({ error: 'El préstamo está liquidado' }, 400);
    }

    // Interés pendiente calculado en el servidor con las transacciones reales
    const { data: txs, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('loanid', loanId);

    if (txError) {
      return jsonResponse({ error: 'Error al leer transacciones', details: txError.message }, 500);
    }

    const pendingInterest = calculatePendingInterest(loan, txs ?? [], Date.now());

    let payToInterest = 0;
    let payToCapital = 0;
    let description = '';
    const type = paymentType || 'mixed';

    if (type === 'interest') {
      payToInterest = numAmount;
      description = 'Pago Intereses';
    } else if (type === 'capital') {
      payToCapital = numAmount;
      description = 'Abono a Capital';
    } else {
      payToInterest = Math.min(numAmount, pendingInterest);
      payToCapital = numAmount - payToInterest;
      if (payToCapital > 0 && payToInterest > 0) {
        description = 'Abono Mixto (Int + Cap)';
      } else if (payToCapital > 0) {
        description = 'Abono a Capital';
      } else {
        description = 'Pago Intereses';
      }
    }

    if (payToCapital > Number(loan.currentcapital)) {
      return jsonResponse({ error: 'El abono a capital excede el capital actual' }, 400);
    }

    const { data: result, error: rpcError } = await supabase.rpc('register_payment_atomic', {
      p_loan_id: loanId,
      p_amount: numAmount,
      p_interest_paid: payToInterest,
      p_capital_reduction: payToCapital,
      p_description: description,
    });

    if (rpcError) {
      const known = RPC_ERRORS[rpcError.message?.trim()];
      if (known) return jsonResponse({ error: known.message }, known.status);
      return jsonResponse({ error: 'Error al registrar el pago', details: rpcError.message }, 500);
    }

    return jsonResponse({
      success: true,
      message: payToCapital > 0 && payToInterest > 0
        ? `Pago registrado: ${payToInterest} a interés, ${payToCapital} a capital`
        : payToCapital > 0
          ? `Abono a capital registrado: -${payToCapital}`
          : 'Pago de intereses registrado',
      loan: result.loan,
      transaction: result.transaction,
      payToInterest,
      payToCapital,
      pendingInterest,
    });
  } catch (error) {
    return jsonResponse({ error: 'Error interno del servidor', details: error.message }, 500);
  }
});
