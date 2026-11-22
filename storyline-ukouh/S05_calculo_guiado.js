/* =====================================================================
   SLIDE 05 · CÁLCULO GUIADO  (Slide_05_CalculoGuiado)
   Reglas 7–10 "Sin Spoilers": cada paso se valida y desbloquea el
   siguiente con animación. Error = sacudida del campo (sin revelar
   la respuesta). Btn_ProbarPuente decide éxito/pista y Link cruza.
   ===================================================================== */

/* ---------------------------------------------------------------------
   BLOQUE 1 · Cuando la línea de tiempo comienza en esta diapositiva
   Los campos in_b2, in_suma, in_c y sus filas empiezan OCULTOS en
   Storyline (estado Hidden) o con opacidad 0 vía JS (abajo).
   --------------------------------------------------------------------- */
(function run() {
  if (!window.UK) return setTimeout(run, 30);
  UK.iniciar(object, getVar, setVar);

  // CHANGE THIS: cada paso = fila (texto "6² =") + campo + check verde
  const ID = {
    cortina: 'ID_CORTINA',
    pasos: {
      in_a2:   { fila: 'ID_FILA_PASO1', campo: 'ID_CAMPO_A2',   check: 'ID_CHECK_1', esperado: 36,  sig: 'in_b2' },
      in_b2:   { fila: 'ID_FILA_PASO2', campo: 'ID_CAMPO_B2',   check: 'ID_CHECK_2', esperado: 64,  sig: 'in_suma' },
      in_suma: { fila: 'ID_FILA_PASO3', campo: 'ID_CAMPO_SUMA', check: 'ID_CHECK_3', esperado: 100, sig: 'in_c' },
      in_c:    { fila: 'ID_FILA_PASO4', campo: 'ID_CAMPO_C',    check: 'ID_CHECK_4', esperado: 10,  sig: null }
    },
    decision: ['ID_TEXTO_DECISION', 'ID_BTN_SI', 'ID_BTN_NO'],
    btnProbar: 'ID_BTN_PROBAR_PUENTE'
  };
  window.S05 = { ID, resueltos: new Set() };

  // Oculta todo lo que sería spoiler
  const p = ID.pasos;
  UK.ocultar(p.in_b2.fila, p.in_b2.campo, p.in_suma.fila, p.in_suma.campo, p.in_c.fila, p.in_c.campo,
    p.in_a2.check, p.in_b2.check, p.in_suma.check, p.in_c.check, ...ID.decision, ID.btnProbar);

  (async () => {
    await UK.entrada(ID.cortina);
    await UK.maquina('ui_titulo', 'CALCULA Y PRUEBA LA PLATAFORMA DE 10 M');
    await UK.aparecer(p.in_a2.fila, { desde: 'izquierda', dist: 30 });
    UK.brillo(p.in_a2.campo, { color: '#FEF08A', veces: 2 });
  })();

  // Valida un paso (se llama cuando cambia la variable del campo)
  window.S05.validar = async function (varName) {
    const s = window.S05, paso = s.ID.pasos[varName];
    const valor = Number(getVar(varName));
    if (Math.abs(valor - paso.esperado) < 0.001) {
      if (s.resueltos.has(varName)) return;
      s.resueltos.add(varName);
      await UK.pop(paso.check);                       // ✔ verde
      UK.brillo(paso.campo, { color: '#86EFAC' });
      if (paso.sig) {                                 // desbloquea el siguiente paso
        const sig = s.ID.pasos[paso.sig];
        try { UK.obj(sig.campo).state = 'Normal'; } catch (e) {}
        await UK.aparecer(sig.fila, { desde: 'izquierda', dist: 30 });
        await UK.aparecer(sig.campo, { desde: 'izquierda', dist: 30 });
        UK.brillo(sig.campo, { color: '#FEF08A', veces: 2 });
      } else {                                        // paso 4 resuelto: decisión final
        await UK.escalonar(s.ID.decision, 'aparecer', { desde: 'abajo', dist: 20, gap: 150 });
      }
    } else if (valor !== 0) {
      // Error: sacude el campo SIN mostrar la respuesta
      UK.sacudir(paso.campo);
      UK.brillo(paso.campo, { color: '#FBCFE8' });
    }
  };
})();


/* ---------------------------------------------------------------------
   BLOQUE 2 · Cuando la variable in_a2 cambia
   (repite el trigger para in_b2, in_suma e in_c cambiando el nombre)
   Nota: la variable de un campo numérico cambia al perder el foco o
   pulsar Enter.
   --------------------------------------------------------------------- */
UK.vincular(object, getVar, setVar);
window.S05.validar('in_a2');   // CHANGE THIS: 'in_b2', 'in_suma', 'in_c'


/* ---------------------------------------------------------------------
   BLOQUE 3 · Cuando el usuario hace clic en Btn_Si  /  Btn_No
   Va después del trigger nativo "s05_alcanza = SI" (o "NO").
   --------------------------------------------------------------------- */
UK.vincular(object, getVar, setVar);
UK.pulso('ID_BTN_SI', { veces: 1 });          // CHANGE THIS: el botón pulsado
UK.desbloquear('ID_BTN_PROBAR_PUENTE');       // CHANGE THIS


/* ---------------------------------------------------------------------
   BLOQUE 4 · Cuando el usuario hace clic en Btn_ProbarPuente  (Regla 10)
   Storyline:
     - "Mostrar capa Layer_CruceExitoso cuando ui_feedback_tick cambie
        SI ui_feedback == EXITO_S05"
     - "Mostrar capa Layer_PistaError cuando ui_feedback_tick cambie
        SI ui_feedback == ERROR_S05"
   --------------------------------------------------------------------- */
(function () {
  UK.vincular(object, getVar, setVar);
  UK.detener('ID_BTN_PROBAR_PUENTE', true);   // CHANGE THIS: deja de latir
  const ok = Math.abs(Number(getVar('in_c')) - 10) < 0.001 && getVar('s05_alcanza') === 'SI';
  if (ok) {
    setVar('s05_completado', true);
    UK.feedback('EXITO_S05');
  } else {
    UK.sacudir('ID_BTN_PROBAR_PUENTE');
    UK.feedback('ERROR_S05');
  }
})();


/* ---------------------------------------------------------------------
   BLOQUE 5 · Cuando la línea de tiempo comienza en Layer_CruceExitoso
   El puente se tiende, Link cruza dando saltitos y aparece el mensaje.
   --------------------------------------------------------------------- */
(function () {
  UK.vincular(object, getVar, setVar);
  // CHANGE THIS
  const PUENTE = 'ID_PUENTE_10M';
  const LINK = 'ID_LINK_CRUCE';
  const MENSAJE = 'ID_MENSAJE_EXITO';
  const BTN = 'ID_BTN_S05_CONTINUAR';
  // CHANGE THIS: ruta de Link (esquina sup. izq. del objeto). Inicio en la
  // plataforma baja, fin en la alta; agrega puntos intermedios si quieres.
  const RUTA = [{ x: 120, y: 420 }, { x: 300, y: 180 }, { x: 360, y: 180 }];

  UK.ocultar(MENSAJE, BTN);
  (async () => {
    await UK.barrido(PUENTE, { desde: 'izquierda', dur: 900 });     // se tiende la plataforma
    UK.brillo(PUENTE, { color: '#FEF08A' });
    await UK.recorrido(LINK, RUTA, { vel: 170, saltos: 8, alturaSalto: 8 });
    await UK.pulso(LINK, { veces: 1, intensidad: 15 });            // ¡llegó!
    await UK.aparecer(MENSAJE, { desde: 'abajo', dist: 30 });
    await UK.desbloquear(BTN);
  })();
})();


/* ---------------------------------------------------------------------
   BLOQUE 6 · Cuando la línea de tiempo comienza en Layer_PistaError
   --------------------------------------------------------------------- */
UK.vincular(object, getVar, setVar);
UK.aparecer('ID_TARJETA_PISTA', { desde: 'derecha', dist: 40 });    // CHANGE THIS
UK.flotar('ID_LINK_PENSATIVO', { amp: 4, periodo: 2000 });           // CHANGE THIS
