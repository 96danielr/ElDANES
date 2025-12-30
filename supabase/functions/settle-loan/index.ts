// Edge Function: Liquidar préstamo
// Maneja la liquidación completa de un préstamo de forma atómica

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Manejar preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Obtener variables de entorno
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Crear cliente con service role (bypass RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parsear body
    const { loanId, totalDue } = await req.json();

    if (!loanId || totalDue === undefined) {
      return new Response(
        JSON.stringify({ error: 'loanId y totalDue son requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obtener el préstamo actual
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('*')
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      return new Response(
        JSON.stringify({ error: 'Préstamo no encontrado', details: loanError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!loan.isactive) {
      return new Response(
        JSON.stringify({ error: 'El préstamo ya está liquidado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transacción atómica: Insertar transacción y actualizar préstamo
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        loanid: loanId,
        amount: totalDue,
        date: Date.now(),
        description: 'PAGO DE LIQUIDACIÓN TOTAL'
      });

    if (transactionError) {
      return new Response(
        JSON.stringify({ error: 'Error al registrar transacción', details: transactionError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: updatedLoan, error: updateError } = await supabase
      .from('loans')
      .update({
        isactive: false,
        currentcapital: 0
      })
      .eq('id', loanId)
      .select()
      .single();

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Error al actualizar préstamo', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Crédito liquidado con éxito',
        loan: updatedLoan
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

