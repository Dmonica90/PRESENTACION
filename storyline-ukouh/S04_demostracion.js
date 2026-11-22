/* =====================================================================
   SLIDE 04 · DEMOSTRACIÓN POR REACOMODO  (Slide_04_Demostracion)
   Alternativa en JavaScript a los Motion Paths: los 4 triángulos viajan
   entre la Disposición 1 (rodean c²) y la Disposición 2 (dejan a² y b²)
   y el botón permite alternar libremente (Regla 6).
   Ventaja: un solo botón, ida y vuelta perfecta, sin 8 motion paths.
   ===================================================================== */

/* ---------------------------------------------------------------------
   BLOQUE 1 · Cuando la línea de tiempo comienza en esta diapositiva
   Coloca los 4 triángulos en la DISPOSICIÓN 1 en el lienzo.
   Para la DISPOSICIÓN 2: mueve temporalmente cada triángulo a su
   posición final, anota X, Y y Rotación (Tamaño y posición, Ctrl+Shift+Enter)
   y regrésalo. Escribe esos valores en DISPOSICION_2.
   --------------------------------------------------------------------- */
(function run() {
  if (!window.UK) return setTimeout(run, 30);
  UK.iniciar(object, getVar, setVar);

  // CHANGE THIS
  const ID = {
    cortina: 'ID_CORTINA',
    tri: ['ID_TRI_1', 'ID_TRI_2', 'ID_TRI_3', 'ID_TRI_4'],
    zonaC2: 'ID_ETQ_C2',          // etiqueta/sombreado del cuadrado central c²
    zonaA2: 'ID_ETQ_A2',          // etiqueta/sombreado a² (oculto al inicio)
    zonaB2: 'ID_ETQ_B2',          // etiqueta/sombreado b² (oculto al inicio)
    formula: 'ID_FORMULA_RECUADRO', // "a² + b² = c²" recuadrada en amarillo
    marcador: 'ID_MARCADOR_FORMULA',
    btnReorganizar: 'ID_BTN_REORGANIZAR',
    btnContinuar: 'ID_BTN_S04_CONTINUAR'
  };

  // CHANGE THIS: posiciones de la disposición 2 (px desde la esquina sup. izq. de la slide)
  const DISPOSICION_2 = [
    { x: 300, y: 120, rotation: 0 },
    { x: 420, y: 120, rotation: 180 },
    { x: 300, y: 300, rotation: 90 },
    { x: 480, y: 300, rotation: 270 }
  ];

  // La disposición 1 se lee automáticamente de cómo dejaste los triángulos
  const DISPOSICION_1 = ID.tri.map(t => {
    const o = UK.obj(t);
    return o ? { x: o.x, y: o.y, rotation: o.rotation || 0 } : { x: 0, y: 0, rotation: 0 };
  });

  window.S04 = { ID, D1: DISPOSICION_1, D2: DISPOSICION_2, enD2: false, ocupado: false };

  UK.ocultar(ID.zonaA2, ID.zonaB2, ID.formula, ID.marcador);
  (async () => {
    await UK.entrada(ID.cortina);
    await UK.runas('ui_titulo', 'EL SECRETO DEL TEOREMA DE PITÁGORAS', { dur: 1200 });
    UK.latido(ID.btnReorganizar, { amp: 5 });
  })();

  // Alterna entre disposiciones
  window.S04.alternar = async function () {
    const s = window.S04, id = s.ID;
    if (s.ocupado) return;                 // evita clics mientras se mueve
    s.ocupado = true;
    UK.detener(id.btnReorganizar, true);

    const destino = s.enD2 ? s.D1 : s.D2;
    // Sale la etiqueta de la disposición actual
    if (s.enD2) { UK.desaparecer(id.zonaA2); UK.desaparecer(id.zonaB2); }
    else UK.desaparecer(id.zonaC2);

    // Los 4 triángulos viajan escalonados con un pequeño "levantar" (escala)
    await Promise.all(id.tri.map((t, i) => (async () => {
      await UK.esperar(i * 140);
      UK.tween(t, { scale: 108 }, { dur: 200 });
      await UK.tween(t, destino[i], { dur: 900, ease: 'suaveInOut' });
      await UK.tween(t, { scale: 100 }, { dur: 220, ease: 'atras' });
    })()));

    s.enD2 = !s.enD2;
    // Aparecen las etiquetas de la nueva disposición
    if (s.enD2) {
      await UK.escalonar([id.zonaA2, id.zonaB2], 'pop', { gap: 200 });
    } else {
      await UK.pop(id.zonaC2);
    }

    // Primera vez: fórmula + marcador + desbloquear continuar
    if (!getVar('s04_reorganizado')) {
      setVar('s04_reorganizado', true);
      UK.resaltar(id.marcador);
      await UK.desenfoque(id.formula, { dur: 800 });
      UK.brillo(id.formula, { color: '#FEF08A', radio: 20 });
      await UK.desbloquear(id.btnContinuar);
    } else {
      UK.pulso(id.formula, { veces: 1 });
    }
    s.ocupado = false;
  };
})();


/* ---------------------------------------------------------------------
   BLOQUE 2 · Cuando el usuario hace clic en Btn_Reorganizar
   (si usas este script, elimina los motion paths y el trigger nativo
    "s04_reorganizado = True": JS ya lo asigna)
   --------------------------------------------------------------------- */
UK.vincular(object, getVar, setVar);
window.S04.alternar();
