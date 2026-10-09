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
 *
 * Atualizações deste arquivo: cole a versão nova, salve e publique em
 * Implantar > Gerenciar implantações > (editar a implantação atual) > Versão: Nova versão.
 * Assim a URL /exec continua a mesma.
 *
 * WhatsApp (colunas AB em diante): opt-in, telefone normalizado e status da
 * mensagem de boas-vindas. Ações welcome_claim / welcome_record / welcome_status,
 * espelho de src/lib/whatsapp/status.ts no site. Nenhum token da Meta passa por aqui.
 *
 * Exclusão (ação delete): o CRM remove a linha inteira do lead, pelo id.
 * Serve para limpar cadastros de teste; não há como desfazer pela API.
 */

var SHEET_NAME = 'Leads';
var HEADERS = [
  'id', 'criado_em', 'status', 'nome', 'email', 'whatsapp', 'nome_cao', 'porte',
  'idade_faixa', 'nascimento', 'cidade', 'uf', 'interesses', 'consentimento',
  'consentimento_versao', 'consentimento_texto', 'cta_origem', 'utm_source',
  'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'referrer',
  'landing_page', 'nota', 'atualizado_em', 'preferredPlan',
  'source', 'whatsapp_e164', 'whatsapp_opt_in', 'whatsapp_opt_in_at', 'whatsapp_opt_in_texto',
  'welcome_message_id', 'welcome_message_status', 'welcome_sent_at', 'welcome_delivered_at',
  'welcome_read_at', 'welcome_failed_at', 'welcome_error_code', 'welcome_error_message'
];
// Colunas novas entram sempre no fim, para não deslocar os dados já gravados.
// Cabeçalho exibido na planilha quando difere do nome do campo.
var HEADER_LABELS = { preferredPlan: 'Plano de interesse' };
// Plano de interesse: código usado pelo site/CRM <-> texto exibido na planilha.
var PLAN_LABELS = { essential: 'Vila Essential', care: 'Vila Care', undecided: 'Ainda não sei' };
var STATUSES = ['novo', 'contatado', 'qualificado', 'descartado'];
// Boas-vindas pelo WhatsApp. Ordem dos status: só avançam (failed prevalece).
var WELCOME_FIELDS = [
  'welcome_message_id', 'welcome_message_status', 'welcome_sent_at', 'welcome_delivered_at',
  'welcome_read_at', 'welcome_failed_at', 'welcome_error_code', 'welcome_error_message'
];
var WELCOME_RANK = { sending: 0, accepted: 1, sent: 2, delivered: 3, read: 4 };
var WELCOME_AT = { sent: 'welcome_sent_at', delivered: 'welcome_delivered_at', read: 'welcome_read_at', failed: 'welcome_failed_at' };

function headerLabel_(h) {
  return HEADER_LABELS[h] || h;
}

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS.map(headerLabel_));
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    return sh;
  }
  // Planilha criada por uma versão anterior: garante as colunas novas no fim.
  if (sh.getMaxColumns() < HEADERS.length) sh.insertColumnsAfter(sh.getMaxColumns(), HEADERS.length - sh.getMaxColumns());
  var head = sh.getRange(1, 1, 1, HEADERS.length);
  var current = head.getValues()[0];
  HEADERS.forEach(function (h, i) {
    if (current[i] === '') sh.getRange(1, i + 1).setValue(headerLabel_(h)).setFontWeight('bold');
  });
  return sh;
}

/** "Vila Care" (planilha) ou "care" -> "care". Vazio ou desconhecido -> "". */
function planCode_(v) {
  var s = String(v || '').trim();
  if (PLAN_LABELS[s]) return s;
  for (var k in PLAN_LABELS) if (PLAN_LABELS[k] === s) return k;
  return '';
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

/** Força texto (ex.: 5511912345678 não pode virar número nem notação científica). */
function text_(v) {
  var s = v === undefined || v === null ? '' : String(v);
  return s ? "'" + s : '';
}

function col_(h) {
  return HEADERS.indexOf(h) + 1;
}

/** Linha (1-based) de cada lead com a coluna `h` igual a `value`; 0 se não achar. */
function findRow_(sh, h, value) {
  if (!value || sh.getLastRow() < 2) return 0;
  var vals = sh.getRange(2, col_(h), sh.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < vals.length; i++) if (String(vals[i][0]) === String(value)) return i + 2;
  return 0;
}

function rowObject_(sh, row) {
  var r = sh.getRange(row, 1, 1, HEADERS.length).getValues()[0];
  var o = {};
  HEADERS.forEach(function (h, i) { o[h] = r[i] === null || r[i] === undefined ? '' : String(r[i]); });
  return o;
}

function setFields_(sh, row, patch) {
  Object.keys(patch).forEach(function (k) {
    if (WELCOME_FIELDS.indexOf(k) < 0) return;
    var v = String(patch[k] === undefined || patch[k] === null ? '' : patch[k]).slice(0, 500);
    sh.getRange(row, col_(k)).setValue(safe_(v));
  });
}

/**
 * Reserva o envio das boas-vindas (idempotência). Só reserva se o lead ainda não
 * tiver status e nenhum lead com o mesmo número tiver envio em andamento ou entregue.
 */
function welcomeClaim_(sh, id, phone) {
  var row = findRow_(sh, 'id', id);
  if (!row || !phone) return { ok: true, claimed: false, reason: 'not_found' };
  if (rowObject_(sh, row).welcome_message_status) return { ok: true, claimed: false, reason: 'already' };
  var last = sh.getLastRow();
  var phones = sh.getRange(2, col_('whatsapp_e164'), last - 1, 1).getValues();
  var statuses = sh.getRange(2, col_('welcome_message_status'), last - 1, 1).getValues();
  for (var i = 0; i < phones.length; i++) {
    var st = String(statuses[i][0]);
    if (String(phones[i][0]) === String(phone) && st && st !== 'failed') return { ok: true, claimed: false, reason: 'duplicate' };
  }
  sh.getRange(row, col_('welcome_message_status')).setValue('sending');
  return { ok: true, claimed: true };
}

/** Aplica um status do webhook ao lead com esse wamid (mesma regra de mergeWelcomeStatus). */
function welcomeStatus_(sh, u) {
  if (!u || !u.wamid || !WELCOME_AT[u.status]) return { ok: false, error: 'bad_update' };
  var row = findRow_(sh, 'welcome_message_id', u.wamid);
  if (!row) return { ok: true, result: 'not_found' };
  var cur = rowObject_(sh, row);
  var patch = {};
  var at = WELCOME_AT[u.status];
  if (!cur[at]) patch[at] = u.timestamp || new Date().toISOString();
  var now = cur.welcome_message_status;
  if (u.status === 'failed') {
    if (now !== 'failed') patch.welcome_message_status = 'failed';
    if (u.error) {
      var e = u.error;
      var head = [e.title, e.message].filter(function (x) { return !!x; }).join(': ');
      patch.welcome_error_code = String(e.code || '');
      patch.welcome_error_message = (e.details ? head + ' (' + e.details + ')' : head).slice(0, 500);
    }
  } else if (now !== 'failed' && WELCOME_RANK[u.status] > (now in WELCOME_RANK ? WELCOME_RANK[now] : -1)) {
    patch.welcome_message_status = u.status;
  }
  if (!Object.keys(patch).length) return { ok: true, result: 'unchanged' };
  setFields_(sh, row, patch);
  return { ok: true, result: 'updated' };
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
    o.preferredPlan = planCode_(o.preferredPlan);
    o.whatsapp_opt_in = o.whatsapp_opt_in === 'sim';
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
      lead.preferredPlan = PLAN_LABELS[planCode_(lead.preferredPlan)] || '';
      lead.whatsapp_opt_in = lead.whatsapp_opt_in === true ? 'sim' : 'não';
      // Status de boas-vindas só entra pelas ações welcome_*.
      WELCOME_FIELDS.forEach(function (h) { lead[h] = ''; });
      sh.appendRow(HEADERS.map(function (h) { return h === 'whatsapp_e164' ? text_(lead[h]) : safe_(lead[h]); }));
      return json_({ ok: true });
    }
    if (body.action === 'welcome_claim') return json_(welcomeClaim_(sh, body.id, body.phone));
    if (body.action === 'welcome_record') {
      var wrow = findRow_(sh, 'id', body.id);
      if (!wrow) return json_({ ok: false, error: 'not_found' });
      setFields_(sh, wrow, body.patch || {});
      return json_({ ok: true });
    }
    if (body.action === 'welcome_status') return json_(welcomeStatus_(sh, body.update));
    if (body.action === 'delete') {
      var drow = findRow_(sh, 'id', body.id);
      if (!drow) return json_({ ok: false, error: 'not_found' });
      sh.deleteRow(drow);
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
