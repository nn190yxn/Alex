const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');
const commercialOps = require('./commercial-ops');
const { extractDocument } = require('./doc-extract');
const dns = require('dns');
const net = require('net');

const root = __dirname;
const dbFile = path.resolve(root, process.env.DB_FILE || 'data/expression.sqlite');
fs.mkdirSync(path.dirname(dbFile), { recursive: true });
const portValue = Number(process.env.PORT || 3000);
const port = Number.isInteger(portValue) && portValue > 0 && portValue < 65536 ? portValue : 3000;
const db = new DatabaseSync(dbFile);
db.exec(`PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS resources (id TEXT PRIMARY KEY, kind TEXT NOT NULL, owner TEXT NOT NULL, data TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, owner TEXT NOT NULL, data TEXT NOT NULL, status TEXT NOT NULL, error TEXT, attempts INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY AUTOINCREMENT, owner TEXT NOT NULL, action TEXT NOT NULL, resource TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL);`);
db.exec(`CREATE TABLE IF NOT EXISTS providers (id TEXT PRIMARY KEY, owner TEXT NOT NULL, name TEXT NOT NULL, base_url TEXT NOT NULL, model TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'disabled', usage_count INTEGER NOT NULL DEFAULT 0, last_used_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`);
db.exec(`CREATE TABLE IF NOT EXISTS team_members (id TEXT PRIMARY KEY, team_owner TEXT NOT NULL, user_id TEXT NOT NULL, role TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(team_owner, user_id));`);

const seed = { schemaVersion: 8, theme: 'blue', rewrite: { source: '', candidate: '', final: '', status: 'draft', confirmed: false, intent: '', audiences: [], selectedSkillIds: [], applyStyle: false, applyIndustry: false, industryPackId: '', results: [] }, expressionRules: { sampleCount: 0 }, industries: { activeContext: '地产', entries: [], frameworks: [], presets: [] }, audiences: [], documents: [], documentProjects: [], documentChapters: [], exportRecords: [], rules: [], comments: [], diagnosis: { factsLocked: false }, releases: [], reviews: [] };
const now = () => new Date().toISOString();
const id = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
function json(res, status, body) { const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }; if (res._setCookie) headers['Set-Cookie'] = res._setCookie; res.writeHead(status, headers); res.end(JSON.stringify(body)); }
function fail(message, status = 400) { const e = new Error(message); e.status = status; throw e; }
function parseBody(req) { return new Promise((resolve, reject) => { let raw = ''; let rejected = false; req.on('data', c => { raw += c; if (Buffer.byteLength(raw) > 5 * 1024 * 1024 && !rejected) { rejected = true; reject(Object.assign(new Error('payload too large'), { status: 413 })); } }); req.on('end', () => { if (rejected) return; try { resolve(raw ? JSON.parse(raw) : {}); } catch (_) { reject(Object.assign(new Error('invalid JSON'), { status: 400 })); } }); }); }
const ALLOW_HEADER_AUTH = process.env.ALLOW_HEADER_AUTH === '1';
const UID_COOKIE = 'expression-uid';
function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i <= 0) continue;
    try { out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); } catch (_) {}
  }
  return out;
}
function cookieHeader(uid) { return `${UID_COOKIE}=${encodeURIComponent(uid)}; Path=/; HttpOnly; SameSite=Lax`; }
function identity(req, res) {
  if (req._uid) return req._uid;
  if (ALLOW_HEADER_AUTH) {
    const headerId = String(req.headers['x-user-id'] || '').trim();
    if (headerId) { req._uid = headerId.slice(0, 100); return req._uid; }
  }
  const cookieId = String(parseCookies(req)[UID_COOKIE] || '');
  if (/^[A-Za-z0-9._:-]{1,100}$/.test(cookieId)) { req._uid = cookieId; return req._uid; }
  const isHtml = req.method === 'GET' && !String(req.url || '').startsWith('/api/');
  if (isHtml) {
    const ownerRow = db.prepare("SELECT user_id FROM team_members WHERE role='owner' ORDER BY created_at LIMIT 1").get();
    if (ownerRow && ownerRow.user_id) {
      req._uid = String(ownerRow.user_id).slice(0, 100);
      req._setCookie = cookieHeader(req._uid);
      if (res) res._setCookie = req._setCookie;
      return req._uid;
    }
  }
  req._uid = `u-${id()}`.slice(0, 100);
  req._setCookie = cookieHeader(req._uid);
  if (res) res._setCookie = req._setCookie;
  return req._uid;
}
function owner(req) { return identity(req); }
const ROLES = ['owner', 'editor', 'reviewer', 'viewer'];
function memberRow(user) { return db.prepare('SELECT id,team_owner teamOwner,user_id userId,role,created_at createdAt,updated_at updatedAt FROM team_members WHERE user_id=? ORDER BY created_at LIMIT 1').get(user); }
function ensureMember(user) {
  const existing = memberRow(user);
  if (existing) return existing;
  const ownerCount = db.prepare("SELECT COUNT(*) count FROM team_members WHERE role='owner'").get().count;
  const assigned = ownerCount === 0 ? 'owner' : 'viewer';
  const ownerRow = db.prepare("SELECT user_id FROM team_members WHERE role='owner' ORDER BY created_at LIMIT 1").get();
  const teamOwner = assigned === 'owner' ? user : ((ownerRow && ownerRow.user_id) || user);
  const stamp = now();
  db.prepare('INSERT OR IGNORE INTO team_members(id,team_owner,user_id,role,created_at,updated_at) VALUES(?,?,?,?,?,?)').run(id(), teamOwner, user, assigned, stamp, stamp);
  return memberRow(user) || { id: '', teamOwner, userId: user, role: assigned, createdAt: stamp, updatedAt: stamp };
}
function role(req) { const row = ensureMember(identity(req)); return ROLES.includes(row.role) ? row.role : 'viewer'; }
function teamOwnerOf(user) { return ensureMember(user).teamOwner || user; }
function memberView(row) { return { id: row.id, userId: row.userId, role: row.role, createdAt: row.createdAt, updatedAt: row.updatedAt }; }
function upsertMember(actor, body) {
  const userId = validateText(body.userId, 'userId', 100);
  const nextRole = String(body.role || 'viewer').toLowerCase();
  if (!ROLES.includes(nextRole)) fail('invalid role');
  const teamOwner = teamOwnerOf(actor);
  const stamp = now();
  const existing = db.prepare('SELECT id,role FROM team_members WHERE team_owner=? AND user_id=?').get(teamOwner, userId);
  if (existing) {
    if (existing.role === 'owner' && nextRole !== 'owner') {
      const owners = db.prepare("SELECT COUNT(*) count FROM team_members WHERE team_owner=? AND role='owner'").get(teamOwner).count;
      if (owners <= 1) fail('cannot demote the last owner', 409);
    }
    db.prepare('UPDATE team_members SET role=?,updated_at=? WHERE id=?').run(nextRole, stamp, existing.id);
    audit(actor, 'update', existing.id, { kind: 'member', role: nextRole, userId });
    return memberView(memberRow(userId));
  }
  const rid = id();
  db.prepare('INSERT INTO team_members(id,team_owner,user_id,role,created_at,updated_at) VALUES(?,?,?,?,?,?)').run(rid, teamOwner, userId, nextRole, stamp, stamp);
  audit(actor, 'create', rid, { kind: 'member', role: nextRole, userId });
  return memberView(memberRow(userId));
}
function patchMember(actor, memberId, body) {
  const teamOwner = teamOwnerOf(actor);
  const row = db.prepare('SELECT user_id userId FROM team_members WHERE id=? AND team_owner=?').get(memberId, teamOwner);
  if (!row) fail('member not found', 404);
  return upsertMember(actor, { userId: row.userId, role: body.role });
}
const permissions = { owner: ['read', 'write', 'publish', 'review', 'admin'], editor: ['read', 'write'], reviewer: ['read', 'review'], viewer: ['read'] };
function requirePermission(req, permission) { const current = role(req); if (!permissions[current].includes(permission)) fail(`role ${current} cannot ${permission}`, 403); return current; }
function listMembers(teamOwner) { return db.prepare('SELECT id,user_id userId,role,created_at createdAt,updated_at updatedAt FROM team_members WHERE team_owner=? ORDER BY created_at').all(teamOwner); }
function audit(user, action, resource, detail) { db.prepare('INSERT INTO audit(owner,action,resource,detail,created_at) VALUES(?,?,?,?,?)').run(user, action, resource, JSON.stringify(detail), now()); }
function resource(user, kind, data, resourceId = id()) { const stamp = now(); const status = data.status || 'active'; db.prepare('INSERT INTO resources(id,kind,owner,data,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').run(resourceId, kind, user, JSON.stringify(data), status, stamp, stamp); audit(user, 'create', resourceId, { kind, status }); return { id: resourceId, ...data, version: 1, status, createdAt: stamp, updatedAt: stamp }; }
function listResources(user, kind) {
  const items = db.prepare('SELECT id,data,version,status,created_at createdAt,updated_at updatedAt FROM resources WHERE owner=? AND kind=? ORDER BY updated_at DESC').all(user, kind).map(x => ({ id: x.id, ...JSON.parse(x.data), version: x.version, status: x.status, createdAt: x.createdAt, updatedAt: x.updatedAt }));
  if (kind === 'context') return items.map(item => item.domain ? item : { ...item, domain: 'commercial-ops' });
  return items;
}
function pageResources(user, kind, url) { const page = Math.max(1, Number(url.searchParams.get('page') || 1)); const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') || 20))); const total = db.prepare('SELECT COUNT(*) count FROM resources WHERE owner=? AND kind=?').get(user, kind).count; const items = listResources(user, kind).slice((page - 1) * pageSize, page * pageSize); return { items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) }; }
function updateResource(user, kind, rid, patch) { const row = db.prepare('SELECT * FROM resources WHERE id=? AND owner=? AND kind=?').get(rid, user, kind); if (!row) fail('resource not found', 404); const data = { ...JSON.parse(row.data), ...patch }; const nextStatus = data.status || row.status; const stamp = now(); db.prepare('UPDATE resources SET data=?,version=version+1,status=?,updated_at=? WHERE id=? AND owner=?').run(JSON.stringify(data), nextStatus, stamp, rid, user); audit(user, 'update', rid, patch); return { id: rid, ...data, version: row.version + 1, status: nextStatus, updatedAt: stamp }; }
function patchSkill(user, rid, patch) {
  const current = listResources(user, 'skill').find(item => item.id === rid);
  if (!current) fail('resource not found', 404);
  const next = { ...patch };
  if (current.builtin === true) {
    delete next.rulesMarkdown;
    delete next.name;
    delete next.summary;
    delete next.sourceRepo;
    delete next.source;
    delete next.kind;
    delete next.builtin;
  }
  return updateResource(user, 'skill', rid, next);
}
function validateText(value, name, max = 200000) { if (typeof value !== 'string' || !value.trim() || value.length > max) fail(`${name} is required and must be <= ${max} characters`); return value.trim(); }
function parseDocument(body) {
  const filename = String(body.filename || '').slice(0, 200);
  const base64 = String(body.base64 || '').replace(/^data:[^,]*,/, '');
  if (base64) {
    const result = extractDocument(filename || '材料', Buffer.from(base64, 'base64'));
    const text = String(result.text || '');
    if (!text.trim()) fail(result.warnings && result.warnings[0] ? result.warnings[0] : '这个文件里没有可用的文字');
    return { status: 'parsed', format: result.format, filename, warnings: result.warnings || [], characters: text.length, lines: text.split(/\r?\n/).length, documents: [{ index: 0, text, characters: text.length, lines: text.split(/\r?\n/).length }], text };
  }
  const format = String(body.format || '').toLowerCase();
  if (['pdf', 'docx', 'pptx', 'xlsx', 'url'].includes(format)) fail(`请把 ${format} 文件作为 base64 上传后再解析`);
  if (!['markdown', 'md', 'txt', 'text'].includes(format)) fail('format must be markdown, txt, pdf, docx, pptx, xlsx or url');
  const values = Array.isArray(body.texts) ? body.texts : [body.text];
  if (!values.length || values.some(value => typeof value !== 'string' || !value.trim())) fail('text or texts is required');
  const documents = values.map((text, index) => ({ index, text: text.trim(), characters: text.trim().length, lines: text.trim().split(/\r?\n/).length }));
  return { status: 'parsed', format: format === 'md' ? 'markdown' : format === 'text' ? 'txt' : format, documents, text: documents.length === 1 ? documents[0].text : undefined };
}
const llmSessions = new Map();
function envLLM() { return process.env.USER_LLM_API_KEY && process.env.USER_LLM_BASE_URL && process.env.USER_LLM_MODEL ? { baseUrl: process.env.USER_LLM_BASE_URL, model: process.env.USER_LLM_MODEL, apiKey: process.env.USER_LLM_API_KEY } : null; }
function configuredLLM(user) { return Boolean(llmSessions.get(user) || envLLM()); }
function resolveLLM(user, input) {
  return llmSessions.get(user) || envLLM();
}
function sanitizeTaskInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const copy = { ...input };
  delete copy.apiKey;
  if (copy.llm && typeof copy.llm === 'object') {
    copy.llm = { baseUrl: copy.llm.baseUrl, model: copy.llm.model };
  }
  return copy;
}
function assertLLMUrl(raw) {
  let parsed;
  try { parsed = new URL(String(raw || '')); } catch (_) { fail('baseUrl must be a valid URL'); }
  if (parsed.protocol !== 'https:') fail('baseUrl must use https');
  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const blockedHost = host === 'localhost' || host === '::1' || host.endsWith('.local') || host.endsWith('.internal');
  const blockedIp = /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host);
  const priv172 = host.match(/^172\.(\d+)\./);
  if (blockedHost || blockedIp || (priv172 && Number(priv172[1]) >= 16 && Number(priv172[1]) <= 31)) fail('baseUrl must be a public https URL');
  return parsed.toString();
}
function sessionView(user) {
  const session = llmSessions.get(user);
  const env = envLLM();
  const active = session || env;
  return { configured: Boolean(active), baseUrl: active ? active.baseUrl : '', model: active ? active.model : '', keyPresent: Boolean(active && active.apiKey), keyStored: false, source: session ? 'session' : (env ? 'env' : '') };
}
function saveSession(user, body) {
  const baseUrl = assertLLMUrl(validateText(body.baseUrl, 'baseUrl', 1000));
  const model = validateText(body.model, 'model', 200);
  const apiKey = validateText(body.apiKey, 'apiKey', 2000);
  llmSessions.set(user, { baseUrl, model, apiKey });
  audit(user, 'update', 'llm-session', { model, baseUrl });
  return sessionView(user);
}
function providerView(row) { return { id: row.id, name: row.name, baseUrl: row.base_url, model: row.model, status: row.status, usageCount: row.usage_count, lastUsedAt: row.last_used_at }; }
function listProviders(user) { return db.prepare('SELECT id,name,base_url,model,status,usage_count,last_used_at FROM providers WHERE owner=? ORDER BY created_at').all(user).map(providerView); }
function providerInput(body) { const name = validateText(body.name, 'name', 200); const baseUrl = assertLLMUrl(validateText(body.baseUrl, 'baseUrl', 1000)); const model = validateText(body.model, 'model', 200); return { name, baseUrl, model }; }
function updateProviderUsage(user) { const row = db.prepare("SELECT id FROM providers WHERE owner=? AND status='enabled' ORDER BY updated_at DESC LIMIT 1").get(user); if (!row) return; db.prepare('UPDATE providers SET usage_count=usage_count+1,last_used_at=?,updated_at=? WHERE id=? AND owner=?').run(now(), now(), row.id, user); audit(user, 'use', row.id, { kind: 'provider' }); }
  function runTask(taskId, user, input) { setImmediate(async () => { try { db.prepare('UPDATE tasks SET status=?,updated_at=? WHERE id=? AND owner=?').run('running', now(), taskId, user); const candidate = await generate(input, user); const prose = stripTaskTags(candidate); const usedCases = input && input.applyIndustry === true ? commercialOps.matchProjects(listResources(user, 'project'), input.source).map(item => item.name) : []; const snapshot = { ...references(user, input), semanticLayers: semanticLayers(input), contentAnalysis: classify(input.source), factDiff: diffFacts(lockedNumbers(user, input.source), prose), systemPrompt: buildSystemPrompt(user, input), industryReplacements: listIndustryReplacements(user, input, prose), usedCases, demo: input.demoMode === true || !resolveLLM(user, input) }; db.prepare('UPDATE tasks SET status=?,data=?,updated_at=? WHERE id=? AND owner=?').run('completed', JSON.stringify({ input: sanitizeTaskInput(input), source: input.source, candidate, status: 'completed', ...snapshot }), now(), taskId, user); } catch (e) { db.prepare('UPDATE tasks SET status=?,error=?,updated_at=? WHERE id=? AND owner=?').run('failed', e.message, now(), taskId, user); } }); }
function publicTaskData(raw) {
  const data = typeof raw === 'string' ? JSON.parse(raw) : (raw || null);
  if (!data || typeof data !== 'object') return data;
  if (data.input) data.input = sanitizeTaskInput(data.input);
  return data;
}
function integrationTaskView(task) { return { taskId: task.id, status: task.status, attempts: task.attempts, error: task.error || null, createdAt: task.createdAt, updatedAt: task.updatedAt, result: task.data ? publicTaskData(task.data) : null }; }
function createTask(user, input) { const source = validateText(input.source, 'source'); const snapshot = { ...references(user, input), semanticLayers: semanticLayers(input), contentAnalysis: classify(source) }; const storedInput = sanitizeTaskInput(input); const task = resource(user, 'task', { source, input: storedInput, ...snapshot, status: 'queued', demoMode: input.demoMode === true }, id()); db.prepare('INSERT INTO tasks(id,owner,data,status,attempts,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').run(task.id, user, JSON.stringify(task), 'queued', 0, now(), now()); runTask(task.id, user, input); return { ...integrationTaskView({ ...task, attempts: 0, error: null, data: JSON.stringify(task), createdAt: task.createdAt, updatedAt: task.updatedAt }), ruleReferences: snapshot.ruleReferences, sourceReferences: snapshot.sourceReferences, semanticLayers: snapshot.semanticLayers, contentAnalysis: snapshot.contentAnalysis }; }
function references(user, input) { return { ruleReferences: (input.ruleReferences || listResources(user, 'rule').filter(x => x.status === 'confirmed').map(x => x.id)), sourceReferences: (input.sourceReferences || input.sourceIds || []) }; }
function classify(source) { const numbers = source.match(/\d{1,3}(?:,\d{3})+(?:\.\d+)?%?|\d+(?:\.\d+)?%?/g) || []; const sentences = source.split(/[。！？\n]/).map(x => x.trim()).filter(Boolean); return { facts: sentences.filter(x => /\d|事实|数据|来源|显示/.test(x)), numbers, citations: sentences.filter(x => /来源|引用|据|报告|研究/.test(x)), opinions: sentences.filter(x => /认为|需要|应当|建议|判断/.test(x)), hypotheses: sentences.filter(x => /可能|预计|推测|假设|或许/.test(x)) }; }
function classifyVoice(text) {
  const source = String(text || "").trim();
  const sentences = source.split(/[。！？!?\n]/).map(x => x.trim()).filter(Boolean);
  const chars = source.replace(/\s/g, "").length;
  const avg = sentences.length ? sentences.reduce((n, sent) => n + sent.length, 0) / sentences.length : chars;
  let kind = '整篇方案';
  if (sentences.length <= 1 && chars < 40 && !/[。！？；]/.test(source)) kind = '标题写法';
  else if (/(表格|如表|列示|单位：|万元|平方米)/.test(source) && (source.match(/\d/g) || []).length >= 4 && chars < 800) kind = '表格说明';
  else if (sentences.length <= 2 && /(需要|应当|判断|结论)/.test(source)) kind = '判断句';
  else if (chars < 400) kind = '一段口气';
  let style = '正式汇报';
  if (/(演讲|品牌方|商家|口语|客从哪来)/.test(source)) style = '口语可讲';
  else if (sentences.filter(sent => /(认为|判断|必须|应当|需要)/.test(sent)).length >= Math.max(1, Math.ceil(sentences.length * 0.4))) style = '判断句密';
  else if (/(目前|同时|此外|一方面)/.test(source) && avg > 30) style = '叙述铺陈';
  let rhythm = '长句链条';
  if (avg < 18) rhythm = '短句落地';
  else if (sentences.length >= 3 && sentences[0].length > sentences[sentences.length - 1].length + 10) rhythm = '先长后短';
  else if (avg < 28) rhythm = '先长后短';
  let logic = '先结论后依据';
  const first = sentences[0] || source;
  if (/(目前|背景|项目位于|本案位于)/.test(first)) logic = '先背景后判断';
  else if (/(问题|不足|缺少|痛点|缺口)/.test(first)) logic = '先问题后动作';
  else if (/(因此|综上|结论|判断|定位为)/.test(first)) logic = '先结论后依据';
  let scene = '招商对内汇报';
  if (/(演讲|品牌方|商家|进场)/.test(source)) scene = '招商对外演讲';
  else if (/(运营|时段|权责|动线)/.test(source)) scene = '运营方案';
  else if (/(活动|触达|转化|节点排期)/.test(source)) scene = '营销活动方案';
  else if (/(沟通|口径|异议|对外口径)/.test(source)) scene = '沟通方案';
  return { kind, style, rhythm, logic, scene, sentenceCount: sentences.length, avgSentenceLength: Math.round(avg) };
}
const INDUSTRY_STOP = new Set(['的','了','是','在','和','与','对','及','等','把','被','就','也','还','但','而','或','其','这','那','有','不','很','更','最','会','能','可','要','又','再','去','来','到','从','以','为','并','且','因','由','于','中','上','下','后','前','内','外','将','已','未','无','该','本','各','每','某','此','若','即','则','却','都','只','才','太','需要','进行','通过','以及','如果','因为','所以','然后','同时','目前','已经','不是','一个','我们','我方','他们','这个','那个','什么','怎么','如何','相关','方面','情况','问题','实现','提供','包括','根据','对于','作为','由于','因此','此外','其中','以上','以下','本次','本文','可以','应当','建议','认为','判断','可能','预计','而是','而且','但是','只是','还是','就是','也是','都是','虽然','尽管','不过','然而','其实','当然','确实','正在','开始','成为','出现','表示','指出','介绍','记者','日前','近日','今天','今年','去年','一种','这样','那样','这里','那里','时候','之后','之前','之间','没有','还有','自己','大家','人们','方式','地方','东西','时间','工作','发展','建设']);
const INDUSTRY_NOISE = new Set(['效果图','实景图','首页','热点','原创','要闻','财经','股票','触屏版','电脑版','精彩推荐','热点推荐','免责声明','空间','内容','艺术','审美','视觉','美学','城市','生活','文化','设计','活动','用户','文章','世界','中国','成都','北京','上海','广州','深圳','杭州','南京','武汉','西安','重庆','天津','苏州','长沙','郑州','跟贴','跟帖','留言','在看','点赞','收藏','关注','原文','推文','公众号','阅读原文','写留言','分享','公开课','订阅','分享至','百度','baidu','登录','复制','copy','about','举报','反馈','帮助中心','设为首页','微信好友','新浪微博','ai导读','扫码','顶部','收藏','分享']);
const INDUSTRY_STEMS = ['业态','招商','客流','坪效','主力','铺位','租金','扣点','开业','调改','动线','落位','策展','非标','百货','购物','街区','首店','快闪','买手','旗舰','奥莱','餐饮','零售','客群','会员','私域','操盘','去化','空置','出租','进驻','撤场','美陈','陈列','中庭','外摆','橱窗','打卡','复购','品牌','消费','商业','商场','门店','店铺','商户','商铺','开店','关店','调铺','夜经济','体验','定位','调性','联营','租赁','营销','运营','资产','收益','转化','写字楼','底商','公寓','酒店','物业','广场','规划','策划','商圈','选址','配比','mall','ifs','skp'];
const EN_STOP = new Set(['the','and','for','with','from','that','this','are','was','were','been','have','has','had','not','but','or','into','onto','over','under','about','after','before','between','through','their','they','them','will','would','could','should','than','then','also','such','more','most','other','some','any','each','copyright','reserved','english','rights','corporation','index','html','news','home','login','share','copy']);
function countOccurrences(source, term) {
  const text = String(source || '');
  const needle = String(term || '');
  if (!needle) return 0;
  let count = 0;
  let from = 0;
  while (from <= text.length) {
    const index = text.indexOf(needle, from);
    if (index < 0) break;
    count += 1;
    from = index + needle.length;
  }
  return count;
}
function isIndustryStop(term) {
  const value = String(term || '').trim();
  if (!value) return true;
  if (INDUSTRY_STOP.has(value) || EN_STOP.has(value.toLowerCase())) return true;
  if (INDUSTRY_NOISE.has(value)) return true;
  if (value.includes('网易') || value.includes('百度') || value.includes('新浪') || /baidu|sina/i.test(value) || value.includes('跟贴') || value.includes('跟帖')) return true;
  if (/^(copy|about|login|share|home|html|index|news|ldquo|rdquo|mdash|nbsp)$/i.test(value)) return true;
  if (/特朗普|凯恩斯/.test(value)) return true;
  if (/^[的了是和与把被就也还但而或其这那]/.test(value)) return true;
  if (/[的了是和与把被]$/.test(value)) return true;
  if (value.includes('的') || value.includes('了')) return true;
  if (/^[一个种]/.test(value) && !hasIndustryStem(value)) return true;
  if (/^\d+(?:\.\d+)?%?$/.test(value)) return true;
  if (/^[，。；、,.!！？:：%％\-\s]+$/.test(value)) return true;
  return false;
}
function hasIndustryStem(term) {
  const value = String(term || '').toLowerCase();
  return INDUSTRY_STEMS.some(stem => value.includes(stem));
}
function isExactStem(term) {
  const value = String(term || '').trim();
  return INDUSTRY_STEMS.includes(value) || INDUSTRY_STEMS.includes(value.toLowerCase());
}
function startsWithStem(term) {
  const value = String(term || '').toLowerCase();
  if (/^(传统|主题|复合|新型|高端|潮流)/.test(value)) return true;
  return INDUSTRY_STEMS.some(stem => value.startsWith(stem));
}
function endsWell(term) {
  const value = String(term || '').toLowerCase();
  if (INDUSTRY_STEMS.some(stem => value.endsWith(stem))) return true;
  return /(?:型|式|性|者|人|场|店|区|馆|点|力|感|风|空间|需求|模式|节奏|主张|组合|系统)$/.test(value);
}
function isUsefulIndustryTerm(term, packSet, article, quoted) {
  const value = String(term || '').trim();
  if (!value || isIndustryStop(value)) return false;
  if (packSet && packSet.has(value)) return true;
  if (isExactStem(value)) return true;
  if (/^[A-Za-z]+$/.test(value) && value.length <= 3) return false;
  if (/^[A-Za-z][A-Za-z0-9]{3,11}$/.test(value)) {
    if (/^[a-z]+$/.test(value)) return false;
    if (/^(copy|about|login|share|home|baidu|html|index|news|copyright|reserved|english|rights|corporation|sina)$/i.test(value)) return false;
    return true;
  }
  if (value.length <= 2) return false;
  if (quoted && hasIndustryStem(value) && value.length <= 16) return true;
  const count = countOccurrences(article, value);
  if (hasIndustryStem(value) && value.length <= 8 && startsWithStem(value) && endsWell(value)) return true;
  if (!hasIndustryStem(value)) return value.length <= 3 && count >= 3;
  return count >= 2;
}
function stripEdgeStops(text) {
  let value = String(text || '');
  let changed = true;
  while (changed && value) {
    changed = false;
    for (const stop of INDUSTRY_STOP) {
      if (value.startsWith(stop) && value.length > stop.length + 1) { value = value.slice(stop.length); changed = true; }
      if (value.endsWith(stop) && value.length > stop.length + 1) { value = value.slice(0, -stop.length); changed = true; }
    }
  }
  return value;
}
function extractTermsByFrequency(source, packTerms) {
  const text = String(source || '');
  const found = new Map();
  const packSet = new Set((packTerms || []).map(item => String(item || '').trim()).filter(Boolean));
  function keep(term, forceKind, quoted) {
    const value = String(term || '').trim();
    if (value.length < 2 || value.length > 24) return;
    if (!text.includes(value)) return;
    if (!isUsefulIndustryTerm(value, packSet, text, quoted)) return;
    const count = countOccurrences(text, value);
    if (!count) return;
    const kind = forceKind || (value.length >= 5 ? 'phrase' : 'term');
    const prev = found.get(value);
    if (!prev || count > prev.count) found.set(value, { term: value, kind, count, status: 'pending' });
  }
  const runs = text.split(/[^\u4e00-\u9fffA-Za-z]+/).filter(Boolean);
  runs.forEach(run => {
    if (/^[A-Za-z]+$/.test(run)) { keep(run, 'term'); return; }
    const cjk = run.replace(/[^\u4e00-\u9fff]/g, '');
    cjk.split(/[里着过得地及并且而或但与和]/).forEach(piece => {
      const cleaned = stripEdgeStops(piece);
      if (cleaned.length >= 2 && cleaned.length <= 8) keep(cleaned, cleaned.length >= 5 ? 'phrase' : 'term');
    });
    for (let n = 2; n <= 6; n += 1) {
      for (let i = 0; i + n <= cjk.length; i += 1) {
        const gram = stripEdgeStops(cjk.slice(i, i + n));
        if (gram.length < 2) continue;
        if (/[里着过得地及并且而或但与和]/.test(gram)) continue;
        const count = countOccurrences(text, gram);
        if (n === 2 && !packSet.has(gram) && !isExactStem(gram)) continue;
        if (n >= 3 && !packSet.has(gram) && !(startsWithStem(gram) && endsWell(gram))) continue;
        if (count >= 2 || packSet.has(gram) || isExactStem(gram) || (startsWithStem(gram) && endsWell(gram))) keep(gram, gram.length >= 5 ? 'phrase' : 'term');
      }
    }
  });
  const quoteRe = /[“"「]([^”"」]{2,24})[”"」]/g;
  let quoted;
  while ((quoted = quoteRe.exec(text))) keep(quoted[1], quoted[1].length >= 5 ? 'phrase' : 'term', true);
  const items = Array.from(found.values()).sort((a, b) => b.count - a.count || b.term.length - a.term.length);
  return items.filter(item => {
    if (item.term.length <= 2) return true;
    return !items.some(other => other.term !== item.term && other.term.includes(item.term) && other.term.length > item.term.length && other.count >= item.count);
  }).slice(0, 200);
}
function industryExtractPayload(article, candidates, mode) {
  const analysis = classify(article);
  const terms = candidates.map(item => item.term);
  const concepts = candidates.filter(item => item.kind === 'term').map(item => item.term).slice(0, 5);
  const phrases = candidates.filter(item => item.kind === 'phrase').map(item => item.term);
  const metrics = analysis.numbers;
  const judgments = analysis.opinions;
  const analysisStructure = ['背景', '问题', '策略', '结果'];
  return {
    mode,
    source: mode,
    useModel: mode === 'model',
    supported: true,
    reviewStatus: 'pending',
    terms,
    phrases,
    candidates,
    concepts,
    metrics,
    judgments,
    analysisStructure,
    structure: { terms, concepts, metrics, judgments, analysisStructure, phrases },
    entries: candidates.map(item => ({
      term: item.term,
      kind: item.kind,
      count: item.count,
      meaning: item.kind === 'phrase' ? '习惯用语，已进行业词库' : '术语，已进行业词库',
      status: item.inPack ? 'accepted' : 'pending',
      source: mode,
      reviewStatus: 'pending'
    })),
    article,
    fetchedFrom: ''
  };
}
function parseModelTerms(raw, article) {
  const match = String(raw || '').match(/\{[\s\S]*\}/);
  if (!match) fail('模型没有按约定返回用词', 502);
  let data;
  try { data = JSON.parse(match[0]); } catch (_) { fail('模型没有按约定返回用词', 502); }
  const list = Array.isArray(data.terms) ? data.terms : [];
  const out = [];
  const seen = new Set();
  list.forEach(item => {
    const term = String(item && (item.term || item.text) || '').trim();
    if (!term || term.length > 24 || seen.has(term) || !article.includes(term) || !isUsefulIndustryTerm(term, null, article, false)) return;
    seen.add(term);
    const kind = item.kind === 'phrase' || term.length >= 5 ? 'phrase' : 'term';
    out.push({ term, kind, count: countOccurrences(article, term), status: 'pending' });
  });
  return out.slice(0, 200);
}
function articleKey(article, url) {
  if (url) return 'url:' + String(url);
  return 'text:' + crypto.createHash('sha1').update(String(article || '')).digest('hex');
}
function uniqueTermsList(list) {
  const seen = new Set();
  const out = [];
  (list || []).forEach(item => {
    const value = String(item || '').trim();
    const key = value.toLocaleLowerCase();
    if (!value || seen.has(key) || isIndustryStop(value)) return;
    seen.add(key);
    out.push(value);
  });
  return out;
}
function rememberExtractedTerms(user, pack, article, candidates, fetchedFrom) {
  if (!pack || !pack.id) return {};
  const hits = pack.termHits && typeof pack.termHits === 'object' ? { ...pack.termHits } : {};
  const seen = Array.isArray(pack.seenArticles) ? pack.seenArticles.slice() : [];
  const terms = (pack.terms || []).slice();
  const phrases = (pack.phrases || []).slice();
  (candidates || []).forEach(item => {
    const term = String(item && item.term || '').trim();
    if (!term) return;
    if (item.kind === 'phrase' || term.length >= 5) phrases.push(term);
    else terms.push(term);
  });
  const key = articleKey(article, fetchedFrom);
  if (!seen.includes(key)) {
    seen.push(key);
    if (seen.length > 300) seen.splice(0, seen.length - 300);
    (candidates || []).forEach(item => {
      const term = String(item && item.term || '').trim();
      if (term) hits[term] = Number(hits[term] || 0) + 1;
    });
  }
  updateResource(user, 'context', pack.id, { termHits: hits, seenArticles: seen, terms: uniqueTermsList(terms), phrases: uniqueTermsList(phrases) });
  return hits;
}
function rankExtractedTerms(candidates, pack, hits) {
  const inPack = new Set([].concat((pack && pack.terms) || [], (pack && pack.phrases) || []).map(item => String(item || '').trim()).filter(Boolean));
  return (candidates || []).map(item => ({
    ...item,
    packHits: Number(hits && hits[item.term] || 0),
    inPack: inPack.has(item.term)
  })).sort((a, b) => (b.packHits - a.packHits) || (b.count - a.count) || (b.term.length - a.term.length));
}
async function chatLLM(user, messages) {
  const llm = resolveLLM(user);
  if (!llm) fail('模型服务未配置。请填写服务地址、模型名称和访问密钥。', 503);
  assertLLMUrl(llm.baseUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  let response;
  try {
    response = await fetch(llm.baseUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${llm.apiKey}` }, body: JSON.stringify({ model: llm.model, messages, temperature: 0 }), signal: controller.signal });
  } catch (error) {
    if (error.name === 'AbortError') fail('LLM request timed out', 504);
    throw error;
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) fail(`LLM request failed: ${response.status}`, 502);
  const result = await response.json();
  const text = result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content;
  if (!text) fail('LLM returned no content', 502);
  updateProviderUsage(user);
  return text;
}
function looksLikeSingleUrl(text) {
  const value = String(text || '').trim();
  return Boolean(value) && !/\s/.test(value) && /^https?:\/\/[^\s]+$/i.test(value);
}
function stripHost(host) {
  return String(host || '').toLowerCase().replace(/^\[|\]$/g, '');
}
function mappedToIPv4(addr) {
  const name = stripHost(addr);
  const dotted = name.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (dotted) return dotted[1];
  const hex = name.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (!hex) return '';
  const n = (parseInt(hex[1], 16) << 16) + parseInt(hex[2], 16);
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}
function isPrivateIPv4(ip) {
  const parts = String(ip || '').split('.').map(Number);
  if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const a = parts[0];
  const b = parts[1];
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 255) return true;
  return false;
}
function isBlockedAddress(addr) {
  const name = stripHost(addr);
  if (!name) return true;
  if (name === 'localhost' || name === '::1' || name === '0.0.0.0' || name === '::') return true;
  const mapped = mappedToIPv4(name);
  if (mapped) return isPrivateIPv4(mapped);
  if (net.isIPv4(name)) return isPrivateIPv4(name);
  if (net.isIPv6(name) && (name === '::1' || name.startsWith('fe80:') || name.startsWith('fc') || name.startsWith('fd'))) return true;
  return false;
}
function isBlockedArticleHost(host) {
  const name = stripHost(host);
  if (!name) return true;
  if (name === 'localhost' || name.endsWith('.local') || name.endsWith('.internal') || name.endsWith('.localhost')) return true;
  return isBlockedAddress(name);
}
async function assertPublicArticleUrl(raw) {
  let parsed;
  try { parsed = new URL(String(raw || '').trim()); } catch (_) { fail('请填写公开的 http 或 https 链接'); }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') fail('请填写公开的 http 或 https 链接');
  if (parsed.username || parsed.password) fail('链接里不要带账号口令');
  if (parsed.href.length > 2000) fail('链接过长');
  const host = parsed.hostname;
  if (isBlockedArticleHost(host)) fail('内网和本机地址不能取');
  const ipLike = stripHost(host);
  if (!net.isIP(ipLike)) {
    let records;
    try {
      records = await dns.promises.lookup(ipLike, { all: true, verbatim: true });
    } catch (_) {
      fail('这个链接打不开，请把正文贴进来', 502);
    }
    if (!records.length || records.some(row => isBlockedAddress(row.address) || isBlockedArticleHost(row.address))) fail('内网和本机地址不能取');
  }
  return parsed;
}
function decodeEntities(text) {
  return String(text || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) && code < 0x110000 ? String.fromCharCode(code) : ' ';
    })
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return Number.isFinite(code) && code < 0x110000 ? String.fromCharCode(code) : ' ';
    });
}
function htmlChunkToText(chunk) {
  return decodeEntities(
    String(chunk || '')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<(?:br|p|div|h[1-6]|li|tr)[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  );
}
function pickHtmlMain(raw) {
  const html = String(raw || '');
  const patterns = [
    /id=["']js_content["'][^>]*>([\s\S]*?)<\/div>/i,
    /class=["'][^"']*rich_media_content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /class=["'][^"']*post_body[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /id=["']endText["'][^>]*>([\s\S]*?)<\/div>/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i
  ];
  for (const re of patterns) {
    const match = html.match(re);
    if (!match || !match[1]) continue;
    if (htmlChunkToText(match[1]).replace(/\s+/g, ' ').trim().length >= 80) return match[1];
  }
  return html;
}
function extractEmbeddedJsonText(html) {
  const texts = [];
  const seen = new Set();
  const re = /"content"\s*:\s*"((?:\\.|[^"\\])+)"/g;
  let match;
  while ((match = re.exec(String(html || '')))) {
    let text = '';
    try { text = JSON.parse('"' + match[1] + '"'); } catch (e) { continue; }
    text = decodeEntities(String(text || '')).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (text.length < 24 || seen.has(text)) continue;
    if (/^【免责声明】/.test(text) || /特色地产诸葛亮|飙马商业地产|飙马中国/.test(text)) continue;
    seen.add(text);
    texts.push(text);
  }
  return texts.join('\n');
}
function stripPageChrome(text) {
  return String(text || '').split(/\n+/).map(line => line.trim()).filter(line => {
    if (!line) return false;
    if (/^(百度首页|登录|搜索|复制|关注|AI导读|举报\/反馈|收藏|分享|微信好友|新浪微博|复制链接|扫码分享至微信|手机看|设为首页|关于百度|About Baidu|使用百度前必读|帮助中心|&copy; Baidu|顶部|网易首页|公开课)$/i.test(line)) return false;
    if (/^(京ICP|京公网安备|©\s*Baidu)/i.test(line)) return false;
    return true;
  }).join('\n');
}
function htmlToText(html) {
  const raw = String(html || '');
  const titleMatch = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeEntities(titleMatch[1].replace(/<[^>]+>/g, '')).trim() : '';
  const jsonText = extractEmbeddedJsonText(raw);
  const body = jsonText.replace(/\s+/g, '').length >= 200 ? jsonText : htmlChunkToText(pickHtmlMain(raw));
  return stripPageChrome([title, body].filter(Boolean).join('\n')).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim();
}
async function readLimitedBody(response, max) {
  const limit = Number(max) || 1024 * 1024;
  if (!response || !response.body || !response.body.getReader) {
    const fallback = Buffer.from(await response.arrayBuffer());
    if (fallback.length > limit) fail('这个页面太大，请把正文贴进来', 413);
    return fallback;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const step = await reader.read();
    if (step.done) break;
    const chunk = Buffer.from(step.value);
    size += chunk.length;
    if (size > limit) fail('这个页面太大，请把正文贴进来', 413);
    chunks.push(chunk);
  }
  return chunks.length ? Buffer.concat(chunks) : Buffer.alloc(0);
}
async function fetchPublicArticle(rawUrl) {
  let current = await assertPublicArticleUrl(rawUrl);
  let response;
  for (let hop = 0; hop < 4; hop += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      response = await fetch(current.toString(), {
        method: 'GET',
        redirect: 'manual',
        headers: { Accept: 'text/html,text/plain,text/markdown;q=0.9,*/*;q=0.1', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
        signal: controller.signal
      });
    } catch (error) {
      if (error.name === 'AbortError') fail('取正文超时，请把正文贴进来', 504);
      fail('这个链接打不开，请把正文贴进来', 502);
    } finally {
      clearTimeout(timer);
    }
    if (response && [301, 302, 303, 307, 308].includes(response.status)) {
      const next = response.headers.get('location');
      if (!next) fail('这个链接打不开，请把正文贴进来', 502);
      current = await assertPublicArticleUrl(new URL(next, current).toString());
      continue;
    }
    break;
  }
  if (!response || !response.ok) fail('这个链接打不开，请把正文贴进来', 502);
  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  if (/pdf|msword|officedocument/.test(contentType)) fail('这个链接是 PDF 或 Word，现在读不了。请另存成 txt，或把正文贴进来。');
  const announced = Number(response.headers.get('content-length') || 0);
  if (announced > 1024 * 1024) fail('这个页面太大，请把正文贴进来', 413);
  const buf = await readLimitedBody(response, 1024 * 1024);
  if (buf.slice(0, 4).toString() === '%PDF') fail('这个链接是 PDF 或 Word，现在读不了。请另存成 txt，或把正文贴进来。');
  const raw = buf.toString('utf8');
  if (raw.includes('\0')) fail('这个页面不是正文，请把正文贴进来');
  const isHtml = /html|xhtml/.test(contentType) || /^\s*</.test(raw);
  const article = (isHtml ? htmlToText(raw) : raw.replace(/^\uFEFF/, '').trim());
  if (!article || article.length < 20) fail('这个页面没有读出正文，请把正文贴进来', 422);
  if (/参数错误|环境异常|该内容已被发布者删除|内容不存在/.test(article.replace(/\s+/g, ''))) fail('这个链接打不开，请把正文贴进来', 422);
  return { url: current.toString(), article: article.slice(0, 200000) };
}
async function semanticExtract(user, body) {
  const pasted = String(body.source || body.material || body.text || '').trim();
  const rawUrl = String(body.url || '').trim();
  let article = '';
  let fetchedFrom = '';
  if (rawUrl && !pasted) {
    const fetched = await fetchPublicArticle(rawUrl);
    article = fetched.article;
    fetchedFrom = fetched.url;
  } else if (!pasted && looksLikeSingleUrl(rawUrl || '')) {
    const fetched = await fetchPublicArticle(rawUrl);
    article = fetched.article;
    fetchedFrom = fetched.url;
  } else if (!rawUrl && looksLikeSingleUrl(pasted)) {
    const fetched = await fetchPublicArticle(pasted);
    article = fetched.article;
    fetchedFrom = fetched.url;
  } else {
    article = validateText(pasted, 'source');
    fetchedFrom = rawUrl;
  }
  const packId = String(body.packId || body.industryPackId || '').trim();
  const pack = (packId && listResources(user, 'context').find(item => item.id === packId || item.name === packId)) || ensureDefaultIndustryPack(user);
  const packTerms = pack ? [].concat(pack.terms || [], pack.phrases || []) : [];
  const llm = resolveLLM(user);
  const wantModel = body.useModel === true || (body.demoMode === false && Boolean(llm));
  let payload;
  if (wantModel) {
    if (!llm) fail('模型服务未配置。请填写服务地址、模型名称和访问密钥。', 503);
    const raw = await chatLLM(user, [
      { role: 'system', content: '从资讯正文里抽出这个行业的用词。尽量抽全，不要故意少抽。只抽出正文里出现过的词。分成术语和习惯用语。术语是这个行业的专名、项目名或固定叫法，习惯用语是这个行业常说的短句。不要编词。数字、百分比、日期不要抽。只返回 JSON：{"terms":[{"term":"用词","kind":"term或phrase"}]}' },
      { role: 'user', content: article.slice(0, 12000) }
    ]);
    payload = industryExtractPayload(article, parseModelTerms(raw, article), 'model');
  } else {
    payload = industryExtractPayload(article, extractTermsByFrequency(article, packTerms), 'local-frequency');
  }
  payload.fetchedFrom = fetchedFrom;
  const hits = rememberExtractedTerms(user, pack, article, payload.candidates, fetchedFrom);
  const storedPack = listResources(user, 'context').find(item => item.id === pack.id) || pack;
  payload.candidates = rankExtractedTerms(payload.candidates, storedPack, hits);
  payload.terms = payload.candidates.map(item => item.term);
  payload.phrases = payload.candidates.filter(item => item.kind === 'phrase').map(item => item.term);
  const types = commercialOps.normalizeCommercialTypes(body.commercialTypes || body.types || []);
  const fingerprint = articleKey(article, fetchedFrom);
  const existingArticle = listResources(user, 'article').find(row => row.fingerprint === fingerprint || (fetchedFrom && row.url === fetchedFrom) || (!fetchedFrom && row.body === article));
  const articleData = {
    title: article.slice(0, 24),
    body: article,
    url: fetchedFrom,
    fingerprint,
    commercialTypes: types,
    domain: 'commercial-ops',
    status: 'active'
  };
  const articleRow = existingArticle
    ? updateResource(user, 'article', existingArticle.id, articleData)
    : resource(user, 'article', articleData);
  payload.articleId = articleRow.id;
  const storedArticles = listResources(user, 'article');
  payload.projects = commercialOps.extractProjects(article, payload.candidates).map(item => {
    const articleCount = commercialOps.countArticlesWithName(storedArticles, item.name);
    return {
      name: item.name,
      count: item.count,
      articleCount,
      status: articleCount >= 2 ? 'candidate' : 'pending'
    };
  });
  payload.entries = payload.candidates.map(item => ({
    term: item.term,
    kind: item.kind,
    count: item.count,
    packHits: item.packHits,
    inPack: item.inPack,
    meaning: item.kind === 'phrase' ? '习惯用语，已进行业词库' : '术语，已进行业词库',
    status: item.inPack ? 'accepted' : 'pending',
    source: payload.source,
    reviewStatus: 'pending'
  }));
  return payload;
}
function lockedNumbers(user, source) {
  const diagnosis = (state(user).diagnosis || {});
  if (diagnosis.factsLocked && diagnosis.lockedContent && Array.isArray(diagnosis.lockedContent.numbers) && diagnosis.lockedContent.numbers.length) return diagnosis.lockedContent.numbers;
  return classify(source || '').numbers;
}
function diffFacts(locked, text) {
  const expected = Array.isArray(locked) ? locked.slice() : [];
  const unused = classify(text || '').numbers.slice();
  const missing = [];
  expected.forEach(num => {
    const index = unused.indexOf(num);
    if (index === -1) missing.push(num);
    else unused.splice(index, 1);
  });
  return { locked: expected, found: classify(text || '').numbers, missing, added: unused, intact: missing.length === 0 };
}
// 去 AI 味：白名单检测。只列出命中的痕迹，改写时只动这些句子，其余逐字保留。
const AI_TASTE_RULES = [
  { id: 'transitions', dim: '顺序', name: '三段式转场', level: 'high', re: /(一方面|另一方面|综上所述|总而言之|总的来说|由此可见|值得注意的是|值得一提的是|需要注意的是|不难看出|在此基础上|与此同时|简而言之|换句话说)/g, fix: '删掉转场词，直接写下一句；顺序靠内容本身，不靠连接词。' },
  { id: 'sequence', dim: '顺序', name: '首先其次式顺序', level: 'medium', re: /(首先|其次|最后)/g, guard: (match, body) => {
    // 只在句首且后面接顿号/逗号时算顺序词；「最后落实到条款」这类正常用法不算。
    const prev = match.index === 0 ? '' : body[match.index - 1];
    const atStart = match.index === 0 || /[。！？；\n]/.test(prev);
    const next = body[match.index + match[0].length] || '';
    return atStart && /[、，,]/.test(next);
  },
  // 单个「最后」「首先」是正常用法，连着出现两次以上才算三段式。
  minCount: 2,
  fix: '删掉顺序词，直接写下一句；顺序靠内容本身。' },
  { id: 'buzzwords', dim: '用词', name: '包装词', level: 'high', re: /(赋能|抓手|闭环|打法|打造|矩阵|生态|护城河|心智|势能|颗粒度|对齐|拉通|复盘|沉淀|深耕|破局|突围|引爆|爆点|组合拳|抢占先机|蓄势)/g, fix: '换成具体的人、事、数；说不清就删。' },
  { id: 'translationese', dim: '用词', name: '翻译腔', level: 'high', re: /(进行(?:了)?[\u4e00-\u9fff]{0,6}|通过[\u4e00-\u9fff]{0,8}来|对于[\u4e00-\u9fff]{0,6}而言|在[\u4e00-\u9fff]{0,6}方面|基于[\u4e00-\u9fff]{0,6}的事实|具有[\u4e00-\u9fff]{0,6}的能力|作为一个[\u4e00-\u9fff]{0,8})/g, fix: '「进行」直接删；「通过…来」改成「用」；「对于…而言」改成「对…」；「具有…的能力」改成「能」。' },
  { id: 'emphasis', dim: '详略', name: '无信息强调', level: 'medium', re: /(非常|极其|真正地|至关重要|不可磨灭|令人叹为观止|前所未有|史无前例|首屈一指)/g, fix: '删掉强调词，用数字或事实替代。' },
  { id: 'formula', dim: '详略', name: '公式对比句', level: 'high', re: /(不仅[\u4e00-\u9fff]{1,20}?(而且|更是|还)|不是[\u4e00-\u9fff]{1,20}?而是|既是[\u4e00-\u9fff]{1,20}?也是)/g, fix: '拆成两句直接说事，或只留一半。' },
  { id: 'closer', dim: '详略', name: '口号式收尾', level: 'medium', re: /(前景广阔|迈出重要一步|奠定了坚实基础|开启(了)?新篇章|注入(了)?新动能|树立(了)?标杆|具有重要意义|未来可期)/g, fix: '改成已经发生的具体事，或下一步具体动作。' },
  { id: 'empty-attr', dim: '立场', name: '无出处归因', level: 'high', re: /(专家认为|行业报告显示|数据显示|研究表明|业内人士(表示|认为)|相关人士(表示|认为))/g, fix: '没有具体出处就删归因，只留能核对的事实。' },
  { id: 'inanimate', dim: '立场', name: '无生命主语', level: 'medium', re: /(方案|项目|策略|举措|机制|体系|规划)(解决|推动|实现|带来|提升|优化|保障|赋能)了?/g, fix: '改成「谁做了什么」，主语落到人。' },
  { id: 'we', dim: '立场', name: '对内用「我们」', level: 'medium', re: /我们(?=[^，。]{0,10}(认为|建议|判断|决定|将|会|要|需要))/g, fix: '对内汇报统一用「我方」。', intent: '给内部看' }
];
const AI_TASTE_LEVEL_WEIGHT = { high: 3, medium: 2, low: 1 };
// 浓度按千字归一，短稿会被放大：一句话里出现一个包装词就能顶到满分。
// 给分母设下限，短稿按 500 字算，长文不受影响。
const TASTE_DENSITY_FLOOR = 500;

function excerptAround(text, index, length) {
  const start = Math.max(0, index - 12);
  const end = Math.min(text.length, index + length + 12);
  return (start > 0 ? '…' : '') + text.slice(start, end).replace(/\s+/g, '') + (end < text.length ? '…' : '');
}

function detectAITaste(text, options) {
  const body = String(text || '').trim();
  if (!body) fail('先贴一段正文，再做体检');
  const intent = String((options && options.intent) || '');
  const sentences = body.split(/[。！？!?]+/).map(item => item.replace(/\s+/g, '')).filter(Boolean);
  const lengths = sentences.map(item => item.length);
  const totalChars = body.length;
  const avg = lengths.length ? Math.round(lengths.reduce((sum, value) => sum + value, 0) / lengths.length) : 0;
  const longest = lengths.length ? Math.max.apply(null, lengths) : 0;
  const hits = [];
  AI_TASTE_RULES.forEach(rule => {
    if (rule.intent && intent && !intent.split('、').includes(rule.intent)) return;
    const re = new RegExp(rule.re.source, 'g');
    const found = [];
    let match;
    let count = 0;
    while ((match = re.exec(body)) !== null) {
      if (rule.guard && !rule.guard(match, body)) continue;
      count += 1;
      if (found.length < 6) found.push({ text: match[0], excerpt: excerptAround(body, match.index, match[0].length) });
    }
    if (!count) return;
    if (rule.minCount && count < rule.minCount) return;
    hits.push({
      id: rule.id,
      dimension: rule.dim,
      name: rule.name,
      level: rule.level,
      count: count,
      samples: found.map(item => item.excerpt),
      fix: rule.fix
    });
  });
  hits.sort((a, b) => AI_TASTE_LEVEL_WEIGHT[b.level] - AI_TASTE_LEVEL_WEIGHT[a.level] || b.count - a.count);

  // 节奏：连续三句长度接近，读起来像同一个模子。
  let uniformRuns = 0;
  for (let i = 0; i + 2 < lengths.length; i += 1) {
    const a = lengths[i], b = lengths[i + 1], c = lengths[i + 2];
    const max = Math.max(a, b, c), min = Math.min(a, b, c);
    if (max > 0 && max - min <= 2) uniformRuns += 1;
  }
  const variance = lengths.length ? lengths.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / lengths.length : 0;
  const flatRun = lengths.length >= 4 && Math.sqrt(variance) <= 3;
  const rhythmUniform = uniformRuns > 0 || flatRun;

  // 浓度：命中权重按千字归一，再叠加节奏项。
  const weighted = hits.reduce((sum, hit) => sum + AI_TASTE_LEVEL_WEIGHT[hit.level] * hit.count, 0);
  const density = weighted / (Math.max(totalChars, TASTE_DENSITY_FLOOR) / 1000);
  let score = Math.round(Math.min(100, 100 * (1 - Math.exp(-density / 30)) + (rhythmUniform ? 10 : 0)));
  if (!weighted && !rhythmUniform) score = 0;
  const level = score >= 55 ? 'high' : score >= 25 ? 'medium' : 'low';

  const dimensions = ['节奏', '顺序', '详略', '立场', '用词'].map(name => {
    const mine = hits.filter(hit => hit.dimension === name);
    const count = mine.reduce((sum, hit) => sum + hit.count, 0);
    const flagged = name === '节奏' ? rhythmUniform : count > 0;
    return { name, count, flagged, note: name === '节奏' ? (uniformRuns > 0 ? '有连续三句长度接近' : flatRun ? '全篇句子长度太齐' : '句子长短有变化') : (count ? mine.map(hit => hit.name).join('、') : '没命中') };
  });

  const review = [
    '数字、专名、引用逐字比对原文，保持原值。',
    '只改上面列出的命中句，其余句子、段落顺序、标题层级原样保留。',
    '没有添上原文没有的判断、结论和事实。',
    '正式稿保留书面判断句；对内汇报统一用「我方」。'
  ];
  if (hits.some(hit => hit.id === 'empty-attr')) review.unshift('归因句要么补上具体出处，要么删掉归因只留事实。');
  if (hits.some(hit => hit.id === 'inanimate')) review.unshift('把无生命主语的句子改回「谁做了什么」。');

  return {
    score,
    level,
    summary: score === 0 ? '没撞上常见的 AI 腔痕迹' : '命中 ' + hits.reduce((sum, hit) => sum + hit.count, 0) + ' 处，集中在' + [...new Set(hits.map(hit => hit.dimension))].join('、'),
    whitelist: '本次只改命中的句子，未命中的逐字保留。',
    stats: { chars: totalChars, sentences: lengths.length, avgSentence: avg, longestSentence: longest, uniformRuns, density: Math.round(density * 10) / 10 },
    dimensions,
    hits,
    review
  };
}

// 口号检测：纯口号、无数字依据时，给出三项补齐提示。只提醒，不拦出稿。
// 示例稿会在正文后附加 [标签] 元信息，核对数字和用词前先去掉，避免标签里的数字被当成正文。
function stripTaskTags(text) {
  return String(text || '').split('\n').filter(line => !/^\s*\[[^\]]+\]\s*$/.test(line)).join('\n').trim();
}
const SLOGAN_WORDS = /(打造|赋能|抓手|闭环|打法|矩阵|生态|标杆|引领|领航|新地标|地标|中心|品质生活|潮流|年轻力|引爆|全面|极致|匠造|启幕|绽放|迭新|焕新|定义|重塑|革新|聚势|共赢|共创|擘画|绘就|书写|璀璨|闪耀|澎湃|活力|势能|抢占|争夺战|心智|护城河|焕新|升级|蝶变|飞跃|新征程|新篇章)/g;
const BRIEF_ENTITY_RE = /(\d+\s*号?[\u4e00-\u9fff]{1,4}|[\u4e00-\u9fff]{2,8}(?:购物中心|广场|天地|中心|街区|商场|项目|城|里|业态|品牌))/g;
const BRIEF_TIME_RE = /(\d{4}\s*年|\d{1,2}\s*月|第[一二三四1-4]季度|[一二三四五六七八九十]+月|今年|去年|明年|年初|年中|年底|近期|三季度|四季度|开业|封顶|竣工)/g;
const BRIEF_ACTION_RE = /(完成|推进|签订|引进|调整|改造|招募|洽谈|落地|收回|开业|封顶|测算|复核|上报|审批)/g;

function analyzeBrief(source) {
  const body = String(source || '').trim();
  const chars = body.length;
  const slogans = [...new Set(body.match(SLOGAN_WORDS) || [])];
  const numbers = [...new Set(body.match(/\d[\d,]*(?:\.\d+)?\s*(?:亿元|万元|平方米|平米|㎡|亿|万|元|%|％|个|家|人|方|次|天|层|栋|座)/g) || [])];
  const timeAnchors = [...new Set(body.match(BRIEF_TIME_RE) || [])];
  const actions = [...new Set(body.match(BRIEF_ACTION_RE) || [])];
  const entities = [...new Set(body.match(BRIEF_ENTITY_RE) || [])].map(name => name.replace(/\s+/g, '')).filter(name => name.length >= 2 && !/^(这个|那个|该项|本项|我们的)/.test(name));
  // 口号词按千字归一，避免长文因总量大被误判；短稿同样用下限，避免被放大。
  const density = Math.round((slogans.length / (Math.max(chars, TASTE_DENSITY_FLOOR) / 1000)) * 10) / 10;
  const isSlogan = chars >= 20 && numbers.length === 0 && (density >= 15 || slogans.length >= 4);
  const checks = [
    { key: 'numbers', name: '数字依据', ok: numbers.length > 0, advice: '补上可核对的数据：客流、出租率、租金、面积、家数，并写清统计口径和时间。' },
    { key: 'entities', name: '具体对象', ok: entities.length > 0, advice: '写清是哪个项目、哪层哪个业态、哪些品牌，别只用「区域」「客群」这类泛指。' },
    { key: 'action', name: '时间与动作', ok: timeAnchors.length > 0 && actions.length > 0, advice: '写清什么时间、谁在做、做到哪一步。' }
  ];
  const missing = checks.filter(item => !item.ok);
  return {
    isSlogan,
    density,
    slogans: slogans.slice(0, 12),
    counts: { numbers: numbers.length, entities: entities.length, timeAnchors: timeAnchors.length, actions: actions.length },
    samples: { numbers: numbers.slice(0, 5), entities: entities.slice(0, 5), timeAnchors: timeAnchors.slice(0, 5), actions: actions.slice(0, 5) },
    checks,
    missing,
    summary: isSlogan ? '这篇像口号，没看到可核对的数据：' + missing.map(item => item.name).join('、') + ' 都缺。' : (missing.length ? '缺 ' + missing.map(item => item.name).join('、') + '，补齐后更好落。' : '数字、对象、时间动作都有。')
  };
}

function persistLock(user, source, lockedContent) {
  const current = state(user);
  current.diagnosis = { factsLocked: true, source, lockedContent, lockedAt: now() };
  db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(`state:${user}`, JSON.stringify(current));
  audit(user, 'update', 'facts-lock', { numbers: lockedContent.numbers });
  return current.diagnosis;
}
const VALID_INTENTS = ['给政府看', '给品牌方看', '给内部看'];
const INTENT_ALIAS = {
  '给领导的工作汇报': '给内部看',
  '招商对内汇报': '给内部看',
  '正式项目汇报': '给内部看',
  '论文': '给内部看',
  '对外沟通': '给品牌方看',
  '招商对外演讲': '给品牌方看',
  '运营方案': '给品牌方看',
  '营销活动方案': '给品牌方看',
  '沟通方案': '给品牌方看',
  '公众号长文': '给品牌方看'
};
const WRITING_SCENES = {
  '给政府看': '给政府或主管单位看的材料。写清背景、依据和口径，数据可追溯，职责边界明确，少用营销包装词。',
  '给品牌方看': '给品牌方或合作方看的沟通稿。写清对象、合作点、条件与后续动作，能讲清为什么、依据是什么。',
  '给内部看': '给内部同事和领导看的汇报。正式、可追责。先写结论再写依据，表格承判断，保留推演过程。'
};
function resolveScenario(input) {
  const direct = input && (input.scenario || input.scene);
  if (direct) return Array.isArray(direct) ? direct.join('、') : String(direct).trim();
  const intents = resolveIntents(input);
  return intents.length ? intents.join('、') : '正式项目汇报';
}
function resolveIntents(input) {
  const raw = input && (input.intents || input.audiences || input.intent || input.scenario || input.scene);
  const list = (Array.isArray(raw) ? raw : [raw]).map(value => String(value || '').trim()).filter(Boolean).map(value => INTENT_ALIAS[value] || value);
  return [...new Set(list)];
}
function resolveIntent(input, required) {
  const list = resolveIntents(input);
  if (!list.length) { if (required) fail('先选这篇写给谁', 400); return ''; }
  if (required) { const bad = list.filter(value => !VALID_INTENTS.includes(value)); if (bad.length) fail('这篇写给谁只支持：给政府看、给品牌方看、给内部看', 400); }
  return list.join('、');
}
function styleGuide(scenario) {
  const list = String(scenario || '').split('、').map(key => WRITING_SCENES[key]).filter(Boolean);
  return list.length ? [...new Set(list)].join(' ') : '保留事实、数字和原意，按给定规则改写。';
}
function semanticLayers(input) {
  const scenario = resolveScenario(input);
  const intent = resolveIntent(input, false) || INTENT_ALIAS[scenario] || scenario;
  return { industry: (input && input.industry) || '地产', expression: (input && input.expression) || '个人表达规则', scenario, intent };
}
const BUILTIN_SKILLS = [
  { id: 'skill-humanizer-zh', name: '去 AI 腔', summary: '去掉中文里常见的空话、翻译腔和宣传套话。', source: 'builtin', sourceRepo: 'op7418/Humanizer-zh', file: 'humanizer-zh.md' },
  { id: 'skill-stop-slop', name: '去空话打分', summary: '删掉空话和套句，改完按是否清楚再检查一遍。', source: 'builtin', sourceRepo: 'hardikpandya/stop-slop', file: 'stop-slop.md' },
  { id: 'skill-no-ai-slop', name: '先检查再少改', summary: '先标出套话，再尽量少改；能不动的句子不动。', source: 'builtin', sourceRepo: 'petergyang/no-ai-slop', file: 'no-ai-slop.md' },
  { id: 'skill-shuorenhua', name: '说人话', summary: '去掉「赋能、抓手」这类包装词，写成具体的人和事。', source: 'builtin', sourceRepo: '', file: 'shuorenhua.md' },
  { id: 'skill-qinggaibaojiegou', name: '只换说法', summary: '分段和标题保持原样，只把套话换成更清楚的句子。', source: 'builtin', sourceRepo: '', file: 'qinggaibaojiegou.md' }
];
const RETIRED_SKILL_IDS = {
  'skill-qingtaolu': 'skill-humanizer-zh',
  'skill-zhongwenquqiang': 'skill-humanizer-zh',
  '清套路': 'skill-humanizer-zh',
  '中文去腔': 'skill-humanizer-zh'
};
function mapRetiredSkillIds(ids) {
  const seen = new Set();
  const out = [];
  (Array.isArray(ids) ? ids : []).forEach(id => {
    const mapped = RETIRED_SKILL_IDS[id] || id;
    if (mapped && !seen.has(mapped)) { seen.add(mapped); out.push(mapped); }
  });
  return out;
}
function loadSkillMarkdown(file, fallback) {
  try { return fs.readFileSync(path.join(root, 'skills', file), 'utf8'); } catch (e) { return fallback; }
}
function skillRowById(packId) {
  return db.prepare('SELECT id,owner,data,version,status,created_at createdAt,updated_at updatedAt FROM resources WHERE id=?').get(packId);
}
function ensureBuiltinSkills(user) {
  BUILTIN_SKILLS.forEach(pack => {
    const markdown = loadSkillMarkdown(pack.file, pack.summary);
    const row = skillRowById(pack.id);
    const payload = {
      name: pack.name,
      summary: pack.summary,
      source: pack.source,
      sourceRepo: pack.sourceRepo || '',
      rulesMarkdown: markdown,
      kind: 'generic-deai',
      builtin: true,
      retired: false
    };
    if (!row) {
      resource(user, 'skill', {
        ...payload,
        enabled: true
      }, pack.id);
      return;
    }
    const data = JSON.parse(row.data);
    if (data.builtin === true && (data.rulesMarkdown !== markdown || data.summary !== pack.summary || data.name !== pack.name || data.sourceRepo !== (pack.sourceRepo || ''))) {
      updateResource(row.owner, 'skill', pack.id, payload);
    }
  });
  Object.keys(RETIRED_SKILL_IDS).filter(id => id.startsWith('skill-')).forEach(id => {
    const row = skillRowById(id);
    if (!row) return;
    const data = JSON.parse(row.data);
    if (data.retired !== true) updateResource(row.owner, 'skill', id, { retired: true, enabled: false });
  });
  return listResources(user, 'skill');
}
function listActiveSkills(user) {
  ensureBuiltinSkills(user);
  const mine = listResources(user, 'skill');
  const seen = new Set(mine.map(item => item.id));
  BUILTIN_SKILLS.forEach(pack => {
    if (seen.has(pack.id)) return;
    const row = skillRowById(pack.id);
    if (!row) return;
    mine.push({ id: row.id, ...JSON.parse(row.data), version: row.version, status: row.status, createdAt: row.createdAt, updatedAt: row.updatedAt });
  });
  return mine.filter(item => item.retired !== true);
}
function normalizeSkillIds(input) {
  if (Array.isArray(input && input.skillIds)) return input.skillIds.map(value => String(value)).filter(Boolean);
  if (input && input.skillId) return [String(input.skillId)];
  return [];
}
function selectedSkill(user, input) {
  const ids = mapRetiredSkillIds(normalizeSkillIds(input));
  if (!ids.length) return null;
  const skills = listActiveSkills(user);
  const skill = skills.find(item => ids.includes(item.id) || ids.includes(item.name));
  if (!skill) fail('这个改法还不能用', 400);
  if (skill.source && skill.source !== 'builtin' && !skill.rulesMarkdown) fail('这个改法还不能用', 400);
  return skill;
}
function ensureDefaultIndustryPack(user) {
  const packs = listResources(user, 'context');
  const hit = packs.find(item => item.name === '商业运营');
  if (hit) return hit;
  return resource(user, 'context', {
    name: '商业运营',
    domain: 'commercial-ops',
    terms: [],
    phrases: [],
    status: 'active'
  });
}
function industryPack(user, input) {
  const packs = listResources(user, 'context');
  const packId = input && input.industryPackId;
  if (packId) return packs.find(item => item.id === packId || item.name === packId) || ensureDefaultIndustryPack(user);
  return ensureDefaultIndustryPack(user);
}
function confirmedRules(user) { return listResources(user, 'rule').filter(rule => rule.confirmed === true || rule.status === 'confirmed'); }
function matchingSamples(user, scenario) {
  const samples = listResources(user, 'sample').filter(sample => !looksLikeOutline(sample.body));
  // 语料场景档可能是旧标签（招商对内汇报），出稿传的是三档（给内部看），
  // 比较前先按别名归一，否则同档语料永远匹配不上，退化成随便取几篇。
  const wanted = normalizeScenes(scenario);
  const matched = samples.filter(sample => {
    const scenes = normalizeScenes(sample.scene);
    return scenes.some(name => wanted.includes(name));
  });
  const pool = (matched.length ? matched : samples).slice();
  // 越像「成段口气」的语料越靠前；标题、整篇排后面，避免长文挤掉口气示范。
  const rankOf = sample => (SAMPLE_KIND_RANK[sample.kind] === undefined ? 9 : SAMPLE_KIND_RANK[sample.kind]);
  pool.sort((a, b) => rankOf(a) - rankOf(b));
  const pick = pool.slice(0, 3);
  if (!pick.length) return '';
  return '个人语料（按这篇怎么写）：\n' + pick.map(sample => {
    const tags = [sample.kind, sample.style, sample.rhythm, sample.logic].filter(Boolean).join(' · ');
    return '- ' + (tags || '语料') + '\n' + String(sample.body || '').slice(0, 280);
  }).join('\n');
}
const SAMPLE_KIND_RANK = { '一段口气': 0, '判断句': 1, '标题写法': 2, '表格说明': 3, '整篇方案': 4 };
// 目录体语料只能教出提纲，教不出口气。行首多为符号或编号的正文按提纲剔除。
function looksLikeOutline(body) {
  const lines = String(body || '').split('\n').map(line => line.trim()).filter(Boolean);
  if (lines.length < 8) return false;
  const outlineLines = lines.filter(line => /^([#>*\-•]|\d+[.、])/.test(line)).length;
  return outlineLines / lines.length > 0.5;
}
function normalizeScenes(value) {
  const raw = String(value || '').split(/[、,+，\/]/).map(item => item.trim()).filter(Boolean);
  return [...new Set(raw.map(item => INTENT_ALIAS[item] || item))];
}
function buildSystemPrompt(user, input) {
  const scenario = resolveScenario(input);
  const intent = resolveIntent(input, false) || scenario;
  const applyStyle = input && input.applyStyle === true;
  const applyIndustry = input && input.applyIndustry === true;
  const skill = selectedSkill(user, input);
  const layers = [styleGuide(intent)];
  if (skill) layers.push('通用写法包（' + skill.name + '）：\n' + (skill.rulesMarkdown || skill.summary || ''));
  const taste = detectAITaste(input && input.source, { intent });
  if (taste.hits.length) {
    layers.push('AI 味体检（白名单：只改下面命中的句子，未命中的句子逐字保留，不改段落顺序和标题层级）：\n' + taste.hits.map(hit => '- [' + hit.dimension + '] ' + hit.name + '：' + hit.fix + '\n  命中：' + hit.samples.slice(0, 3).join(' / ')).join('\n'));
  }
  if (taste.hits.length || taste.stats.uniformRuns) layers.push('发布前复核：\n' + taste.review.map(item => '- ' + item).join('\n'));
  if (intent.split('、').includes('给内部看')) layers.push('对内口径用「我方」，不用随笔「我」。');
  if (applyIndustry) {
    const pack = industryPack(user, input);
    if (pack) {
      const terms = [].concat(pack.terms || [], pack.phrases || []).filter(Boolean);
      layers.push('行业用语（' + pack.name + '）：\n' + (terms.length ? terms.map(term => '- ' + term).join('\n') : '用户尚未装满术语。保持原文用词，提示补包。'));
    } else {
      layers.push('行业用语：还没有收下的行业用词。保持原文用词。');
    }
    const cases = commercialOps.matchProjects(listResources(user, 'project'), input && input.source);
    const casePrompt = commercialOps.industryCasePrompt(cases);
    if (casePrompt) layers.push(casePrompt);
  }
  if (applyStyle) {
    const rules = confirmedRules(user);
    const ruleText = rules.slice(0, 40).map(rule => '- ' + (rule.name || '规则') + ': ' + (rule.statement || rule.text || '')).join('\n');
    layers.push(ruleText ? '个人表达（怎么说）：\n' + ruleText : '个人表达（怎么说）：保留判断句，完整推演，避免宣传腔和提纲体。');
    layers.push(matchingSamples(user, intent));
  }
  layers.push('交付要求：锁定数字、专名和引用；已锁定事实保持原值。');
  const nums = lockedNumbers(user, input && input.source);
  if (nums.length) layers.push('已锁定数字（必须保持原值）：' + nums.join('、'));
  return layers.filter(Boolean).join('\n\n');
}
function termConflicts(body) { const terms = Array.isArray(body.terms) ? body.terms : []; const normalized = terms.map(term => String(term).trim().toLocaleLowerCase().replace(/[\s，。；、,.!?！？:：]/g, '')); const conflicts = []; normalized.forEach((term, index) => { normalized.slice(index + 1).forEach((other, offset) => { if (term && term === other) conflicts.push({ terms: [String(terms[index]), String(terms[index + offset + 1])], reason: 'normalized-term-collision' }); }); }); return { conflicts, checked: normalized.filter(Boolean).length, hasConflict: conflicts.length > 0 }; }
function resolveRules(body) { const groups = new Map(); const decisions = body.decisions && typeof body.decisions === 'object' ? body.decisions : {}; const add = (rule, source) => { if (!rule || typeof rule !== 'object' || !String(rule.name || '').trim()) return; const item = { ...rule, name: String(rule.name).trim(), source, priority: Number.isFinite(Number(rule.priority)) ? Number(rule.priority) : 0 }; if (!groups.has(item.name)) groups.set(item.name, []); groups.get(item.name).push(item); }; (Array.isArray(body.personalRules) ? body.personalRules : []).forEach(rule => add(rule, 'personal')); (Array.isArray(body.teamRules) ? body.teamRules : []).forEach(rule => add(rule, 'team')); const mergedRules = []; const conflicts = []; for (const [name, candidates] of groups) { candidates.sort((a, b) => b.priority - a.priority || (a.source === 'personal' ? -1 : 1)); const selectedSource = decisions[name]; const selected = selectedSource === 'personal' || selectedSource === 'team' ? candidates.find(rule => rule.source === selectedSource) : candidates[0]; if (candidates.length > 1) conflicts.push({ name, candidates, selectedSource: selectedSource || null, reason: 'same-name-rule' }); if (selected) mergedRules.push(selected); } const decisionRequired = conflicts.some(conflict => !conflict.selectedSource); return { mergedRules, conflicts, decisionRequired }; }
function parseIndustryTerms(pack) {
  const raw = [].concat((pack && pack.terms) || [], (pack && pack.phrases) || []).map(item => String(item).trim()).filter(Boolean);
  return raw.map(text => {
    const parts = text.split(/\s*(?:→|->)\s*/);
    if (parts.length === 2 && parts[0] && parts[1] && parts[0] !== parts[1]) return { from: parts[0], to: parts[1], term: parts[1] };
    return { from: '', to: text, term: text };
  });
}
function applyIndustryDemo(source, pack) {
  const maps = parseIndustryTerms(pack).filter(item => item.from).sort((a, b) => b.from.length - a.from.length);
  let text = String(source || '');
  maps.forEach(item => {
    if (text.includes(item.from)) text = text.split(item.from).join(item.to);
  });
  return text;
}
function listIndustryReplacements(user, input, candidate) {
  if (!input || input.applyIndustry !== true) return [];
  const pack = industryPack(user, input);
  if (!pack) return [];
  const body = String(candidate || '');
  return parseIndustryTerms(pack).filter(item => body.includes(item.to)).map(item => ({
    from: item.from || '',
    to: item.to,
    term: item.term,
    applied: true,
    accepted: null
  }));
}
async function generate(input, user) {
  const llm = resolveLLM(user, input);
  const scenario = resolveScenario(input);
  const rules = confirmedRules(user);
  const system = buildSystemPrompt(user, input);
  if (input.demoMode === true || !llm) {
    if (!llm && input.demoMode !== true) fail('模型服务未配置。请填写服务地址、模型名称和访问密钥，或设置 demoMode=true 使用示例稿。', 503);
    updateProviderUsage(user);
    const intent = resolveIntent(input, false) || scenario;
    const applyStyle = input.applyStyle === true;
    const applyIndustry = input.applyIndustry === true;
    const skill = selectedSkill(user, input);
    const pack = applyIndustry ? industryPack(user, input) : null;
    const cases = applyIndustry ? commercialOps.matchProjects(listResources(user, 'project'), input.source) : [];
    const tags = [
      '[演示模式：未调用外部模型]',
      '[写作场景：' + scenario + ']',
      '[这篇写给谁：' + intent + ']',
      skill ? '[写法包：' + skill.name + ']' : '',
      applyIndustry ? '[已换行业用语]' : '',
      cases.length ? '[案例：' + cases.map(item => item.name).join('、') + ']' : '',
      applyIndustry && pack ? '[行业包：' + pack.name + ']' : '',
      applyStyle ? '[已换口气]' : '',
      applyStyle ? '[已加载个人规则：' + rules.length + ' 条]' : '',
      applyStyle ? '[已加载个人语料：' + listResources(user, 'sample').length + ' 篇]' : ''
    ].filter(Boolean);
    let body = input.source.trim();
    if (applyIndustry && pack) body = applyIndustryDemo(body, pack);
    if (applyIndustry && cases.length) {
      body += '\n\n相关案例口径：\n' + cases.map(item => '- ' + item.name + (item.features ? '：' + String(item.features).slice(0, 80) : '')).join('\n');
    }
    return body + '\n\n' + tags.join('\n');
  }
  assertLLMUrl(llm.baseUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  let response;
  try {
    response = await fetch(llm.baseUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${llm.apiKey}` }, body: JSON.stringify({ model: llm.model, messages: [{ role: 'system', content: system }, { role: 'user', content: input.source }], temperature: 0.2 }), signal: controller.signal });
  } catch (error) {
    if (error.name === 'AbortError') fail('LLM request timed out', 504);
    throw error;
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) fail(`LLM request failed: ${response.status}`, 502);
  const result = await response.json();
  const text = result.choices?.[0]?.message?.content;
  if (!text) fail('LLM returned no content', 502);
  updateProviderUsage(user);
  return text;
}
function state(user) { const settings = db.prepare('SELECT key,value FROM settings WHERE key=?').get(`state:${user}`); const value = settings ? JSON.parse(settings.value) : structuredClone(seed); value.samples = listResources(user, 'sample'); value.documents = listResources(user, 'document'); value.rules = listResources(user, 'rule'); value.contexts = listResources(user, 'context'); value.skills = listActiveSkills(user); return value; }
function backup(user) { return { schemaVersion: seed.schemaVersion, state: state(user), resources: db.prepare('SELECT id,kind,data,version,status,created_at createdAt,updated_at updatedAt FROM resources WHERE owner=? ORDER BY id').all(user).map(row => ({ id: row.id, kind: row.kind, data: JSON.parse(row.data), version: row.version, status: row.status, createdAt: row.createdAt, updatedAt: row.updatedAt })) }; }
function restore(user, body) { if (body.schemaVersion !== seed.schemaVersion) fail(`unsupported schemaVersion: ${body.schemaVersion}`, 400); if (!body.state || typeof body.state !== 'object' || !Array.isArray(body.resources)) fail('invalid backup format'); db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(`state:${user}`, JSON.stringify(body.state)); const statement = db.prepare('INSERT INTO resources(id,kind,owner,data,version,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,version=excluded.version,status=excluded.status,updated_at=excluded.updated_at WHERE resources.owner=excluded.owner'); for (const item of body.resources) { if (!item.id || !item.kind || !item.data || item.owner) fail('invalid backup resource'); const stamp = now(); statement.run(String(item.id), String(item.kind), user, JSON.stringify(item.data), Number.isInteger(item.version) ? item.version : 1, item.status || 'active', item.createdAt || stamp, item.updatedAt || stamp); } audit(user, 'restore', 'backup', { schemaVersion: body.schemaVersion, resourceCount: body.resources.length }); return backup(user); }
function openapi() { const operation = (summary, requestBody, response = 'object') => ({ summary, ...(requestBody ? { requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' }, example: requestBody } } } } : {}), responses: { '200': { description: 'Success', content: { 'application/json': { schema: { type: response } } } }, '400': { description: 'Invalid request' } } }); return { openapi: '3.0.3', info: { title: '商业运营工作台 API', version: '1.0.0', description: '商业运营工作台的开发者接口目录。' }, servers: [{ url: '/' }], paths: { '/api/health': { get: operation('检查服务健康状态') }, '/api/state': { get: operation('读取当前用户工作台状态'), put: operation('保存当前用户工作台状态', { theme: 'blue' }) }, '/api/rewrite/analyze': { post: operation('分析原文并锁定事实', { source: '待分析文本' }) }, '/api/rewrite/detect': { post: operation('按白名单检测 AI 味', { source: '待检测文本' }) }, '/api/rewrite/generate': { post: operation('创建异步改写任务', { source: '待改写文本', intents: ['给政府看'], demoMode: true }, 'object') }, '/api/skills': { get: operation('列出通用写法包'), post: operation('启用或登记写法包', { name: '去 AI 腔', enabled: true }) }, '/api/contexts': { get: operation('列出用户自建行业包'), post: operation('创建行业包', { name: '教培', terms: ['课时'] }) }, '/api/integrations/tasks': { post: operation('创建插件改写任务', { source: '待改写文本', demoMode: true }) }, '/api/integrations/tasks/{id}': { get: operation('查询插件任务状态') }, '/api/integrations/tasks/{id}/retry': { post: operation('重试插件任务') }, '/api/samples': { get: operation('读取表达样本'), post: operation('创建表达样本', { title: '样本', body: '正文' }) }, '/api/documents/parse': { post: operation('解析 Markdown 或 TXT 文本', { format: 'markdown', text: '# 标题' }) }, '/api/documents/extract': { post: operation('读取 Word、PPT、Excel、PDF 等文件的正文', { filename: '材料.docx', base64: '...' }) }, '/api/exports/document': { post: operation('把成稿导出为 Word 或 PPT', { format: 'docx', title: '方案', markdown: '# 标题' }) }, '/api/reports/consistency': { post: operation('跨章节核对全稿数字与口径', { sections: [{ title: '方案一', text: '正文' }] }) }, '/api/rewrite/audiences': { get: operation('列出这篇写给谁的三档对象') }, '/api/frameworks/presets': { get: operation('列出方案骨架预置章节') }, '/api/rules/resolve': { post: operation('合并个人规则与团队规则', { personalRules: [], teamRules: [], decisions: {} }) }, '/api/backup': { get: operation('导出当前用户备份') }, '/api/audit': { get: operation('读取当前用户审计记录') }, '/api/team/me': { get: operation('读取当前用户角色') }, '/api/team/members': { get: operation('读取团队成员'), post: operation('添加或更新团队成员', { userId: 'editor-1', role: 'editor' }) }, '/api/providers': { get: operation('读取模型 Provider'), post: operation('创建模型 Provider', { name: 'Provider', baseUrl: 'https://example.com/v1', model: 'model' }), patch: operation('更新模型 Provider', { id: 'provider-id', status: 'enabled' }) } } }; }
async function api(req, res, url) { if (req.method === 'GET' && url.pathname === '/api/openapi') return json(res, 200, openapi()); if (req.method === "GET" && url.pathname === "/api/backup") { requirePermission(req, 'read'); return json(res, 200, backup(owner(req))); } if (req.method === "POST" && url.pathname === "/api/backup/restore") { requirePermission(req, 'write'); return json(res, 200, restore(owner(req), await parseBody(req))); } const user = owner(req); const parts = url.pathname.split('/').filter(Boolean); const handled = await commercialOps.handle(req, res, url, { user, json, fail, parseBody, requirePermission, listResources, resource, updateResource, validateText }); if (handled !== false) return handled; if (req.method === 'GET' && url.pathname === '/api/health') return json(res, 200, { ok: true, service: 'personal-expression-preview', persistence: 'sqlite', llmConfigured: configuredLLM(user) }); if (req.method === 'GET' && url.pathname === '/api/team/me') return json(res, 200, { userId: user, role: role(req), permissions: permissions[role(req)] }); if (req.method === 'GET' && url.pathname === '/api/state') { requirePermission(req, 'read'); return json(res, 200, state(user)); } if (req.method === 'PUT' && url.pathname === '/api/state') { requirePermission(req, 'write'); const body = await parseBody(req); db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(`state:${user}`, JSON.stringify({ ...seed, ...body })); audit(user, 'update', 'state', { keys: Object.keys(body), role: role(req) }); return json(res, 200, state(user)); }
   if (parts[1] === 'providers' && ['GET', 'POST', 'PATCH'].includes(req.method)) {
     requirePermission(req, req.method === 'GET' ? 'read' : 'write');
      if (req.method === 'GET') return json(res, 200, { items: listProviders(user), llmConfigured: configuredLLM(user), keyStored: false });
      const body = await parseBody(req);
      if (!body || Array.isArray(body) || typeof body !== 'object') fail('invalid provider payload');
      const allowed = ['name', 'baseUrl', 'model', 'status', ...(req.method === 'PATCH' ? ['id'] : [])];
      if (Object.keys(body).some(key => !allowed.includes(key))) fail('provider accepts only name, baseUrl, model and status; API keys are never stored');
      if (body.status !== undefined) { if (!['enabled', 'disabled'].includes(body.status)) fail('invalid provider status'); }
     const rid = parts[2] || body.id;
     const current = req.method === 'PATCH' ? listProviders(user).find(item => item.id === rid) : null;
     if (req.method === 'PATCH' && !current) fail('provider not found', 404);
     const data = providerInput({ ...current, ...body });
     const status = body.status || current?.status || 'disabled';
     const providerId = current?.id || id();
     const stamp = now();
     db.exec('BEGIN');
     try {
       if (status === 'enabled') db.prepare("UPDATE providers SET status='disabled' WHERE owner=? AND id<>?").run(user, providerId);
       if (current) db.prepare('UPDATE providers SET name=?,base_url=?,model=?,status=?,updated_at=? WHERE id=? AND owner=?').run(data.name, data.baseUrl, data.model, status, stamp, providerId, user);
       else db.prepare('INSERT INTO providers(id,owner,name,base_url,model,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').run(providerId, user, data.name, data.baseUrl, data.model, status, stamp, stamp);
       audit(user, current ? 'update' : 'create', providerId, { kind: 'provider', status });
       db.exec('COMMIT');
     } catch (error) { db.exec('ROLLBACK'); throw error; }
      return json(res, current ? 200 : 201, listProviders(user).find(item => item.id === providerId));
    }
    if (parts[1] === 'llm' && parts[2] === 'session') {
      requirePermission(req, req.method === 'GET' ? 'read' : 'write');
      if (req.method === 'GET') return json(res, 200, sessionView(user));
      if (req.method === 'DELETE') { llmSessions.delete(user); audit(user, 'delete', 'llm-session', {}); return json(res, 200, sessionView(user)); }
      if (req.method === 'POST') return json(res, 200, saveSession(user, await parseBody(req)));
      fail('method not allowed', 405);
    }
    if (req.method === 'POST' && url.pathname === '/api/documents/parse') { requirePermission(req, 'write'); return json(res, 200, parseDocument(await parseBody(req))); }
  if (parts[1] === 'state' && parts.length === 3 && req.method === 'PUT') { requirePermission(req, 'write'); const body = await parseBody(req); const current = state(user); current[parts[2]] = body; db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(`state:${user}`, JSON.stringify(current)); audit(user, 'update', 'state', { section: parts[2] }); return json(res, 200, body); }
    const kindMap = { samples: 'sample', documents: 'document', rules: 'rule', contexts: 'context', industries: 'industry', scenarios: 'scenario', skills: 'skill' }; if (parts[1] && kindMap[parts[1]] && parts.length === 2) { const kind = kindMap[parts[1]]; requirePermission(req, req.method === 'GET' ? 'read' : 'write'); if (kind === 'skill') ensureBuiltinSkills(user); if (kind === 'context') ensureDefaultIndustryPack(user); if (req.method === 'GET') return json(res, 200, kind === 'skill' ? listActiveSkills(user) : listResources(user, kind)); if (req.method === 'POST') { const body = await parseBody(req); if (kind === 'sample') { validateText(body.body, 'body'); const voice = classifyVoice(body.body); body.kind = body.kind || voice.kind; body.style = body.style || voice.style; body.rhythm = body.rhythm || voice.rhythm; body.logic = body.logic || voice.logic; body.scene = body.scene || body.context || voice.scene; } if (kind === 'document') validateText(body.content, 'content'); if (kind === 'rule') { validateText(body.statement || body.text, 'statement'); body.priority = Number.isFinite(Number(body.priority)) ? Number(body.priority) : 0; body.status = body.status || 'active'; } if (kind === 'context') { validateText(body.name, 'name'); body.domain = body.domain || 'commercial-ops'; body.terms = Array.isArray(body.terms) ? body.terms.map(term => String(term).trim()).filter(Boolean) : String(body.terms || '').split(/[\n，,、]/).map(term => term.trim()).filter(Boolean); body.phrases = Array.isArray(body.phrases) ? body.phrases.map(term => String(term).trim()).filter(Boolean) : String(body.phrases || '').split(/[\n，,、]/).map(term => term.trim()).filter(Boolean); body.status = body.status || 'active'; } if (kind === 'skill') { if (body.id) { const existing = listResources(user, 'skill').find(item => item.id === body.id); if (existing) return json(res, 200, patchSkill(user, body.id, { enabled: body.enabled !== false })); } body.kind = body.kind || 'generic-deai'; body.enabled = body.enabled !== false; body.source = body.source || 'custom'; } if (!body.name && kind !== 'sample') fail('name is required'); return json(res, 201, resource(user, kind, body)); } }
    if (parts[1] && kindMap[parts[1]] && req.method === 'PATCH' && parts[2]) { requirePermission(req, 'write'); const body = await parseBody(req); if (kindMap[parts[1]] === 'skill') return json(res, 200, patchSkill(user, parts[2], body)); return json(res, 200, updateResource(user, kindMap[parts[1]], parts[2], body)); }
  if (req.method === 'POST' && url.pathname === '/api/rewrite/detect') {
    requirePermission(req, 'read');
    const input = await parseBody(req);
    const source = validateText(input.source || input.text || input.candidate, 'source', 200000);
    const report = detectAITaste(source, { intent: resolveIntent(input, false) });
    return json(res, 200, { source, ...report, brief: analyzeBrief(source), checkedAt: now() });
  }
  if (req.method === 'POST' && url.pathname === '/api/rewrite/analyze') { const input = await parseBody(req); const source = validateText(input.source || input.fragment || input.text, 'source'); const analysis = classify(source); const lockedContent = { numbers: analysis.numbers, facts: analysis.facts }; const shouldLock = input.lock === true || input.lockFacts === true; if (shouldLock) { requirePermission(req, 'write'); persistLock(user, source, lockedContent); } const diagnosis = state(user).diagnosis || {}; return json(res, 200, { source, ready: true, lockedContent, issues: [], analyzedAt: now(), factCount: analysis.facts.length, numberCount: analysis.numbers.length, factsCount: analysis.facts.length, numbersCount: analysis.numbers.length, factsLocked: shouldLock || diagnosis.factsLocked === true, contentAnalysis: analysis }); }
    if (req.method === 'POST' && url.pathname === '/api/rewrite/generate') { requirePermission(req, 'write'); const input = await parseBody(req); validateText(input.source, 'source'); resolveIntent(input, true); const skillIds = mapRetiredSkillIds(normalizeSkillIds(input)); skillIds.forEach(skillId => selectedSkill(user, { skillIds: [skillId] })); const enqueue = (payload) => { const source = payload.source; const snapshot = { ...references(user, payload), semanticLayers: semanticLayers(payload), contentAnalysis: classify(source) }; const storedInput = sanitizeTaskInput(payload); const task = resource(user, 'task', { source, input: storedInput, ...snapshot, status: 'queued', demoMode: payload.demoMode === true }, id()); db.prepare('INSERT INTO tasks(id,owner,data,status,attempts,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').run(task.id, user, JSON.stringify(task), 'queued', 0, now(), now()); runTask(task.id, user, payload); return { taskId: task.id, status: 'queued', ...snapshot }; }; if (skillIds.length > 1) { const tasks = skillIds.map(skillId => enqueue({ ...input, skillIds: [skillId] })); return json(res, 202, { taskId: tasks[0].taskId, taskIds: tasks.map(item => item.taskId), status: 'queued', ...tasks[0] }); } return json(res, 202, enqueue({ ...input, skillIds })); }
    if (parts[1] === 'tasks' && parts[2] && req.method === 'GET') { const task = db.prepare('SELECT id,status,error,data,attempts,created_at createdAt,updated_at updatedAt FROM tasks WHERE id=? AND owner=?').get(parts[2], user); if (!task) fail('task not found', 404); return json(res, 200, { ...task, data: publicTaskData(task.data) }); }
    if (parts[1] === 'tasks' && parts[2] && parts[3] === 'resume' && req.method === 'POST') { const task = db.prepare('SELECT * FROM tasks WHERE id=? AND owner=?').get(parts[2], user); if (!task) fail('task not found', 404); const data = JSON.parse(task.data); const resumeId = id(); db.prepare('INSERT INTO tasks(id,owner,data,status,attempts,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').run(resumeId, user, JSON.stringify({ ...data, id: resumeId, status: 'queued', resumedFrom: parts[2] }), 'queued', task.attempts + 1, now(), now()); runTask(resumeId, user, data.input || { source: data.source, demoMode: data.demoMode }); return json(res, 202, { taskId: resumeId, status: 'queued', resumedFrom: parts[2] }); }
   if (req.method === 'POST' && parts[1] === 'tasks' && parts[2] && parts[3] === 'retry') { const task = db.prepare('SELECT data FROM tasks WHERE id=? AND owner=?').get(parts[2], user); if (!task) fail('task not found', 404); const data = JSON.parse(task.data); const retryId = id(); db.prepare('INSERT INTO tasks(id,owner,data,status,attempts,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').run(retryId, user, JSON.stringify({ ...data, id: retryId, status: 'queued' }), 'queued', (task.attempts || 0) + 1, now(), now()); runTask(retryId, user, data.input || { source: data.source, demoMode: data.demoMode }); return json(res, 202, { taskId: retryId, status: 'queued', retriedFrom: parts[2] }); }
    if (req.method === 'GET' && parts[1] === 'versions') return json(res, 200, pageResources(user, 'version', url));
   if (req.method === 'POST' && parts[1] === 'versions') { const body = await parseBody(req); validateText(body.content, 'content'); return json(res, 201, resource(user, 'version', { name: body.name || '表达版本', content: body.content, status: 'draft', confirmed: false })); }
   if (req.method === 'PATCH' && parts[1] === 'versions' && parts[2]) { const body = await parseBody(req); const version = listResources(user, 'version').find(x => x.id === parts[2]); if (!version) fail('version not found', 404); if (body.action === 'rollback') { const current = state(user); current.rewrite.final = version.content; current.rewrite.candidate = version.content; current.rewrite.status = 'confirmed'; db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(`state:${user}`, JSON.stringify(current)); audit(user, 'rollback', parts[2], {}); return json(res, 200, state(user)); } return json(res, 200, updateResource(user, 'version', parts[2], body.action === 'confirm' ? { status: 'confirmed', confirmed: true } : body)); }
   if (req.method === 'GET' && parts[1] === 'reviews') return json(res, 200, listResources(user, 'review'));
   if (req.method === 'POST' && parts[1] === 'reviews') { const body = await parseBody(req); return json(res, 201, resource(user, 'review', { name: body.name || '待审批内容', content: body.content || '', status: 'pending', reviewer: body.reviewer || 'team' })); }
    if (req.method === 'PATCH' && parts[1] === 'reviews' && parts[2]) { const body = await parseBody(req); if (!['approved','rejected','pending'].includes(body.status)) fail('invalid review status'); return json(res, 200, updateResource(user, 'review', parts[2], { status: body.status, comment: body.comment || '' })); }
     if (parts[1] === 'comments' && req.method === 'POST') { requirePermission(req, 'review'); const body = await parseBody(req); validateText(body.body || body.comment, 'comment'); return json(res, 201, resource(user, 'comment', { targetId: body.targetId || '', body: body.body || body.comment, status: 'open' })); }
     if (req.method === 'GET' && parts[1] === 'comments') return json(res, 200, pageResources(user, 'comment', url));
     if (req.method === 'PATCH' && parts[1] === 'comments' && parts[2]) { requirePermission(req, 'review'); const body = await parseBody(req); if (!['open', 'approved', 'rejected', 'resolved'].includes(body.status)) fail('invalid comment status'); return json(res, 200, updateResource(user, 'comment', parts[2], { status: body.status })); }
    if (req.method === 'POST' && url.pathname === '/api/terms/conflicts') return json(res, 200, termConflicts(await parseBody(req)));
      if (req.method === 'POST' && url.pathname === '/api/rules/resolve') { const body = await parseBody(req); const result = resolveRules(body); audit(user, 'resolve', 'rules', { conflicts: result.conflicts.map(conflict => ({ name: conflict.name, selectedSource: conflict.selectedSource })), decisionRequired: result.decisionRequired }); return json(res, 200, result); }
     if (req.method === 'GET' && parts[1] === 'releases') return json(res, 200, listResources(user, 'release')); if (req.method === 'POST' && parts[1] === 'releases') { requirePermission(req, 'publish'); const body = await parseBody(req); validateText(body.versionId, 'versionId'); return json(res, 201, resource(user, 'release', { versionId: body.versionId, status: body.status || 'draft', note: body.note || '' })); }
     if (req.method === 'PATCH' && parts[1] === 'releases' && parts[2]) { const body = await parseBody(req); const current = listResources(user, 'release').find(x => x.id === parts[2]); if (!current) fail('release not found', 404); const next = body.status; if (!['draft', 'published', 'archived'].includes(next)) fail('invalid release status'); if (next === 'published') requirePermission(req, 'publish'); else requirePermission(req, 'write'); const allowed = { draft: ['published', 'archived'], published: ['archived'], archived: [] }; if (next !== current.status && !allowed[current.status].includes(next)) fail('invalid release transition', 409); return json(res, 200, updateResource(user, 'release', parts[2], { status: next, publishedAt: next === 'published' ? now() : current.publishedAt })); }
     if (parts[1] === 'publish-api' && ['GET', 'POST', 'PATCH'].includes(req.method)) { if (req.method !== 'GET') requirePermission(req, 'write'); if (req.method === 'GET') return json(res, 200, listResources(user, 'publishApi')); const body = await parseBody(req); if (req.method === 'POST') return json(res, 201, resource(user, 'publishApi', { name: validateText(body.name || 'API', 'name', 200), path: validateText(body.path || body.endpoint, 'path', 500), endpoint: body.endpoint || body.path || '', status: body.status || 'active', response: body.response || null })); return json(res, 200, updateResource(user, 'publishApi', parts[2], body)); }
    if (req.method === 'POST' && parts[1] === 'exports') { const body = await parseBody(req); return json(res, 201, resource(user, 'export', { versionId: body.versionId || '', format: body.format || 'markdown', status: body.status || 'completed', exportedAt: now() })); }
   if (req.method === 'POST' && url.pathname === '/api/samples/clean') { const body = await parseBody(req); const text = validateText(body.body, 'body'); const analysis = classify(text); const voice = classifyVoice(text); return json(res, 200, { mode: 'local-demo', source: 'local-rule-demo', confidence: 0.72, reviewStatus: 'pending', labels: body.labels || [], representative: body.representative === true, cleanedText: text.replace(/\s+/g, ' ').trim(), analysis, voice }); }
    if (req.method === 'POST' && url.pathname === '/api/industry/fetch-article') { const body = await parseBody(req); const fetched = await fetchPublicArticle(body && (body.url || body.source)); return json(res, 200, fetched); }
    if (req.method === 'POST' && url.pathname === '/api/industry/semantic-extract') { return json(res, 200, await semanticExtract(user, await parseBody(req))); }
   if (req.method === 'POST' && url.pathname === '/api/rules/generate') { requirePermission(req, 'write'); const body = await parseBody(req); const source = validateText(body.source, 'source'); const rule = { name: body.name || '候选表达规则', statement: `从内容中提取：${source.slice(0, 80)}`, source: body.sourceId || 'local-rule-demo', confidence: 0.68, reviewStatus: 'pending', status: 'pending', confirmed: false, demoMode: true }; return json(res, 201, resource(user, 'rule', rule)); }
  if (req.method === 'GET' && url.pathname === '/api/exports/skill') { const current = state(user); const confirmed = listResources(user, 'rule').filter(x => x.confirmed === true || x.status === 'confirmed'); const markdown = `# 个人表达规则 Skill\n\n行业语境：${current.industries.activeContext}\n\n${confirmed.map(x => `- ${x.name || x.statement}`).join('\n') || '暂无已确认规则。'}\n`; return json(res, 200, { markdown, prompt: `保留原意与个人语气。已确认规则数：${confirmed.length}。`, status: confirmed.length ? 'ready' : 'incomplete', confirmedRuleCount: confirmed.length }); }
    if (parts[1] === 'team' && parts[2] === 'members') {
      if (req.method === 'GET' && parts.length === 3) { requirePermission(req, 'read'); return json(res, 200, listMembers(teamOwnerOf(user))); }
      if (req.method === 'POST' && parts.length === 3) { requirePermission(req, 'admin'); return json(res, 201, upsertMember(user, await parseBody(req))); }
      if (req.method === 'PATCH' && parts.length === 4) { requirePermission(req, 'admin'); return json(res, 200, patchMember(user, parts[3], await parseBody(req))); }
    }
    if (req.method === 'GET' && url.pathname === '/api/audit') { requirePermission(req, 'read'); return json(res, 200, db.prepare('SELECT action,resource,detail,created_at createdAt FROM audit WHERE owner=? ORDER BY id DESC LIMIT 200').all(user)); } fail('API not found', 404); }
const server = http.createServer(async (req, res) => { try { const url = new URL(req.url, 'http://localhost'); identity(req, res); if (url.pathname.startsWith('/api/integrations/tasks')) { const user=owner(req), parts=url.pathname.split('/').filter(Boolean); requirePermission(req, req.method==='GET'?'read':'write'); if(req.method==='POST' && parts.length===3) return json(res,202,{ok:true,data:createTask(user,await parseBody(req))}); const task=db.prepare('SELECT id,status,error,data,attempts,created_at createdAt,updated_at updatedAt FROM tasks WHERE id=? AND owner=?').get(parts[3],user); if(!task) fail('task not found',404); if(req.method==='GET') return json(res,200,{ok:true,data:integrationTaskView(task)}); const data=JSON.parse(task.data); return json(res,202,{ok:true,data:{...createTask(user,data.input||{source:data.source,demoMode:data.demoMode}),retriedFrom:task.id}}); } if (url.pathname.startsWith('/api/')) return await api(req, res, url); const requested = decodeURIComponent(url.pathname); const file = requested === '/' ? '/index.html' : requested; const safe = path.normalize(path.join(root, file)); const ext = path.extname(safe); const allowedJs = new Set(['app.js', 'data-model.js']); const rooted = safe === root || safe.startsWith(root + path.sep); if (!rooted || !fs.existsSync(safe) || fs.statSync(safe).isDirectory() || !((ext === '.html' || ext === '.css') || (ext === '.js' && allowedJs.has(path.basename(safe))))) return json(res, 404, { error: 'Not found' }); res.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' }[ext], ...(res._setCookie ? { 'Set-Cookie': res._setCookie } : {}) }); fs.createReadStream(safe).pipe(res); } catch (e) { json(res, e.status || 500, { error: e.message }); } });
 server.listen(port, () => console.log(`Expression workbench listening on http://localhost:${port}`));
