// Edge Function: Crear préstamo
// Maneja la creación de nuevos préstamos y actualización de préstamos existentes

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { clientId, capital, rate, customStartDate, existingLoanId } = await req.json();

    if (!clientId || capital === undefined || rate === undefined) {
      return new Response(
        JSON.stringify({ error: 'clientId, capital y rate son requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Si hay un préstamo existente, agregar capital
    if (existingLoanId) {
      const { data: existingLoan, error: loanError } = await supabase
        .from('loans')
        .select('*')
        .eq('id', existingLoanId)
        .single();

      if (loanError || !existingLoan) {
        return new Response(
          JSON.stringify({ error: 'Préstamo existente no encontrado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const newCap = Number(existingLoan.currentcapital) + capital;
      
      const { data: updatedLoan, error: updateError } = await supabase
        .from('loans')
        .update({
          currentcapital: newCap,
          initialcapital: Number(existingLoan.initialcapital) + capital
        })
        .eq('id', existingLoanId)
        .select()
        .single();

      if (updateError) {
        return new Response(
          JSON.stringify({ error: 'Error al actualizar capital', details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Registrar transacción de inyección de capital
      await supabase.from('transactions').insert({
        loanid: existingLoanId,
        amount: 0,
        date: Date.now(),
        description: `INYECCIÓN CAPITAL (+${capital})`
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Capital sumado',
          loan: updatedLoan
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Crear nuevo préstamo
    const { data: newLoan, error: insertError } = await supabase
      .from('loans')
      .insert({
        clientid: clientId,
        initialcapital: capital,
        currentcapital: capital,
        monthlyrate: rate,
        startdate: customStartDate || Date.now(),
        isactive: true,
        owner: 'Juntos'
      })
      .select()
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: 'Error al crear préstamo', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Registrar transacción de apertura
    await supabase.from('transactions').insert({
      loanid: newLoan.id,
      amount: 0,
      date: Date.now(),
      description: 'APERTURA DE CRÉDITO'
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Préstamo activado',
        loan: newLoan
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

