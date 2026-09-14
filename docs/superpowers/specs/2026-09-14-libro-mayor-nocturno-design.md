# Diseño: Tema "Libro mayor nocturno"

**Fecha:** 2026-09-14
**Estado:** Implementado. El usuario pidió un rediseño completo de colores y contraste sin consultas; la paleta la eligió el asistente.

## Concepto

Un libro de contabilidad abierto de noche: tinta verde-negra con grano fino, cifras en crema, y latón como único metal. Sobrio, cálido, legible a las 6 a. m. en un celular. Reemplaza el look "Anthropic" (crema claro + terracota).

## Paleta

| Rol | Valor | Nota |
|---|---|---|
| Fondo | `#0E1411` | Halos radiales de latón (arriba izq.) y verde (abajo der.) + grano SVG al 32 % |
| Superficie | `#171F1B` / elevada `#1D2622` | Filo de luz de 1 px arriba (`inset 0 1px rgba(cream,.06)`) |
| Texto | `#F2ECDD` · `#B9B2A1` · `#8B8679` | Contraste ≥ 4.5:1 sobre superficie en los tres pesos |
| Acento (latón) | `#D9A441` · hover `#E8B65A` · profundo `#A87A22` | Único acento. Texto sobre latón siempre tinta `#15110A` |
| Éxito | `#5DBE8A` | |
| Alerta | `#E8853A` | Naranja a propósito: no compite con el latón |
| Peligro | `#E3564F` | |
| Info | `#6FB7C9` | |

## Tipografía

- **Fraunces** (serif variable, `opsz`/`SOFT`) en títulos y `.font-display`.
- **Instrument Sans** en cuerpo e inputs.
- **JetBrains Mono** con `tabular-nums slashed-zero` en `.font-mono` (todo el dinero).

## Decisiones de contraste

- Rellenos sólidos de acento y estado (`.bg-accent`, `.bg-success`, `.bg-warning`, `.bg-danger`) fuerzan texto tinta con `!important`; el TSX sigue diciendo `text-white` y no se tocó.
- La tarjeta del titular (`bg-gradient-to-br from-accent`) se sobreescribe a un gradiente bronce `#9A6A18 → #4A3208` para que su texto blanco pase AA. El botón **Guardar** dentro de ella es crema sólida con texto tinta.
- `bg-white/N` se remapea a tintes de crema (`rgba(242,236,221,.05/.09)`); `bg-white` sólido a la superficie elevada.
- Badges: tinte translúcido del color + texto en versión clara del mismo color.

## Detalles con carácter

- Tarjetas de cobro: franja de 3 px del color de estado en el borde izquierdo con resplandor, y un tinte que se desvanece hacia la derecha.
- Header: hilo de latón de 1 px en el borde superior.
- Botón primario: gradiente de latón con filo claro arriba y sombra dorada; se aclara al pasar el cursor.
- Logo: moneda de latón con "D" en Fraunces.
- Gráfica de Stats: barras en gradiente latón → latón claro.
- `prefers-reduced-motion` desactiva animaciones.

## Archivos

`index.html` (todo el tema), `App.tsx` (logo), `views/Stats.tsx` (colores del gradiente de barras), `CLAUDE.md` (convenciones).

## Verificación

`npm run build` en verde. Capturas con Chrome headless de: login, Cobros (grid con tarjetas verde/amarilla/roja), Operar, Clientes, Stats, Movimientos, modal Control Operativo en modo lectura y edición, y ConfirmModal, todas con datos de prueba mediante un arnés temporal no commiteado.
