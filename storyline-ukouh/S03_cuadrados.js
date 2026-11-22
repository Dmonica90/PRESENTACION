/* =====================================================================
   SLIDE 03 · EL SECRETO DE LOS CUADRADOS  (Slide_03_Cuadrados)
   Efectos: los cuadrados crecen desde su lado, las áreas cuentan de
            0 a 36 / 64 m², tachado animado de "6 × 2 = 12", c² = ? con
            halo de incógnita y tarjeta síntesis escalonada.
   Variables auxiliares: ui_area_a, ui_area_b (texto) mostradas como
   %ui_area_a% y %ui_area_b% dentro de cada cuadrado.
   Regla 4/5: JS lleva s03_cuadrados_ok sin doble conteo (quita el
   "Sumar 1" nativo de los pins).
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
    notaError: 'ID_NOTA_6x2',       // texto "6 × 2 = 12"
    tachado: 'ID_LINEA_TACHADO',    // línea magenta sobre "6 × 2 = 12"
    cuadA: 'ID_CUADRICULA_6x6',     // cuadrícula 6×6 cian
    cuadB: 'ID_CUADRICULA_8x8',     // cuadrícula 8×8 magenta
    cuadC: 'ID_CUADRADO_INCLINADO', // cuadrado sobre la hipotenusa
    etqC:  'ID_TEXTO_C2_INCOGNITA', // "c² = ?"
    pinA: 'ID_PIN_A', pinB: 'ID_PIN_B', pinC: 'ID_PIN_C',
    tarjeta: ['ID_SINTESIS_36', 'ID_SINTESIS_64', 'ID_SINTESIS_C2'],
    btnContinuar: 'ID_BTN_S03_CONTINUAR'
  };
  window.S03 = { ID, vistos: new Set() };
  setVar('s03_cuadrados_ok', 0);
  setVar('ui_area_a', '');
  setVar('ui_area_b', '');

  UK.ocultar(ID.cuadA, ID.cuadB, ID.cuadC, ID.etqC, ID.tachado, ...ID.tarjeta);
  (async () => {
    await UK.entrada(ID.cortina);
    await UK.maquina('ui_titulo', '¿QUÉ TIENEN QUE VER LOS CUADRADOS CON EL PUENTE?');
    // Aclaración conceptual: 6² NO es 6 × 2
    await UK.esperar(400);
    await UK.trazar(ID.tachado, { desde: 'izquierda', dur: 400 });
    UK.sacudir(ID.notaError, { amp: 5 });
    // Los pins laten para invitar a explorar
    [ID.pinA, ID.pinB, ID.pinC].forEach((p, i) => setTimeout(() => UK.latido(p, { amp: 7 }), i * 200));
  })();

  // Función común para los 3 pins
  window.S03.explorar = async function (cual) {
    const s = window.S03, id = s.ID;
    const pin = { a: id.pinA, b: id.pinB, c: id.pinC }[cual];
    UK.detener(pin, true);
    const nuevo = !s.vistos.has(cual);
    s.vistos.add(cual);
    setVar('s03_cuadrados_ok', s.vistos.size);

    if (cual === 'a') {
      await UK.barrido(id.cuadA, { desde: 'abajo', dur: 700 });       // crece desde el cateto
      UK.contar('ui_area_a', 0, 36, { dur: 1000, sufijo: ' m²' });
      UK.brillo(id.cuadA, { color: '#A5F3FC' });
    } else if (cual === 'b') {
      await UK.barrido(id.cuadB, { desde: 'izquierda', dur: 700 });
      UK.contar('ui_area_b', 0, 64, { dur: 1100, sufijo: ' m²' });
      UK.brillo(id.cuadB, { color: '#FBCFE8' });
    } else {
      await UK.desenfoque(id.cuadC, { dur: 800 });
      await UK.pop(id.etqC);
      UK.latido(id.etqC, { amp: 5, periodo: 1600 });                 // la incógnita "respira"
    }

    if (nuevo && s.vistos.size === 3) {                              // Regla 5
      await UK.esperar(600);
      await UK.escalonar(id.tarjeta, 'aparecer', { desde: 'abajo', dist: 24, gap: 180 });
      await UK.desbloquear(id.btnContinuar);
    }
  };
})();


/* ---------------------------------------------------------------------
   BLOQUE 2 · Cuando el usuario hace clic en Pin_CuadradoA
   (copia para Pin_CuadradoB → 'b' y Pin_CuadradoC → 'c')
   --------------------------------------------------------------------- */
UK.vincular(object, getVar, setVar);
window.S03.explorar('a');   // CHANGE THIS: 'a', 'b' o 'c'
