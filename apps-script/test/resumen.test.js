// Verifica RESUMEN_CURSOS y el apilado de tablas en RESUMEN_DIVISION.
const fs = require('fs');
const vm = require('vm');

function nuevaHoja() {
  const st = { cells: {}, merges: [], maxRows: 1000, maxCols: 26 };
  const rango = (r, c, nr = 1, nc = 1) => {
    const self = {
      merge() { st.merges.push({ r, c, nr, nc }); return self; },
      setValue(v) { st.cells[`${r},${c}`] = v; return self; },
      setValues(vals) { vals.forEach((row, i) => row.forEach((v, j) => { st.cells[`${r + i},${c + j}`] = v; })); return self; },
      setFormula(f) { st.cells[`${r},${c}`] = f; return self; },
      setBackgrounds() { return self; }, createFilter() { return self; }
    };
    ['setBackground','setFontColor','setFontWeight','setFontSize','setFontFamily',
     'setHorizontalAlignment','setVerticalAlignment','setWrap','setNumberFormat',
     'setDataValidation','breakApart','clearContent','clearFormat','clearDataValidations',
     'setBorder'].forEach(m => { self[m] = () => self; });
    return self;
  };
  return { st,
    sheet: {
      getFilter: () => null, clearConditionalFormatRules() {}, getConditionalFormatRules: () => [],
      setConditionalFormatRules() {}, setFrozenRows() {}, setFrozenColumns() {},
      getMaxRows: () => st.maxRows, getMaxColumns: () => st.maxCols,
      insertRowsAfter(_, n) { st.maxRows += n; }, insertColumnsAfter(_, n) { st.maxCols += n; },
      setColumnWidth() {}, setHiddenGridlines() {}, autoResizeColumns() {},
      getRange: (r, c, nr, nc) => rango(r, c, nr, nc)
    } };
}

const hojas = {};
const ss = {
  getSheetByName: n => (hojas[n] = hojas[n] || nuevaHoja()).sheet,
  insertSheet: n => (hojas[n] = hojas[n] || nuevaHoja()).sheet
};
const chain = () => new Proxy({}, { get: (t, p) => p === 'build' ? () => ({}) : () => chain() });
const ctx = {
  Logger: { log: () => {} }, Session: { getScriptTimeZone: () => 'UTC' },
  Utilities: { formatDate: d => `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}` },
  SpreadsheetApp: { getActiveSpreadsheet: () => ss, newDataValidation: chain, newConditionalFormatRule: chain },
  console
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(
  require('path').join(__dirname, '..', 'Codigo.gs'), 'utf8'), ctx);

const H = ['ID','NAME','EMAIL','DIVISION','DEPARTAMENTO','MANAGER','ACTIVE STATUS','PUESTO',
  'LOCATION','CAMPAIGN','LEARNING CAMPAING','DELIVERY DATE','ITEM DUE DATE','STATUS',
  'DATE START','DATE COMPLETE','SCORE'];
const f = (id, div, camp, curso, st) => {
  const r = new Array(H.length).fill('');
  r[0]=id; r[1]='P'+id; r[2]=`${id}@x.com`; r[3]=div; r[6]='Yes'; r[9]=camp; r[10]=curso; r[13]=st;
  return r;
};
const datos = [H,
  f(1,'Finance','C-A','Curso1','Completed'),
  f(2,'Finance','C-A','Curso1','Not Started'),
  f(3,'Technology','C-A','Curso1','Completed'),
  f(4,'Technology','C-A','Curso1','In Progress'),
  f(5,'People','C-A','Curso1','Not Started'),
  f(1,'Finance','C-B','Curso2','Completed'),
  f(1,'Finance','C-B','Curso3','Completed'),
  f(2,'Finance','C-B','Curso2','Not Started'),
];

ctx.mapearColumnas_(H);
const modelo = ctx.construirModelo_(datos, ['C-A', 'C-B']);
ctx.generarResumen_(ss, modelo);
ctx.generarResumenDivision_(ss, modelo);

let fallos = 0, ok = 0;
const check = (n, real, esp) => {
  const a = JSON.stringify(real), b = JSON.stringify(esp);
  if (a === b) { ok++; console.log(`  ✅ ${n}`); }
  else { fallos++; console.log(`  ❌ ${n}\n       esperado: ${b}\n       real:     ${a}`); }
};

console.log('\n── RESUMEN_CURSOS ──');
const R = hojas['RESUMEN_CURSOS'].st.cells;
check('headers', [R['1,1'], R['1,2'], R['1,3'], R['1,7']],
  ['CAMPAÑA','# CURSOS','# ASIGNADOS','% CUMPLIMIENTO']);
// C-A: 5 personas, 2 completas (id1, id3) → 40%
check('C-A fila', [R['2,1'], R['2,2'], R['2,3'], R['2,4'], R['2,5'], R['2,6'], R['2,7'], R['2,8']],
  ['C-A', 1, 5, 2, 1, 2, 0.4, 3]);
// C-B: 2 personas (id1 con 2 cursos completos, id2 con 1 sin iniciar) → 50%
check('C-B fila', [R['3,1'], R['3,2'], R['3,3'], R['3,4'], R['3,7']], ['C-B', 2, 2, 1, 0.5]);
check('asignados = completado+enProceso+noIniciado', R['2,3'], R['2,4'] + R['2,5'] + R['2,6']);

console.log('\n── RESUMEN_DIVISION: apilado ──');
const D = hojas['RESUMEN_DIVISION'].st.cells;
// C-A: título r2, header r3, 3 divisiones r4-6, GRAND TOTAL r7, +2 → C-B en r9
check('título C-A en B2', D['2,2'], 'CAMPAÑA: C-A');
check('header en B3', [D['3,2'], D['3,3'], D['3,4'], D['3,5'], D['3,6']],
  ['División','Completado','Pendiente','Total','Completion %']);
check('divisiones alfabéticas B4..B6', [D['4,2'], D['5,2'], D['6,2']],
  ['Finance','People','Technology']);
check('Finance 1/1/2 = 50%', [D['4,3'], D['4,4'], D['4,5'], D['4,6']], [1, 1, 2, 0.5]);
check('GRAND TOTAL C-A en B7', [D['7,2'], D['7,3'], D['7,4'], D['7,5'], D['7,6']],
  ['GRAND TOTAL', 2, 3, 5, 0.4]);
// C-A ocupa 2..7, quedan 8 y 9 en blanco → C-B arranca en 10
check('filas 8 y 9 en blanco', [D['8,2'], D['9,2']], [undefined, undefined]);
check('segunda tabla arranca en B10', D['10,2'], 'CAMPAÑA: C-B');
// C-B: header 11, Finance 12, GRAND TOTAL 13
check('C-B solo tiene Finance', D['12,2'], 'Finance');
check('GRAND TOTAL C-B en B13', [D['13,2'], D['13,3'], D['13,4'], D['13,5'], D['13,6']],
  ['GRAND TOTAL', 1, 1, 2, 0.5]);

console.log('\n── Coherencia entre hojas ──');
check('GRAND TOTAL C-A == # ASIGNADOS C-A', D['7,5'], R['2,3']);
check('GRAND TOTAL completado C-A == # COMPLETADO C-A', D['7,3'], R['2,4']);
check('% GRAND TOTAL == % CUMPLIMIENTO', D['7,6'], R['2,7']);

console.log('\n── Merges de RESUMEN_DIVISION no se traslapan ──');
const M = hojas['RESUMEN_DIVISION'].st.merges, sol = [];
for (let i = 0; i < M.length; i++) for (let j = i + 1; j < M.length; j++) {
  const A = M[i], B = M[j];
  if (A.r < B.r + B.nr && B.r < A.r + A.nr && A.c < B.c + B.nc && B.c < A.c + A.nc) sol.push([A, B]);
}
check('cero traslapes', sol, []);

console.log(`\n${'═'.repeat(50)}\n${fallos === 0 ? '✅' : '❌'}  ${ok} pasaron, ${fallos} fallaron\n`);
process.exit(fallos ? 1 : 0);
