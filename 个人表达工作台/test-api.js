const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const port = 3100 + Math.floor(Math.random() * 500);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'expression-api-'));
const dbFile = path.join(tempDir, 'state.sqlite');
const server = spawn(process.execPath, ['server.js'], {
  cwd: __dirname,
  env: { ...process.env, PORT: String(port), DB_FILE: dbFile },
  stdio: ['ignore', 'pipe', 'pipe']
});

async function request(method, route, payload, user = 'local-user', userRole = 'owner') {
  const response = await fetch(`http://127.0.0.1:${port}${route}`, {
    method,
    headers: { 'x-user-id': user, 'x-user-role': userRole, ...(payload === undefined ? {} : { 'content-type': 'application/json' }) },
    body: payload === undefined ? undefined : JSON.stringify(payload)
  });
  const body = await response.json();
  return { status: response.status, body };
}

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try { if ((await request('GET', '/api/health')).status === 200) return; } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error('server did not start');
}

(async () => {
  await waitForServer();
  const health = await request('GET', '/api/health');
  assert.deepStrictEqual(health.body.ok, true);
  assert.strictEqual(typeof health.body.llmConfigured, 'boolean');
  const openapi = await request('GET', '/api/openapi');
  assert.strictEqual(openapi.status, 200);
  assert.strictEqual(openapi.body.openapi, '3.0.3');
  for (const route of ['/api/health', '/api/state', '/api/rewrite/analyze', '/api/rewrite/generate', '/api/samples', '/api/documents/parse', '/api/rules/resolve', '/api/backup', '/api/audit', '/api/providers']) assert.ok(openapi.body.paths[route]);
  const parsed = await request('POST', '/api/documents/parse', { format: 'markdown', text: '# 标题\n正文' });
  assert.strictEqual(parsed.body.status, 'parsed'); assert.strictEqual(parsed.body.documents[0].lines, 2);
  const batch = await request('POST', '/api/documents/parse', { format: 'txt', texts: ['甲', '乙'] });
  assert.strictEqual(batch.body.documents.length, 2);
  const unsupported = await request('POST', '/api/documents/parse', { format: 'pdf', text: 'x' });
  assert.strictEqual(unsupported.body.status, 'unsupported');
  const initial = await request('GET', '/api/state');
  const exported = await request('GET', '/api/backup'); assert.strictEqual(exported.body.schemaVersion, 4); assert.ok(Array.isArray(exported.body.resources));
  exported.body.state.theme = 'restored'; const restored = await request('POST', '/api/backup/restore', exported.body); assert.strictEqual(restored.body.state.theme, 'restored');
  assert.strictEqual((await request('POST', '/api/backup/restore', { ...exported.body, schemaVersion: 999 })).status, 400);
  assert.strictEqual((await request('POST', '/api/backup/restore', { state: {}, resources: [], schemaVersion: 4, filler: 'x'.repeat(5 * 1024 * 1024) })).status, 413);
  assert.strictEqual(initial.status, 200);
  assert.strictEqual((await request('GET', '/api/providers')).body.keyStored, false);
  assert.strictEqual((await request('POST', '/api/providers', { name: '测试', baseUrl: 'https://example.com/v1', model: 'test', apiKey: 'secret' })).status, 400);
  const provider = await request('POST', '/api/providers', { name: '测试', baseUrl: 'https://example.com/v1', model: 'test' });
  assert.strictEqual(provider.status, 201);
  assert.strictEqual((await request('PATCH', '/api/providers', { id: provider.body.id, status: 'enabled' }, 'editor', 'editor')).status, 403);
  assert.strictEqual((await request('PATCH', '/api/providers', { id: provider.body.id, status: 'enabled' })).body.status, 'enabled');
  const saved = { ...initial.body, theme: 'green' };
  assert.strictEqual((await request('PUT', '/api/state', saved)).body.theme, 'green');
  assert.strictEqual((await request('GET', '/api/state')).body.theme, 'green');
  assert.strictEqual((await request('PUT', '/api/state/theme', 'purple')).body, 'purple');
  assert.strictEqual((await request('POST', '/api/rewrite/analyze', { source: '原始内容' })).body.ready, true);
  const generated = await request('POST', '/api/rewrite/generate', { source: '原始内容', demoMode: true });
  assert.strictEqual(generated.status, 202);
  assert.ok(generated.body.taskId);
  let task;
  for (let i = 0; i < 30; i += 1) { task = await request('GET', `/api/tasks/${generated.body.taskId}`); if (task.body.status === 'completed') break; await new Promise(resolve => setTimeout(resolve, 20)); }
  assert.strictEqual(task.body.status, 'completed');
  assert.strictEqual((await request('GET', '/api/providers')).body.items[0].usageCount, 1);
  assert.deepStrictEqual(task.body.data.ruleReferences, []);
  assert.deepStrictEqual(task.body.data.semanticLayers, { industry: '地产', expression: '个人表达规则', scenario: '正式项目汇报' });
  assert.ok(task.body.data.contentAnalysis);
  const integration = await request('POST', '/api/integrations/tasks', { source: '插件改写内容 20%', demoMode: true });
  assert.strictEqual(integration.status, 202); assert.strictEqual(integration.body.ok, true); assert.ok(integration.body.data.taskId);
  const integrationStatus = await request('GET', `/api/integrations/tasks/${integration.body.data.taskId}`);
  assert.strictEqual(integrationStatus.status, 200); assert.ok(['queued', 'running', 'completed'].includes(integrationStatus.body.data.status));
  assert.strictEqual((await request('POST', '/api/integrations/tasks', { source: '无权限', demoMode: true }, 'viewer', 'viewer')).status, 403);
  const integrationRetry = await request('POST', `/api/integrations/tasks/${integration.body.data.taskId}/retry`);
  assert.strictEqual(integrationRetry.status, 202); assert.strictEqual(integrationRetry.body.ok, true);
  const cleaned = await request('POST', '/api/samples/clean', { body: '  客流 12% 可能增长。', labels: ['经营'], representative: true });
  assert.strictEqual(cleaned.body.reviewStatus, 'pending');
  assert.strictEqual(cleaned.body.representative, true);
  const extracted = await request('POST', '/api/industry/semantic-extract', { source: '客流 12%，需要优化业态组合。' });
  assert.ok(extracted.body.structure.metrics.includes('12%'));
  const candidate = await request('POST', '/api/rules/generate', { source: '先判断后策略' });
  assert.strictEqual(candidate.body.reviewStatus, 'pending');
  const confirmed = await request('PATCH', `/api/rules/${candidate.body.id}`, { status: 'confirmed', confirmed: true, reviewStatus: 'approved' });
  assert.strictEqual(confirmed.body.confirmed, true);
  const sample = await request('POST', '/api/samples', { title: '样本', body: '真实方案内容', industry: '地产', context: '汇报', representativeness: 'representative' });
  assert.strictEqual(sample.status, 201);
  const rule = await request('POST', '/api/rules', { name: '保留判断', statement: '先判断后策略', confirmed: true, status: 'confirmed' });
  assert.strictEqual(rule.status, 201);
  const skill = await request('GET', '/api/exports/skill');
  assert.strictEqual(skill.status, 200);
  assert.ok(skill.body.markdown && skill.body.prompt && skill.body.confirmedRuleCount >= 1);
  const page = await request('GET', '/api/samples?page=1&pageSize=1');
  assert.ok(Array.isArray(page.body));
  const comment = await request('POST', '/api/comments', { targetId: sample.body.id, body: '请补充来源' });
  assert.strictEqual(comment.status, 201);
  assert.strictEqual((await request('GET', '/api/comments?page=1&pageSize=10')).body.total, 1);
  const release = await request('POST', '/api/releases', { versionId: 'v1' });
  assert.strictEqual(release.body.status, 'draft');
  const published = await request('PATCH', `/api/releases/${release.body.id}`, { status: 'published' });
  assert.strictEqual(published.body.status, 'published');
  assert.strictEqual((await request('PATCH', `/api/releases/${release.body.id}`, { status: 'draft' })).status, 409);
  const apiRecord = await request('POST', '/api/publish-api', { name: '改写 API', path: '/api/rewrite' });
  assert.strictEqual((await request('GET', '/api/publish-api')).body.length, 1);
  assert.strictEqual((await request('PATCH', `/api/publish-api/${apiRecord.body.id}`, { status: 'disabled' })).body.status, 'disabled');
  assert.strictEqual((await request('POST', '/api/releases', { versionId: 'v2' }, 'viewer', 'viewer')).status, 403);
  assert.strictEqual((await request('POST', '/api/comments', { targetId: sample.body.id, body: '无权限' }, 'viewer', 'viewer')).status, 403);
  assert.ok((await request('GET', '/api/audit')).body.length >= 6);
  const conflicts = await request('POST', '/api/terms/conflicts', { terms: ['客流', ' 客流 ', '业态'] });
  assert.strictEqual(conflicts.body.hasConflict, true);
  const resolved = await request('POST', '/api/rules/resolve', { personalRules: [{ name: '语气', statement: '完整', priority: 5 }], teamRules: [{ name: '语气', statement: '统一', priority: 10 }], decisions: {} });
  assert.strictEqual(resolved.body.decisionRequired, true); assert.strictEqual(resolved.body.mergedRules[0].source, 'team');
  const decided = await request('POST', '/api/rules/resolve', { personalRules: [{ name: '语气', statement: '完整', priority: 5 }], teamRules: [{ name: '语气', statement: '统一', priority: 10 }], decisions: { '语气': 'personal' } });
  assert.strictEqual(decided.body.decisionRequired, false); assert.strictEqual(decided.body.mergedRules[0].source, 'personal');
  const resumed = await request('POST', `/api/tasks/${generated.body.taskId}/resume`);
  assert.strictEqual(resumed.status, 202);
  console.log('API smoke tests passed');
})().catch(error => { console.error(error); process.exitCode = 1; })
  .finally(() => server.kill());
