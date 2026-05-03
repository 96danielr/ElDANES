// Helper para llamar a las Edge Functions de Supabase
import { supabase } from './supabase';

const SUPABASE_URL = 'https://ougsplrbvypxflyyfojm.supabase.co';

export interface SettleLoanParams {
  loanId: string;
  totalDue: number;
}

export interface RegisterPaymentParams {
  loanId: string;
  amount: number;
  pendingInterest: number;
  paymentType: 'interest' | 'capital' | 'mixed';
}

export interface CreateLoanParams {
  clientId: string;
  capital: number;
  rate: number;
  customStartDate?: number;
  existingLoanId?: string;
}

export interface UpdateLoanParams {
  loanId: string;
  monthlyrate?: number;
  owner?: string;
}

/**
 * Llama a una Edge Function de Supabase
 */
async function callFunction<T>(functionName: string, body: any): Promise<T> {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
  });

  if (error) {
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
  return callFunction<{ success: boolean; message: string; loan: any }>(
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
    loan?: any;
    payToInterest: number;
    payToCapital: number;
  }>('register-payment', params);
}

/**
 * Crear un nuevo préstamo o agregar capital a uno existente
 */
export async function createLoan(params: CreateLoanParams) {
  return callFunction<{ 
    success: boolean; 
    message: string; 
    loan: any;
  }>('create-loan', params);
}

/**
 * Actualizar un préstamo (tasa de interés, capital, etc.)
 */
export async function updateLoan(params: UpdateLoanParams) {
  return callFunction<{ 
    success: boolean; 
    message: string; 
    loan: any;
  }>('update-loan', params);
}

