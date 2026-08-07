// ═══════════════════════════════════════════════════════════════
// REPORTE GLEAN — POR CAMPAÑA
//
// En CONTROL (col A, desde fila 2) se escriben NOMBRES DE CAMPAÑA.
// El script descubre solo qué cursos y qué personas pertenecen a cada una:
//   columna J = CAMPAIGN            → la campaña que se busca
//   columna K = LEARNING CAMPAING   → el curso dentro de esa campaña
//
// Genera 3 hojas:
//   REPORTE_CURSOS    matriz persona × curso, agrupada por campaña
//   RESUMEN_CURSOS    una fila por campaña (conteos en PERSONAS)
//   RESUMEN_DIVISION  una tabla por campaña, apiladas hacia abajo
//
// Regla de negocio: una persona cuenta como "Completado" en una campaña
// cuando terminó TODOS los cursos que tiene asignados en esa campaña.
// ═══════════════════════════════════════════════════════════════

const CFG = {
  fuenteId: '1a4tUIajOsYP3QtZC4kJd7wRfdIjvWMzxMBXvnXNmJbI',
  fuenteSheet: '90_LOOKER_DETALLE',
  controlSheet: 'CONTROL',
  controlStartRow: 2,
  resumenSheet: 'RESUMEN_CURSOS',
  divisionSheet: 'RESUMEN_DIVISION',
  consolidadoSheet: 'REPORTE_CURSOS'
};

const PAL = {
  orange: '#FC4C02', blue: '#7DA1C4', yellow: '#FF9E1B',
  red: '#CE0058', grey: '#63666A', cream: '#EDC8A3',
  white: '#FFFFFF', black: '#1b1b1b', altRow: '#FDF5EE',
  green: '#34A853',
  cellGreen: '#D9EAD3', cellYellow: '#FFF2CC', cellGrey: '#EFEFEF',
  cellRed: '#F4CCCC'
};

// Color del encabezado de cada campaña (rota si hay más campañas que colores)
const CAMPAIGN_COLORS = ['#FC4C02', '#E8112D', '#00629B', '#B8860B', '#6B2C91', '#63666A'];

// Layout
const MARGIN = 1;              // columna A vacía
const FIRST_COL = MARGIN + 1;  // = 2 (B)
const SUMMARY_START = 3;       // primera fila del resumen (una barra por campaña)

const SIN_DIVISION = '(Sin división)';

let COL = {};

// ═══════════════════════════════════════════════════════════════
// ENTRADA PRINCIPAL
// ═══════════════════════════════════════════════════════════════

function generarReportesGlean() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const campanasPedidas = leerCampanasControl_(ss);
  const datos = leerDatosFuente_();
  mapearColumnas_(datos[0]);

  const modelo = construirModelo_(datos, campanasPedidas);

  const vacias = modelo.campanas.filter(c => c.cursos.length === 0).map(c => c.nombre);
  if (vacias.length === modelo.campanas.length) {
    throw new Error(
      '❌ Ninguna campaña de CONTROL se encontró en la columna CAMPAIGN de la fuente.\n' +
      'Buscadas: ' + campanasPedidas.join(', ') + '\n' +
      'Corre "Probar mapeo (diagnóstico)" para ver las campañas disponibles.'
    );
  }

  escribirReporteConsolidado_(ss, modelo);
  generarResumen_(ss, modelo);
  generarResumenDivision_(ss, modelo);

  SpreadsheetApp.flush();

  const aviso = vacias.length
    ? ` ⚠️ Sin datos en la fuente: ${vacias.join(', ')}`
    : '';
  Logger.log(`✅ Listo — ${modelo.campanas.length} campaña(s) procesada(s).${aviso}`);
}

// ═══════════════════════════════════════════════════════════════
// LECTURA
// ═══════════════════════════════════════════════════════════════

function leerCampanasControl_(ss) {
  const controlSheet = ss.getSheetByName(CFG.controlSheet);
  if (!controlSheet) throw new Error(`❌ No se encontró la hoja '${CFG.controlSheet}'`);

  const lastRow = controlSheet.getLastRow();
  if (lastRow < CFG.controlStartRow) throw new Error('❌ No hay campañas en CONTROL');

  const vistas = new Set();
  const campanas = [];

  controlSheet
    .getRange(CFG.controlStartRow, 1, lastRow - CFG.controlStartRow + 1, 1)
    .getValues().flat()
    .map(v => safe(v))
    .forEach(v => {
      if (v === '') return;
      const clave = norm(v);
      if (vistas.has(clave)) return;   // ignora duplicados en CONTROL
      vistas.add(clave);
      campanas.push(v);
    });

  if (!campanas.length) throw new Error('❌ No hay campañas válidas en CONTROL');
  return campanas;
}

function leerDatosFuente_() {
  const fuente = SpreadsheetApp.openById(CFG.fuenteId).getSheetByName(CFG.fuenteSheet);
  if (!fuente) throw new Error(`❌ No se encontró la hoja fuente '${CFG.fuenteSheet}'`);

  const datos = fuente.getDataRange().getValues();
  if (datos.length < 2) throw new Error('❌ La fuente no tiene datos');
  return datos;
}

function mapearColumnas_(headerRow) {
  const h = headerRow.map(v => norm(safe(v)));
  COL = {
    ID: h.indexOf('id'),
    NAME: h.indexOf('name'),
    EMAIL: h.indexOf('email'),
    UBICACION: h.indexOf('ubicacion') >= 0 ? h.indexOf('ubicacion') : h.indexOf('location'),
    DIVISION: h.indexOf('division') >= 0 ? h.indexOf('division') : h.indexOf('company'),
    DEPARTAMENTO: h.indexOf('departamento') >= 0 ? h.indexOf('departamento') : h.indexOf('department'),
    PUESTO: h.indexOf('puesto') >= 0 ? h.indexOf('puesto') : h.indexOf('title'),
    MANAGER: h.indexOf('manager'),
    // 'campaign' es match exacto: no choca con 'learning campaing' ni con 'person_campaign_key'
    CAMPAIGN: h.indexOf('campaign'),
    LEARNING: h.indexOf('learning campaing'),
    STATUS: h.indexOf('status'),
    ACTIVE_STATUS: h.indexOf('active status'),
    START: h.indexOf('date start'),
    END: h.indexOf('date complete'),
    SCORE: h.indexOf('score')
  };

  // Posiciones por defecto según el layout conocido de 90_LOOKER_DETALLE
  if (COL.CAMPAIGN < 0) COL.CAMPAIGN = 9;   // J
  if (COL.LEARNING < 0) COL.LEARNING = 10;  // K
  if (COL.STATUS < 0) COL.STATUS = 13;
  if (COL.START < 0) COL.START = 14;
  if (COL.END < 0) COL.END = 15;
  if (COL.SCORE < 0) COL.SCORE = 16;
}

// ═══════════════════════════════════════════════════════════════
// MODELO DE DATOS
// ═══════════════════════════════════════════════════════════════

/**
 * Llave del registro curso-persona. Incluye la campaña porque el MISMO curso
 * puede pertenecer a dos campañas distintas (p.ej. PLD y FT 2026 vive tanto en
 * CJAC-Q3-2026 como en CJAC-Q3-CLIPAI) y sus datos son independientes.
 */
function claveCurso_(campana, curso) {
  return norm(campana) + '||' + norm(curso);
}

function construirModelo_(datos, campanasPedidas) {
  // norm(campaña) → nombre tal cual se escribió en CONTROL
  const mapaCampana = new Map();
  campanasPedidas.forEach(c => mapaCampana.set(norm(c), c));

  const peopleMap = {};
  const campanas = campanasPedidas.map(nombre => ({
    nombre: nombre,
    cursosMap: new Map(),      // norm(curso) → nombre original
    cursos: [],
    personasIds: new Set(),
    divisiones: {},
    stats: { asignados: 0, completado: 0, enProceso: 0, noIniciado: 0 }
  }));
  const porNombre = new Map();
  campanas.forEach(c => porNombre.set(norm(c.nombre), c));

  // ── PASADA 1: recorrer la fuente ──
  for (let i = 1; i < datos.length; i++) {
    const row = datos[i];

    const campanaNorm = norm(safe(row[COL.CAMPAIGN]));
    if (!mapaCampana.has(campanaNorm)) continue;

    const activeStatus = COL.ACTIVE_STATUS >= 0 ? norm(safe(row[COL.ACTIVE_STATUS])) : '';
    if (activeStatus === '' || activeStatus === 'no') continue;

    const curso = safe(row[COL.LEARNING]);
    if (!curso) continue;

    const personId = safe(row[COL.EMAIL]).toLowerCase() || safe(row[COL.ID]).replace(/\.0$/, '');
    if (!personId) continue;

    const camp = porNombre.get(campanaNorm);

    if (!peopleMap[personId]) {
      peopleMap[personId] = {
        id: safe(row[COL.ID]).replace(/\.0$/, ''),
        email: safe(row[COL.EMAIL]).toLowerCase(),
        name: safe(row[COL.NAME]),
        ubicacion: COL.UBICACION >= 0 ? safe(row[COL.UBICACION]) : '',
        division: COL.DIVISION >= 0 ? safe(row[COL.DIVISION]) : '',
        departamento: COL.DEPARTAMENTO >= 0 ? safe(row[COL.DEPARTAMENTO]) : '',
        puesto: COL.PUESTO >= 0 ? safe(row[COL.PUESTO]) : '',
        manager: COL.MANAGER >= 0 ? safe(row[COL.MANAGER]) : '',
        cursos: {}
      };
    }

    if (!camp.cursosMap.has(norm(curso))) camp.cursosMap.set(norm(curso), curso);
    camp.personasIds.add(personId);

    peopleMap[personId].cursos[claveCurso_(camp.nombre, curso)] = {
      status: normStatus_(safe(row[COL.STATUS])),
      start: row[COL.START],
      end: row[COL.END],
      score: COL.SCORE >= 0 ? row[COL.SCORE] || 0 : 0
    };
  }

  // ── PASADA 2: con la lista de cursos ya completa, calcular avance por persona ──
  campanas.forEach(camp => {
    camp.cursos = Array.from(camp.cursosMap.values())
      .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

    camp.personasIds.forEach(pid => {
      const persona = peopleMap[pid];
      let completados = 0, enProgreso = 0, asignados = 0;

      camp.cursos.forEach(curso => {
        const reg = persona.cursos[claveCurso_(camp.nombre, curso)];
        if (!reg) return;
        asignados++;
        if (reg.status === 'Completado') completados++;
        else if (reg.status === 'En Progreso') enProgreso++;
      });

      // "Completo" = terminó todo lo que tiene asignado en esta campaña
      const completoTodo = asignados > 0 && completados === asignados;

      camp.stats.asignados++;
      if (completoTodo) camp.stats.completado++;
      // Cuenta como "en proceso" tanto quien ya completó algo como quien tiene
      // un curso arrancado: con un solo curso En Progreso caería en "no iniciado".
      else if (completados > 0 || enProgreso > 0) camp.stats.enProceso++;
      else camp.stats.noIniciado++;

      const div = persona.division || SIN_DIVISION;
      if (!camp.divisiones[div]) camp.divisiones[div] = { completado: 0, pendiente: 0, total: 0 };
      camp.divisiones[div].total++;
      if (completoTodo) camp.divisiones[div].completado++;
      else camp.divisiones[div].pendiente++;
    });
  });

  return { peopleMap, campanas };
}

// ═══════════════════════════════════════════════════════════════
// HOJA 1 — REPORTE_CURSOS
// ═══════════════════════════════════════════════════════════════

function escribirReporteConsolidado_(ss, modelo) {
  const baseHeaders = ['ID', 'Correo', 'Nombre Completo Clipper', 'Ubicación', 'División', 'Departamento', 'Puesto', 'Manager'];
  const fixedCols = baseHeaders.length;

  // Solo van a la matriz las campañas que sí trajeron cursos
  const activas = modelo.campanas.filter(c => c.cursos.length > 0);

  // ── LAYOUT DE COLUMNAS ──
  let col = FIRST_COL + fixedCols;
  const layout = activas.map(camp => {
    const start = col;
    const cursos = camp.cursos.map(nombre => {
      const c = col;
      col += 4;
      return { nombre: nombre, col: c };
    });
    return { camp: camp, start: start, ancho: col - start, cursos: cursos };
  });
  const resumenCol = col;
  const totalCols = (resumenCol + 4) - FIRST_COL;

  // ── LAYOUT DE FILAS ──
  const celebRow = SUMMARY_START + layout.length;   // fila del mensaje 🎉
  const campRow = celebRow + 2;                     // encabezado de campaña
  const cursoRow = campRow + 1;                     // encabezado de curso
  const subRow = cursoRow + 1;                      // STATUS / DATE START / ...
  const dataRow = subRow + 1;

  // ── FILAS DE DATOS (se arman antes de escribir: las barras necesitan lastDataRow) ──
  const idsSet = new Set();
  layout.forEach(L => L.camp.personasIds.forEach(id => idsSet.add(id)));
  const personas = Array.from(idsSet)
    .map(id => modelo.peopleMap[id])
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));

  const rows = personas.map(persona => {
    const row = [
      persona.id, persona.email, persona.name, persona.ubicacion,
      persona.division, persona.departamento, persona.puesto, persona.manager
    ];

    let completados = 0, enProgreso = 0, asignados = 0;
    layout.forEach(L => {
      L.cursos.forEach(c => {
        const reg = persona.cursos[claveCurso_(L.camp.nombre, c.nombre)];
        row.push(
          reg ? reg.status : '',
          reg ? formatDateMX(reg.start) : '',
          reg ? formatDateMX(reg.end) : '',
          reg ? reg.score : ''
        );
        if (reg) {
          asignados++;
          if (reg.status === 'Completado') completados++;
          else if (reg.status === 'En Progreso') enProgreso++;
        }
      });
    });

    // Mismo criterio que las stats por campaña: un curso arrancado ya es "en proceso"
    const statusClip = (asignados > 0 && completados === asignados) ? '🟢 Completo' :
      (completados > 0 || enProgreso > 0) ? '🟡 En proceso' : '🔴 Sin iniciar';

    row.push(statusClip, completados, asignados, asignados > 0 ? completados / asignados : 0);
    return row;
  });

  const lastDataRow = dataRow + Math.max(rows.length, 1) - 1;

  // ── PREPARAR HOJA ──
  const sheet = getOrCreateSheet_(ss, CFG.consolidadoSheet);
  limpiarHoja_(sheet, FIRST_COL + totalCols);
  asegurarFilas_(sheet, dataRow + rows.length + 5);

  // ── TÍTULO ──
  sheet.getRange(1, FIRST_COL)
    .setValue('RESUMEN DE AVANCE')
    .setFontWeight('bold').setFontSize(14).setFontColor(PAL.orange);

  // ── BARRAS: UNA POR CAMPAÑA ──
  layout.forEach((L, idx) => {
    const letras = L.cursos.map(c => columnToLetter_(c.col));
    sheet.getRange(SUMMARY_START + idx, FIRST_COL, 1, 3).merge()
      .setFormula(rows.length
        ? construirFormulaBarraCampana_(L.camp.nombre, letras, dataRow, lastDataRow)
        : `="${L.camp.nombre.replace(/"/g, '""')}   (sin personas)"`)
      .setFontFamily('Courier New').setFontSize(11)
      .setVerticalAlignment('middle').setBackground(PAL.white);
  });

  // ── MENSAJE 🎉 (solo si todas las campañas al 100%) ──
  if (rows.length) {
    sheet.getRange(celebRow, FIRST_COL, 1, 3).merge()
      .setFormula(construirFormulaFestejo_(layout, dataRow, lastDataRow))
      .setFontWeight('bold').setFontSize(11).setFontColor(PAL.green)
      .setVerticalAlignment('middle');
  }

  // ── ENCABEZADOS BASE (merge vertical de 3 filas) ──
  for (let i = 0; i < baseHeaders.length; i++) {
    sheet.getRange(campRow, FIRST_COL + i, 3, 1).merge()
      .setValue(baseHeaders[i])
      .setBackground(i < 3 ? PAL.orange : PAL.grey)
      .setFontColor(PAL.white).setFontWeight('bold')
      .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  }

  // ── ENCABEZADOS DE CAMPAÑA + CURSO ──
  layout.forEach((L, idx) => {
    sheet.getRange(campRow, L.start, 1, L.ancho).merge()
      .setValue(L.camp.nombre)
      .setBackground(CAMPAIGN_COLORS[idx % CAMPAIGN_COLORS.length])
      .setFontColor(PAL.white).setFontWeight('bold').setFontSize(12)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');

    L.cursos.forEach(c => {
      sheet.getRange(cursoRow, c.col, 1, 4).merge()
        .setValue(c.nombre)
        .setBackground(PAL.blue).setFontColor(PAL.white).setFontWeight('bold')
        .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);

      sheet.getRange(subRow, c.col, 1, 4)
        .setValues([['STATUS', 'DATE START', 'DATE COMPLETE', 'SCORE']])
        .setBackground(PAL.red).setFontColor(PAL.white).setFontWeight('bold')
        .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
    });
  });

  // ── ENCABEZADO RESUMEN CLIPPER ──
  sheet.getRange(campRow, resumenCol, 2, 4).merge()
    .setValue('RESUMEN CLIPPER')
    .setBackground(PAL.orange).setFontColor(PAL.white).setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');

  sheet.getRange(subRow, resumenCol, 1, 4)
    .setValues([['Status Clip', 'Cursos completados', 'Total cursos asignados', '% avance']])
    .setBackground(PAL.red).setFontColor(PAL.white).setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);

  // ── DATOS ──
  if (rows.length > 0) {
    sheet.getRange(dataRow, FIRST_COL, rows.length, totalCols).setValues(rows)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');

    // Texto del colaborador alineado a la izquierda
    sheet.getRange(dataRow, FIRST_COL + 1, rows.length, 7).setHorizontalAlignment('left');

    // % avance
    sheet.getRange(dataRow, FIRST_COL + totalCols - 1, rows.length, 1).setNumberFormat('0%');

    // Filas alternas — un solo setBackgrounds en vez de uno por fila
    const bgs = rows.map((_, r) =>
      new Array(totalCols).fill(r % 2 === 0 ? PAL.altRow : PAL.white));
    sheet.getRange(dataRow, FIRST_COL, rows.length, totalCols).setBackgrounds(bgs);

    const statusCols = [];
    layout.forEach(L => L.cursos.forEach(c => statusCols.push(c.col)));

    aplicarDropdownStatus_(sheet, statusCols, rows.length, dataRow);
    aplicarFormatoStatus_(sheet, statusCols, rows.length, dataRow, resumenCol);
  }

  // ── FREEZE: A(margen) + ID + Correo + Nombre ──
  sheet.setFrozenRows(subRow);
  sheet.setFrozenColumns(FIRST_COL + 2); // = 4 → A,B,C,D
  sheet.setHiddenGridlines(true);

  autoSizeReporte_(sheet, layout, resumenCol);
}

/** % de personas que completaron TODOS los cursos de la campaña. */
function formulaPctCampana_(colLetras, dataRow, lastRow) {
  // -- fuerza la coerción booleana; necesario cuando la campaña tiene un solo curso
  const eq = colLetras.map(c => `--(${c}${dataRow}:${c}${lastRow}="Completado")`).join(',');
  // Persona "asignada" a la campaña = tiene status en al menos uno de sus cursos
  const any = colLetras.map(c => `(${c}${dataRow}:${c}${lastRow}<>"")`).join('+');
  return `IFERROR(SUMPRODUCT(${eq})/SUMPRODUCT(--((${any})>0)),0)`;
}

function construirFormulaBarraCampana_(nombre, colLetras, dataRow, lastRow) {
  const pct = formulaPctCampana_(colLetras, dataRow, lastRow);
  return `="${nombre.replace(/"/g, '""')}   " & REPT("█",ROUND(${pct}*10)) & REPT("░",10-ROUND(${pct}*10)) & " " & TEXT(${pct},"0%")`;
}

function construirFormulaFestejo_(layout, dataRow, lastRow) {
  const pcts = layout.map(L =>
    formulaPctCampana_(L.cursos.map(c => columnToLetter_(c.col)), dataRow, lastRow));
  return `=IF(MIN(${pcts.join(',')})=1,"🎉 CURSOS 100% COMPLETOS 🎉","")`;
}

function aplicarDropdownStatus_(sheet, statusCols, numRows, dataRow) {
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['No Iniciado', 'En Progreso', 'Completado'], true)
    .setAllowInvalid(false).build();
  statusCols.forEach(c => sheet.getRange(dataRow, c, numRows, 1).setDataValidation(rule));
}

function aplicarFormatoStatus_(sheet, statusCols, numRows, dataRow, resumenCol) {
  const ranges = statusCols.map(c => sheet.getRange(dataRow, c, numRows, 1));
  const clip = sheet.getRange(dataRow, resumenCol, numRows, 1);
  const rules = sheet.getConditionalFormatRules();

  [['Completado', PAL.cellGreen], ['En Progreso', PAL.cellYellow], ['No Iniciado', PAL.cellGrey]]
    .forEach(([texto, color]) => {
      rules.push(SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo(texto).setBackground(color).setRanges(ranges).build());
    });

  [['🟢', PAL.cellGreen], ['🟡', PAL.cellYellow], ['🔴', PAL.cellRed]]
    .forEach(([emoji, color]) => {
      rules.push(SpreadsheetApp.newConditionalFormatRule()
        .whenTextContains(emoji).setBackground(color).setRanges([clip]).build());
    });

  sheet.setConditionalFormatRules(rules);
}

function autoSizeReporte_(sheet, layout, resumenCol) {
  sheet.setColumnWidth(1, 30); // margen A
  sheet.setColumnWidth(FIRST_COL, 80);      // ID
  sheet.setColumnWidth(FIRST_COL + 1, 220); // Correo
  sheet.setColumnWidth(FIRST_COL + 2, 240); // Nombre
  sheet.setColumnWidth(FIRST_COL + 3, 120); // Ubicación
  sheet.setColumnWidth(FIRST_COL + 4, 120); // División
  sheet.setColumnWidth(FIRST_COL + 5, 150); // Departamento
  sheet.setColumnWidth(FIRST_COL + 6, 180); // Puesto
  sheet.setColumnWidth(FIRST_COL + 7, 180); // Manager

  layout.forEach(L => {
    L.cursos.forEach(c => {
      sheet.setColumnWidth(c.col, 120);      // STATUS
      sheet.setColumnWidth(c.col + 1, 100);  // DATE START
      sheet.setColumnWidth(c.col + 2, 110);  // DATE COMPLETE
      sheet.setColumnWidth(c.col + 3, 70);   // SCORE
    });
  });

  sheet.setColumnWidth(resumenCol, 130);
  sheet.setColumnWidth(resumenCol + 1, 120);
  sheet.setColumnWidth(resumenCol + 2, 140);
  sheet.setColumnWidth(resumenCol + 3, 90);
}

// ═══════════════════════════════════════════════════════════════
// HOJA 2 — RESUMEN_CURSOS (una fila por campaña)
// ═══════════════════════════════════════════════════════════════

function generarResumen_(ss, modelo) {
  const headers = [
    'CAMPAÑA', '# CURSOS', '# ASIGNADOS', '# COMPLETADO', '# EN PROCESO',
    '# NO INICIADO', '% CUMPLIMIENTO', 'FALTANTES'
  ];

  const rows = modelo.campanas.map(camp => {
    const s = camp.stats;
    return [
      camp.nombre, camp.cursos.length, s.asignados, s.completado, s.enProceso,
      s.noIniciado,
      s.asignados > 0 ? s.completado / s.asignados : 0,
      s.asignados - s.completado
    ];
  });

  const sheet = getOrCreateSheet_(ss, CFG.resumenSheet);
  limpiarHoja_(sheet, headers.length);
  escribirDatos_(sheet, headers, rows);
  if (rows.length > 0) sheet.getRange(2, 7, rows.length, 1).setNumberFormat('0.0%');
}

// ═══════════════════════════════════════════════════════════════
// HOJA 3 — RESUMEN_DIVISION (una tabla por campaña, apiladas)
// ═══════════════════════════════════════════════════════════════

function generarResumenDivision_(ss, modelo) {
  const ANCHO = 5;
  const sheet = getOrCreateSheet_(ss, CFG.divisionSheet);
  limpiarHoja_(sheet, FIRST_COL + ANCHO);

  // 3 filas de encabezado/título + una fila por división + GRAND TOTAL + separación
  const filasNecesarias = modelo.campanas.reduce(
    (acc, c) => acc + Object.keys(c.divisiones).length + 5, SUMMARY_START);
  asegurarFilas_(sheet, filasNecesarias + 5);

  let r = 2;

  modelo.campanas.forEach(camp => {
    const divisiones = Object.keys(camp.divisiones)
      .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

    // ── Título de la campaña ──
    sheet.getRange(r, FIRST_COL, 1, ANCHO).merge()
      .setValue('CAMPAÑA: ' + camp.nombre)
      .setBackground(PAL.orange).setFontColor(PAL.white)
      .setFontWeight('bold').setFontSize(12)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
    r++;

    // ── Encabezado ──
    sheet.getRange(r, FIRST_COL, 1, ANCHO)
      .setValues([['División', 'Completado', 'Pendiente', 'Total', 'Completion %']])
      .setBackground(PAL.orange).setFontColor(PAL.white).setFontWeight('bold')
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
    r++;

    // ── Datos + GRAND TOTAL ──
    let tc = 0, tp = 0, tt = 0;
    const filas = divisiones.map(div => {
      const d = camp.divisiones[div];
      tc += d.completado; tp += d.pendiente; tt += d.total;
      return [div, d.completado, d.pendiente, d.total, d.total > 0 ? d.completado / d.total : 0];
    });
    filas.push(['GRAND TOTAL', tc, tp, tt, tt > 0 ? tc / tt : 0]);

    if (filas.length > 0) {
      const rango = sheet.getRange(r, FIRST_COL, filas.length, ANCHO);
      rango.setValues(filas).setVerticalAlignment('middle');
      sheet.getRange(r, FIRST_COL, filas.length, 1).setHorizontalAlignment('left');
      sheet.getRange(r, FIRST_COL + 1, filas.length, 4).setHorizontalAlignment('center');

      // Columna % con fondo rosa
      sheet.getRange(r, FIRST_COL + 4, filas.length, 1)
        .setNumberFormat('0%').setBackground(PAL.cellRed);

      // GRAND TOTAL en negritas
      sheet.getRange(r + filas.length - 1, FIRST_COL, 1, ANCHO)
        .setFontWeight('bold').setBorder(true, null, null, null, null, null);

      r += filas.length;
    }

    r += 2; // separación entre tablas
  });

  sheet.setColumnWidth(1, 30);
  sheet.setColumnWidth(FIRST_COL, 220);
  for (let i = 1; i < ANCHO; i++) sheet.setColumnWidth(FIRST_COL + i, 120);
  sheet.setHiddenGridlines(true);
}

// ═══════════════════════════════════════════════════════════════
// DIAGNÓSTICO
// ═══════════════════════════════════════════════════════════════

/**
 * No escribe nada. Reporta qué columnas detectó y qué encontró por campaña.
 * Correr antes de generarReportesGlean cuando algo no cuadra.
 */
function probarMapeoColumnas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const campanasPedidas = leerCampanasControl_(ss);
  const datos = leerDatosFuente_();
  mapearColumnas_(datos[0]);

  const lineas = [];
  lineas.push('── COLUMNAS DETECTADAS ──');
  Object.keys(COL).forEach(k => {
    const idx = COL[k];
    const header = idx >= 0 && idx < datos[0].length ? safe(datos[0][idx]) : '(fuera de rango)';
    lineas.push(`  ${k}: índice ${idx} (${columnToLetter_(idx + 1)}) → "${header}"`);
  });

  const modelo = construirModelo_(datos, campanasPedidas);

  lineas.push('');
  lineas.push('── CAMPAÑAS EN CONTROL ──');
  modelo.campanas.forEach(camp => {
    if (camp.cursos.length === 0) {
      lineas.push(`  ❌ "${camp.nombre}" — NO encontrada en la fuente`);
      return;
    }
    lineas.push(`  ✅ "${camp.nombre}" — ${camp.cursos.length} curso(s), ${camp.stats.asignados} persona(s)`);
    camp.cursos.forEach(c => lineas.push(`       · ${c}`));
    lineas.push(`       completado ${camp.stats.completado} · en proceso ${camp.stats.enProceso} · sin iniciar ${camp.stats.noIniciado}`);
  });

  // Si alguna no se encontró, listar las campañas que sí existen en la fuente
  if (modelo.campanas.some(c => c.cursos.length === 0)) {
    const disponibles = new Set();
    for (let i = 1; i < datos.length; i++) {
      const v = safe(datos[i][COL.CAMPAIGN]);
      if (v) disponibles.add(v);
    }
    lineas.push('');
    lineas.push('── CAMPAÑAS DISPONIBLES EN LA FUENTE ──');
    Array.from(disponibles).sort().forEach(v => lineas.push(`  ${v}`));
  }

  const reporte = lineas.join('\n');
  Logger.log(reporte);
  try {
    SpreadsheetApp.getUi().alert('Diagnóstico', reporte, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    // Sin UI disponible (ejecución desde el editor): basta con el Logger
  }
  return reporte;
}

// ═══════════════════════════════════════════════════════════════
// UTILIDADES DE HOJA
// ═══════════════════════════════════════════════════════════════

function getOrCreateSheet_(ss, name) {
  const existing = ss.getSheetByName(name);
  if (existing) return existing;
  return ss.insertSheet(name);
}

function asegurarFilas_(sheet, n) {
  const max = sheet.getMaxRows();
  if (max < n) sheet.insertRowsAfter(max, n - max);
}

function asegurarColumnas_(sheet, n) {
  const max = sheet.getMaxColumns();
  if (max < n) sheet.insertColumnsAfter(max, n - max);
}

function limpiarHoja_(sheet, numCols) {
  const f = sheet.getFilter();
  if (f) f.remove();
  sheet.clearConditionalFormatRules();
  sheet.setFrozenRows(0);
  sheet.setFrozenColumns(0);
  asegurarColumnas_(sheet, numCols);

  const rango = sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns());
  rango.breakApart();
  rango.clearContent().clearFormat().clearDataValidations();
}

function escribirDatos_(sheet, headers, rows) {
  const data = [headers, ...rows];
  asegurarFilas_(sheet, data.length);
  asegurarColumnas_(sheet, headers.length);
  sheet.getRange(1, 1, data.length, headers.length).setValues(data);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold').setBackground(PAL.orange).setFontColor(PAL.white);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
  if (rows.length > 0) {
    try { sheet.getRange(1, 1, data.length, headers.length).createFilter(); } catch (e) {}
  }
}

// ═══════════════════════════════════════════════════════════════
// UTILIDADES DE DATOS
// ═══════════════════════════════════════════════════════════════

function normStatus_(value) {
  const s = norm(value);
  if (s === 'completed' || s === 'completado' || s === 'terminado') return 'Completado';
  if (s === 'in progress' || s === 'en progreso') return 'En Progreso';
  return 'No Iniciado';
}

function safe(v) {
  return (v !== undefined && v !== null) ? v.toString().trim() : '';
}

function norm(t) {
  return safe(t).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ').trim();
}

function formatDateMX(value) {
  if (!value) return '';
  const date = Object.prototype.toString.call(value) === '[object Date]' ? value : new Date(value);
  if (isNaN(date.getTime())) return '';
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd/MM/yyyy');
}

function columnToLetter_(column) {
  let temp, letter = '';
  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }
  return letter;
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🤖 Actualiza')
    .addItem('Actualizar datos', 'generarReportesGlean')
    .addSeparator()
    .addItem('Probar mapeo (diagnóstico)', 'probarMapeoColumnas')
    .addToUi();
}
