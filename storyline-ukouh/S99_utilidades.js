/* =====================================================================
   UTILIDADES GENERALES
   ===================================================================== */

/* ---------------------------------------------------------------------
   A · Btn_Reiniciar (Layer_SantuarioCompletado)
   Trigger 1: Ejecutar JavaScript al hacer clic (este bloque)
   Trigger 2: Saltar a Slide_01_Portada al hacer clic (debajo del 1)
   Restaura las 19 variables + auxiliares a su valor inicial.
   --------------------------------------------------------------------- */
UK.vincular(object, getVar, setVar);
UK.reiniciarVariables();


/* ---------------------------------------------------------------------
   B · Botón "Saltar animación" (accesibilidad / alumnos que repiten)
   Completa al instante todos los typewriters en curso.
   --------------------------------------------------------------------- */
UK.vincular(object, getVar, setVar);
UK.completarTexto();


/* ---------------------------------------------------------------------
   C · Depuración: muestra en la consola (F12) la telemetría actual.
   Útil al probar en navegador / Review 360.
   --------------------------------------------------------------------- */
(function () {
  const nombres = ['pred_inicial', 's02_lados_ok', 's03_cuadrados_ok', 's04_reorganizado',
    'in_a2', 'in_b2', 'in_suma', 'in_c', 's05_alcanza', 's05_completado',
    's06_pred_12m', 's06_altura_actual', 's07_lado_ok', 's07_ecuacion', 's07_respuesta',
    's07_intentos', 's07_primer_intento', 's07_tipo_error', 's07_aprobado'];
  const tabla = {};
  nombres.forEach(n => { tabla[n] = getVar(n); });
  console.table(tabla);
})();


/* ---------------------------------------------------------------------
   D · (Opcional) Enviar la telemetría al LMS en SCORM 1.2 / 2004
   Trigger: al hacer clic en Btn_Finalizar, ANTES de "Salir del curso".
   Guarda un resumen en cmi.comments / cmi.comments_from_learner y
   reporta la puntuación por intentos (100 si acertó a la primera).
   Solo funciona en salida publicada dentro de un LMS (no en vista previa).
   --------------------------------------------------------------------- */
(function () {
  function buscarLMS(win) {
    let w = win, n = 0;
    while (w && n < 10) {
      if (w.API) return { v: '1.2', api: w.API };
      if (w.API_1484_11) return { v: '2004', api: w.API_1484_11 };
      if (w.parent === w) break;
      w = w.parent; n++;
    }
    return null;
  }
  const lms = buscarLMS(window);
  if (!lms) { console.log('[UK] Sin LMS: telemetría solo local.'); return; }

  const intentos = Number(getVar('s07_intentos')) || 1;
  const puntaje = getVar('s07_aprobado') ? Math.max(60, 100 - (intentos - 1) * 10) : 0;   // CHANGE THIS: tu criterio
  const resumen = `pred=${getVar('pred_inicial')};primer=${getVar('s07_primer_intento')};` +
                  `intentos=${intentos};error=${getVar('s07_tipo_error')};pred12=${getVar('s06_pred_12m')}`;

  if (lms.v === '1.2') {
    lms.api.LMSSetValue('cmi.comments', resumen);
    lms.api.LMSSetValue('cmi.core.score.raw', String(puntaje));
    lms.api.LMSCommit('');
  } else {
    lms.api.SetValue('cmi.comments_from_learner.0.comment', resumen);
    lms.api.SetValue('cmi.score.raw', String(puntaje));
    lms.api.SetValue('cmi.score.scaled', String(puntaje / 100));
    lms.api.Commit('');
  }
})();
