/* =====================================================================
   SLIDE 06 · LABORATORIO WHAT-IF  (Slide_06_Laboratorio)
   Conecta Storyline con el Web Object (webobject-simulador/index.html)
   en ambos sentidos con postMessage (Regla 11):
     Storyline -> simulador : altura y desbloqueo tras la predicción
     simulador -> Storyline : altura del slider y resultado del cruce
   Además genera los feedbacks dinámicos del punto 14 de la sábana.
   IMPORTANTE: en Storyline los Web Objects SIEMPRE quedan por encima de
   todo, por eso el bloqueo "primero predice" vive dentro del simulador.
   Variables auxiliares: ui_c_texto, ui_banner, ui_texto (texto).
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
    preds: ['ID_BTN_S06_PRED_A', 'ID_BTN_S06_PRED_B', 'ID_BTN_S06_PRED_C'],
    banner: 'ID_BANNER_ESTADO',     // forma con estados personalizados "Alcanza" y "NoAlcanza"
    resultado: 'ID_TEXTO_C',        // muestra %ui_c_texto%
    btnContinuar: 'ID_BTN_S06_CONTINUAR'
  };
  const BASE = 6, PLATAFORMA = 10;

  window.S06 = { ID, prev: getVar('s06_altura_actual'), cruces: 0 };

  // Calcula c, actualiza textos, banner y feedback dinámico
  window.S06.actualizar = function (b, avisarSimulador) {
    const s = window.S06;
    b = Math.max(0, Math.min(14, Number(b)));
    const c = Math.sqrt(BASE * BASE + b * b);
    setVar('ui_c_texto', `c = √(6² + ${UK.formatear(b, b % 1 ? 1 : 0)}²) ≈ ${UK.formatear(c, 2)} m`);

    if (c <= PLATAFORMA + 1e-9) {
      setVar('ui_banner', `✔ La plataforma de 10 m alcanza (sobran ${UK.formatear(PLATAFORMA - c, 2)} m)`);
      try { UK.obj(s.ID.banner).state = 'Alcanza'; } catch (e) {}
    } else {
      setVar('ui_banner', `✖ No alcanza: faltan ${UK.formatear(c - PLATAFORMA, 2)} m`);
      try { UK.obj(s.ID.banner).state = 'NoAlcanza'; } catch (e) {}
    }

    // Feedbacks dinámicos (sábana, fila 14)
    if (b === 0) setVar('ui_texto', 'Cuando la altura llega a cero, ambos extremos están al mismo nivel y la distancia es igual al tramo horizontal.');
    else if (c > PLATAFORMA) setVar('ui_texto', 'Necesitamos una plataforma más larga. Calcula la diferencia entre la longitud disponible y la distancia necesaria.');
    else if (b > s.prev) setVar('ui_texto', 'Observa cómo crece la hipotenusa aunque la distancia horizontal siga siendo la misma.');
    else if (b < s.prev) setVar('ui_texto', 'La distancia diagonal se reduce.');
    s.prev = b;

    if (avisarSimulador) UK.enviarWeb({ tipo: 'altura', valor: b });
  };

  // Mensajes que llegan desde el simulador
  UK.escucharWeb(msg => {
    UK.vincular(object, getVar, setVar);
    if (msg.tipo === 'altura') {
      if (Number(getVar('s06_altura_actual')) !== Number(msg.valor)) setVar('s06_altura_actual', Number(msg.valor));
      window.S06.actualizar(msg.valor, false);
    }
    if (msg.tipo === 'cruce') {
      window.S06.cruces++;
      UK.pulso(window.S06.ID.resultado, { veces: 1 });
      if (!msg.alcanza) UK.brillo(window.S06.ID.banner, { color: '#FBCFE8', veces: 2 });
      if (window.S06.cruces === 1) UK.desbloquear(window.S06.ID.btnContinuar);  // probó al menos 1 vez
    }
    if (msg.tipo === 'listo' && getVar('s06_pred_12m') !== '') {
      UK.enviarWeb({ tipo: 'habilitar' });   // si vuelve a la slide ya predicha
      UK.enviarWeb({ tipo: 'altura', valor: Number(getVar('s06_altura_actual')) });
    }
  });

  (async () => {
    await UK.entrada(ID.cortina);
    await UK.maquina('ui_titulo', '¿QUÉ PASA SI CAMBIA LA ALTURA?');
    await UK.escalonar(ID.preds, 'aparecer', { desde: 'derecha', dist: 40, gap: 130 });
    window.S06.actualizar(getVar('s06_altura_actual'), false);
    if (getVar('s06_pred_12m') !== '') UK.enviarWeb({ tipo: 'habilitar' });
  })();
})();


/* ---------------------------------------------------------------------
   BLOQUE 2 · Cuando el usuario hace clic en Btn_S06_Pred_A / B / C
   Después del trigger nativo "s06_pred_12m = A" (B / C).
   --------------------------------------------------------------------- */
(function () {
  UK.vincular(object, getVar, setVar);
  const BTN = 'ID_BTN_S06_PRED_A';   // CHANGE THIS
  UK.pulso(BTN, { veces: 1 });
  UK.brillo(BTN, { color: '#FEF08A' });
  UK.enviarWeb({ tipo: 'habilitar' });                                   // abre el simulador
  UK.enviarWeb({ tipo: 'altura', valor: Number(getVar('s06_altura_actual')) });
})();


/* ---------------------------------------------------------------------
   BLOQUE 3 (solo si TAMBIÉN usas un slider nativo de Storyline)
   Cuando la variable s06_altura_actual cambia
   --------------------------------------------------------------------- */
UK.vincular(object, getVar, setVar);
window.S06.actualizar(getVar('s06_altura_actual'), true);
