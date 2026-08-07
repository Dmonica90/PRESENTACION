// Arnés de pruebas para Codigo.gs — corre la lógica pura fuera de Apps Script.
const fs = require('fs');
const vm = require('vm');

const src = fs.readFileSync(
  require('path').join(__dirname, '..', 'Codigo.gs'), 'utf8');

const ctx = {
  Logger: { log: () => {} },
  Session: { getScriptTimeZone: () => 'America/Mexico_City' },
  Utilities: {
    formatDate: (d) => {
      const p = n => String(n).padStart(2, '0');
      return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
    }
  },
  SpreadsheetApp: {},
  console
};
vm.createContext(ctx);
vm.runInContext(src, ctx);

// ── Datos sintéticos con los headers reales de 90_LOOKER_DETALLE ──
const H = ['ID','NAME','EMAIL','DIVISION','DEPARTAMENTO','MANAGER','ACTIVE STATUS','PUESTO',
  'LOCATION','CAMPAIGN','LEARNING CAMPAING','DELIVERY DATE','ITEM DUE DATE','STATUS',
  'DATE START','DATE COMPLETE','SCORE','TOPIC','COMPLETED_FLAG','IN_PROGRESS_FLAG',
  'NOT_STARTED_FLAG','TOTAL_FLAG','DURATION_MIN','HOURS_COMPLETED','HOURS_ASSIGNED',
  'LOAD_DATE','PERSON_CAMPAIGN_KEY','PERSON_TOTAL_COURSES','PERSON_COMPLETED_COURSES',
  'PERSON_FINAL_STATUS','KPI_INCLUDED_FLAG','PERTENECE SPEI'];

const PLD  = 'Prevención de Lavado de Dinero (PLD) y Financiamiento al Terrorismo (FT) 2026';
const SPEI = 'Gestión de Incidencias y Plan de Continuidad en el SPEI';

// fila(id, nombre, email, division, active, campaign, curso, status, score)
function fila(id, name, email, div, active, camp, curso, status, score) {
  const r = new Array(H.length).fill('');
  r[0]=id; r[1]=name; r[2]=email; r[3]=div; r[4]='Dept'; r[5]='Mgr';
  r[6]=active; r[7]='Puesto'; r[8]='Mexico'; r[9]=camp; r[10]=curso;
  r[13]=status; r[14]=new Date(2026,6,13); r[15]= status==='Completed'?new Date(2026,6,20):'';
  r[16]=score;
  return r;
}

const datos = [H,
  // ── ana: en AMBAS campañas. Completa PLD en 2026, y en CLIPAI completa PLD pero NO SPEI
  fila(1,'Ana Ruiz','ana@x.com','Finance','Yes','CJAC-Q3-2026',  PLD,  'Completed',   80),
  fila(1,'Ana Ruiz','ana@x.com','Finance','Yes','CJAC-Q3-CLIPAI',PLD,  'Completed',   90),
  fila(1,'Ana Ruiz','ana@x.com','Finance','Yes','CJAC-Q3-CLIPAI',SPEI, 'Not Started',  0),
  // ── beto: CLIPAI completo (los dos cursos)
  fila(2,'Beto Paz','beto@x.com','Finance','Yes','CJAC-Q3-CLIPAI',PLD, 'Completed',  100),
  fila(2,'Beto Paz','beto@x.com','Finance','Yes','CJAC-Q3-CLIPAI',SPEI,'Completed',   70),
  // ── caro: CLIPAI sin iniciar nada
  fila(3,'Caro Lim','caro@x.com','Technology','Yes','CJAC-Q3-CLIPAI',PLD, 'Not Started',0),
  fila(3,'Caro Lim','caro@x.com','Technology','Yes','CJAC-Q3-CLIPAI',SPEI,'Not Started',0),
  // ── dani: solo asignada a 1 de los 2 cursos de CLIPAI, y lo completó → cuenta completo
  fila(4,'Dani Sol','dani@x.com','Technology','Yes','CJAC-Q3-CLIPAI',PLD, 'Completed',  85),
  // ── EXCLUIDOS ──
  fila(5,'Baja Uno','baja@x.com','Finance','No','CJAC-Q3-CLIPAI',PLD,'Completed',100),   // inactivo
  fila(6,'Otra Camp','otra@x.com','People','Yes','CJAC-Q9-OTRA', PLD,'Completed',100),   // campaña no pedida
  fila(7,'Sin Div','sd@x.com','',    'Yes','CJAC-Q3-CLIPAI',PLD,'In Progress',0),        // división vacía
];

// ═══════════════════════════════════════════════
let fallos = 0, ok = 0;
function check(nombre, real, esperado) {
  const a = JSON.stringify(real), b = JSON.stringify(esperado);
  if (a === b) { ok++; console.log(`  ✅ ${nombre}`); }
  else { fallos++; console.log(`  ❌ ${nombre}\n       esperado: ${b}\n       real:     ${a}`); }
}

// `let`/`const` de nivel superior viven en el scope léxico del script, no en el
// objeto de contexto — hay que evaluarlos dentro del vm para leerlos.
const evalCtx = expr => vm.runInContext(expr, ctx);

console.log('\n── 1. Mapeo de columnas ──');
ctx.mapearColumnas_(H);
const C = evalCtx('COL');
check('CAMPAIGN → J (9)', C.CAMPAIGN, 9);
check('LEARNING → K (10)', C.LEARNING, 10);
check('STATUS → 13 (no ACTIVE STATUS ni PERSON_FINAL_STATUS)', C.STATUS, 13);
check('ACTIVE STATUS → 6', C.ACTIVE_STATUS, 6);
check('SCORE → 16', C.SCORE, 16);
check('DIVISION → 3', C.DIVISION, 3);
check('DATE START/COMPLETE → 14/15', [C.START, C.END], [14, 15]);

console.log('\n── 2. Descubrimiento de campañas y cursos ──');
const modelo = ctx.construirModelo_(datos, ['CJAC-Q3-2026', 'CJAC-Q3-CLIPAI']);
const c2026 = modelo.campanas[0], clipai = modelo.campanas[1];
check('CJAC-Q3-2026 → 1 curso', c2026.cursos, [PLD]);
check('CJAC-Q3-CLIPAI → 2 cursos (alfabético)', clipai.cursos, [SPEI, PLD]);

console.log('\n── 3. Curso repetido en 2 campañas: datos independientes ──');
const ana = modelo.peopleMap['ana@x.com'];
check('Ana tiene 3 registros (no se pisan)', Object.keys(ana.cursos).length, 3);
check('score PLD en 2026 = 80',  ana.cursos[ctx.claveCurso_('CJAC-Q3-2026', PLD)].score, 80);
check('score PLD en CLIPAI = 90', ana.cursos[ctx.claveCurso_('CJAC-Q3-CLIPAI', PLD)].score, 90);

console.log('\n── 4. Exclusiones ──');
check('inactivo (ACTIVE STATUS=No) fuera', modelo.peopleMap['baja@x.com'], undefined);
check('campaña no pedida fuera', modelo.peopleMap['otra@x.com'], undefined);

console.log('\n── 5. Avance por persona (completó TODO lo asignado) ──');
check('CJAC-Q3-2026 stats', c2026.stats,
  { asignados: 1, completado: 1, enProceso: 0, noIniciado: 0 });          // solo Ana, completa
check('CLIPAI stats', clipai.stats,
  { asignados: 5, completado: 2, enProceso: 2, noIniciado: 1 });
// completado: beto (2/2), dani (1/1 asignado)
// enProceso:  ana (1 de 2 completo), sinDiv (su único curso En Progreso)
// noIniciado: caro (los 2 sin arrancar)
check('un curso En Progreso NO cuenta como sin iniciar',
  [clipai.stats.enProceso, clipai.stats.noIniciado], [2, 1]);

console.log('\n── 6. Tabla por división (cuenta PERSONAS) ──');
check('Finance en CLIPAI', clipai.divisiones['Finance'], { completado: 1, pendiente: 1, total: 2 });
check('Technology en CLIPAI', clipai.divisiones['Technology'], { completado: 1, pendiente: 1, total: 2 });
check('división vacía → (Sin división)', clipai.divisiones['(Sin división)'],
  { completado: 0, pendiente: 1, total: 1 });

const tot = Object.values(clipai.divisiones)
  .reduce((a, d) => ({ c: a.c + d.completado, t: a.t + d.total }), { c: 0, t: 0 });
check('GRAND TOTAL divisiones == stats.asignados', tot.t, clipai.stats.asignados);
check('GRAND TOTAL completado == stats.completado', tot.c, clipai.stats.completado);

console.log('\n── 7. Campaña inexistente no truena ──');
const m2 = ctx.construirModelo_(datos, ['CAMPAÑA-FANTASMA']);
check('campaña fantasma → 0 cursos', m2.campanas[0].cursos.length, 0);
check('campaña fantasma → 0 personas', m2.campanas[0].stats.asignados, 0);

console.log('\n── 8. Fórmulas generadas ──');
const f1 = ctx.formulaPctCampana_(['J'], 10, 100);          // 1 curso
const f2 = ctx.formulaPctCampana_(['J', 'N'], 10, 100);     // 2 cursos
check('1 curso: coerción -- presente', /--\(J10:J100="Completado"\)/.test(f1), true);
check('1 curso: rango acotado (no abierto)', /J10:J100/.test(f1) && !/J10:J[^0-9]/.test(f1), true);
check('2 cursos: producto de ambos status', /--\(J10:J100="Completado"\),--\(N10:N100="Completado"\)/.test(f2), true);
check('denominador cuenta "asignado a la campaña"',
  /SUMPRODUCT\(--\(\(\(J10:J100<>""\)\+\(N10:N100<>""\)\)>0\)\)/.test(f2), true);
// Sheets escapa comillas duplicándolas: ="CJAC ""Q3""   " se lee como  CJAC "Q3"
const barra = ctx.construirFormulaBarraCampana_('CJAC "Q3"', ['J'], 10, 100);
check('comillas del nombre escapadas', barra.startsWith('="CJAC ""Q3""   " & REPT('), true);

console.log('\n── 9. Utilidades ──');
check('columnToLetter_ 2/27/28', [ctx.columnToLetter_(2), ctx.columnToLetter_(27), ctx.columnToLetter_(28)], ['B','AA','AB']);
// NFD también descompone la ñ (n + tilde) y la tilde se elimina → 'n'. No afecta el
// match porque CONTROL y la fuente pasan por la misma normalización.
check('norm quita acentos/mayúsculas/espacios', ctx.norm('  CAMPAÑA  Ünicá '), 'campana unica');
check('norm: CONTROL y fuente empatan', ctx.norm(' cjac-q3-CLIPAI ') === ctx.norm('CJAC-Q3-Clipai'), true);
check('normStatus_ variantes', [ctx.normStatus_('Completed'), ctx.normStatus_('IN PROGRESS'), ctx.normStatus_('')],
  ['Completado','En Progreso','No Iniciado']);

console.log(`\n${'═'.repeat(50)}\n${fallos === 0 ? '✅' : '❌'}  ${ok} pasaron, ${fallos} fallaron\n`);
process.exit(fallos ? 1 : 0);
