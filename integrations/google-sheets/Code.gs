/**
 * PetVila Club · Primeiros da Vila
 * Planilha Google como base de leads + API mínima para o site e o CRM.
 *
 * Instalação (uma vez):
 * 1. Crie uma planilha Google (ex.: "PetVila · Primeiros da Vila").
 * 2. Extensões > Apps Script. Cole este arquivo inteiro em Code.gs e salve.
 * 3. Configurações do projeto (engrenagem) > Propriedades do script > adicione
 *    TOKEN = uma senha longa e aleatória (a mesma vai em LEADS_SHEETS_TOKEN na Vercel).
 * 4. Implantar > Nova implantação > Tipo: App da Web.
 *    Executar como: Eu. Quem pode acessar: Qualquer pessoa.
 *    Copie a URL (termina em /exec) para LEADS_SHEETS_URL na Vercel.
 * Toda chamada exige o TOKEN; sem ele a API responde "unauthorized".
 * Segurança: a planilha guarda dados pessoais (LGPD). Não compartilhe a planilha
 * nem o projeto do Apps Script com ninguém que não precise; o TOKEN deve ter
 * 32+ caracteres aleatórios e ser trocado (aqui e na Vercel) se vazar.
 * Ao atualizar este arquivo: Implantar > Gerenciar implantações > editar > Nova versão
 * (mantém a mesma URL).
 */

var SHEET_NAME = 'Leads';
var HEADERS = [
  'id', 'criado_em', 'status', 'nome', 'email', 'whatsapp', 'nome_cao', 'porte',
  'idade_faixa', 'nascimento', 'cidade', 'uf', 'interesses', 'consentimento',
  'consentimento_versao', 'consentimento_texto', 'cta_origem', 'utm_source',
  'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'referrer',
  'landing_page', 'nota', 'atualizado_em'
];
var STATUSES = ['novo', 'contatado', 'qualificado', 'descartado'];

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function authorized_(token) {
  var expected = PropertiesService.getScriptProperties().getProperty('TOKEN');
  if (!expected || typeof token !== 'string' || token.length !== expected.length) return false;
  // Comparação em tempo constante.
  var diff = 0;
  for (var i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}

/** Texto que começa com = + - @ vira fórmula no Sheets; prefixa com apóstrofo. */
function safe_(v) {
  var s = v === undefined || v === null ? '' : String(v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function rows_() {
  var sh = sheet_();
  var last = sh.getLastRow();
  if (last < 2) return [];
  var values = sh.getRange(2, 1, last - 1, HEADERS.length).getDisplayValues();
  return values.map(function (r) {
    var o = {};
    HEADERS.forEach(function (h, i) { o[h] = r[i]; });
    o.interesses = o.interesses ? o.interesses.split(',').map(function (s) { return s.trim(); }) : [];
    return o;
  });
}

/** Legado: o site agora lista por POST (token fora da URL). Mantido para não quebrar o CRM antes da reimplantação. */
function doGet(e) {
  if (!authorized_(e.parameter.token)) return json_({ ok: false, error: 'unauthorized' });
  if (e.parameter.action === 'list') return json_({ ok: true, leads: rows_() });
  return json_({ ok: false, error: 'unknown_action' });
}

function doPost(e) {
  var body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'bad_json' }); }
  if (!authorized_(body.token)) return json_({ ok: false, error: 'unauthorized' });
  if (body.action === 'list') return json_({ ok: true, leads: rows_() });

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = sheet_();
    if (body.action === 'append') {
      var lead = body.lead || {};
      lead.status = 'novo';
      lead.interesses = (lead.interesses || []).join(', ');
      lead.consentimento = lead.consentimento ? 'sim' : 'não';
      sh.appendRow(HEADERS.map(function (h) { return safe_(lead[h]); }));
      return json_({ ok: true });
    }
    if (body.action === 'update') {
      if (body.status && STATUSES.indexOf(body.status) < 0) return json_({ ok: false, error: 'bad_status' });
      var ids = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 1).getValues();
      for (var i = 0; i < ids.length; i++) {
        if (ids[i][0] === body.id) {
          var row = i + 2;
          if (body.status) sh.getRange(row, HEADERS.indexOf('status') + 1).setValue(body.status);
          if (typeof body.nota === 'string') sh.getRange(row, HEADERS.indexOf('nota') + 1).setValue(safe_(body.nota.slice(0, 1000)));
          sh.getRange(row, HEADERS.indexOf('atualizado_em') + 1).setValue(new Date().toISOString());
          return json_({ ok: true });
        }
      }
      return json_({ ok: false, error: 'not_found' });
    }
    return json_({ ok: false, error: 'unknown_action' });
  } finally {
    lock.releaseLock();
  }
}
