/* =====================================================================
   SLIDE 07 · EVALUACIÓN FINAL  (Slide_07_EvaluacionFinal)
   Implementa las Reglas 12–15 en UN solo bloque (evita problemas de
   orden entre triggers nativos):
     12 · s07_intentos + 1 en cada clic
     13 · s07_primer_intento inmutable (solo en el intento 1)
     14 · diagnóstico jerárquico LADOS > FORMULA > CALCULO
     15 · aprobación + resumen metacognitivo (pred_inicial vs resultado)
   Y la celebración final: sello, desarrollo con typewriter, Link cruza,
   puerta que se abre y orbe flotando.
   ===================================================================== */

/* ---------------------------------------------------------------------
   BLOQUE 1 · Cuando la línea de tiempo comienza en esta diapositiva
   --------------------------------------------------------------------- */
(function run() {
  if (!window.UK) return setTimeout(run, 30);
  UK.iniciar(object, getVar, setVar);

  // CHANGE THIS
  const ID = {
    cortina: 'ID_CORTINA',
    triangulo: 'ID_TRIANGULO_5_12',
    controles: ['ID_GRUPO_LADOS', 'ID_GRUPO_ECUACION', 'ID_GRUPO_RESPUESTA'],
    btnValidar: 'ID_BTN_VALIDAR_FINAL'
  };
  window.S07 = { ID };

  UK.ocultar(...ID.controles, ID.btnValidar);
  (async () => {
    await UK.entrada(ID.cortina);
    await UK.runas('ui_titulo', 'EL ÚLTIMO DESAFÍO DEL SANTUARIO', { dur: 1300 });
    await UK.desenfoque(ID.triangulo, { dur: 800 });
    await UK.escalonar(ID.controles, 'aparecer', { desde: 'abajo', dist: 24, gap: 200 });
    await UK.pop(ID.btnValidar);
  })();
})();


/* ---------------------------------------------------------------------
   BLOQUE 2 · Cuando el usuario hace clic en Btn_ValidarFinal
   ELIMINA los triggers nativos de las reglas 12–15 (este bloque los hace).
   Storyline (en la slide base):
     Mostrar capa Layer_ErrorLados        cuando ui_feedback_tick cambie SI ui_feedback == LADOS
     Mostrar capa Layer_ErrorFormula      cuando ui_feedback_tick cambie SI ui_feedback == FORMULA
     Mostrar capa Layer_ErrorCalculo      cuando ui_feedback_tick cambie SI ui_feedback == CALCULO
     Mostrar capa Layer_SantuarioCompletado cuando ui_feedback_tick cambie SI ui_feedback == EXITO_S07
   --------------------------------------------------------------------- */
(function () {
  UK.vincular(object, getVar, setVar);
  const ID = window.S07 ? window.S07.ID : {};
  const RESPUESTA_CORRECTA = 13;   // 5² + 12² = 169 -> √169 = 13

  // Si ya aprobó, no seguimos sumando intentos
  if (getVar('s07_aprobado') === true) return;

  // Regla 12: contador de intentos
  const intentos = (Number(getVar('s07_intentos')) || 0) + 1;
  setVar('s07_intentos', intentos);

  // Evaluación de los 3 criterios
  const ladoOk = getVar('s07_lado_ok') === true;
  const ecuacionOk = getVar('s07_ecuacion') === 'B';
  const respuestaOk = Math.abs(Number(getVar('s07_respuesta')) - RESPUESTA_CORRECTA) < 0.001;
  const exito = ladoOk && ecuacionOk && respuestaOk;

  // Regla 13: primer intento inmutable
  if (intentos === 1 && getVar('s07_primer_intento') === 'PENDIENTE') {
    setVar('s07_primer_intento', exito ? 'ACIERTO' : 'ERROR');
  }

  if (exito) {
    // Regla 15. s07_tipo_error conserva el último error cometido (NINGUNO si acertó a la primera)
    setVar('s07_aprobado', true);

    // Resumen metacognitivo: predicción del Slide 01 vs resultado
    // (la respuesta correcta en Slide 01 era A: 6-8-10 cabe exacto)
    const pred = getVar('pred_inicial');
    const textoPred = {
      A: 'Predijiste que la plataforma alcanzaba… ¡y las matemáticas te dieron la razón!',
      B: 'Predijiste que era demasiado corta; el cálculo demostró que 10 m era exacto.',
      C: 'Preferiste calcular antes de opinar: justo lo que hace un buen explorador.'
    }[pred] || 'Tu predicción inicial no quedó registrada.';
    const primer = getVar('s07_primer_intento') === 'ACIERTO' ? 'Sí ✔' : 'No (lo lograste reintentando)';
    setVar('ui_resumen',
      `${textoPred}\n` +
      `Resolviste el desafío al primer intento: ${primer}\n` +
      `Intentos totales: ${intentos}`);

    UK.feedback('EXITO_S07');
  } else {
    // Regla 14: diagnóstico por prioridad
    const tipo = !ladoOk ? 'LADOS' : (!ecuacionOk ? 'FORMULA' : 'CALCULO');
    setVar('s07_tipo_error', tipo);

    // Señala el control culpable sin revelar la respuesta
    const culpable = { LADOS: 0, FORMULA: 1, CALCULO: 2 }[tipo];
    if (ID.controles) {
      UK.sacudir(ID.controles[culpable]);
      UK.brillo(ID.controles[culpable], { color: '#FBCFE8', veces: 2 });
    }
    UK.feedback(tipo);
  }
})();


/* ---------------------------------------------------------------------
   BLOQUE 3 · Cuando la línea de tiempo comienza en Layer_ErrorLados
   (igual para Layer_ErrorFormula y Layer_ErrorCalculo cambiando IDs)
   --------------------------------------------------------------------- */
(function () {
  UK.vincular(object, getVar, setVar);
  UK.aparecer('ID_TARJETA_ERROR', { desde: 'derecha', dist: 40 });   // CHANGE THIS
  UK.latido('ID_RESALTE_90', { amp: 8, periodo: 1100 });            // CHANGE THIS (solo en ErrorLados)
})();


/* ---------------------------------------------------------------------
   BLOQUE 4 · Cuando la línea de tiempo comienza en Layer_SantuarioCompletado
   Recién AQUÍ se revela el desarrollo completo (regla sin spoilers).
   Cuadros de texto: %ui_texto% (desarrollo) y %ui_resumen% (tarjeta).
   --------------------------------------------------------------------- */
(function () {
  UK.vincular(object, getVar, setVar);
  // CHANGE THIS
  const ID = {
    sello: 'ID_SELLO_SANTUARIO_RESUELTO',
    link: 'ID_LINK_CELEBRANDO',
    puertaIzq: 'ID_PUERTA_IZQ', puertaDer: 'ID_PUERTA_DER',
    orbe: 'ID_ORBE_LUZ',
    tarjeta: 'ID_TARJETA_RESUMEN',
    botones: ['ID_BTN_REVISAR', 'ID_BTN_REINICIAR', 'ID_BTN_FINALIZAR']
  };
  // CHANGE THIS: ruta de Link sobre el último puente
  const RUTA = [{ x: 140, y: 430 }, { x: 330, y: 150 }, { x: 420, y: 150 }];

  setVar('ui_texto', '');
  UK.ocultar(ID.sello, ID.orbe, ID.tarjeta, ...ID.botones);
  (async () => {
    await UK.maquina('ui_texto', '5² + 12² = 25 + 144 = 169\nc = √169 = 13 m', { vel: 45 });
    await UK.recorrido(ID.link, RUTA, { vel: 180, saltos: 9, alturaSalto: 9 });

    // La puerta del santuario se abre
    const pi = UK.obj(ID.puertaIzq), pd = UK.obj(ID.puertaDer);
    if (pi && pd) {
      await Promise.all([
        UK.tween(ID.puertaIzq, { x: pi.x - pi.width * 0.9 }, { dur: 1100, ease: 'suaveInOut' }),
        UK.tween(ID.puertaDer, { x: pd.x + pd.width * 0.9 }, { dur: 1100, ease: 'suaveInOut' })
      ]);
    }

    // Orbe de luz y sello
    await UK.pop(ID.orbe, { dur: 700 });
    UK.flotar(ID.orbe, { amp: 8, periodo: 2600 });
    UK.brillo(ID.orbe, { color: '#FEF08A', radio: 26, veces: Infinity, dur: 2000 });
    await UK.sello(ID.sello);

    // Tarjeta comparativa y botones
    await UK.aparecer(ID.tarjeta, { desde: 'abajo', dist: 30 });
    await UK.escalonar(ID.botones, 'pop', { gap: 140 });
  })();
})();
