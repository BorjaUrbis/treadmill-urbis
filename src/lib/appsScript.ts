/**
 * Código de Google Apps Script que convierte una hoja de Google Sheets en la
 * base de datos de la app. Se pega en Extensiones → Apps Script de la hoja.
 * (Copia en google-apps-script/Code.gs, generada con `npm run gen:gs`.)
 */
export const APPS_SCRIPT_CODE = String.raw`/**
 * Treadmill Urbis — base de datos en Google Sheets
 * 1) Pega este código en Extensiones → Apps Script y guarda.
 * 2) Ejecuta la función "setup" una vez (acepta los permisos).
 * 3) Implementar → Nueva implementación → Aplicación web.
 *    Ejecutar como: Yo · Quién tiene acceso: Cualquier usuario.
 * 4) Copia la URL que acaba en /exec y pégala en la app (Ajustes → Google Sheets).
 */
var SHEET = 'Sesiones';
var HEAD = ['id', 'Fecha', 'Hora fin', 'Minutos', 'Velocidad (km/h)', 'Distancia (km)', 'Kcal pantalla',
  'Descalzo', 'Carga (kg)', 'Notas', 'Actualizado', 'Hora inicio', 'Kcal estimadas', 'Semana (lunes)'];
var RAW = 11; // columnas A..K son datos; L..N son fórmulas

function setup() {
  ensure_();
  SpreadsheetApp.getActiveSpreadsheet().toast('Treadmill Urbis listo. Ahora: Implementar → Aplicación web.');
}

/** Si reinstalas la app y la hoja rechaza la conexión, ejecuta esto una vez. */
function resetToken() {
  PropertiesService.getScriptProperties().deleteProperty('TOKEN');
}

function ensure_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET);
  if (!sh) {
    var first = ss.getSheets()[0];
    if (first.getLastRow() === 0) { first.setName(SHEET); sh = first; }
    else sh = ss.insertSheet(SHEET);
  }
  if (sh.getRange(1, 1).getValue() !== 'id') {
    sh.getRange(1, 1, 1, HEAD.length).setValues([HEAD]).setFontWeight('bold').setBackground('#1F2937').setFontColor('#C6FF3D');
    sh.setFrozenRows(1);
    sh.getRange('B:B').setNumberFormat('dd/mm/yyyy');
    sh.getRange('C:C').setNumberFormat('@');
    sh.getRange('K:K').setNumberFormat('0');
    sh.getRange('N:N').setNumberFormat('dd/mm/yyyy');
    sh.hideColumns(1);
    sh.hideColumns(11);
    sh.setColumnWidth(10, 280);
  }
  var aj = ss.getSheetByName('Ajustes');
  if (!aj) {
    aj = ss.insertSheet('Ajustes');
    aj.getRange('A1:B4').setValues([['Ajustes', ''], ['Peso corporal (kg)', 84], ['Inclinación (%)', 0], ['Objetivo semanal (km)', 25]]);
    aj.getRange('A1').setFontWeight('bold');
    aj.getRange('A6').setValue('Kcal estimadas: ecuación de marcha del ACSM sobre peso corporal + carga. La app actualiza estos valores.');
  }
  var rs = ss.getSheetByName('Resumen semanal');
  if (!rs) {
    rs = ss.insertSheet('Resumen semanal');
    rs.getRange('A1').setFormula('=QUERY(Sesiones!A:N, "select N, count(A), sum(D), sum(F), sum(M) where A is not null group by N order by N desc label N \'Semana\', count(A) \'Sesiones\', sum(D) \'Minutos\', sum(F) \'Km\', sum(M) \'Kcal est.\'", 1)');
    rs.getRange('A:A').setNumberFormat('dd/mm/yyyy');
  }
  return sh;
}

function onEdit(e) {
  var sh = e.range.getSheet();
  if (sh.getName() !== SHEET || e.range.getRow() < 2 || e.range.getColumn() > 10) return;
  for (var r = e.range.getRow(); r <= e.range.getLastRow(); r++) {
    if (!sh.getRange(r, 1).getValue()) sh.getRange(r, 1).setValue(Utilities.getUuid());
    sh.getRange(r, 11).setValue(Date.now());
    writeFormulas_(sh, r);
  }
}

function doGet() {
  return out_({ ok: true, app: 'treadmill-urbis' });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var req = JSON.parse(e.postData.contents);
    var props = PropertiesService.getScriptProperties();
    var token = props.getProperty('TOKEN');
    if (!token && req.token) { props.setProperty('TOKEN', req.token); token = req.token; }
    if (!req.token || req.token !== token) return out_({ ok: false, error: 'token' });
    var sh = ensure_();
    if (req.settings) {
      var aj = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Ajustes');
      aj.getRange('B2:B4').setValues([[req.settings.bodyWeightKg], [req.settings.inclinePct], [req.settings.weeklyGoalKm]]);
    }
    var tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
    var index = indexRows_(sh);
    (req.upserts || []).forEach(function (s) {
      var row = index[s.id];
      if (row) {
        var cur = Number(sh.getRange(row, 11).getValue()) || 0;
        if (cur > s.updatedAt) return; // la hoja tiene una edición más reciente
      } else {
        row = sh.getLastRow() + 1;
        index[s.id] = row;
      }
      sh.getRange(row, 1, 1, RAW).setValues([toRow_(s, tz)]);
      writeFormulas_(sh, row);
    });
    var del = (req.deletes || []).map(function (id) { return index[id]; }).filter(Boolean).sort(function (a, b) { return b - a; });
    del.forEach(function (r) { sh.deleteRow(r); });
    return out_({ ok: true, sessions: list_(sh, tz) });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function indexRows_(sh) {
  var n = sh.getLastRow() - 1;
  var idx = {};
  if (n < 1) return idx;
  sh.getRange(2, 1, n, 1).getValues().forEach(function (v, i) { if (v[0]) idx[v[0]] = i + 2; });
  return idx;
}

function toRow_(s, tz) {
  return [
    s.id,
    Utilities.parseDate(s.date, tz, 'yyyy-MM-dd'),
    s.endTime || '',
    s.minutes,
    s.speedKmh,
    s.distanceKm,
    s.kcalScreen == null ? '' : s.kcalScreen,
    s.barefoot == null ? '' : (s.barefoot ? 'Sí' : 'No'),
    s.loadKg || 0,
    s.notes || '',
    s.updatedAt,
  ];
}

function writeFormulas_(sh, r) {
  sh.getRange(r, 12, 1, 3).setFormulas([[
    // Apps Script usa siempre la sintaxis en inglés (comas y punto decimal), sea cual sea el idioma de la hoja
    '=IF(OR(C' + r + '="",D' + r + '=""),"",TEXT(MOD(TIMEVALUE(C' + r + ')-D' + r + '/1440,1),"hh:mm"))',
    '=IF(OR(D' + r + '="",E' + r + '=""),"",ROUND((0.1*E' + r + '*1000/60+1.8*E' + r + '*1000/60*Ajustes!$B$3/100+3.5)*(Ajustes!$B$2+N(I' + r + '))/1000*5*D' + r + '))',
    '=IF(B' + r + '="","",B' + r + '-WEEKDAY(B' + r + ',2)+1)',
  ]]);
}

function list_(sh, tz) {
  var n = sh.getLastRow() - 1;
  if (n < 1) return [];
  var vals = sh.getRange(2, 1, n, RAW).getValues();
  var res = [];
  for (var i = 0; i < vals.length; i++) {
    var v = vals[i];
    if (!v[1] && !v[3] && !v[5]) continue; // fila vacía
    if (!v[0]) {
      v[0] = Utilities.getUuid();
      v[10] = Date.now();
      sh.getRange(i + 2, 1).setValue(v[0]);
      sh.getRange(i + 2, 11).setValue(v[10]);
      writeFormulas_(sh, i + 2);
    }
    var date = v[1] instanceof Date ? Utilities.formatDate(v[1], tz, 'yyyy-MM-dd') : String(v[1]);
    var end = v[2] instanceof Date ? Utilities.formatDate(v[2], tz, 'HH:mm') : String(v[2] || '');
    var bf = String(v[7] || '').toLowerCase();
    res.push({
      id: String(v[0]),
      date: date,
      endTime: end || null,
      minutes: Number(v[3]) || 0,
      speedKmh: Number(v[4]) || 0,
      distanceKm: Number(v[5]) || 0,
      kcalScreen: v[6] === '' ? null : Number(v[6]),
      barefoot: bf === '' ? null : bf.charAt(0) === 's' || bf === 'true',
      loadKg: Number(v[8]) || 0,
      notes: String(v[9] || ''),
      updatedAt: Number(v[10]) || 0,
    });
  }
  return res;
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
`;
