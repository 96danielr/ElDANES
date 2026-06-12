# Diseño: Liquidar préstamos con saldo en cero (fix del flujo de cierre)

**Fecha:** 2026-06-12
**Estado:** Aprobado por el usuario

## Problema

Un crédito totalmente pagado (interés al día + capital en $0 por abonos) tiene total a liquidar = $0, y tanto `settle-loan` como el RPC `settle_loan_atomic` rechazan montos ≤ 0. Resultado: imposible liquidarlo. El usuario lo resolvía **eliminando** el préstamo, lo que borra sus transacciones y daña ganancias históricas, Stats y Flujo de Caja.

## Cambios

### RPC `settle_loan_atomic` (supabase-rpc.sql + aplicar en prod vía Management API)
- Validación pasa de `p_amount <= 0` a `p_amount < 0` (cero permitido).
- Siempre inserta la transacción de cierre (amount puede ser 0) y marca `isactive=false, currentcapital=0`, atómico como hoy.

### Edge `settle-loan` (redeploy)
- Acepta `totalDue >= 0` (rechaza solo negativos/no numéricos).
- Descripción condicional: `serverTotal > 0` → `PAGO DE LIQUIDACIÓN TOTAL`; `serverTotal == 0` → `CIERRE DE CRÉDITO (saldo en cero)`.
- Tolerancia 409 igual que hoy.

### Frontend
- `App.tsx settleLoan`: mensaje de confirmación con desglose `Capital $X + Interés $Y = Total $Z`; si Z=0: "Crédito totalmente pagado. Se cerrará y pasará al historial sin cobro adicional." Botón "Liquidar" / "Cerrar Crédito".
- `Dashboard.tsx` modal: el botón inferior dice "Liquidar Préstamo" si debe algo, "Cerrar Crédito (pagado)" si capital y pendiente están en $0.
- `App.tsx deleteLoan`: el confirm advierte que borra el historial y que para créditos pagados se debe usar Cerrar Crédito.

### Compatibilidad de cálculo
La transacción de cierre con amount 0: `computeInterestState` la ignora (amount 0 → continue), `computePaymentBreakdown` la marca `otro` sin montos, Movimientos no la lista como flujo (amount ≤ 0 no-apertura/inyección se omite). El historial del modal sí la muestra (etiqueta SIS). Cero impacto en números.

## Verificación

E2E en producción con préstamo desechable: crear cliente+préstamo de prueba → abonar capital completo → cerrar con $0 → verificar isactive=false y transacción de cierre → eliminar datos de prueba. Más `npm run build` y tests existentes.
