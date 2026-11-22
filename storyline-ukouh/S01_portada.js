/* =====================================================================
   SLIDE 01 · PORTADA Y DETONADOR  (Slide_01_Portada)
   Efectos: cortina de entrada, título que se descifra como runas,
            subtítulo con typewriter, resaltado de marcador, cotas que
            se dibujan, botones de predicción escalonados, Link flotando.
   ===================================================================== */

/* ---------------------------------------------------------------------
   BLOQUE 1 · Trigger: Ejecutar JavaScript
             Cuando: la línea de tiempo comienza en esta diapositiva
   Objetos: el título y el subtítulo son cuadros de texto que muestran
            %ui_titulo% y %ui_texto% (desactiva "Ajustar forma al texto").
   --------------------------------------------------------------------- */
(function run() {
  if (!window.UK) return setTimeout(run, 30);   // espera a que cargue la librería
  UK.iniciar(object, getVar, setVar);

  // CHANGE THIS: pega aquí los IDs de tus objetos (clic derecho > icono copiar)
  const ID = {
    cortina:      'ID_CORTINA',       // rectángulo #FAF8F2 del tamaño de la slide, al frente
    marcador:     'ID_MARCADOR_SUB',  // rectángulo amarillo #FEF08A detrás del subtítulo
    ilustracion:  'ID_LINK_ABISMO',   // boceto de Link frente al abismo
    cotaH:        'ID_COTA_6M',       // cota horizontal cian (6 m)
    cotaV:        'ID_COTA_8M',       // cota vertical magenta (8 m)
    plataforma:   'ID_PLATAFORMA_10M',
    enunciado:    'ID_TEXTO_ENUNCIADO',
    btnA: 'ID_BTN_PRED_A', btnB: 'ID_BTN_PRED_B', btnC: 'ID_BTN_PRED_C',
    notaPie:      'ID_NOTA_PIE'
  };

  // Preparamos: todo oculto salvo la cortina
  UK.ocultar(ID.marcador, ID.cotaH, ID.cotaV, ID.plataforma, ID.enunciado, ID.btnA, ID.btnB, ID.btnC, ID.notaPie);
  setVar('ui_titulo', '');
  setVar('ui_texto', '');

  (async () => {
    await UK.entrada(ID.cortina);                                            // hoja que se retira
    await UK.runas('ui_titulo', 'LAS MATEMÁTICAS OCULTAS EN ZELDA: TOTK', { dur: 1400 });
    UK.resaltar(ID.marcador);                                                // pasa el marcador
    await UK.maquina('ui_texto', '¿PUEDE LINK CRUZAR CUALQUIER ABISMO?', { vel: 38 });

    // Diagrama: se "dibujan" las cotas como trazos de tinta
    await UK.trazar(ID.cotaH, { desde: 'izquierda' });
    await UK.trazar(ID.cotaV, { desde: 'abajo' });
    await UK.aparecer(ID.plataforma, { desde: 'izquierda', dist: 60 });
    UK.flotar(ID.ilustracion, { amp: 4, periodo: 3000 });                     // Link "respira"

    await UK.aparecer(ID.enunciado, { desde: 'abajo', dist: 20 });
    // Botones de predicción, uno tras otro
    await UK.escalonar([ID.btnA, ID.btnB, ID.btnC], 'pop', { gap: 140 });
    UK.aparecer(ID.notaPie, { desde: 'ninguno', dur: 900 });
  })();
})();


/* ---------------------------------------------------------------------
   BLOQUE 2 · Trigger: Ejecutar JavaScript
             Cuando: el usuario hace clic en Btn_Pred_A
   Colócalo DESPUÉS del trigger nativo "Ajustar variable pred_inicial = A".
   Duplica para Btn_Pred_B y Btn_Pred_C cambiando el ID del botón.
   --------------------------------------------------------------------- */
(function () {
  const BTN = 'ID_BTN_PRED_A';                        // CHANGE THIS: ID del botón pulsado
  const OTROS = ['ID_BTN_PRED_B', 'ID_BTN_PRED_C'];   // CHANGE THIS: los otros dos
  UK.vincular(object, getVar, setVar);
  UK.pulso(BTN, { veces: 1, intensidad: 10 });
  UK.brillo(BTN, { color: '#FEF08A' });
  OTROS.forEach(id => UK.tween(id, { opacity: 55 }, { dur: 300 }));   // atenúa (sin juzgar)
  UK.tween(BTN, { opacity: 100 }, { dur: 200 });
})();


/* ---------------------------------------------------------------------
   BLOQUE 3 · Trigger: Ejecutar JavaScript
             Cuando: la línea de tiempo comienza en la capa Layer_FeedbackNeutro
   --------------------------------------------------------------------- */
(function () {
  UK.vincular(object, getVar, setVar);
  const TARJETA = 'ID_TARJETA_FEEDBACK';     // CHANGE THIS
  const BTN_CONT = 'ID_BTN_S01_CONTINUAR';   // CHANGE THIS (estado inicial: Disabled)
  (async () => {
    await UK.aparecer(TARJETA, { desde: 'derecha', dist: 50 });
    await UK.desbloquear(BTN_CONT);          // Disabled -> Normal + latido de atención
  })();
})();


/* ---------------------------------------------------------------------
   BLOQUE 4 (opcional) · Transición de salida
   Trigger: Ejecutar JavaScript cuando el usuario hace clic en Btn_S01_Continuar
   + Trigger nativo: "Saltar a diapositiva siguiente cuando ui_navegar cambie"
   (QUITA el salto directo del botón, o la cortina no alcanzará a verse).
   --------------------------------------------------------------------- */
UK.vincular(object, getVar, setVar);
UK.salida('ID_CORTINA');   // CHANGE THIS
