# Reporte Glean — por campaña

Apps Script que arma el reporte de avance de cursos a partir de
`90_LOOKER_DETALLE`. Se pega en el editor de Apps Script del spreadsheet
(Extensiones → Apps Script), reemplazando el contenido del archivo de código.

## Cómo se usa

1. En la hoja **`CONTROL`**, columna A a partir de la fila 2, escribe los
   **nombres de campaña** (uno por fila):

   ```
   CJAC-Q3-CLIPAI
   CJAC-Q3-2026
   ```

   Antes iban nombres de curso; ahora van campañas. El script descubre solo
   qué cursos tiene cada una. El match ignora mayúsculas, acentos y espacios
   de más, pero el texto debe corresponder a un valor real de la columna
   `CAMPAIGN` (columna J de la fuente).

2. Menú **🤖 Actualiza → Actualizar datos**.

Si algo no cuadra, corre primero **🤖 Actualiza → Probar mapeo (diagnóstico)**:
no escribe nada y muestra qué columnas detectó, qué campañas encontró, con
cuántos cursos y personas — y si alguna no apareció, lista todas las campañas
disponibles en la fuente.

## Qué genera

| Hoja | Contenido |
|---|---|
| `REPORTE_CURSOS` | Matriz persona × curso. Encabezado de campaña arriba, cursos debajo, y `STATUS / DATE START / DATE COMPLETE / SCORE` por curso. Arriba, una barra de avance por campaña. |
| `RESUMEN_CURSOS` | Una fila por campaña: `# CURSOS`, `# ASIGNADOS`, `# COMPLETADO`, `# EN PROCESO`, `# NO INICIADO`, `% CUMPLIMIENTO`, `FALTANTES`. |
| `RESUMEN_DIVISION` | Una tabla por campaña (apiladas hacia abajo): `División · Completado · Pendiente · Total · Completion %` con `GRAND TOTAL`. |

Las tres hojas se reescriben completas en cada corrida.

## Reglas de negocio

- **Se excluye** quien tenga `ACTIVE STATUS` vacío o `No`.
- Una persona cuenta como **Completado** en una campaña cuando terminó
  **todos los cursos que tiene asignados en esa campaña**. Si solo le
  asignaron 1 de 2 y lo terminó, cuenta como completa.
- **En proceso** = tiene al menos un curso completado *o* al menos uno en
  progreso. **No iniciado** = ninguno arrancado.
- Los conteos de `RESUMEN_CURSOS` y `RESUMEN_DIVISION` son de **personas**,
  no de inscripciones. Por eso `GRAND TOTAL` de una división coincide con
  `# ASIGNADOS` de esa campaña.
- Un mismo curso puede vivir en dos campañas (p. ej. *PLD y FT 2026* está en
  `CJAC-Q3-2026` y en `CJAC-Q3-CLIPAI`) y sus datos se mantienen
  independientes por campaña.
- La columna `RESUMEN CLIPPER` es **global**: suma todos los cursos de todas
  las campañas del reporte, no de una sola.

## Columnas que lee de la fuente

Se localizan por nombre de encabezado; si alguna se renombra, el diagnóstico
lo señala. Posiciones por defecto si no se encuentran: `CAMPAIGN` → J,
`LEARNING CAMPAING` → K, `STATUS` → N, `DATE START` → O, `DATE COMPLETE` → P,
`SCORE` → Q.

## Pruebas

La lógica corre fuera de Apps Script con stubs de `SpreadsheetApp`, así que se
puede verificar sin abrir el spreadsheet:

```bash
cd apps-script && for t in test/*.test.js; do node "$t"; done
```

- `logica.test.js` — mapeo de columnas, descubrimiento de campañas, exclusiones,
  clasificación por persona, fórmulas generadas.
- `layout.test.js` — aritmética de la hoja: merges sin traslape, posición de
  encabezados, freeze, rangos de las barras.
- `resumen.test.js` — contenido de `RESUMEN_CURSOS` y apilado de tablas en
  `RESUMEN_DIVISION`.

Después de editar `Codigo.gs`, corre las pruebas antes de pegarlo al editor.
