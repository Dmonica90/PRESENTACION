/* =====================================================================
   UK — LIBRERÍA DE ANIMACIONES · SANTUARIO DE UKOUH (Storyline 360)
   ---------------------------------------------------------------------
   DÓNDE VA:  Vista > Patrón de diapositivas (Slide Master) > patrón
              principal > Trigger "Ejecutar JavaScript"
              cuando "la línea de tiempo comienza".
              (Alternativa: primer trigger de Slide_01 y de cualquier
              slide al que el alumno pueda llegar al reanudar.)
   QUÉ HACE:  Define window.UK con efectos reutilizables:
              - Texto:       maquina (typewriter), runas (decodificar),
                             contar (contador numérico)
              - Entradas:    aparecer, desenfoque, pop, barrido, escalonar
              - Énfasis:     pulso, latido, brillo, sacudir, resaltar, sello
              - Movimiento:  moverA, recorrido (Link cruzando), flotar
              - Transición:  entrada / salida de slide con "cortina"
              - Utilidades:  feedback (mostrar capas), desbloquear,
                             enviarWeb / escucharWeb (Web Object),
                             reiniciarVariables
   Requiere Storyline 360 build 3.98+ (Advanced JavaScript API).
   ===================================================================== */
(function () {
  'use strict';

  // Si la librería ya existe (el patrón la ejecuta en cada slide), no la redefinimos.
  if (window.UK && window.UK.__v === 1) return;

  const UK = { __v: 1 };

  // ---------------------------------------------------------------
  // 1. Referencias al API de Storyline
  //    object/getVar/setVar solo existen dentro de cada trigger, así que
  //    cada slide/capa las "presta" a la librería con UK.iniciar o UK.vincular.
  // ---------------------------------------------------------------
  const api = { object: null, getVar: null, setVar: null };
  let gen = 0;                 // "generación": cambia en cada slide para cortar secuencias viejas
  let bases = new Map();       // posición/escala original de cada objeto (evita que se "desplacen")
  let tweens = new Map();      // animaciones activas por objeto y propiedad
  let bucles = new Map();      // animaciones infinitas (flotar, latido, recorrido)
  const maquinas = new Map();  // typewriters activos por variable
  let manejadorWeb = null;     // listener de mensajes del Web Object

  // Llamar al inicio de CADA slide: detiene lo anterior y vincula el API nuevo.
  UK.iniciar = function (objectFn, getVarFn, setVarFn) {
    UK.detenerTodo();
    gen++;
    bases = new Map();
    return UK.vincular(objectFn, getVarFn, setVarFn);
  };

  // Llamar al inicio de una CAPA (layer): vincula sin detener lo de la slide base.
  UK.vincular = function (objectFn, getVarFn, setVarFn) {
    api.object = objectFn;
    api.getVar = getVarFn;
    api.setVar = setVarFn;
    return UK;
  };

  UK.get = (nombre) => api.getVar(nombre);
  UK.set = (nombre, valor) => api.setVar(nombre, valor);

  // ---------------------------------------------------------------
  // 2. Utilidades internas
  // ---------------------------------------------------------------
  const EASE = {
    lineal: t => t,
    suave: t => 1 - Math.pow(1 - t, 3),                                      // desacelera
    suaveInOut: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    atras: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }, // se pasa y regresa
    elastico: t => (t === 0 || t === 1) ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1,
    rebote: t => {
      const n = 7.5625, d = 2.75;
      if (t < 1 / d) return n * t * t;
      if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
      if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
      return n * (t -= 2.625 / d) * t + 0.984375;
    }
  };
  UK.EASE = EASE;

  // Valores por defecto (OJO: en Storyline opacidad y escala van de 0 a 100)
  const DEF = { opacity: 100, scale: 100, scaleX: 100, scaleY: 100, rotation: 0, x: 0, y: 0 };

  // Obtiene el objeto de Storyline a partir de su ID (o lo devuelve si ya es objeto)
  function o(ref) {
    if (ref && typeof ref === 'object') return ref;
    let obj = null;
    try { obj = api.object(ref); } catch (e) { obj = null; }
    if (!obj) console.warn('[UK] No encuentro el objeto con ID:', ref, '— revisa el ID copiado en Storyline.');
    return obj;
  }
  UK.obj = o;

  const clave = (ref, obj) => (typeof ref === 'string' ? ref : obj);

  // Guarda la posición original del objeto la primera vez que se anima en la slide
  function base(ref, obj) {
    const k = clave(ref, obj);
    if (!bases.has(k)) {
      bases.set(k, { x: obj.x, y: obj.y, scale: Number(obj.scale) || 100, rotation: Number(obj.rotation) || 0 });
    }
    return bases.get(k);
  }

  // Espera "ms" milisegundos. Si cambias de slide mientras tanto, la secuencia se corta.
  UK.esperar = function (ms) {
    const g = gen;
    return new Promise(r => setTimeout(() => { if (g === gen) r(); }, ms));
  };

  // Animación con Web Animations API (para clip-path y filtros)
  function waapi(obj, frames, opts) {
    try {
      const a = obj.animate(frames, opts);
      if (a && a.finished) return a.finished.then(() => {}, () => {});
    } catch (e) {
      console.warn('[UK] animate() no disponible en este objeto', e);
    }
    return UK.esperar((opts.duration || 0) + (opts.delay || 0));
  }

  // ---------------------------------------------------------------
  // 3. Motor de interpolación (tween) sobre las propiedades oficiales
  //    x, y, scale, scaleX, scaleY, rotation, opacity
  // ---------------------------------------------------------------
  UK.tween = function (ref, props, opc = {}) {
    const obj = o(ref);
    if (!obj) return Promise.resolve();
    const dur = opc.dur != null ? opc.dur : 600;
    const delay = opc.delay || 0;
    const fn = typeof opc.ease === 'function' ? opc.ease : (EASE[opc.ease] || EASE.suave);
    const k = clave(ref, obj);
    const g = gen;

    return new Promise(resolve => {
      let raf = null, timer = null, cancelado = false, t0 = null;
      const desde = {};
      const rec = {
        cancel() {
          cancelado = true;
          clearTimeout(timer);
          cancelAnimationFrame(raf);
          liberar();
          if (g === gen) resolve();
        }
      };

      // Si otra animación ya mueve la misma propiedad de este objeto, la cancelamos
      if (!tweens.has(k)) tweens.set(k, new Map());
      const porProp = tweens.get(k);
      Object.keys(props).forEach(p => { const prev = porProp.get(p); if (prev && prev !== rec) prev.cancel(); });
      Object.keys(props).forEach(p => porProp.set(p, rec));

      function liberar() {
        Object.keys(props).forEach(p => { if (porProp.get(p) === rec) porProp.delete(p); });
      }

      function paso(ahora) {
        if (cancelado || g !== gen) return;
        if (t0 === null) t0 = ahora;
        const p = dur <= 0 ? 1 : Math.min(1, (ahora - t0) / dur);
        const e = fn(p);
        for (const prop in props) obj[prop] = desde[prop] + (props[prop] - desde[prop]) * e;
        if (p < 1) raf = requestAnimationFrame(paso);
        else { liberar(); resolve(); }
      }

      function arrancar() {
        if (cancelado || g !== gen) return;
        for (const prop in props) {
          const v = Number(obj[prop]);
          desde[prop] = isNaN(v) ? (DEF[prop] != null ? DEF[prop] : 0) : v;
        }
        raf = requestAnimationFrame(paso);
      }

      if (delay > 0) timer = setTimeout(arrancar, delay); else arrancar();
    });
  };

  // Detiene animaciones (tweens y bucles) de un objeto. restaurar=true lo devuelve a su sitio.
  UK.detener = function (ref, restaurar) {
    const obj = typeof ref === 'string' ? (api.object ? (function () { try { return api.object(ref); } catch (e) { return null; } })() : null) : ref;
    const k = clave(ref, obj);
    const t = tweens.get(k);
    if (t) [...new Set(t.values())].forEach(r => r.cancel());
    const b = bucles.get(k);
    if (b) b.cancel();
    if (restaurar && obj && bases.has(k)) {
      const bb = bases.get(k);
      obj.x = bb.x; obj.y = bb.y; obj.scale = bb.scale; obj.rotation = bb.rotation;
    }
  };

  // Detiene TODO (se llama solo al cambiar de slide con UK.iniciar)
  UK.detenerTodo = function () {
    gen++;
    tweens.forEach(m => [...new Set(m.values())].forEach(r => r.cancel()));
    tweens = new Map();
    bucles.forEach(b => b.cancel());
    bucles = new Map();
    [...maquinas.values()].forEach(m => m.completar());
    if (manejadorWeb) { window.removeEventListener('message', manejadorWeb); manejadorWeb = null; }
  };

  // Registra un bucle infinito con requestAnimationFrame
  function bucle(ref, obj, alCuadro) {
    const k = clave(ref, obj);
    if (bucles.has(k)) bucles.get(k).cancel();
    const g = gen;
    let raf = null, t0 = null, vivo = true;
    const rec = { cancel() { vivo = false; cancelAnimationFrame(raf); if (bucles.get(k) === rec) bucles.delete(k); } };
    bucles.set(k, rec);
    function paso(ahora) {
      if (!vivo || g !== gen) return;
      if (t0 === null) t0 = ahora;
      if (alCuadro(ahora - t0) === false) { rec.cancel(); return; }
      raf = requestAnimationFrame(paso);
    }
    raf = requestAnimationFrame(paso);
    return rec;
  }

  // ---------------------------------------------------------------
  // 4. EFECTOS DE ENTRADA
  // ---------------------------------------------------------------
  const DIRS = { abajo: [0, 1], arriba: [0, -1], izquierda: [-1, 0], derecha: [1, 0], ninguno: [0, 0] };

  // Oculta / muestra al instante (úsalo al inicio de la slide para preparar entradas)
  UK.ocultar = (...refs) => refs.flat().forEach(r => { const ob = o(r); if (ob) ob.opacity = 0; });
  UK.mostrar = (...refs) => refs.flat().forEach(r => { const ob = o(r); if (ob) ob.opacity = 100; });

  // Aparece deslizándose desde una dirección + fundido
  UK.aparecer = function (ref, opc = {}) {
    const obj = o(ref); if (!obj) return Promise.resolve();
    const { desde = 'abajo', dist = 40, dur = 700, delay = 0, ease = 'suave' } = opc;
    const b = base(ref, obj);
    const [dx, dy] = DIRS[desde] || DIRS.abajo;
    obj.x = b.x + dx * dist;
    obj.y = b.y + dy * dist;
    obj.opacity = 0;
    return UK.tween(ref, { x: b.x, y: b.y, opacity: 100 }, { dur, delay, ease });
  };

  // Sale deslizándose + fundido
  UK.desaparecer = function (ref, opc = {}) {
    const obj = o(ref); if (!obj) return Promise.resolve();
    const { hacia = 'arriba', dist = 30, dur = 450, delay = 0, ease = 'suaveInOut' } = opc;
    const b = base(ref, obj);
    const [dx, dy] = DIRS[hacia] || DIRS.arriba;
    return UK.tween(ref, { x: b.x + dx * dist, y: b.y + dy * dist, opacity: 0 }, { dur, delay, ease });
  };

  // Aparece desde borroso a nítido (ideal para títulos y fórmulas)
  UK.desenfoque = function (ref, opc = {}) {
    const obj = o(ref); if (!obj) return Promise.resolve();
    const { dur = 900, delay = 0, blur = 14 } = opc;
    obj.opacity = 0;
    return Promise.all([
      UK.tween(ref, { opacity: 100 }, { dur, delay }),
      waapi(obj, [{ filter: `blur(${blur}px)` }, { filter: 'blur(0px)' }], { duration: dur, delay, easing: 'ease-out', fill: 'both' })
    ]);
  };

  // Aparece "saltando" desde escala 0 (botones, etiquetas, íconos)
  UK.pop = function (ref, opc = {}) {
    const obj = o(ref); if (!obj) return Promise.resolve();
    const { dur = 550, delay = 0, desdeEscala = 0 } = opc;
    const b = base(ref, obj);
    obj.scale = desdeEscala;
    obj.opacity = 0;
    return UK.tween(ref, { scale: b.scale, opacity: 100 }, { dur, delay, ease: 'atras' });
  };

  // Revela el objeto con una "cortina" (clip-path). Úsalo para trazar cotas,
  // dibujar segmentos del triángulo o barrer un resaltado de marcador.
  const CLIP_OCULTO = {
    izquierda: 'inset(0 100% 0 0)', derecha: 'inset(0 0 0 100%)',
    arriba: 'inset(0 0 100% 0)', abajo: 'inset(100% 0 0 0)',
    centro: 'inset(0 50% 0 50%)'
  };
  UK.barrido = function (ref, opc = {}) {
    const obj = o(ref); if (!obj) return Promise.resolve();
    const { desde = 'izquierda', dur = 700, delay = 0, easing = 'cubic-bezier(.65,0,.35,1)' } = opc;
    obj.opacity = 100;
    return waapi(obj, [{ clipPath: CLIP_OCULTO[desde] || CLIP_OCULTO.izquierda }, { clipPath: 'inset(0 0 0 0)' }],
      { duration: dur, delay, easing, fill: 'both' });
  };
  // Lo contrario: lo esconde con cortina
  UK.barridoSalida = function (ref, opc = {}) {
    const obj = o(ref); if (!obj) return Promise.resolve();
    const { hacia = 'derecha', dur = 600, delay = 0, easing = 'cubic-bezier(.65,0,.35,1)' } = opc;
    const opuesto = { derecha: 'derecha', izquierda: 'izquierda', arriba: 'arriba', abajo: 'abajo' };
    const fin = { derecha: 'inset(0 0 0 100%)', izquierda: 'inset(0 100% 0 0)', arriba: 'inset(0 0 100% 0)', abajo: 'inset(100% 0 0 0)' };
    return waapi(obj, [{ clipPath: 'inset(0 0 0 0)' }, { clipPath: fin[opuesto[hacia]] || fin.derecha }],
      { duration: dur, delay, easing, fill: 'both' });
  };
  // Alias con nombres pedagógicos
  UK.trazar = (ref, opc = {}) => UK.barrido(ref, Object.assign({ dur: 650 }, opc));                // dibujar segmento/cota
  UK.resaltar = (ref, opc = {}) => UK.barrido(ref, Object.assign({ dur: 450, easing: 'cubic-bezier(.6,0,.3,1)' }, opc)); // marcador amarillo

  // Aplica un efecto a varios objetos con retraso escalonado
  UK.escalonar = function (refs, efecto = 'aparecer', opc = {}) {
    const { gap = 120 } = opc;
    const base0 = opc.delay || 0;
    return Promise.all(refs.map((r, i) => UK[efecto](r, Object.assign({}, opc, { delay: base0 + i * gap }))));
  };

  // ---------------------------------------------------------------
  // 5. EFECTOS DE ÉNFASIS / FEEDBACK
  // ---------------------------------------------------------------
  // Pulso corto (acierto)
  UK.pulso = async function (ref, opc = {}) {
    const obj = o(ref); if (!obj) return;
    const { veces = 2, intensidad = 12, dur = 220 } = opc;
    const b = base(ref, obj);
    for (let i = 0; i < veces; i++) {
      await UK.tween(ref, { scale: b.scale + intensidad }, { dur, ease: 'suave' });
      await UK.tween(ref, { scale: b.scale }, { dur, ease: 'suaveInOut' });
    }
  };

  // Latido infinito para llamar la atención (se detiene con UK.detener(id))
  UK.latido = function (ref, opc = {}) {
    const obj = o(ref); if (!obj) return;
    const { amp = 6, periodo = 1400 } = opc;
    const b = base(ref, obj);
    return bucle(ref, obj, t => { obj.scale = b.scale + Math.sin(t / periodo * Math.PI * 2) * amp; });
  };

  // Sacudida horizontal (error)
  UK.sacudir = async function (ref, opc = {}) {
    const obj = o(ref); if (!obj) return;
    const { amp = 12, veces = 6, dur = 55 } = opc;
    const b = base(ref, obj);
    for (let i = 0; i < veces; i++) {
      const dir = i % 2 === 0 ? 1 : -1;
      const fuerza = amp * (1 - i / veces);       // cada sacudida es más suave
      await UK.tween(ref, { x: b.x + dir * fuerza }, { dur, ease: 'lineal' });
    }
    await UK.tween(ref, { x: b.x }, { dur, ease: 'suave' });
  };

  // Halo de luz (amarillo = acierto, magenta = alerta)
  UK.brillo = function (ref, opc = {}) {
    const obj = o(ref); if (!obj) return Promise.resolve();
    const { color = '#FEF08A', dur = 1200, veces = 1, radio = 16, delay = 0 } = opc;
    const off = `drop-shadow(0 0 0px ${color})`;
    const on = `drop-shadow(0 0 ${radio}px ${color}) drop-shadow(0 0 ${Math.round(radio / 3)}px ${color})`;
    return waapi(obj, [{ filter: off }, { filter: on }, { filter: off }],
      { duration: dur, delay, iterations: veces, easing: 'ease-in-out' });
  };

  // Sello "SANTUARIO RESUELTO": cae desde grande, rotado, y golpea la página
  UK.sello = async function (ref, opc = {}) {
    const obj = o(ref); if (!obj) return;
    const { dur = 650, delay = 0, rotFinal = -8 } = opc;
    const b = base(ref, obj);
    obj.scale = 260; obj.rotation = -30; obj.opacity = 0;
    await UK.tween(ref, { scale: b.scale, rotation: rotFinal, opacity: 100 }, { dur, delay, ease: 'atras' });
    UK.brillo(ref, { color: '#FEF08A', radio: 22, dur: 900 });
    await UK.sacudir(ref, { amp: 4, veces: 4, dur: 40 });
  };

  // Habilita un botón (estado Disabled -> Normal) con un pequeño "despertar"
  UK.desbloquear = async function (ref, opc = {}) {
    const obj = o(ref); if (!obj) return;
    const { estado = 'Normal', latir = true } = opc;
    try { obj.state = estado; } catch (e) { console.warn('[UK] No pude cambiar estado a', estado); }
    obj.opacity = 100;
    UK.brillo(ref, { color: '#FEF08A' });
    await UK.pulso(ref, { veces: 1, intensidad: 14 });
    if (latir) UK.latido(ref, { amp: 4 });  // sigue latiendo hasta que hagas UK.detener(id)
  };

  // ---------------------------------------------------------------
  // 6. MOVIMIENTO
  // ---------------------------------------------------------------
  UK.moverA = (ref, x, y, opc = {}) => UK.tween(ref, { x, y }, Object.assign({ dur: 800, ease: 'suaveInOut' }, opc));

  // Mueve un objeto por una ruta de puntos [{x,y},...] (coordenadas de la esquina
  // superior izquierda del objeto). "saltos" simula pasos/saltitos al caminar.
  UK.recorrido = function (ref, puntos, opc = {}) {
    const obj = o(ref); if (!obj || !puntos || puntos.length < 2) return Promise.resolve();
    const { vel = 160, saltos = 0, alturaSalto = 10, ease = 'suaveInOut' } = opc; // vel en px/seg
    const fn = EASE[ease] || EASE.suaveInOut;
    // Longitud de cada tramo
    const tramos = [];
    let total = 0;
    for (let i = 1; i < puntos.length; i++) {
      const l = Math.hypot(puntos[i].x - puntos[i - 1].x, puntos[i].y - puntos[i - 1].y);
      tramos.push(l); total += l;
    }
    const dur = (total / vel) * 1000;
    const g = gen;
    return new Promise(resolve => {
      bucle(ref, obj, t => {
        if (g !== gen) return false;
        const p = Math.min(1, t / dur);
        let d = fn(p) * total, i = 0;
        while (i < tramos.length - 1 && d > tramos[i]) { d -= tramos[i]; i++; }
        const f = tramos[i] ? d / tramos[i] : 1;
        const a = puntos[i], z = puntos[i + 1];
        obj.x = a.x + (z.x - a.x) * f;
        obj.y = a.y + (z.y - a.y) * f - (saltos ? Math.abs(Math.sin(p * saltos * Math.PI)) * alturaSalto : 0);
        if (p >= 1) { resolve(); return false; }
      });
    });
  };

  // Flotación suave infinita (orbe, Link pensativo, íconos)
  UK.flotar = function (ref, opc = {}) {
    const obj = o(ref); if (!obj) return;
    const { amp = 6, periodo = 2400, eje = 'y' } = opc;
    const b = base(ref, obj);
    return bucle(ref, obj, t => { obj[eje] = b[eje] + Math.sin(t / periodo * Math.PI * 2) * amp; });
  };

  // ---------------------------------------------------------------
  // 7. ANIMACIONES DE TEXTO (vía variables de texto de Storyline)
  //    En Storyline, el cuadro de texto debe mostrar la variable: %ui_titulo%
  //    Esto es más estable que manipular el SVG del texto.
  // ---------------------------------------------------------------

  // Máquina de escribir. Pausa un poco más en signos de puntuación.
  UK.maquina = function (varName, texto, opc = {}) {
    const { vel = 32, delay = 0, cursor = '▌', pausaPuntuacion = 220 } = opc;
    if (maquinas.has(varName)) maquinas.get(varName).completar();
    const g = gen;
    return new Promise(resolve => {
      let i = 0, timer = null, terminado = false;
      const fin = () => {
        if (terminado) return;
        terminado = true;
        clearTimeout(timer);
        maquinas.delete(varName);
        api.setVar(varName, texto);
        if (g === gen) resolve();
      };
      maquinas.set(varName, { completar: fin });
      const paso = () => {
        if (terminado || g !== gen) return;
        i++;
        const fragmento = texto.slice(0, i);
        api.setVar(varName, fragmento + (i < texto.length && cursor ? cursor : ''));
        if (i >= texto.length) return fin();
        timer = setTimeout(paso, /[.,;:!?¿¡—\n]/.test(texto[i - 1]) ? pausaPuntuacion : vel);
      };
      api.setVar(varName, cursor || '');
      timer = setTimeout(paso, delay);
    });
  };

  // Completa al instante el typewriter (botón "Saltar" / accesibilidad)
  UK.completarTexto = function (varName) {
    if (varName) { const m = maquinas.get(varName); if (m) m.completar(); }
    else [...maquinas.values()].forEach(m => m.completar());
  };

  // Efecto "runas que se descifran": caracteres aleatorios que se resuelven de izquierda a derecha
  UK.runas = function (varName, texto, opc = {}) {
    const { dur = 1300, delay = 0, simbolos = '#%&@$*+=?<>/ABCDEFGHJKLMNPRSTUVWXYZ0123456789' } = opc;
    const g = gen;
    return UK.esperar(delay).then(() => new Promise(resolve => {
      let t0 = null, ultimo = 0;
      const paso = (ahora) => {
        if (g !== gen) return;
        if (t0 === null) t0 = ahora;
        const p = Math.min(1, (ahora - t0) / dur);
        if (ahora - ultimo > 40 || p >= 1) {       // ~25 actualizaciones/seg para no saturar
          ultimo = ahora;
          const resueltos = Math.floor(p * texto.length);
          let s = '';
          for (let i = 0; i < texto.length; i++) {
            const c = texto[i];
            s += (i < resueltos || c === ' ' || c === '\n') ? c : simbolos[Math.floor(Math.random() * simbolos.length)];
          }
          api.setVar(varName, s);
        }
        if (p < 1) requestAnimationFrame(paso); else { api.setVar(varName, texto); resolve(); }
      };
      requestAnimationFrame(paso);
    }));
  };

  // Formatea un número con N decimales y separador decimal
  UK.formatear = function (n, decimales = 0, separador = '.') {
    return Number(n).toFixed(decimales).replace('.', separador);
  };

  // Contador animado: 0 -> 36 m², 0 -> 13.42 m, etc.
  // Si la variable es numérica y no hay prefijo/sufijo, guarda un número; si no, texto.
  UK.contar = function (varName, desde, hasta, opc = {}) {
    const { dur = 1200, delay = 0, decimales = 0, prefijo = '', sufijo = '', separador = '.', ease = 'suave' } = opc;
    const fn = EASE[ease] || EASE.suave;
    const numerica = typeof api.getVar(varName) === 'number' && !prefijo && !sufijo;
    const escribir = v => api.setVar(varName, numerica
      ? Number(v.toFixed(decimales))
      : prefijo + UK.formatear(v, decimales, separador) + sufijo);
    const g = gen;
    return UK.esperar(delay).then(() => new Promise(resolve => {
      let t0 = null, ultimo = 0;
      const paso = (ahora) => {
        if (g !== gen) return;
        if (t0 === null) t0 = ahora;
        const p = Math.min(1, (ahora - t0) / dur);
        if (ahora - ultimo > 30 || p >= 1) { ultimo = ahora; escribir(desde + (hasta - desde) * fn(p)); }
        if (p < 1) requestAnimationFrame(paso); else { escribir(hasta); resolve(); }
      };
      requestAnimationFrame(paso);
    }));
  };

  // ---------------------------------------------------------------
  // 8. TRANSICIONES ENTRE SLIDES ("cortina" de papel cuadriculado)
  //    Crea en cada slide un rectángulo del tamaño de la slide, color #FAF8F2,
  //    al frente de todo, visible desde el inicio. Copia su ID.
  // ---------------------------------------------------------------
  // Al entrar: la cortina se retira hacia la derecha como hoja de cuaderno
  UK.entrada = function (cortinaRef, opc = {}) {
    const { dur = 750, delay = 0, hacia = 'derecha' } = opc;
    const obj = o(cortinaRef); if (!obj) return Promise.resolve();
    obj.opacity = 100;
    return UK.barridoSalida(cortinaRef, { hacia, dur, delay, easing: 'cubic-bezier(.77,0,.18,1)' });
  };

  // Al salir: la cortina cubre la slide y DESPUÉS suma 1 a la variable de navegación.
  // En Storyline: trigger "Saltar a la siguiente diapositiva cuando ui_navegar cambie".
  UK.salida = async function (cortinaRef, opc = {}) {
    const { dur = 600, desde = 'izquierda', variable = 'ui_navegar' } = opc;
    const obj = o(cortinaRef);
    if (obj) {
      obj.opacity = 100;
      await UK.barrido(cortinaRef, { desde, dur, easing: 'cubic-bezier(.77,0,.18,1)' });
    }
    api.setVar(variable, (Number(api.getVar(variable)) || 0) + 1);
  };

  // ---------------------------------------------------------------
  // 9. FEEDBACK -> CAPAS
  //    JavaScript no puede mostrar capas directamente. Patrón:
  //    UK.feedback('ERROR_LADOS') escribe ui_feedback y suma 1 a ui_feedback_tick.
  //    En Storyline: "Mostrar capa Layer_ErrorLados cuando ui_feedback_tick cambie
  //    SI ui_feedback == ERROR_LADOS". El tick garantiza que la capa se muestre
  //    aunque el alumno repita el mismo error.
  // ---------------------------------------------------------------
  UK.feedback = function (tipo) {
    api.setVar('ui_feedback', tipo);
    api.setVar('ui_feedback_tick', (Number(api.getVar('ui_feedback_tick')) || 0) + 1);
  };

  // ---------------------------------------------------------------
  // 10. COMUNICACIÓN CON EL WEB OBJECT (simulador HTML5 del Slide 06)
  // ---------------------------------------------------------------
  UK.enviarWeb = function (datos) {
    document.querySelectorAll('iframe').forEach(f => {
      try { f.contentWindow.postMessage(Object.assign({ fuente: 'ukouh-storyline' }, datos), '*'); } catch (e) { /* iframe no accesible */ }
    });
  };
  UK.escucharWeb = function (callback) {
    if (manejadorWeb) window.removeEventListener('message', manejadorWeb);
    manejadorWeb = ev => { const d = ev.data; if (d && d.fuente === 'ukouh-sim') callback(d); };
    window.addEventListener('message', manejadorWeb);
  };

  // ---------------------------------------------------------------
  // 11. REINICIO DE LAS 19 VARIABLES (+ auxiliares de UI)
  // ---------------------------------------------------------------
  UK.INICIALES = {
    pred_inicial: '', s02_lados_ok: 0, s03_cuadrados_ok: 0, s04_reorganizado: false,
    in_a2: 0, in_b2: 0, in_suma: 0, in_c: 0, s05_alcanza: '', s05_completado: false,
    s06_pred_12m: '', s06_altura_actual: 8,
    s07_lado_ok: false, s07_ecuacion: '', s07_respuesta: 0,
    s07_intentos: 0, s07_primer_intento: 'PENDIENTE', s07_tipo_error: 'NINGUNO', s07_aprobado: false,
    // auxiliares (ui_feedback_tick y ui_navegar NO se reinician a propósito)
    ui_titulo: '', ui_texto: '', ui_area_a: '', ui_area_b: '', ui_c_texto: '', ui_banner: '', ui_feedback: '', ui_resumen: ''
  };
  UK.reiniciarVariables = function () {
    Object.keys(UK.INICIALES).forEach(n => {
      try { api.setVar(n, UK.INICIALES[n]); } catch (e) { console.warn('[UK] Variable inexistente:', n); }
    });
  };

  // ---------------------------------------------------------------
  // Publicar la librería
  // ---------------------------------------------------------------
  window.UK = UK;
  UK.vincular(object, getVar, setVar);
  console.log('[UK] Librería Santuario de Ukouh lista.');
})();
