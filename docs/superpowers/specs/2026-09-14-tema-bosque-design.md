# Diseño: Tema "Bosque" (claro, verde bosque)

**Fecha:** 2026-09-14
**Estado:** Implementado. El usuario rechazó un intento previo en tema oscuro con dorado (revertido en `9e02bbd`) y eligió explícitamente **blanco + verde bosque**.

## Concepto

Interfaz clara y limpia de banca moderna. Fondo blanco con un gris verdoso muy leve, texto carbón, y un único acento: verde bosque. Sin dorados, sin fondos oscuros, contraste alto. Reemplaza el look "Anthropic" (crema + terracota).

## Paleta

| Rol | Valor | Nota |
|---|---|---|
| Página | `#F5F8F6` | Veladura radial verde al 10 % en la parte superior; blanco puro hasta 420 px |
| Superficie | `#FFFFFF` | Bordes `#DCE4DE`, sombras suaves con tinte verde |
| Texto | `#14211A` · `#4B5A51` · `#687569` | Contraste AA en los tres pesos sobre blanco |
| Acento (bosque) | `#1F6B45` · hover `#185737` · profundo `#124229` · tinte `#E3F1E8` | Único acento; texto blanco sobre él (6.2:1) |
| Éxito | `#23854B` | |
| Alerta | `#C98017` | |
| Peligro | `#C93F37` | |
| Info | `#287694` | |

## Tipografía

- **Bricolage Grotesque** (variable, `opsz`) en títulos y `.font-display`, peso 700/800, tracking negativo.
- **Figtree** en cuerpo e inputs. `.font-mono` es Figtree 700 con `tabular-nums` para que las cifras alineen sin parecer código.

## Detalles con carácter

- Header con línea verde de 3 px arriba.
- Tarjetas de cobro con franja de 4 px del color de estado en el borde izquierdo y un tinte suave que se desvanece hacia la derecha.
- Botón primario: gradiente sutil de verde con filo claro y sombra verde.
- Tarjeta del titular en gradiente verde sólido (`#24784E → #1F6B45 → #124229`); Guardar en blanco con texto verde.
- Logo: cuadrado redondeado en gradiente verde con "D" blanca en Bricolage.
- Barras de Stats en gradiente `#1F6B45 → #58A97C`.
- `prefers-reduced-motion` desactiva animaciones.

## Archivos

`index.html` (todo el tema), `App.tsx` (logo), `views/Stats.tsx` (colores de barras), `CLAUDE.md` (convenciones).

## Verificación

`npm run build` en verde. Capturas con Chrome headless de login, Cobros (tarjetas verde/amarilla/roja), Operar, Clientes, Stats, Movimientos, modal Control Operativo en edición y ConfirmModal, con datos de prueba mediante un arnés temporal no commiteado.
