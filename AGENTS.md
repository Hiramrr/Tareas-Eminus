# Instrucciones del repositorio

## Contrato del lenguaje visual

La interfaz actual de Miyu tiene un lenguaje visual deliberado. No lo rediseñes salvo que el usuario pida de forma explícita un rediseño.

Conserva estas decisiones:

- Tipografía monoespaciada como base.
- Estética de terminal y retrocomputación.
- Bordes rectos, finos y, donde ya se usan, punteados.
- Controles de texto entre corchetes, por ejemplo `[ actualizar ]`.
- Ilustración y logotipo ASCII del encabezado.
- Paleta base clara, sobria y de alto contraste. Los temas existentes pueden cambiar colores, pero no la estructura visual base.
- Composición, jerarquía, orden de pestañas y ubicación de controles existentes.

No introduzcas por iniciativa propia:

- Tarjetas redondeadas, píldoras o radios decorativos.
- Sombras suaves, degradados o efectos de producto SaaS genérico.
- Azul corporativo como acento predeterminado.
- Tipografía sans serif como fuente predeterminada.
- Iconos genéricos para sustituir texto o arte ASCII.
- Menús de tipo `Más` para esconder pestañas o acciones que hoy están visibles.
- Reordenamientos, agrupaciones o movimientos de controles.
- Cambios de etiquetas, espaciado global, tamaños o densidad que no sean necesarios para la tarea pedida.

"Quitar bloat" significa retirar funciones, opciones o código redundante. No autoriza un rediseño, una reinterpretación estética ni cambios en la arquitectura de la interfaz.

Antes de entregar cualquier cambio de UI:

1. Revisa el diff de HTML, CSS y textos visibles.
2. Confirma que cada cambio visual responde directamente a lo que pidió el usuario.
3. Mantén el parche pequeño. Si la tarea no pide tocar una zona, no la muevas ni la modernices.
4. Comprueba al menos los estados normal, compacto y minimizado cuando el cambio afecte al encabezado o a la estructura del panel.

Si una modificación funcional exige cambiar el lenguaje visual o mover controles, detente y pide autorización antes de hacerlo.
