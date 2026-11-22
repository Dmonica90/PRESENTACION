# Santuario de Ukouh: scripts de JavaScript para Storyline 360

Paquete de animaciones de texto, transiciones, feedback y telemetría para la cápsula
**Las Matemáticas Ocultas en Zelda: TOTK**. Está construido sobre la sábana de producción
(7 slides, 19 variables y 15 reglas de triggers).

> Requiere **Storyline 360 build 3.98 o posterior** (Advanced JavaScript API: `object()`, `getVar`, `setVar`).
> En la **vista previa** de Storyline el JavaScript no siempre se ejecuta, así que prueba siempre la **salida publicada**
> (en el navegador, en Review 360 o en SCORM Cloud).

## Archivos

| Archivo | Dónde va | Qué hace |
|---|---|---|
| `00_libreria_UK.js` | Patrón de diapositivas → trigger *Ejecutar JavaScript* **cuando la línea de tiempo comienza** | Crea `window.UK` con todos los efectos |
| `S01_portada.js` … `S07_evaluacion.js` | Un bloque por trigger (cada archivo indica cuál) | Coreografía de cada slide y sus capas |
| `S99_utilidades.js` | Botones de reinicio, saltar animación, depuración y envío al LMS | Utilidades |
| `webobject-simulador/index.html` | Insertar → Objeto web → carpeta `webobject-simulador` (Slide 06) | Simulador en Canvas con el slider de 0 a 14 m y la animación de cruce |

Si no quieres usar el patrón, pega la librería como **primer** trigger de Slide_01. Pégala también en cualquier
slide a la que el alumno pueda llegar al reanudar el curso. Los scripts de cada slide esperan solos a que la librería esté cargada.

## Variables

### Las 19 de tu sábana (sin cambios)
`pred_inicial`, `s02_lados_ok`, `s03_cuadrados_ok`, `s04_reorganizado`, `in_a2`, `in_b2`, `in_suma`, `in_c`,
`s05_alcanza`, `s05_completado`, `s06_pred_12m`, `s06_altura_actual`, `s07_lado_ok`, `s07_ecuacion`,
`s07_respuesta`, `s07_intentos`, `s07_primer_intento`, `s07_tipo_error`, `s07_aprobado`

### 10 auxiliares de interfaz (créalas en el panel de variables, respetando mayúsculas y minúsculas)

| Variable | Tipo | Inicial | Uso |
|---|---|---|---|
| `ui_titulo` | Texto | (vacío) | Título animado (typewriter/runas) → cuadro con `%ui_titulo%` |
| `ui_texto` | Texto | (vacío) | Subtítulo, feedback dinámico de S06 y desarrollo final de S07 |
| `ui_area_a` | Texto | (vacío) | Contador "36 m²" (S03) |
| `ui_area_b` | Texto | (vacío) | Contador "64 m²" (S03) |
| `ui_c_texto` | Texto | (vacío) | "c = √(6² + 12²) ≈ 13.42 m" (S06) |
| `ui_banner` | Texto | (vacío) | Banner "alcanza / faltan X m" (S06) |
| `ui_resumen` | Texto | (vacío) | Tarjeta metacognitiva final (S07) |
| `ui_feedback` | Texto | (vacío) | Qué capa mostrar: `EXITO_S05`, `ERROR_S05`, `LADOS`, `FORMULA`, `CALCULO`, `EXITO_S07` |
| `ui_feedback_tick` | Número | 0 | Se suma 1 en cada feedback y dispara la capa aunque el alumno repita el mismo error |
| `ui_navegar` | Número | 0 | Transición de salida: JS anima la cortina y después suma 1 |

## Patrones clave en Storyline

1. **JavaScript no abre capas.** Por eso JS llama a `UK.feedback('LADOS')` y Storyline lleva este trigger:
   *Mostrar capa Layer_ErrorLados cuando `ui_feedback_tick` cambie, si `ui_feedback` = `LADOS`*.
2. **Transición entre slides:** se usa un rectángulo color crema (#FAF8F2) del tamaño de la slide, colocado al frente
   (la "cortina"). Al entrar se retira como una hoja de cuaderno. Al salir, el botón ejecuta `UK.salida(...)`
   y la slide lleva el trigger *Saltar a la siguiente diapositiva cuando `ui_navegar` cambie*.
   Quita el salto directo del botón.
3. **Texto animado:** el cuadro de texto muestra una variable (`%ui_titulo%`). Desactiva *Ajustar forma al texto*
   y dale al cuadro el tamaño del texto completo para que no salte mientras se escribe.
4. **IDs de objetos:** en cada script, los textos `'ID_...'` marcados con `// CHANGE THIS` se reemplazan por el ID real.
   Para copiarlo: clic derecho en el objeto → icono de copiar, o en el editor de JS → *Object reference* → *Add*.
5. **Botones que se desbloquean:** ponles el estado inicial **Disabled**. `UK.desbloquear(id)` los pasa a **Normal**,
   les da un halo y los deja latiendo. `UK.detener(id, true)` detiene el latido.
6. **Contadores sin doble conteo (S02 y S03):** JS lleva `s02_lados_ok` y `s03_cuadrados_ok` con protección contra
   el doble clic. Elimina los triggers nativos *Sumar 1*.
7. **Evaluación final (S07):** un solo bloque JS reemplaza las reglas 12 a 15. Así se evitan problemas de orden entre
   triggers y `s07_primer_intento` no se puede sobrescribir. `s07_tipo_error` guarda el **último** error cometido;
   queda en `NINGUNO` si el alumno acertó a la primera.
8. **Web Object (S06):** en Storyline siempre se dibuja por encima de todo. Por eso el candado de "primero haz tu
   predicción" está dentro del simulador, y Storyline lo abre con `UK.enviarWeb({tipo:'habilitar'})`.
   El slider del simulador actualiza `s06_altura_actual` y cada cruce probado avisa a Storyline, que desbloquea
   *Continuar* después del primer intento.

## Referencia rápida de la librería

```js
// Texto
UK.maquina('ui_titulo', 'Texto…', { vel: 32 })          // máquina de escribir
UK.runas('ui_titulo', 'TÍTULO', { dur: 1300 })           // caracteres que se descifran
UK.contar('ui_area_a', 0, 36, { sufijo: ' m²' })         // contador animado
UK.completarTexto()                                      // termina al instante (botón Saltar)
// Entradas
UK.aparecer(id, { desde: 'abajo', dist: 40 })  UK.desenfoque(id)  UK.pop(id)
UK.barrido(id, { desde: 'izquierda' })  UK.trazar(id)  UK.resaltar(id)
UK.escalonar([id1, id2, id3], 'pop', { gap: 140 })
// Énfasis y feedback
UK.pulso(id)  UK.latido(id)  UK.brillo(id, { color: '#FBCFE8' })  UK.sacudir(id)  UK.sello(id)
UK.desbloquear(id)  UK.detener(id, true)
// Movimiento
UK.moverA(id, x, y)  UK.recorrido(id, [{x,y}, {x,y}], { saltos: 8 })  UK.flotar(id)
// Transiciones, capas y simulador
UK.entrada(cortinaId)  UK.salida(cortinaId)  UK.feedback('LADOS')
UK.enviarWeb({ tipo: 'altura', valor: 12 })  UK.escucharWeb(msg => …)
UK.reiniciarVariables()
```

Unidades del API de Storyline: **opacidad de 0 a 100** y **escala en %** (100 = normal).
Todas las funciones devuelven una promesa, así que se pueden encadenar con `await` dentro de `(async () => { … })()`.

## Lista de pruebas
- [ ] Publicar en Web o Review 360 (la vista previa no basta).
- [ ] Abrir la consola (F12) y confirmar `[UK] Librería Santuario de Ukouh lista.` sin avisos `No encuentro el objeto`.
- [ ] S02/S03: hacer doble clic en el mismo lado no suma dos veces.
- [ ] S05: una respuesta incorrecta sacude el campo sin revelar la respuesta.
- [ ] S06: el slider en 12 m muestra 13.42 m y "faltan 3.42 m"; Continuar se habilita después del primer cruce.
- [ ] S07: fallar y luego acertar deja `s07_primer_intento = ERROR` y `s07_intentos = 2`.
- [ ] Reiniciar devuelve las 19 variables a sus valores iniciales.
