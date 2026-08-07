// Simula las escrituras a la hoja para validar la aritmética del layout:
// merges traslapados, posición de encabezados, freeze, ancho total.
const fs = require('fs');
const vm = require('vm');

const merges = [];   // {r, c, nr, nc}
const cells = {};    // "r,c" → valor
let frozenRows = 0, frozenCols = 0, maxRows = 1000, maxCols = 26;

const rangeStub = (r, c, nr, nc) => {
  const self = {
    _r: r, _c: c, _nr: nr, _nc: nc,
    merge() { merges.push({ r, c, nr, nc }); return self; },
    setValue(v) { cells[`${r},${c}`] = v; return self; },
    setValues(vals) {
      vals.forEach((row, i) => row.forEach((v, j) => { cells[`${r + i},${c + j}`] = v; }));
      return self;
    },
    setFormula(f) { cells[`${r},${c}`] = f; return self; },
    setBackgrounds(b) {
      if (b.length !== nr || b[0].length !== nc)
        throw new Error(`setBackgrounds ${b.length}x${b[0].length} != rango ${nr}x${nc}`);
      return self;
    },
    createFilter() { return self; },
    getA1Notation() { return `R${r}C${c}:R${r + nr - 1}C${c + nc - 1}`; }
  };
  ['setBackground','setFontColor','setFontWeight','setFontSize','setFontFamily',
   'setHorizontalAlignment','setVerticalAlignment','setWrap','setNumberFormat',
   'setDataValidation','breakApart','clearContent','clearFormat','clearDataValidations',
   'setBorder'].forEach(m => { self[m] = () => self; });
  return self;
};

const sheet = {
  getFilter: () => null,
  clearConditionalFormatRules() {},
  getConditionalFormatRules: () => [],
  setConditionalFormatRules() {},
  setFrozenRows(n) { frozenRows = n; },
  setFrozenColumns(n) { frozenCols = n; },
  getMaxRows: () => maxRows,
  getMaxColumns: () => maxCols,
  insertRowsAfter(_, n) { maxRows += n; },
  insertColumnsAfter(_, n) { maxCols += n; },
  setColumnWidth() {}, setHiddenGridlines() {}, autoResizeColumns() {},
  getRange: (r, c, nr = 1, nc = 1) => rangeStub(r, c, nr, nc)
};

const chain = () => { const o = new Proxy({}, { get: (t, p) => p === 'build' ? () => ({}) : () => chain() }); return o; };

const ctx = {
  Logger: { log: () => {} },
  Session: { getScriptTimeZone: () => 'America/Mexico_City' },
  Utilities: { formatDate: d => `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}` },
  SpreadsheetApp: {
    getActiveSpreadsheet: () => ({ getSheetByName: () => sheet, insertSheet: () => sheet }),
    newDataValidation: chain,
    newConditionalFormatRule: chain
  },
  console
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(
  require('path').join(__dirname, '..', 'Codigo.gs'), 'utf8'), ctx);

// ── Modelo con 2 campañas: una de 1 curso, otra de 2 ──
const H = ['ID','NAME','EMAIL','DIVISION','DEPARTAMENTO','MANAGER','ACTIVE STATUS','PUESTO',
  'LOCATION','CAMPAIGN','LEARNING CAMPAING','DELIVERY DATE','ITEM DUE DATE','STATUS',
  'DATE START','DATE COMPLETE','SCORE'];
const PLD = 'PLD y FT 2026', SPEI = 'Gestión SPEI';
const f = (id, name, div, camp, curso, st) => {
  const r = new Array(H.length).fill('');
  r[0]=id; r[1]=name; r[2]=`${id}@x.com`; r[3]=div; r[6]='Yes'; r[9]=camp; r[10]=curso;
  r[13]=st; r[14]=new Date(2026,6,13); r[16]=0;
  return r;
};
const datos = [H,
  f(1,'Ana','Finance','CJAC-Q3-2026',PLD,'Completed'),
  f(1,'Ana','Finance','CJAC-Q3-CLIPAI',PLD,'Completed'),
  f(1,'Ana','Finance','CJAC-Q3-CLIPAI',SPEI,'Not Started'),
  f(2,'Beto','Finance','CJAC-Q3-CLIPAI',PLD,'Completed'),
  f(2,'Beto','Finance','CJAC-Q3-CLIPAI',SPEI,'Completed'),
  f(3,'Caro','Technology','CJAC-Q3-CLIPAI',PLD,'Not Started'),
  f(3,'Caro','Technology','CJAC-Q3-CLIPAI',SPEI,'Not Started'),
  f(4,'Dani','Technology','CJAC-Q3-CLIPAI',PLD,'Completed'),
  f(5,'Eva','People','CJAC-Q3-2026',PLD,'In Progress'),
];

ctx.mapearColumnas_(H);
const modelo = ctx.construirModelo_(datos, ['CJAC-Q3-2026', 'CJAC-Q3-CLIPAI']);
ctx.escribirReporteConsolidado_(ctx.SpreadsheetApp.getActiveSpreadsheet(), modelo);

let fallos = 0, ok = 0;
const check = (n, real, esp) => {
  const a = JSON.stringify(real), b = JSON.stringify(esp);
  if (a === b) { ok++; console.log(`  ✅ ${n}`); }
  else { fallos++; console.log(`  ❌ ${n}\n       esperado: ${b}\n       real:     ${a}`); }
};

console.log('\n── Merges no se traslapan ──');
const solapes = [];
for (let i = 0; i < merges.length; i++)
  for (let j = i + 1; j < merges.length; j++) {
    const A = merges[i], B = merges[j];
    if (A.r < B.r + B.nr && B.r < A.r + A.nr && A.c < B.c + B.nc && B.c < A.c + A.nc)
      solapes.push([A, B]);
  }
check('cero traslapes entre merges', solapes, []);

console.log('\n── Posiciones esperadas ──');
// 2 campañas → barras en 3 y 4 · celeb 5 · campRow 7 · cursoRow 8 · subRow 9 · dataRow 10
check('barra campaña 1 en B3', String(cells['3,2']).startsWith('="CJAC-Q3-2026'), true);
check('barra campaña 2 en B4', String(cells['4,2']).startsWith('="CJAC-Q3-CLIPAI'), true);
check('festejo en B5', String(cells['5,2']).startsWith('=IF(MIN('), true);
check('encabezado base "ID" en B7', cells['7,2'], 'ID');
check('encabezado base "Manager" en I7', cells['7,9'], 'Manager');
check('campaña 1 en J7', cells['7,10'], 'CJAC-Q3-2026');
check('campaña 2 en N7', cells['7,14'], 'CJAC-Q3-CLIPAI');
check('curso de campaña 1 en J8', cells['8,10'], PLD);
check('cursos de campaña 2 en N8/R8 (alfabético)', [cells['8,14'], cells['8,18']], [SPEI, PLD]);
check('subheader STATUS en J9/N9/R9',
  [cells['9,10'], cells['9,14'], cells['9,18']], ['STATUS','STATUS','STATUS']);
check('subheader SCORE cierra cada bloque',
  [cells['9,13'], cells['9,17'], cells['9,21']], ['SCORE','SCORE','SCORE']);
check('RESUMEN CLIPPER en V7', cells['7,22'], 'RESUMEN CLIPPER');
check('sublabels del resumen en V9..Y9',
  [cells['9,22'], cells['9,23'], cells['9,24'], cells['9,25']],
  ['Status Clip','Cursos completados','Total cursos asignados','% avance']);

console.log('\n── Datos ──');
check('primera fila de datos en B10 (orden alfabético)', cells['10,2'], '1');   // Ana
check('última fila de datos en fila 14 (5 personas)', cells['14,2'], '5');      // Eva
// RESUMEN CLIPPER es global (todas las campañas del reporte), no por campaña.
// Ana: PLD/2026 ✔, PLD/CLIPAI ✔, SPEI/CLIPAI ✘ → 2 de 3
check('Ana: cursos completados / asignados = 2/3', [cells['10,23'], cells['10,24']], [2, 3]);
check('Ana: % avance = 2/3', cells['10,25'], 2 / 3);
check('Ana: Status Clip = en proceso', cells['10,22'], '🟡 En proceso');
check('Status Clip de Beto = completo', cells['11,22'], '🟢 Completo');

console.log('\n── Freeze y anchos ──');
check('freeze rows = subRow (9)', frozenRows, 9);
check('freeze cols = 4 (A,B,C,D)', frozenCols, 4);
check('columnas insertadas hasta >= 25 (Y)', maxCols >= 25, true);

console.log('\n── Barra: rangos apuntan a las columnas STATUS correctas ──');
check('campaña 1 → J10:J14', /J10:J14/.test(cells['3,2']) && !/N10/.test(cells['3,2']), true);
check('campaña 2 → N10:N14 y R10:R14',
  /N10:N14/.test(cells['4,2']) && /R10:R14/.test(cells['4,2']), true);

console.log(`\n${'═'.repeat(50)}\n${fallos === 0 ? '✅' : '❌'}  ${ok} pasaron, ${fallos} fallaron\n`);
process.exit(fallos ? 1 : 0);
