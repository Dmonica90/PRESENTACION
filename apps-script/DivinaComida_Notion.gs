// ═══════════════════════════════════════════════════════════════
// DIVINA COMIDA FAMILIAR → NOTION
//
// Web App que recibe las fichas de evaluación del formulario
// (divina-comida/index.html) y crea una página por ficha en la
// base de datos de Notion.
//
// El token de Notion NUNCA vive en el HTML: se guarda aquí como
// Script Property, así el formulario puede publicarse abierto.
//
// La votación es anónima: no se pide ni se guarda quién califica.
//
// Instalación: ver apps-script/README_DivinaComida.md
// ═══════════════════════════════════════════════════════════════

const NOTION_DB_ID = '5c8039b8-2471-41ec-b960-6b45f728c4d4';
const NOTION_VERSION = '2022-06-28';

// Nombre de la Script Property donde vive el token de integración
const TOKEN_PROP = 'NOTION_TOKEN';

// Secciones evaluadas: clave en el formulario → propiedades en Notion
const SECCIONES = [
  { clave: 'recepcion',       puntaje: 'Recepción y Ambiente', nivel: 'Nivel Recepción' },
  { clave: 'entrada',         puntaje: 'Entrada',              nivel: 'Nivel Entrada' },
  { clave: 'platoFuerte',     puntaje: 'Plato Fuerte',         nivel: 'Nivel Plato Fuerte' },
  { clave: 'postre',          puntaje: 'Postre',               nivel: 'Nivel Postre' },
  { clave: 'entretenimiento', puntaje: 'Entretenimiento',      nivel: 'Nivel Entretenimiento' }
];

// ═══════════════════════════════════════════════════════════════
// ENTRADA HTTP
// ═══════════════════════════════════════════════════════════════

function doPost(e) {
  try {
    const datos = JSON.parse(e.postData.contents);
    const error = validar_(datos);
    if (error) return json_({ ok: false, error: error });

    const pagina = crearPaginaNotion_(datos);
    return json_({ ok: true, url: pagina.url });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doGet() {
  return json_({ ok: true, servicio: 'Divina Comida Familiar → Notion' });
}

// ═══════════════════════════════════════════════════════════════
// VALIDACIÓN
// ═══════════════════════════════════════════════════════════════

// Anfitriones válidos: deben coincidir con las opciones del select en Notion
const ANFITRIONES = [
  '1. Nando y Moni',
  '2. Mir y mamá',
  '3. Mir y papá',
  '4. Mary y Diego'
];

function validar_(d) {
  if (!d) return 'No llegó ninguna ficha.';
  if (ANFITRIONES.indexOf(texto_(d.anfitrion)) === -1) {
    return 'Elige a uno de los anfitriones de la lista.';
  }

  for (var i = 0; i < SECCIONES.length; i++) {
    var s = SECCIONES[i];
    var p = Number(d[s.clave + 'Puntaje']);
    if (!isFinite(p) || p < 1 || p > 10) {
      return 'El puntaje de "' + s.puntaje + '" debe ir del 1 al 10.';
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// NOTION
// ═══════════════════════════════════════════════════════════════

function crearPaginaNotion_(d) {
  var props = {
    'Anfitrión': { select: { name: texto_(d.anfitrion) } },
    'Momento Memorable': richText_(d.momentoMemorable),
    'Comentario Secreto': richText_(d.comentarioSecreto)
  };

  SECCIONES.forEach(function (s) {
    props[s.puntaje] = { number: Number(d[s.clave + 'Puntaje']) };
    var nivel = texto_(d[s.clave + 'Nivel']);
    if (nivel) props[s.nivel] = { select: { name: nivel } };
  });

  var respuesta = UrlFetchApp.fetch('https://api.notion.com/v1/pages', {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    headers: {
      'Authorization': 'Bearer ' + token_(),
      'Notion-Version': NOTION_VERSION
    },
    payload: JSON.stringify({
      parent: { database_id: NOTION_DB_ID },
      icon: { emoji: '🍽️' },
      properties: props
    })
  });

  var cuerpo = JSON.parse(respuesta.getContentText());
  if (respuesta.getResponseCode() >= 300) {
    throw new Error('Notion rechazó la ficha: ' + (cuerpo.message || respuesta.getContentText()));
  }
  return cuerpo;
}

function token_() {
  var t = PropertiesService.getScriptProperties().getProperty(TOKEN_PROP);
  if (!t) throw new Error('Falta la Script Property ' + TOKEN_PROP + ' con el token de Notion.');
  return t;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function texto_(v) {
  return v == null ? '' : String(v).trim();
}

function richText_(v) {
  var t = texto_(v);
  return { rich_text: t ? [{ text: { content: t.slice(0, 2000) } }] : [] };
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════════════════════════════════════════════════════
// PRUEBA MANUAL (correr desde el editor de Apps Script)
// ═══════════════════════════════════════════════════════════════

function probarEnvio() {
  var demo = {
    anfitrion: '1. Nando y Moni',
    recepcionPuntaje: 9,  recepcionNivel: '5 Hospitalidad pura',
    entradaPuntaje: 7,    entradaNivel: '3-4 Rica pero nada fuera de lo común',
    platoFuertePuntaje: 10, platoFuerteNivel: '5 Digno de restaurante',
    postrePuntaje: 8,     postreNivel: '5 El broche de oro',
    entretenimientoPuntaje: 9, entretenimientoNivel: '5 Las risas no pararon',
    momentoMemorable: 'Ficha de prueba.',
    comentarioSecreto: 'Se puede borrar.'
  };
  Logger.log(crearPaginaNotion_(demo).url);
}
