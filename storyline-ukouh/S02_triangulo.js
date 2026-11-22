/* =====================================================================
   SLIDE 02 · MODELO GEOMÉTRICO  (Slide_02_Triangulo)
   Efectos: entrada con cortina, título typewriter, ángulo de 90° que
            late, cada lado se "dibuja" y su etiqueta salta al acertar,
            sacudida + halo magenta si falla, botón que se desbloquea.
   Reglas 2 y 3: el contador s02_lados_ok lo lleva JavaScript con
   protección anti doble clic. QUITA el trigger nativo "Sumar 1 a
   s02_lados_ok" de los hotspots para no contar dos veces.
   ===================================================================== */

/* ---------------------------------------------------------------------
   BLOQUE 1 · Cuando la línea de tiempo comienza en esta diapositiva
   --------------------------------------------------------------------- */
(function run() {
  if (!window.UK) return setTimeout(run, 30);
  UK.iniciar(object, getVar, setVar);

  // CHANGE THIS: IDs de tus objetos
  const ID = {
    cortina: 'ID_CORTINA',
    angulo90: 'ID_MARCA_90',
    linkSentado: 'ID_LINK_SENTADO',
    // segmento coloreado + etiqueta que aparece al acertar (ocultos al inicio)
    segA: 'ID_SEG_CIAN',     etqA: 'ID_ETQ_CATETO_A',
    segB: 'ID_SEG_MAGENTA',  etqB: 'ID_ETQ_CATETO_B',
    segC: 'ID_SEG_AMARILLO', etqC: 'ID_ETQ_HIPOTENUSA',
    btnContinuar: 'ID_BTN_S02_CONTINUAR',
    progreso: ['ID_PUNTO_1', 'ID_PUNTO_2', 'ID_PUNTO_3']   // 3 puntitos indicadores (opcional)
  };

  // Guardamos la configuración para los bloques de clic (sobrevive entre triggers)
  window.S02 = { ID, encontrados: new Set() };
  setVar('s02_lados_ok', 0);

  UK.ocultar(ID.segA, ID.etqA, ID.segB, ID.etqB, ID.segC, ID.etqC);
  (async () => {
    await UK.entrada(ID.cortina);
    await UK.maquina('ui_titulo', '¿QUÉ FIGURA GEOMÉTRICA ESCONDE EL ABISMO?');
    UK.flotar(ID.linkSentado, { amp: 3, periodo: 3200 });
    UK.latido(ID.angulo90, { amp: 8, periodo: 1200 });   // pista visual: el ángulo recto
  })();

  // Función común para los 3 hotspots
  window.S02.acierto = async function (lado) {
    const s = window.S02, id = s.ID;
    if (s.encontrados.has(lado)) return;                 // ya lo identificó: no cuenta doble
    s.encontrados.add(lado);
    setVar('s02_lados_ok', s.encontrados.size);

    const seg = { a: id.segA, b: id.segB, c: id.segC }[lado];
    const etq = { a: id.etqA, b: id.etqB, c: id.etqC }[lado];
    const desde = { a: 'izquierda', b: 'abajo', c: 'izquierda' }[lado];
    const color = { a: '#A5F3FC', b: '#FBCFE8', c: '#FEF08A' }[lado];

    await UK.trazar(seg, { desde });
    UK.brillo(seg, { color, radio: 14 });
    await UK.pop(etq);
    if (id.progreso[s.encontrados.size - 1]) UK.pop(id.progreso[s.encontrados.size - 1]);

    if (s.encontrados.size === 3) {                      // Regla 3
      UK.detener(id.angulo90, true);
      await UK.desbloquear(id.btnContinuar);
    }
  };

  window.S02.fallo = function (idZona) {
    UK.sacudir(idZona, { amp: 8 });
    UK.brillo(idZona, { color: '#FBCFE8', radio: 12 });
    UK.pulso(window.S02.ID.angulo90, { veces: 2, intensidad: 18 });   // señala el 90°
  };
})();


/* ---------------------------------------------------------------------
   BLOQUE 2 · Cuando el usuario hace clic en Hotspot_CatetoA
   (copia para Hotspot_CatetoB → 'b' y Hotspot_Hipotenusa → 'c')
   Puedes mantener tu trigger nativo "Mostrar capa Layer_AciertoLado".
   --------------------------------------------------------------------- */
UK.vincular(object, getVar, setVar);
window.S02.acierto('a');   // CHANGE THIS: 'a', 'b' o 'c'


/* ---------------------------------------------------------------------
   BLOQUE 3 · Cuando el usuario hace clic en una zona INCORRECTA
   (p. ej. un hotspot sobre el abismo o sobre el lado equivocado)
   --------------------------------------------------------------------- */
UK.vincular(object, getVar, setVar);
window.S02.fallo('ID_ZONA_CLICADA');   // CHANGE THIS
