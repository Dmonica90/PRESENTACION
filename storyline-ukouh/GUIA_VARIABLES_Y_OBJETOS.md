# Guía de montaje: variables, JS inicial y nombres de objetos

Esta guía cubre tres cosas:

1. Los **prompts para el AI Assistant** de Storyline, que crean las 29 variables (las 19 de la sábana y 10 auxiliares).
2. **Cómo colocar el JavaScript inicial** (`00_libreria_UK.js`) y los scripts de cada slide.
3. **Cómo nombrar cada objeto** para encontrarlo fácilmente y copiar su ID en los scripts.

---

## 1. Prompts para el AI Assistant (AI Chat)

**Requisito:** Storyline 360 actualizado. La función que permite agregar, renombrar, listar, modificar y eliminar variables
desde el chat apareció en la actualización de junio de 2026. Para crear y editar triggers desde el chat se necesita la
build 3.120 o posterior.

**Cómo usarlos:**
- Abre el **AI Assistant → AI Chat** y pega **un prompt a la vez**. Al terminar, usa el prompt de verificación.
- Los nombres llevan minúsculas y guiones bajos y deben quedar **exactamente iguales**, porque el JavaScript distingue mayúsculas de minúsculas.
- Si el asistente cambia algún nombre (por ejemplo, le pone mayúscula inicial), pídele: *"Renombra la variable X a x exactamente"*.

### 1.1 Predicción inicial
```text
Crea una variable de proyecto de tipo Texto llamada pred_inicial con valor inicial vacío. Guarda la predicción del alumno en el Slide 01 ("A", "B" o "C").
```

### 1.2 Progresión
```text
Crea una variable de proyecto de tipo Número llamada s02_lados_ok con valor inicial 0. Cuenta los lados del triángulo identificados (0 a 3).
```
```text
Crea una variable de proyecto de tipo Número llamada s03_cuadrados_ok con valor inicial 0. Cuenta los cuadrados de área explorados (0 a 3).
```
```text
Crea una variable de proyecto de tipo Verdadero/Falso llamada s04_reorganizado con valor inicial Falso. Se vuelve Verdadero al reacomodar los 4 triángulos.
```

### 1.3 Cálculo guiado
```text
Crea una variable de proyecto de tipo Número llamada in_a2 con valor inicial 0. Es la respuesta del Paso 1 (6² = 36).
```
```text
Crea una variable de proyecto de tipo Número llamada in_b2 con valor inicial 0. Es la respuesta del Paso 2 (8² = 64).
```
```text
Crea una variable de proyecto de tipo Número llamada in_suma con valor inicial 0. Es la respuesta del Paso 3 (36 + 64 = 100).
```
```text
Crea una variable de proyecto de tipo Número llamada in_c con valor inicial 0. Es la respuesta del Paso 4 (√100 = 10).
```
```text
Crea una variable de proyecto de tipo Texto llamada s05_alcanza con valor inicial vacío. Guarda la decisión "SI" o "NO".
```
```text
Crea una variable de proyecto de tipo Verdadero/Falso llamada s05_completado con valor inicial Falso. Se vuelve Verdadero cuando los 4 pasos y la decisión son correctos.
```

### 1.4 Exploración de altura
```text
Crea una variable de proyecto de tipo Texto llamada s06_pred_12m con valor inicial vacío. Guarda la predicción "A", "B" o "C" antes de usar el simulador.
```
```text
Crea una variable de proyecto de tipo Número llamada s06_altura_actual con valor inicial 8. Es la altura del simulador en metros (de 0 a 14).
```

### 1.5 Evaluación final
```text
Crea una variable de proyecto de tipo Verdadero/Falso llamada s07_lado_ok con valor inicial Falso. Se vuelve Verdadero cuando el alumno identifica bien los catetos y la hipotenusa.
```
```text
Crea una variable de proyecto de tipo Texto llamada s07_ecuacion con valor inicial vacío. Guarda la ecuación elegida "A", "B" o "C" (la correcta es B).
```
```text
Crea una variable de proyecto de tipo Número llamada s07_respuesta con valor inicial 0. Es la longitud del puente que escribe el alumno (la esperada es 13).
```

### 1.6 Telemetría
```text
Crea una variable de proyecto de tipo Número llamada s07_intentos con valor inicial 0. Cuenta los clics en Btn_ValidarFinal.
```
```text
Crea una variable de proyecto de tipo Texto llamada s07_primer_intento con valor inicial PENDIENTE. Guarda "ACIERTO" o "ERROR" solo en el primer intento.
```
```text
Crea una variable de proyecto de tipo Texto llamada s07_tipo_error con valor inicial NINGUNO. Guarda el tipo de error: "LADOS", "FORMULA" o "CALCULO".
```
```text
Crea una variable de proyecto de tipo Verdadero/Falso llamada s07_aprobado con valor inicial Falso. Se vuelve Verdadero al superar el desafío final.
```

### 1.7 Auxiliares de interfaz (las usa el JavaScript)
```text
Crea una variable de proyecto de tipo Texto llamada ui_titulo con valor inicial vacío. Muestra el título animado de cada slide.
```
```text
Crea una variable de proyecto de tipo Texto llamada ui_texto con valor inicial vacío. Muestra subtítulos y textos dinámicos animados.
```
```text
Crea una variable de proyecto de tipo Texto llamada ui_area_a con valor inicial vacío. Muestra el contador animado "36 m²".
```
```text
Crea una variable de proyecto de tipo Texto llamada ui_area_b con valor inicial vacío. Muestra el contador animado "64 m²".
```
```text
Crea una variable de proyecto de tipo Texto llamada ui_c_texto con valor inicial vacío. Muestra el cálculo de la hipotenusa en el Slide 06.
```
```text
Crea una variable de proyecto de tipo Texto llamada ui_banner con valor inicial vacío. Muestra el mensaje "alcanza / faltan X m" del Slide 06.
```
```text
Crea una variable de proyecto de tipo Texto llamada ui_resumen con valor inicial vacío. Muestra la tarjeta de resumen final del Slide 07.
```
```text
Crea una variable de proyecto de tipo Texto llamada ui_feedback con valor inicial vacío. Indica qué capa de feedback se debe mostrar.
```
```text
Crea una variable de proyecto de tipo Número llamada ui_feedback_tick con valor inicial 0. Se incrementa en cada feedback para mostrar la capa correspondiente.
```
```text
Crea una variable de proyecto de tipo Número llamada ui_navegar con valor inicial 0. Se incrementa para saltar a la siguiente diapositiva después de la transición.
```

### 1.8 Verificación
```text
Lista todas las variables del proyecto con su tipo y su valor inicial en una tabla.
```
Compara el resultado con esta tabla:

| Variable | Tipo | Inicial |
|---|---|---|
| pred_inicial | Texto | (vacío) |
| s02_lados_ok | Número | 0 |
| s03_cuadrados_ok | Número | 0 |
| s04_reorganizado | V/F | Falso |
| in_a2 / in_b2 / in_suma / in_c | Número | 0 |
| s05_alcanza | Texto | (vacío) |
| s05_completado | V/F | Falso |
| s06_pred_12m | Texto | (vacío) |
| s06_altura_actual | Número | 8 |
| s07_lado_ok | V/F | Falso |
| s07_ecuacion | Texto | (vacío) |
| s07_respuesta | Número | 0 |
| s07_intentos | Número | 0 |
| s07_primer_intento | Texto | PENDIENTE |
| s07_tipo_error | Texto | NINGUNO |
| s07_aprobado | V/F | Falso |
| ui_titulo, ui_texto, ui_area_a, ui_area_b, ui_c_texto, ui_banner, ui_resumen, ui_feedback | Texto | (vacío) |
| ui_feedback_tick, ui_navegar | Número | 0 |

> **Si el asistente no logra crear alguna variable:** ábrela a mano en la pestaña **Variables** (icono **{x}** del panel de triggers)
> → botón **+** → escribe el nombre, elige el tipo y el valor inicial → **Aceptar**.

---

## 2. Cómo colocar el JavaScript inicial

### 2.1 La librería (`00_libreria_UK.js`): una sola vez para todo el curso
1. Ve a **Ver → Patrón de diapositivas** (*View → Slide Master*).
2. En la columna izquierda, selecciona el **patrón principal** (la miniatura grande de arriba, no un diseño de abajo).
3. En el panel **Triggers**, haz clic en **Crear un nuevo trigger**:
   - **Acción:** *Ejecutar JavaScript*
   - **Cuándo:** *La línea de tiempo comienza*
   - **Objeto:** el patrón de diapositivas
4. Haz clic en **Script…** y pega **todo** el contenido de `00_libreria_UK.js`. Luego **Aceptar** → **Cerrar vista de patrón**.
5. Comprueba que **todas** las slides usen un diseño de ese patrón (clic derecho en la slide → *Diseño*).

> **Plan B (si no usas el patrón):** pega la librería como **primer** trigger de Slide_01, en *Ejecutar JavaScript cuando
> la línea de tiempo comienza*. Repítelo en cualquier slide a la que el alumno pueda llegar al reanudar el curso.
> La librería detecta si ya está cargada y no se duplica.

### 2.2 Scripts de cada slide (`S01`…`S07`)
Cada archivo está dividido en **BLOQUES**. El encabezado de cada bloque indica el trigger exacto:

| Encabezado del bloque | Trigger en Storyline |
|---|---|
| "Cuando la línea de tiempo comienza en esta diapositiva" | Ejecutar JavaScript → La línea de tiempo comienza → *esta diapositiva* |
| "Cuando el usuario hace clic en Btn_X" | Ejecutar JavaScript → El usuario hace clic → *Btn_X* |
| "Cuando la variable X cambia" | Ejecutar JavaScript → La variable cambia → *X* |
| "Cuando la línea de tiempo comienza en Layer_X" | Selecciona la capa **Layer_X** → Ejecutar JavaScript → La línea de tiempo comienza |

**Orden de los triggers:** cuando un botón tiene también un trigger nativo (por ejemplo, *Ajustar pred_inicial = A*),
el trigger de JavaScript va **debajo** del nativo. Usa las flechas del panel de triggers para ordenarlos.

### 2.3 Triggers nativos para las capas
Como el JavaScript no puede abrir capas, en la **slide base** crea estos triggers:
*Mostrar capa … cuando la variable `ui_feedback_tick` cambie*, con la condición indicada:

| Slide | Capa | Condición |
|---|---|---|
| S05 | Layer_CruceExitoso | `ui_feedback` = `EXITO_S05` |
| S05 | Layer_PistaError | `ui_feedback` = `ERROR_S05` |
| S07 | Layer_ErrorLados | `ui_feedback` = `LADOS` |
| S07 | Layer_ErrorFormula | `ui_feedback` = `FORMULA` |
| S07 | Layer_ErrorCalculo | `ui_feedback` = `CALCULO` |
| S07 | Layer_SantuarioCompletado | `ui_feedback` = `EXITO_S07` |

Además, en cada slide que use la transición de salida, agrega:
*Saltar a la diapositiva siguiente cuando la variable `ui_navegar` cambie*.

Si tu versión ya permite crear triggers desde el AI Chat, puedes pedirlo así:
```text
En esta diapositiva, crea un trigger que muestre la capa Layer_ErrorLados cuando la variable ui_feedback_tick cambie, con la condición de que ui_feedback sea igual a LADOS.
```

### 2.4 Comprobar que funciona
1. **Publica** el curso (Web o Review 360); la vista previa no basta.
2. Abre la salida publicada en Chrome y pulsa **F12 → Consola**.
3. Debe aparecer `[UK] Librería Santuario de Ukouh lista.`
4. Si aparece `[UK] No encuentro el objeto con ID: …`, ese ID está mal copiado o pertenece a otra slide.

---

## 3. Cómo nombrar cada objeto

### Por qué importa
- El JavaScript **no usa el nombre** del objeto, sino su **ID** (un código como `6aBcD3fGh1X`).
- Aun así, el nombre es lo que ves en el **panel de línea de tiempo** y en el desplegable **Object reference** del editor de JS.
  Con buenos nombres, encontrar y copiar cada ID toma segundos.
- Para renombrar: doble clic sobre el nombre en el **panel de línea de tiempo** (o en el panel *Selección*).

### Convención de prefijos

| Prefijo | Tipo de objeto | Ejemplo |
|---|---|---|
| `Btn_` | Botón | `Btn_Pred_A` |
| `Txt_` | Cuadro de texto | `Txt_Titulo` |
| `Img_` | Imagen o ilustración | `Img_LinkAbismo` |
| `Shp_` | Forma (rectángulo, línea, marcador) | `Shp_Cortina` |
| `Grp_` | Grupo | `Grp_Lados` |
| `Hotspot_` | Zona activa | `Hotspot_CatetoA` |
| `Pin_` | Marcador interactivo | `Pin_CuadradoA` |
| `Inp_` | Campo de entrada de datos | `Inp_A2` |
| `Web_` | Objeto web | `Web_Simulador` |
| `Layer_` | Capa | `Layer_CruceExitoso` |

Reglas: sin espacios ni tildes, con guion bajo entre palabras. Se respetan los nombres que ya tiene la sábana (`Btn_Pred_A`, `Hotspot_CatetoA`, etc.).

### Cómo copiar el ID y pegarlo en el script
1. Haz clic derecho sobre el objeto en el lienzo → icono **copiar ID** (se copia el código que **no** va entre paréntesis).
   También puedes abrir el editor de JS → **Object reference** → buscar el objeto por su nombre → **Add**.
2. En el script, busca la línea con `// CHANGE THIS` y reemplaza el texto entre comillas: `'ID_CORTINA'` → `'6aBcD3fGh1X'`.
3. **Si copias o duplicas un objeto o una slide, el ID cambia.** Vuelve a copiarlo en la slide nueva.

### Tabla de objetos por slide (nombre en Storyline ↔ marcador en el script)

**Todas las slides:** `Shp_Cortina` → `ID_CORTINA`. Es un rectángulo del tamaño de la slide, color #FAF8F2, sin borde,
y debe ser el **último de la lista** de la línea de tiempo (el que queda encima de todo). Cada slide tiene su propia cortina con su propio ID.
También necesitas `Txt_Titulo`, que muestra `%ui_titulo%` y no necesita ID.

#### Slide 01 · Portada
| Nombre en Storyline | Marcador en el script | Qué es |
|---|---|---|
| `Txt_Subtitulo` | (no necesita ID) | Muestra `%ui_texto%` |
| `Shp_MarcadorSub` | `ID_MARCADOR_SUB` | Rectángulo amarillo #FEF08A detrás del subtítulo |
| `Img_LinkAbismo` | `ID_LINK_ABISMO` | Boceto de Link frente al abismo |
| `Shp_Cota6m` | `ID_COTA_6M` | Cota horizontal cian |
| `Shp_Cota8m` | `ID_COTA_8M` | Cota vertical magenta |
| `Img_Plataforma10m` | `ID_PLATAFORMA_10M` | Plataforma de 10 m |
| `Txt_Enunciado` | `ID_TEXTO_ENUNCIADO` | Texto del problema |
| `Btn_Pred_A` / `Btn_Pred_B` / `Btn_Pred_C` | `ID_BTN_PRED_A/B/C` | Botones de predicción |
| `Txt_NotaPie` | `ID_NOTA_PIE` | Nota de adaptación educativa |
| `Shp_TarjetaFeedback` *(en Layer_FeedbackNeutro)* | `ID_TARJETA_FEEDBACK` | Tarjeta amarilla |
| `Btn_S01_Continuar` *(estado inicial Disabled)* | `ID_BTN_S01_CONTINUAR` | Botón "Descubrir la geometría" |

#### Slide 02 · Triángulo
| Nombre en Storyline | Marcador en el script | Qué es |
|---|---|---|
| `Shp_Marca90` | `ID_MARCA_90` | Cuadradito del ángulo recto |
| `Img_LinkSentado` | `ID_LINK_SENTADO` | Link observando |
| `Shp_SegCian` / `Txt_EtqCatetoA` | `ID_SEG_CIAN` / `ID_ETQ_CATETO_A` | Cateto a (6 m) y su etiqueta |
| `Shp_SegMagenta` / `Txt_EtqCatetoB` | `ID_SEG_MAGENTA` / `ID_ETQ_CATETO_B` | Cateto b (8 m) y su etiqueta |
| `Shp_SegAmarillo` / `Txt_EtqHipotenusa` | `ID_SEG_AMARILLO` / `ID_ETQ_HIPOTENUSA` | Hipotenusa y su etiqueta |
| `Hotspot_CatetoA` / `Hotspot_CatetoB` / `Hotspot_Hipotenusa` | (no necesitan ID) | Zonas de clic |
| `Hotspot_Abismo` | `ID_ZONA_CLICADA` | Zona incorrecta (para la sacudida) |
| `Shp_Punto1` / `Shp_Punto2` / `Shp_Punto3` | `ID_PUNTO_1/2/3` | Indicadores de progreso (opcional) |
| `Btn_S02_Continuar` *(Disabled)* | `ID_BTN_S02_CONTINUAR` | Avance |

#### Slide 03 · Cuadrados
| Nombre en Storyline | Marcador en el script | Qué es |
|---|---|---|
| `Txt_Nota6x2` | (no necesita ID) | "6 × 2 = 12" |
| `Shp_Tachado` | `ID_LINEA_TACHADO` | Línea magenta que tacha la nota |
| `Img_Cuadricula6x6` | `ID_CUADRICULA_6x6` | Cuadrado a² (contiene `%ui_area_a%`) |
| `Img_Cuadricula8x8` | `ID_CUADRICULA_8x8` | Cuadrado b² (contiene `%ui_area_b%`) |
| `Img_CuadradoInclinado` | `ID_CUADRADO_INCLINADO` | Cuadrado sobre la hipotenusa |
| `Txt_C2Incognita` | `ID_TEXTO_C2_INCOGNITA` | "c² = ?" |
| `Pin_CuadradoA` / `Pin_CuadradoB` / `Pin_CuadradoC` | `ID_PIN_A/B/C` | Pins interactivos |
| `Txt_Sintesis36` / `Txt_Sintesis64` / `Txt_SintesisC2` | `ID_SINTESIS_36/64/C2` | Tarjeta de síntesis |
| `Btn_S03_Continuar` *(Disabled)* | `ID_BTN_S03_CONTINUAR` | Avance |

#### Slide 04 · Demostración
| Nombre en Storyline | Marcador en el script | Qué es |
|---|---|---|
| `Img_Tri1` … `Img_Tri4` | `ID_TRI_1` … `ID_TRI_4` | Los 4 triángulos idénticos |
| `Txt_EtqC2` | `ID_ETQ_C2` | Etiqueta del cuadrado central c² |
| `Txt_EtqA2` / `Txt_EtqB2` | `ID_ETQ_A2` / `ID_ETQ_B2` | Etiquetas a² y b² |
| `Txt_Formula` | `ID_FORMULA_RECUADRO` | "a² + b² = c²" |
| `Shp_MarcadorFormula` | `ID_MARCADOR_FORMULA` | Resaltado amarillo |
| `Btn_Reorganizar` | `ID_BTN_REORGANIZAR` | Botón "Reorganizar piezas" |
| `Btn_S04_Continuar` *(Disabled)* | `ID_BTN_S04_CONTINUAR` | Avance |

#### Slide 05 · Cálculo guiado
| Nombre en Storyline | Marcador en el script | Qué es |
|---|---|---|
| `Txt_FilaPaso1` … `Txt_FilaPaso4` | `ID_FILA_PASO1` … `ID_FILA_PASO4` | Texto de cada paso ("6² =") |
| `Inp_A2` / `Inp_B2` / `Inp_Suma` / `Inp_C` | `ID_CAMPO_A2` / `ID_CAMPO_B2` / `ID_CAMPO_SUMA` / `ID_CAMPO_C` | Campos numéricos (ligados a `in_a2` … `in_c`) |
| `Img_Check1` … `Img_Check4` | `ID_CHECK_1` … `ID_CHECK_4` | Marcas ✔ verdes |
| `Txt_Decision` | `ID_TEXTO_DECISION` | "¿Podrá cruzar?" |
| `Btn_Si` / `Btn_No` | `ID_BTN_SI` / `ID_BTN_NO` | Decisión |
| `Btn_ProbarPuente` *(Disabled)* | `ID_BTN_PROBAR_PUENTE` | Validar |
| `Img_Puente10m` *(Layer_CruceExitoso)* | `ID_PUENTE_10M` | Puente que se tiende |
| `Img_LinkCruce` *(Layer_CruceExitoso)* | `ID_LINK_CRUCE` | Link que cruza |
| `Txt_MensajeExito` *(Layer_CruceExitoso)* | `ID_MENSAJE_EXITO` | Mensaje de éxito |
| `Btn_S05_Continuar` *(Layer_CruceExitoso)* | `ID_BTN_S05_CONTINUAR` | Avance |
| `Shp_TarjetaPista` *(Layer_PistaError)* | `ID_TARJETA_PISTA` | Pista |
| `Img_LinkPensativo` *(Layer_PistaError)* | `ID_LINK_PENSATIVO` | Link pensativo |

#### Slide 06 · Laboratorio
| Nombre en Storyline | Marcador en el script | Qué es |
|---|---|---|
| `Btn_S06_Pred_A` / `B` / `C` | `ID_BTN_S06_PRED_A/B/C` | Mini predicción |
| `Shp_BannerEstado` | `ID_BANNER_ESTADO` | Forma con estados personalizados **Alcanza** y **NoAlcanza**; contiene `%ui_banner%` |
| `Txt_ResultadoC` | `ID_TEXTO_C` | Muestra `%ui_c_texto%` |
| `Txt_FeedbackDinamico` | (no necesita ID) | Muestra `%ui_texto%` |
| `Web_Simulador` | (no necesita ID) | Objeto web → carpeta `webobject-simulador` |
| `Btn_S06_Continuar` *(Disabled)* | `ID_BTN_S06_CONTINUAR` | Avance |

#### Slide 07 · Evaluación final
| Nombre en Storyline | Marcador en el script | Qué es |
|---|---|---|
| `Img_Triangulo5_12` | `ID_TRIANGULO_5_12` | Triángulo del desafío |
| `Grp_Lados` | `ID_GRUPO_LADOS` | Grupo de controles para identificar los lados |
| `Grp_Ecuacion` | `ID_GRUPO_ECUACION` | Grupo de opciones A/B/C |
| `Grp_Respuesta` | `ID_GRUPO_RESPUESTA` | Grupo del campo `s07_respuesta` |
| `Btn_ValidarFinal` | `ID_BTN_VALIDAR_FINAL` | Validar |
| `Shp_TarjetaError` *(en cada capa de error)* | `ID_TARJETA_ERROR` | Tarjeta del error (ID distinto en cada capa) |
| `Shp_Resalte90` *(Layer_ErrorLados)* | `ID_RESALTE_90` | Resaltado del ángulo recto |
| `Img_SelloSantuario` *(Layer_SantuarioCompletado)* | `ID_SELLO_SANTUARIO_RESUELTO` | Sello |
| `Img_LinkCelebrando` | `ID_LINK_CELEBRANDO` | Link que cruza el último puente |
| `Img_PuertaIzq` / `Img_PuertaDer` | `ID_PUERTA_IZQ` / `ID_PUERTA_DER` | Las dos hojas de la puerta |
| `Img_OrbeLuz` | `ID_ORBE_LUZ` | Orbe |
| `Shp_TarjetaResumen` | `ID_TARJETA_RESUMEN` | Contiene `%ui_resumen%` |
| `Btn_RevisarResultados` / `Btn_Reiniciar` / `Btn_Finalizar` | `ID_BTN_REVISAR` / `ID_BTN_REINICIAR` / `ID_BTN_FINALIZAR` | Cierre |

### Ajustes de los cuadros de texto animados
Esto aplica a los cuadros que muestran `%ui_titulo%`, `%ui_texto%`, `%ui_resumen%`, etc.:
- Clic derecho → **Formato de forma → Cuadro de texto → Ajuste automático: No ajustar**.
- Dales el tamaño del texto completo para que no salten mientras se escribe.
- Para la accesibilidad, conviene escribir el título completo en el **texto alternativo** del cuadro.
