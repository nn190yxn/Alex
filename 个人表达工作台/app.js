(function () {
  'use strict';
  var store = window.ExpressionStore;
  if (!store) {
    var fallbackKey = 'expression-workbench-state';
    var fallback = { schemaVersion: 2, theme: 'blue', rewrite: { source: '', candidate: '', final: '', status: 'draft', confirmed: false }, expressionRules: { sampleCount: 0, confirmedCount: 86, pendingCount: 12 }, industries: { activeContext: '地产', entries: [], frameworks: [] }, documents: [], releases: [], reviews: [] };
    try { var old = JSON.parse(localStorage.getItem(fallbackKey) || localStorage.getItem('expression-workbench-mvp') || 'null'); if (old) { fallback.theme = old.theme || fallback.theme; fallback.rewrite.source = old.source || ''; fallback.rewrite.candidate = old.candidate || ''; fallback.rewrite.final = old.final || ''; fallback.rewrite.confirmed = old.confirmed === true; fallback.rewrite.status = fallback.rewrite.confirmed ? 'confirmed' : (fallback.rewrite.candidate ? 'generated' : 'draft'); fallback.expressionRules.sampleCount = Number(old.samples) || 0; } } catch (e) {}
    if (old && old.schemaVersion >= 2) Object.assign(fallback, old);
    store = window.ExpressionStore = { state: fallback, save: function () { localStorage.setItem(fallbackKey, JSON.stringify(fallback)); } };
  }
   var state = store.state;
   var syncBanner;
   function banner(kind, text) {
     if (!syncBanner) { syncBanner = document.createElement('div'); syncBanner.className = 'panel'; syncBanner.setAttribute('role', 'status'); syncBanner.style.margin = '12px 0'; document.querySelector('main') && document.querySelector('main').prepend(syncBanner); }
     syncBanner.textContent = text; syncBanner.dataset.state = kind;
   }
   function request(method, path, body) {
     return fetch(path, { method: method, headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(function (response) {
       return response.json().catch(function () { return {}; }).then(function (result) { if (!response.ok) throw new Error('操作未完成，请检查填写内容和访问权限后重试。'); return result; });
     });
   }
   function syncState() {
     if (!window.fetch) return Promise.resolve();
     banner('loading', '正在加载最新资料…');
     return request('GET', '/api/state').then(function (remote) { Object.keys(remote || {}).forEach(function (key) { state[key] = remote[key]; }); store.save(); banner('success', '资料已同步'); if (!sessionStorage.getItem('expression-state-synced')) { sessionStorage.setItem('expression-state-synced', '1'); location.reload(); } else sessionStorage.removeItem('expression-state-synced'); }).catch(function () { banner('error', '服务暂不可用，当前使用本机草稿'); });
   }
  state.industries = state.industries || { activeContext: '地产', entries: [], frameworks: [] };
  state.documents = state.documents || []; state.rules = state.rules || []; state.comments = state.comments || [];
    function save() { store.save(); if (window.fetch) { request('PUT', '/api/state', state).then(function () { banner('success', '资料已保存并同步'); }).catch(function () { banner('error', '同步失败，草稿已保存到本机'); }); } }
   function resource(method, path, body, fallback) { return request(method, path, body).catch(function (error) { if (fallback) fallback(); banner('error', '操作未完成，草稿已保存到本机'); throw error; }); }
   function bindForm(selector, handler) { var f=document.querySelector(selector); if(!f)return; f.addEventListener('submit',function(e){e.preventDefault();handler(new FormData(f));f.reset();save();location.reload();}); }
  function list(key, target, fields) { var host=document.querySelector(target); if(!host)return; var source=key==='industries'?state.industries.entries:state[key]||[]; host.innerHTML=source.map(function(x){return '<div class="entry"><h2>'+String(x[fields[0]]||'')+'</h2><p>'+String(x[fields[1]]||'')+' · '+String(x.status||'启用')+'</p><button class="btn" data-item="'+x.id+'">切换状态</button></div>';}).join('')||'<p>暂无自定义内容。</p>'; host.querySelectorAll('[data-item]').forEach(function(b){b.onclick=function(){var x=source.find(function(i){return i.id===b.dataset.item;});x.status=x.status==='启用'?'停用':'启用';save();location.reload();};}); }
   function setupPublish() { var box=document.querySelector('[data-preview]'); if(!box)return; var r=state.expressionRules||{},i=state.industries||{},w=state.rewrite||{},v='1.'+(r.confirmedCount||0)+'.'+(r.sampleCount||0),text=w.final||w.candidate||'未填写'; var md='# 个人表达规则\n\n版本: '+v+'\n适用行业: '+(i.activeContext||'未配置')+'\n\n## 已确认表达\n\n'+text+'\n\n## 行业资料\n\n'+JSON.stringify(i.entries||[])+'\n\n## 写作场景\n\n'+JSON.stringify(i.frameworks||[])+'\n\n## 写作要求\n\n- 保留原意与个人语气。\n- 信息不足时标记待确认。\n',prompt='你是个人表达助手。适用行业：'+(i.activeContext||'未配置')+'；已确认规则：'+(r.confirmedCount||0)+' 条；表达基准：'+text+'。保留原意与个人语气，只输出可直接使用的结果。'; document.querySelector('[data-preview="markdown"]').textContent=md;document.querySelector('[data-preview="prompt"]').textContent=prompt;document.querySelector('[data-version]').textContent='v'+v;document.querySelector('[data-export-summary]').textContent=(r.confirmedCount||0)+' 条已确认规则 · '+(i.activeContext||'未配置'); document.querySelectorAll('[data-copy]').forEach(function(b){b.onclick=function(){navigator.clipboard.writeText(b.dataset.copy==='markdown'?md:prompt);b.textContent='已复制';};}); document.querySelectorAll('[data-download]').forEach(function(b){b.onclick=function(){var mdType=b.dataset.download==='markdown',a=document.createElement('a');a.href=URL.createObjectURL(new Blob([mdType?md:prompt],{type:'text/plain'}));a.download=mdType?'personal-expression-skill.md':'personal-expression-lite-prompt.txt';a.click();resource('POST','/api/exports',{versionId:v,format:mdType?'markdown':'prompt'}).catch(function(){});};}); document.querySelector('[data-release]').onclick=function(){state.releases=state.releases||[];state.releases.push({name:'个人表达规则',version:v,status:'已发布',updatedAt:new Date().toISOString(),markdown:md,prompt:prompt});save();resource('POST','/api/releases',{versionId:v,note:'个人表达规则'}).catch(function(){});document.querySelector('[data-release-status]').textContent='已发布';this.textContent='已发布当前版本';}; }
  document.body.dataset.theme = state.theme;
  document.querySelectorAll('[data-set]').forEach(function (button) {
    button.classList.toggle('active', button.dataset.set === state.theme);
    button.addEventListener('click', function () { state.theme = button.dataset.set; document.body.dataset.theme = state.theme; document.querySelectorAll('[data-set]').forEach(function (x) { x.classList.toggle('active', x.dataset.set === state.theme); }); save(); });
  });
   var pages = { '工作台首页': 'index.html', '新建改写': 'rewrite.html', '我的方案语言': 'voice.html', '行业知识库': 'industry.html', '内容诊断': 'diagnosis.html', '历史任务': 'compare.html', '多行业多场景': 'contexts.html', '文档资料中心': 'documents.html', '行业框架编辑器': 'framework.html', '表达规则发布中心': 'publish.html', '团队审核': 'team.html' };
   document.querySelectorAll('.side .nav, .side nav').forEach(function (nav) { var active = Object.keys(pages).find(function (name) { return nav.textContent.indexOf(name) >= 0 && nav.querySelector('.active, .on') && nav.querySelector('.active, .on').textContent.indexOf(name) >= 0; }); nav.innerHTML = Object.keys(pages).map(function (name) { return '<button class="' + (name === active ? 'active' : '') + '">' + name + '</button>'; }).join(''); });
  document.querySelectorAll('.nav div, nav button').forEach(function (item) { var name = Object.keys(pages).find(function (x) { return item.textContent.indexOf(x) >= 0; }); if (name) item.addEventListener('click', function () { location.href = pages[name]; }); });
  var editor = document.querySelector('.editor');
  if (editor) { if (state.rewrite.source) editor.textContent = state.rewrite.source; editor.contentEditable = 'true'; editor.addEventListener('input', function () { state.rewrite.source = editor.innerText; save(); }); }
   var generate = Array.from(document.querySelectorAll('button')).find(function (x) { return x.textContent.indexOf('生成改写稿') >= 0; });
     if (generate) generate.addEventListener('click', function () { fetch('/api/rewrite/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source: state.rewrite.source, demoMode: true }) }).then(function (r) { return r.json().then(function (result) { if (!r.ok) throw new Error('生成未完成，请检查原文和模型服务后重试'); return result; }); }).then(function (result) { state.rewrite.taskId = result.taskId; state.rewrite.status = result.status; save(); generate.textContent = '任务已提交'; var poll = function () { fetch('/api/tasks/'+result.taskId).then(function(r){return r.json();}).then(function(t){if(t.status==='completed'){state.rewrite.candidate=t.data.candidate;state.rewrite.status='generated';save();generate.textContent='改写稿已生成';}else if(t.status==='failed'){generate.textContent='生成失败，请检查模型服务后重试';}else setTimeout(poll,300);}); }; poll(); }).catch(function (error) { generate.textContent = '生成未完成，请检查原文和模型服务后重试'; }); });
  var confirm = Array.from(document.querySelectorAll('button')).find(function (x) { return x.textContent.indexOf('确认最终稿') >= 0; });
  if (confirm) confirm.addEventListener('click', function () { state.rewrite.confirmed = true; state.rewrite.status = 'confirmed'; state.expressionRules.sampleCount += 1; save(); confirm.textContent = '已确认最终稿'; });
  var finalEditor=document.querySelector('[data-final-editor]'); if(finalEditor){finalEditor.value=state.rewrite.final||state.rewrite.candidate||''; finalEditor.addEventListener('input',function(){state.rewrite.final=finalEditor.value;state.rewrite.status='edited';save();});}
   bindForm('[data-doc-form]',function(d){state.documents.push({id:String(Date.now()),name:d.get('name'),meta:d.get('category'),format:d.get('format')||'txt',content:d.get('content'),chapters:[],status:'启用'});}); list('documents','[data-documents]',['name','meta']);
  if(document.title.indexOf('文档资料')>=0&&!document.querySelector('[data-doc-form]')){document.querySelector('main').insertAdjacentHTML('beforeend','<form class="panel inline-form" data-doc-form><h2>新增文本或 Markdown 资料</h2><input name="name" placeholder="资料名称" required><input name="category" placeholder="分类" required><textarea name="content" placeholder="资料内容" required></textarea><button class="btn primary">保存资料</button></form><section class="panel" data-documents></section>');}
  if(document.title.indexOf('多行业多场景')>=0&&!document.querySelector('[data-context-form]')){document.querySelector('main').insertAdjacentHTML('beforeend','<form class="panel inline-form" data-context-form><h2>创建自定义行业 / 场景</h2><input name="industry" placeholder="行业" required><input name="name" placeholder="场景名称" required><input name="description" placeholder="场景说明" required><button class="btn primary">保存场景</button></form><section class="cards" data-contexts></section>');}
  if(document.title.indexOf('方案语言')>=0&&!document.querySelector('[data-rule-form]')){document.querySelector('main').insertAdjacentHTML('beforeend','<form class="panel inline-form" data-rule-form><h2>新增方案语言规则</h2><input name="name" placeholder="规则名称" required><input name="version" placeholder="版本" required><textarea name="text" placeholder="规则内容" required></textarea><button class="btn primary">保存规则</button></form><section class="panel" data-rules></section>');}
   function setupContexts() {
     var host=document.querySelector('[data-contexts]'); if(!host)return;
     var entries=state.industries.entries=state.industries.entries||[];
     if(!entries.length) entries=[{id:'default-1',name:'招商运营提案',industry:'地产',meta:'地产 · 强调业态关系、客流承接与经营结果。',status:'启用'},{id:'default-2',name:'品牌定位复盘',industry:'品牌',meta:'品牌 · 强调用户洞察、差异化和传播落点。',status:'启用'},{id:'default-3',name:'团队共识沟通',industry:'组织',meta:'组织 · 强调事实、行动与责任边界。',status:'启用'}];
     state.industries.entries=entries;
     var type='all',status='all';
     function render(){host.innerHTML=entries.filter(function(x){return (type==='all'||x.industry===type)&&(status==='all'||x.status===status);}).map(function(x){return '<article class="panel" data-context-id="'+x.id+'"><span class="tag">'+x.industry+'</span><input class="context-name" value="'+x.name.replace(/"/g,'&quot;')+'" aria-label="条目名称"><p>'+x.meta.split(' · ').slice(1).join(' · ')+'</p><button class="btn" data-context-toggle>'+x.status+'</button></article>';}).join('')||'<p>暂无匹配条目。</p>';host.querySelectorAll('[data-context-toggle]').forEach(function(b){b.onclick=function(){var x=entries.find(function(i){return i.id===b.closest('[data-context-id]').dataset.contextId;});x.status=x.status==='启用'?'停用':'启用';save();render();};});host.querySelectorAll('.context-name').forEach(function(input){input.onchange=function(){var x=entries.find(function(i){return i.id===input.closest('[data-context-id]').dataset.contextId;});if(input.value.trim()){x.name=input.value.trim();save();}};});}
     document.querySelectorAll('[data-context-type]').forEach(function(b){b.onclick=function(){type=b.dataset.contextType;document.querySelectorAll('[data-context-type]').forEach(function(x){x.classList.toggle('active',x===b);});render();};});
     document.querySelectorAll('[data-context-status]').forEach(function(b){b.onclick=function(){status=b.dataset.contextStatus;document.querySelectorAll('[data-context-status]').forEach(function(x){x.classList.toggle('active',x===b);});render();};});
     bindForm('[data-context-form]',function(d){var item={id:String(Date.now()),name:d.get('name'),industry:d.get('industry'),scenario:d.get('name'),meta:d.get('industry')+' · '+d.get('description'),status:'启用'};entries.push(item);fetch('/api/contexts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(item)}).catch(function(){});render();});
     render();
   }
   setupContexts();
   bindForm('[data-doc-form]',function(d){state.documents.push({id:String(Date.now()),name:d.get('name'),meta:d.get('category'),content:d.get('content'),status:'启用'});}); list('documents','[data-documents]',['name','meta']);
   function setupDocumentExport() { if (document.title.indexOf('文档资料') < 0 || document.querySelector('[data-document-export]')) return; var host=document.querySelector('main'), panel=document.createElement('section'); panel.className='panel'; panel.dataset.documentExport='true'; panel.innerHTML='<h2>导出资料</h2><p data-export-info>按章节顺序合并资料，保存为 Markdown 文本文件。</p><button class="btn primary" data-export-markdown>保存资料到本机</button>'; host.appendChild(panel); var info=panel.querySelector('[data-export-info]'), button=panel.querySelector('[data-export-markdown]'); function markdown(){ var docs=state.documents||[], chapters=state.documentChapters||[]; return docs.map(function(doc){ var parts=chapters.filter(function(ch){return !ch.documentId||ch.documentId===doc.id;}); var body=parts.length?parts.sort(function(a,b){return (a.order||0)-(b.order||0);}).map(function(ch){return '## '+(ch.title||'未命名章节')+'\n\n'+(ch.content||'');}).join('\n\n'):(doc.content||''); return '# '+(doc.name||'未命名文档')+'\n\n'+body; }).join('\n\n---\n\n'); } button.onclick=function(){ var exportedAt=new Date().toISOString(), fileName='personal-expression-documents-'+exportedAt.slice(0,10)+'.md', content=markdown()||'# 文档资料\n\n暂无可导出的文档。'; state.exportRecords=state.exportRecords||[]; state.exportRecords.push({id:String(Date.now()),fileName:fileName,exportedAt:exportedAt,documentCount:(state.documents||[]).length}); save(); var link=document.createElement('a'); link.href=URL.createObjectURL(new Blob([content],{type:'text/markdown;charset=utf-8'})); link.download=fileName; link.click(); URL.revokeObjectURL(link.href); info.textContent='已导出 '+fileName+' · '+new Date(exportedAt).toLocaleString(); }; }
   setupDocumentExport();
   bindForm('[data-rule-form]',function(d){var item={id:String(Date.now()),name:d.get('name'),statement:d.get('text'),priority:Number(d.get('priority'))||0,meta:'v'+d.get('version')+' · '+d.get('text'),status:'启用'};state.rules.push(item);fetch('/api/rules',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(item)}).catch(function(){});}); list('rules','[data-rules]',['name','meta']);
  bindForm('[data-rule-form]',function(d){state.rules.push({id:String(Date.now()),name:d.get('name'),meta:'v'+d.get('version')+' · '+d.get('text'),status:'启用'});}); list('rules','[data-rules]',['name','meta']);
  document.querySelectorAll('[data-lock-facts]').forEach(function(b){b.onclick=function(){state.diagnosis.factsLocked=!state.diagnosis.factsLocked;save();b.textContent=state.diagnosis.factsLocked?'事实已锁定':'锁定事实';};});
   bindForm('[data-comment-form]',function(d){state.comments.push({id:String(Date.now()),name:'审核评论',meta:d.get('text'),status:'待审核'});});
  function setupTeamReview() {
    var list = document.querySelector('[data-review-list]');
    if (!list) return;
    state.teamReviews = state.teamReviews || {};
    state.reviewHistory = state.reviewHistory || [];
    function persist() { save(); renderHistory(); }
    function renderHistory() {
      var host = document.querySelector('[data-review-history]');
      if (!host) return;
      host.innerHTML = state.reviewHistory.length ? state.reviewHistory.slice().reverse().map(function (item) { return '<div class="entry"><b>' + item.title + '</b><p>' + item.status + ' · ' + new Date(item.updatedAt).toLocaleString() + (item.comment ? ' · ' + item.comment : '') + '</p></div>'; }).join('') : '<p>暂无审核记录。</p>';
    }
    list.querySelectorAll('.entry').forEach(function (row) {
      var id = row.dataset.reviewId, item = state.teamReviews[id] || { status: '待审核', comments: [] };
      state.teamReviews[id] = item;
      var status = row.querySelector('[data-review-status]'), comments = row.querySelector('[data-review-comments]');
      status.textContent = item.status; status.dataset.reviewStatus = item.status;
      comments.innerHTML = item.comments.map(function (text) { return '<p class="sub">审核评论：' + text + '</p>'; }).join('');
      status.onclick = function () { item.status = item.status === '已通过' ? '待审核' : '已通过'; state.reviewHistory.push({ title: row.querySelector('h2').textContent, status: item.status, updatedAt: new Date().toISOString() }); persist(); status.textContent = item.status; };
      row.querySelector('[data-review-comment]').onsubmit = function (event) { event.preventDefault(); var text = row.querySelector('textarea').value.trim(); if (!text) return; item.comments.push(text); state.reviewHistory.push({ title: row.querySelector('h2').textContent, status: item.status, comment: text, updatedAt: new Date().toISOString() }); row.querySelector('textarea').value = ''; persist(); comments.innerHTML = item.comments.map(function (comment) { return '<p class="sub">审核评论：' + comment + '</p>'; }).join(''); };
    });
    document.querySelector('[data-review-batch]').onclick = function () { list.querySelectorAll('[data-review-select]:checked').forEach(function (check) { var row = check.closest('.entry'), item = state.teamReviews[row.dataset.reviewId]; item.status = '已通过'; state.reviewHistory.push({ title: row.querySelector('h2').textContent, status: item.status, updatedAt: new Date().toISOString() }); row.querySelector('[data-review-status]').textContent = item.status; check.checked = false; }); persist(); };
    renderHistory();
  }
  setupTeamReview();
  function setupFramework() {
    var host = document.querySelector('[data-framework-nodes]');
    if (!host) return;
    var form = document.querySelector('[data-framework-form]');
    var status = document.querySelector('[data-framework-status]');
    var versions = state.industries.frameworkVersions = state.industries.frameworkVersions || [];
    var nodes = state.industries.frameworks = state.industries.frameworks || [];
    if (!nodes.length) {
      ['先给出项目判断', '补充市场与客群依据', '落到业态与运营动作', '避免空泛宣传表达'].forEach(function (name, index) {
        nodes.push({ id: 'framework-' + index, name: name, description: '', priority: ['高优先级', '中优先级', '中优先级', '低优先级'][index] });
      });
    }
    function persist(message) {
      try { store.save(); status.textContent = message; return true; }
      catch (error) { status.textContent = '保存失败，请检查浏览器存储空间后重试。'; return false; }
    }
    function render() {
      host.replaceChildren();
      nodes.forEach(function (node, index) {
        var row = document.createElement('div');
        row.className = 'entry framework-node';
        row.innerHTML = '<div class="toolbar"><b></b><span class="tag"></span></div><label>节点名称<input name="name" required></label><label>节点说明<textarea name="description" rows="3"></textarea></label><div class="tabs"><button type="button" class="btn" data-move="-1">上移</button><button type="button" class="btn" data-move="1">下移</button></div>';
        row.querySelector('b').textContent = String(index + 1).padStart(2, '0');
        row.querySelector('.tag').textContent = node.priority || '中优先级';
        row.querySelector('input').value = node.name || '';
        row.querySelector('textarea').value = node.description || '';
        row.querySelectorAll('input, textarea').forEach(function (field) {
          field.addEventListener('input', function () {
            field.setCustomValidity(field.name === 'name' && !field.value.trim() ? '请输入节点名称' : '');
            node[field.name] = field.value;
            persist('修改已保存到本地草稿');
          });
        });
        row.querySelectorAll('[data-move]').forEach(function (button) {
          var target = index + Number(button.dataset.move);
          button.disabled = target < 0 || target >= nodes.length;
          button.addEventListener('click', function () {
            if (target < 0 || target >= nodes.length) return;
            nodes.splice(target, 0, nodes.splice(index, 1)[0]);
            persist('节点顺序已保存到本地草稿');
            render();
          });
        });
        host.appendChild(row);
      });
    }
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var name = form.elements.name.value.trim();
      if (!name) { form.elements.name.setCustomValidity('请输入节点名称'); form.elements.name.reportValidity(); return; }
      nodes.push({ id: 'framework-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8), name: name, description: form.elements.description.value, priority: '中优先级' });
      render();
      form.reset();
      persist('节点已新增并保存到本地草稿');
    });
    form.elements.name.addEventListener('input', function () { this.setCustomValidity(''); });
    document.querySelector('[data-framework-save]').addEventListener('click', function () {
      var invalid = Array.from(host.querySelectorAll('input')).find(function (field) { return !field.value.trim(); });
      if (invalid) { invalid.setCustomValidity('请输入节点名称'); invalid.reportValidity(); return; }
      var version = { version: versions.length + 1, savedAt: new Date().toISOString(), nodes: JSON.parse(JSON.stringify(nodes)) };
      versions.push(version);
      if (!persist('已保存版本 v' + version.version + ' · ' + new Date(version.savedAt).toLocaleString())) versions.pop();
    });
    render();
    persist(versions.length ? '最近保存版本 v' + versions[versions.length - 1].version : '框架草稿已保存到本地');
  }
  setupFramework();
  var sample = Array.from(document.querySelectorAll('button')).find(function (x) { return x.textContent.indexOf('保存为样本') >= 0 || x.textContent.indexOf('添加表达样本') >= 0; });
  if (sample) sample.addEventListener('click', function () { state.expressionRules.sampleCount += 1; save(); sample.textContent = '样本已保存'; });
  document.querySelectorAll('.issue').forEach(function (issue) { issue.addEventListener('click', function () { document.querySelectorAll('.issue').forEach(function (x) { x.style.background = ''; }); issue.style.background = '#fff8df'; }); });
  document.querySelectorAll('.search').forEach(function (input) { input.addEventListener('input', function () { document.querySelectorAll('.entry').forEach(function (entry) { entry.hidden = !!input.value && entry.textContent.toLowerCase().indexOf(input.value.toLowerCase()) < 0; }); }); });
  document.querySelectorAll('[data-filter]').forEach(function (button) { button.addEventListener('click', function () { document.querySelectorAll('[data-filter]').forEach(function (x) { x.classList.remove('active'); }); button.classList.add('active'); var value = button.dataset.filter; document.querySelectorAll('[data-category]').forEach(function (item) { item.hidden = value !== 'all' && item.dataset.category !== value; }); }); });
  document.querySelectorAll('[data-toggle-status]').forEach(function (button) { button.addEventListener('click', function () { var enabled = button.dataset.toggleStatus === 'on'; var next = enabled ? '已启用' : '已发布'; button.dataset.toggleStatus = enabled ? 'off' : 'on'; button.textContent = next; button.classList.toggle('active'); var row = button.closest('.entry, .panel'); var label = row && row.querySelector('h2'); var collection = document.title.indexOf('发布') >= 0 ? state.releases : (document.title.indexOf('审核') >= 0 ? state.reviews : state.documents); collection.push({ name: label ? label.textContent : document.title, status: next, updatedAt: new Date().toISOString() }); save(); }); });
   document.querySelectorAll('[data-priority]').forEach(function (button) { button.addEventListener('click', function () { var row = button.closest('[data-priority-row]'); if (row) { row.parentNode.prepend(row); var id=row.dataset.id, item=(state.rules||[]).find(function(x){return x.id===id;}); if(item){item.priority=(state.rules.length||1);save();fetch('/api/rules/'+id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({priority:item.priority})}).catch(function(){});}} }); });
   setupPublish();
   document.querySelectorAll('[data-task-retry]').forEach(function (b) { b.onclick = function () { fetch('/api/tasks/'+b.dataset.taskRetry+'/retry', { method: 'POST' }).then(function(r){return r.json();}).then(function(x){b.textContent='重试任务 '+x.taskId;}); }; });
   syncState();
 })();
