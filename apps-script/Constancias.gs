/**
 * Genera constancias en PDF dentro de la carpeta de constancias 2026,
 * con UNA SUBCARPETA POR PERSONA (antes era una por curso).
 * Incluye diagnóstico y manejo de errores.
 *
 * PASOS:
 *   1. Ejecuta Diagnostico()  -> revisa el registro (Ver > Registros)
 *   2. Si todo se ve bien, ejecuta GenerarDocumentos()
 *
 * Hoja "Data", datos desde la fila 4:
 *   B = name | C = course | D = score | E = date | F = link al PDF (lo escribe el script)
 */

const TEMPLATE_ID = "1PRhjiM7HfGEdS3ZtwJw5ik5ctp4yOsVHpHktsiQWNik"; // Constancia sin firma
const FOLDER_ID   = "1O1k5BN-ZSfeck09gwfZ7q3ThfujPLjR4";           // Carpeta destino de constancias

function Diagnostico() {
  const log = [];

  try {
    const t = DriveApp.getFileById(TEMPLATE_ID);
    log.push("✅ Plantilla: " + t.getName());
  } catch (e) {
    log.push("❌ No puedo abrir la plantilla: " + e.message);
  }

  try {
    const f = DriveApp.getFolderById(FOLDER_ID);
    log.push("✅ Carpeta destino: " + f.getName() + " (" + f.getUrl() + ")");
  } catch (e) {
    log.push("❌ No puedo abrir la carpeta: " + e.message);
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Data");
  if (!sheet) {
    log.push("❌ No existe la hoja 'Data'");
    Logger.log(log.join("\n"));
    return;
  }

  const ultimaFila = sheet.getLastRow();
  log.push("Última fila con datos: " + ultimaFila);

  if (ultimaFila >= 4) {
    const rows = sheet.getRange(4, 2, ultimaFila - 3, 4).getValues();
    const personas = {};
    let conNombre = 0, conFecha = 0;
    rows.forEach(r => {
      if (r[0]) {
        conNombre++;
        personas[r[0].toString().trim()] = true;
      }
      if (esFecha(r[3])) conFecha++;
    });
    log.push("Filas con nombre: " + conNombre);
    log.push("Filas con fecha (se generarán): " + conFecha);
    log.push("Carpetas por persona que se usarán: " + Object.keys(personas).length);
  }

  Logger.log(log.join("\n"));
  try { SpreadsheetApp.getUi().alert(log.join("\n")); } catch (e) {}
}

function GenerarDocumentos() {
  const template = DriveApp.getFileById(TEMPLATE_ID);
  const parentFolder = DriveApp.getFolderById(FOLDER_ID);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Data");

  const ultimaFila = sheet.getLastRow();
  if (ultimaFila < 4) {
    Logger.log("No hay datos suficientes.");
    return;
  }

  const rows = sheet.getRange(4, 2, ultimaFila - 3, 4).getValues(); // B=name, C=course, D=score, E=date

  let generadas = 0, saltadas = 0;
  const errores = [];
  const cacheCarpetas = {}; // evita buscar la misma carpeta de persona en cada fila

  for (let i = 0; i < rows.length; i++) {
    const fila = i + 4;
    const name = rows[i][0];
    const course = rows[i][1];
    const score = rows[i][2];
    const date = rows[i][3];

    if (!name) { saltadas++; continue; }
    if (!esFecha(date)) { saltadas++; continue; }

    let tempDoc = null;

    try {
      // Carpeta por PERSONA (una por nombre; adentro van todas sus constancias)
      const personaNombre = name.toString().trim();
      const personFolderName = limpiarNombre(personaNombre) || "Sin nombre";
      let personFolder = cacheCarpetas[personFolderName];
      if (!personFolder) {
        personFolder = getOrCreateFolder(parentFolder, personFolderName);
        cacheCarpetas[personFolderName] = personFolder;
      }

      // El nombre del archivo lleva el curso, para distinguir varias constancias de la misma persona
      const cursoTexto = course ? course.toString().trim() : "";
      const nombreArchivo = limpiarNombre(
        personaNombre + (cursoTexto ? " - " + cursoTexto : "") + " - Constancia 2026"
      );

      // 1) Copia temporal de la plantilla (en la carpeta de la persona)
      const copy = template.makeCopy(nombreArchivo + " (temp)", personFolder);
      tempDoc = DriveApp.getFileById(copy.getId());
      try { tempDoc.moveTo(personFolder); } catch (e) {}

      // 2) Reemplazo de placeholders
      const doc = DocumentApp.openById(copy.getId());
      const body = doc.getBody();
      body.replaceText('\\[\\{name\\}\\]', personaNombre);
      body.replaceText('\\[\\{Course\\}\\]', cursoTexto);
      body.replaceText('\\[\\{date\\}\\]', formatearFecha(date));
      body.replaceText('\\[\\{score\\}\\]', formatearScore(score));
      doc.saveAndClose();

      // 3) Exportar a PDF y guardarlo en la carpeta de la persona
      const pdfBlob = DriveApp.getFileById(copy.getId()).getAs(MimeType.PDF).setName(nombreArchivo + ".pdf");
      const pdfFile = personFolder.createFile(pdfBlob);

      // 4) Eliminar el Doc temporal (queda solo el PDF)
      tempDoc.setTrashed(true);

      sheet.getRange(fila, 6).setValue(pdfFile.getUrl()); // F = Link al PDF
      generadas++;
      Logger.log("OK fila " + fila + ": " + personaNombre);
    } catch (err) {
      if (tempDoc) { try { tempDoc.setTrashed(true); } catch (e2) {} }
      saltadas++;
      errores.push("Fila " + fila + " (" + name + "): " + err.message);
      Logger.log("ERROR fila " + fila + ": " + err.message);
    }
  }

  const resumen = "Generadas: " + generadas + " | Saltadas: " + saltadas +
    (errores.length ? "\n\nErrores:\n" + errores.join("\n") : "");
  Logger.log(resumen);
  try { SpreadsheetApp.getUi().alert(resumen); } catch (e) {}
}

/* ---------- Auxiliares ---------- */

function limpiarNombre(texto) {
  return (texto || "").toString().trim().replace(/[\\\/:*?"<>|#]+/g, "-");
}

function getOrCreateFolder(parentFolder, folderName) {
  const folders = parentFolder.getFoldersByName(folderName);
  return folders.hasNext() ? folders.next() : parentFolder.createFolder(folderName);
}

function esFecha(v) {
  if (v instanceof Date && !isNaN(v.getTime())) return true;
  if (typeof v === "string" && v.trim() !== "") return !isNaN(new Date(v).getTime());
  return false;
}

function formatearFecha(v) {
  const d = (v instanceof Date) ? v : new Date(v);
  if (isNaN(d.getTime())) return (v || "").toString();
  const m = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  return d.getDate() + " de " + m[d.getMonth()] + " de " + d.getFullYear();
}

function formatearScore(s) {
  if (s === "" || s == null) return "";
  const n = Number(s);
  return isNaN(n) ? s.toString() : (n % 1 === 0 ? n.toFixed(0) : n.toString());
}

function ConvertirPlantillaAGoogleDoc() {
  const ORIGINAL_ID = TEMPLATE_ID; // Constancia sin firma (.docx)
  const resource = { title: "Constancia sin firma (Google Doc)", mimeType: MimeType.GOOGLE_DOCS };
  const converted = Drive.Files.copy(resource, ORIGINAL_ID);
  Logger.log("✅ Nuevo Google Doc creado");
  Logger.log("ID: " + converted.id);
  Logger.log("URL: " + converted.alternateLink);
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📚 Genera Constancias')
    .addItem('Diagnóstico', 'Diagnostico')
    .addItem('Generar documentos', 'GenerarDocumentos')
    .addToUi();
}
