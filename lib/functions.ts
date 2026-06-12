// Helper para llamar a las Edge Functions de Supabase
import { supabase } from './supabase';
import { Loan, Transaction } from '../types';

export interface SettleLoanParams {
  loanId: string;
  totalDue: number;
}

export interface RegisterPaymentParams {
  loanId: string;
  amount: number;
  paymentType: 'interest' | 'capital' | 'mixed';
}

export interface CreateLoanParams {
  clientId: string;
  capital: number;
  rate: number;
  customStartDate?: number;
  existingLoanId?: string;
  hasLetra?: boolean;
}

export interface UpdateLoanParams {
  loanId: string;
  monthlyrate?: number;
  owner?: string;
  hasletra?: boolean;
}

/**
 * Llama a una Edge Function de Supabase.
 * En errores HTTP (400/404/409/500) extrae el mensaje real del body
 * para que llegue al toast del usuario.
 */
async function callFunction<T>(functionName: string, body: any): Promise<T> {
  const { data, error } = await supabase.functions.invoke(functionName, { body });

  if (error) {
    if (error.context && typeof error.context.json === 'function') {
      let serverMessage: string | null = null;
      try {
        const errBody = await error.context.json();
        if (errBody?.error) serverMessage = errBody.error;
      } catch {
        // body no era JSON — usar mensaje genérico
      }
      if (serverMessage) throw new Error(serverMessage);
    }
    throw new Error(error.message || 'Error al llamar a la función');
  }

  if (!data || data.error) {
    throw new Error(data?.error || 'Error desconocido en la función');
  }

  return data as T;
}

/**
 * Liquidar un préstamo completamente
 */
export async function settleLoan(params: SettleLoanParams) {
  return callFunction<{ success: boolean; message: string; loan: Loan; transaction: Transaction }>(
    'settle-loan',
    params
  );
}

/**
 * Registrar un pago (abono)
 */
export async function registerPayment(params: RegisterPaymentParams) {
  return callFunction<{
    success: boolean;
    message: string;
    loan: Loan;
    transaction: Transaction;
    payToInterest: number;
    payToCapital: number;
  }>('register-payment', params);
}

/**
 * Crear un nuevo préstamo o agregar capital a uno existente
 */
export async function createLoan(params: CreateLoanParams) {
  return callFunction<{ success: boolean; message: string; loan: Loan; transaction: Transaction | null }>(
    'create-loan',
    params
  );
}

/**
 * Actualizar un préstamo (tasa de interés, etiqueta)
 */
export async function updateLoan(params: UpdateLoanParams) {
  return callFunction<{ success: boolean; message: string; loan: Loan }>(
    'update-loan',
    params
  );
}
