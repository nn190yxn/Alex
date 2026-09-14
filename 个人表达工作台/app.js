(function () {
  'use strict';
  var store = window.ExpressionStore;
  if (!store) {
    var fallbackKey = 'expression-workbench-state';
    var fallback = { schemaVersion: 8, theme: 'blue', rewrite: { source: '', candidate: '', final: '', status: 'draft', confirmed: false, scenario: '', audiences: [] }, expressionRules: { sampleCount: 0 }, industries: { activeContext: '地产', entries: [], frameworks: [], presets: [] }, audiences: [], documents: [], documentProjects: [], documentChapters: [], exportRecords: [], rules: [], comments: [], diagnosis: { factsLocked: false }, releases: [], reviews: [] };
    try { var old = JSON.parse(localStorage.getItem(fallbackKey) || localStorage.getItem('expression-workbench-mvp') || 'null'); if (old) { fallback.theme = old.theme || fallback.theme; fallback.rewrite.source = old.source || ''; fallback.rewrite.candidate = old.candidate || ''; fallback.rewrite.final = old.final || ''; fallback.rewrite.confirmed = old.confirmed === true; fallback.rewrite.status = fallback.rewrite.confirmed ? 'confirmed' : (fallback.rewrite.candidate ? 'generated' : 'draft'); fallback.expressionRules.sampleCount = Number(old.samples) || 0; } } catch (e) {}
    if (old && old.schemaVersion >= 2) Object.assign(fallback, old);
    store = window.ExpressionStore = { state: fallback, save: function () { localStorage.setItem(fallbackKey, JSON.stringify(fallback)); } };
  }
   var state = store.state;
   var syncBanner;
    var RETIRED_SKILL_IDS = { 'skill-qingtaolu': 'skill-humanizer-zh', 'skill-zhongwenquqiang': 'skill-humanizer-zh', '清套路': 'skill-humanizer-zh', '中文去腔': 'skill-humanizer-zh' };
    function mapRetiredSkillIds(ids) {
      var seen = {};
      var out = [];
      (ids || []).forEach(function (id) {
        var mapped = RETIRED_SKILL_IDS[id] || id;
        if (mapped && !seen[mapped]) { seen[mapped] = true; out.push(mapped); }
      });
      return out;
    }
   function banner(kind, text) {
      if (!syncBanner) {
        syncBanner = document.createElement('div');
        syncBanner.setAttribute('role', 'status');
        syncBanner.style.cssText = 'position:fixed;right:24px;top:16px;z-index:40;max-width:280px;padding:10px 14px;border-radius:10px;background:#fff;border:1px solid var(--line,#e5eaf2);box-shadow:0 8px 24px #1f2f4d14;font-size:13px;color:var(--muted,#718096);opacity:0;transition:opacity .2s;pointer-events:none';
        document.body.appendChild(syncBanner);
      }
      if (!text) { syncBanner.style.opacity = '0'; return; }
      syncBanner.textContent = text;
      syncBanner.dataset.state = kind;
      syncBanner.style.opacity = '1';
      clearTimeout(banner.timer);
      if (kind !== 'error') banner.timer = setTimeout(function () { syncBanner.style.opacity = '0'; }, 1600);
    }
    function request(method, path, body) {
      return fetch(path, { method: method, headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (result) { if (!response.ok) throw new Error('操作未完成，请检查填写内容和访问权限后重试。'); return result; });
      });
    }
    function syncState() {
      if (!window.fetch) return Promise.resolve();
      return request('GET', '/api/state').then(function (remote) {
        var theme = readStoredTheme();
        Object.keys(remote || {}).forEach(function (key) { state[key] = remote[key]; });
        if (theme) state.theme = theme;
        applyTheme(state.theme);
        store.save();
        if (remote && remote.theme !== state.theme) save();
      }).catch(function () { banner('error', '服务暂不可用，当前使用本机草稿'); });
    }
   state.industries = state.industries || { activeContext: '地产', entries: [], frameworks: [] };
   state.documents = state.documents || []; state.rules = state.rules || []; state.comments = state.comments || [];
     var saveTimer;
     function save(options) {
       store.save();
       if (!window.fetch) return;
       var notify = options && options.notify;
       request('PUT', '/api/state', state).then(function () {
         if (notify) banner('success', '资料已保存并同步');
       }).catch(function () { banner('error', '同步失败，草稿已保存到本机'); });
     }
     function saveSoon() {
       clearTimeout(saveTimer);
       saveTimer = setTimeout(function () { save(); }, 400);
     }
   function resource(method, path, body, fallback) { return request(method, path, body).catch(function (error) { if (fallback) fallback(); banner('error', '操作未完成，草稿已保存到本机'); throw error; }); }
    function bindForm(selector, handler) { var f=document.querySelector(selector); if(!f)return; f.addEventListener('submit',function(e){e.preventDefault();handler(new FormData(f));f.reset();save();location.reload();}); }
    function esc(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]; }); }
    function skillLayer(skill) {
      var id = skill && skill.id;
      if (id === 'skill-shuorenhua' || id === 'skill-qinggaibaojiegou') return '口气';
      return '去 AI';
    }
    var STYLE_DIMENSIONS = [
      { id: 'stance', name: '立场与人称', hint: '我方、客观陈述、去自夸' },
      { id: 'wording', name: '用词', hint: '行业术语、禁用词、动词精准、感情色彩' },
      { id: 'syntax', name: '句式', hint: '长短、整散、主动被动、肯定否定' },
      { id: 'order', name: '语序与焦点', hint: '先结论还是先背景、信息落点' },
      { id: 'rhetoric', name: '修辞', hint: '排比、引用、数字对比、比喻' },
      { id: 'rhythm', name: '节奏与详略', hint: '场景段展开、判断段精简、表格紧凑' },
      { id: 'discourse', name: '篇章与标题', hint: '章标题、结论先行、分层顺序' },
      { id: 'facts', name: '数字与专名', hint: '数字、专名按原文锁定' },
      { id: 'boundary', name: '边界与反例', hint: '哪些「最/唯一」保留、哪些词中性不动' }
    ];
    var LEGACY_LAYER_MAP = { '标题和判断': '篇章与标题', '用词和口径': '用词', '叙事顺序': '语序与焦点' };
    var LEGACY_RULE_DIMENSION = {
      '克制不张扬': 'boundary',
      '事实自己说话': 'boundary',
      '结论先行': 'discourse',
      '标题即判断': 'discourse',
      '先立标杆再说落地': 'order',
      '用我方': 'stance',
      '分工思维': 'stance',
      '定位表述': 'stance',
      '行话能去就去': 'wording',
      '转折改陈述': 'syntax'
    };
    function dimensionName(id) {
      var hit = STYLE_DIMENSIONS.filter(function (d) { return d.id === id; })[0];
      return hit ? hit.name : '';
    }
    function classifyRuleDimension(rule) {
      var name = String(rule && rule.name || '');
      if (LEGACY_RULE_DIMENSION[name]) return LEGACY_RULE_DIMENSION[name];
      var text = name + ' ' + String(rule && (rule.statement || rule.text || rule.meta) || '');
      if (/标题|每页结构|结论先行|分层|目录|篇章/.test(text)) return 'discourse';
      if (/叙事|顺序|标杆|先.*再.*最后/.test(text)) return 'order';
      if (/但是|然而|不过|转折|断句|长句|短句|整句|散句|句式/.test(text)) return 'syntax';
      if (/最|第一|唯一|独有|核心优势|复制不了|事实自己说话|留有余地|底线|克制|自夸/.test(text)) return 'boundary';
      if (/数字|专名|原文|面积|租金|千分位|引用/.test(text)) return 'facts';
      if (/排比|引用|比喻|修辞/.test(text)) return 'rhetoric';
      if (/我方|我们|定位|竞品|同类项目|分工|协同|对外|对内|称呼/.test(text)) return 'stance';
      if (/节奏|详略|展开|精简|场景段/.test(text)) return 'rhythm';
      return 'wording';
    }
    function habitLayer(rule) {
      if (rule && rule.dimension && dimensionName(rule.dimension)) return dimensionName(rule.dimension);
      if (rule && rule.layer && LEGACY_LAYER_MAP[rule.layer]) return LEGACY_LAYER_MAP[rule.layer];
      return dimensionName(classifyRuleDimension(rule)) || '用词';
    }
    var STYLE_SCAN_RULES = [
      { dimension: 'wording', pattern: /(引擎|闭环|赋能|抓手|打法|打造|矩阵)/g, replace: function (m) { return ({ '引擎': '业态', '闭环': '联动', '赋能': '带动', '抓手': '切入点', '打法': '策略', '打造': '建设', '矩阵': '集群' })[m]; }, note: '行话换常用词' },
      { dimension: 'syntax', pattern: /(但是|然而|不过)/g, replace: function (m) { return ({ '但是': '也', '然而': '同时', '不过': '并' })[m]; }, note: '转折改陈述，或拆成两句' },
      { dimension: 'stance', pattern: /我们|竞品|抢客流/g, replace: function (m) { return ({ '我们': '我方', '竞品': '同类项目', '抢客流': '客源分流' })[m]; }, note: '用「我方」；「竞品」写「同类项目」' },
      { dimension: 'boundary', pattern: /(最大的|唯一的|第一|唯一|独有|核心优势|复制不了|最好|最强)/g, replace: null, note: '绝对化或自夸，去掉或改成客观数据' },
      { dimension: 'facts', pattern: /\d[\d,.]*\s*(?:万方|万平方米|万|亿|平方米|方|%|％|元|人)/g, replace: null, note: '数字按原文锁定，不改写' }
    ];
    function styleScanFindings(text) {
      var out = [];
      STYLE_SCAN_RULES.forEach(function (rule) {
        var re = new RegExp(rule.pattern.source, 'g');
        var m;
        while ((m = re.exec(text))) {
          out.push({ dimension: rule.dimension, from: m[0], suggest: rule.replace ? rule.replace(m[0]) : '', note: rule.note, replace: rule.replace, index: m.index });
          if (m.index === re.lastIndex) re.lastIndex += 1;
        }
      });
      text.split(/[。！？\n]+/).forEach(function (sentence) {
        var s = sentence.trim();
        if (s.length >= 45) out.push({ dimension: 'rhythm', from: s.slice(0, 36) + '…', suggest: '', note: '一句话太长，拆成一句一个判断', replace: null, index: text.indexOf(s) });
      });
      out.forEach(function (f, i) { f._i = i; });
      return out;
    }
    function styleApplyFindings(text, findings) {
      var checked = (findings || []).slice().sort(function (a, b) { return b.index - a.index; });
      var changed = 0;
      var skipped = 0;
      checked.forEach(function (f) {
        if (!f.replace) { skipped += 1; return; }
        text = text.slice(0, f.index) + f.replace(f.from) + text.slice(f.index + f.from.length);
        changed += 1;
      });
      return { text: text, changed: changed, skipped: skipped };
    }
    function recordStyleRule(dimension, from, to, note) {
      var statement = (note ? (note + '：') : '') + (from || '') + (to ? (' → ' + to) : '');
      var body = { name: statement.slice(0, 24), statement: statement, dimension: dimension || 'wording', before: from || '', after: to || '', reviewStatus: 'pending', status: 'active', confirmed: false, source: '顺手改' };
      return request('POST', '/api/rules', body).then(function (saved) {
        var list = (state.rules || []).filter(function (r) { return r.id !== (saved && saved.id); });
        if (saved && saved.id) list.push(saved);
        state.rules = list;
        try { store.save(); } catch (e) {}
        return saved;
      });
    }
    function groupBy(list, keyFn, order) {
      var groups = [];
      var map = {};
      (list || []).forEach(function (item) {
        var key = keyFn(item);
        if (!map[key]) { map[key] = []; groups.push(key); }
        map[key].push(item);
      });
      if (order && order.length) groups.sort(function (a, b) {
        var ia = order.indexOf(a); var ib = order.indexOf(b);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      });
      return groups.map(function (key) { return { name: key, items: map[key] }; });
    }
    function foldGroup(name, count, body, opts) {
      var options = opts || {};
      var open = options.open !== false;
      var key = options.key ? ('expression-fold:' + options.key + ':' + name) : '';
      if (key) {
        var stored = null;
        try { stored = localStorage.getItem(key); } catch (e) {}
        if (stored === '0') open = false;
        else if (stored === '1') open = true;
      }
      return '<details class="catalog-group fold-group"' + (open ? ' open' : '') + (key ? ' data-fold-key="' + esc(key) + '"' : '') + '><summary><span>' + esc(name) + '</span><small>' + esc(count) + '</small></summary><div class="fold-body">' + body + '</div></details>';
    }
    document.addEventListener('toggle', function (event) {
      var node = event.target;
      if (!node || node.tagName !== 'DETAILS' || !node.hasAttribute('data-fold-key')) return;
      try { localStorage.setItem(node.getAttribute('data-fold-key'), node.open ? '1' : '0'); } catch (e) {}
    }, true);
    function list(key, target, fields) { var host=document.querySelector(target); if(!host)return; var source=state[key]||[]; host.innerHTML=source.map(function(x){return '<div class="entry"><h2>'+esc(x[fields[0]])+'</h2><p>'+esc(x[fields[1]])+' · '+esc(x.status||'启用')+'</p><button class="btn" data-item="'+esc(x.id)+'">切换状态</button></div>';}).join('')||'<p>暂无自定义内容。</p>'; host.querySelectorAll('[data-item]').forEach(function(b){b.onclick=function(){var x=source.find(function(i){return i.id===b.dataset.item;});x.status=x.status==='启用'?'停用':'启用';save();location.reload();};}); }
   function setupPublish() { var box=document.querySelector('[data-preview]'); if(!box)return; var r=state.expressionRules||{},i=state.industries||{},w=state.rewrite||{},v='1.'+(r.confirmedCount||0)+'.'+(r.sampleCount||0),text=w.final||w.candidate||'未填写'; var md='# 个人表达规则\n\n版本: '+v+'\n适用行业: '+(i.activeContext||'未配置')+'\n\n## 已确认表达\n\n'+text+'\n\n## 行业资料\n\n'+JSON.stringify(i.entries||[])+'\n\n## 写作场景\n\n'+JSON.stringify(i.frameworks||[])+'\n\n## 写作要求\n\n- 保留原意与个人语气。\n- 信息不足时标记待确认。\n',prompt='你是个人表达助手。适用行业：'+(i.activeContext||'未配置')+'；已确认规则：'+(r.confirmedCount||0)+' 条；表达基准：'+text+'。保留原意与个人语气，只输出可直接使用的结果。'; document.querySelector('[data-preview="markdown"]').textContent=md;document.querySelector('[data-preview="prompt"]').textContent=prompt;document.querySelector('[data-version]').textContent='v'+v;document.querySelector('[data-export-summary]').textContent=(r.confirmedCount||0)+' 条已确认规则 · '+(i.activeContext||'未配置'); document.querySelectorAll('[data-copy]').forEach(function(b){b.onclick=function(){navigator.clipboard.writeText(b.dataset.copy==='markdown'?md:prompt);b.textContent='已复制';};}); document.querySelectorAll('[data-download]').forEach(function(b){b.onclick=function(){var mdType=b.dataset.download==='markdown',a=document.createElement('a');a.href=URL.createObjectURL(new Blob([mdType?md:prompt],{type:'text/plain'}));a.download=mdType?'personal-expression-skill.md':'personal-expression-lite-prompt.txt';a.click();resource('POST','/api/exports',{versionId:v,format:mdType?'markdown':'prompt'}).catch(function(){});};}); document.querySelector('[data-release]').onclick=function(){state.releases=state.releases||[];state.releases.push({name:'个人表达规则',version:v,status:'已发布',updatedAt:new Date().toISOString(),markdown:md,prompt:prompt});save();resource('POST','/api/releases',{versionId:v,note:'个人表达规则'}).catch(function(){});document.querySelector('[data-release-status]').textContent='已发布';this.textContent='已发布当前版本';}; }
   var THEME_KEY = 'expression-workbench-theme';
   function readStoredTheme() {
     try {
       var stored = localStorage.getItem(THEME_KEY);
       if (stored) return stored;
     } catch (e) {}
     return state.theme || 'blue';
   }
   function applyTheme(theme) {
     var next = theme || readStoredTheme() || 'blue';
     if (['blue', 'orange', 'purple'].indexOf(next) < 0) next = 'blue';
     state.theme = next;
     document.documentElement.dataset.theme = next;
     document.body.dataset.theme = next;
     try { localStorage.setItem(THEME_KEY, next); } catch (e2) {}
     document.querySelectorAll('[data-set]').forEach(function (button) {
       button.classList.toggle('active', button.dataset.set === next);
     });
   }
    applyTheme(readStoredTheme());
   document.querySelectorAll('[data-set]').forEach(function (button) {
     button.addEventListener('click', function () { applyTheme(button.dataset.set); save(); });
   });
      var NAV_ICONS = {
        edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
        layers: '<path d="M12 2 3 7l9 5 9-5-9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
        file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
        list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
        feed: '<path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/>',
        book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
        quote: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
        case: '<path d="M2 7h20v13H2z"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>',
        text: '<path d="M17 10H3M21 6H3M21 14H3M17 18H3"/>',
        sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
        target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
        users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
        send: '<path d="M22 2 11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7Z"/>'
      };
      function navIcon(name) {
        var body = NAV_ICONS[name];
        if (!body) return '';
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
      }
      var navGroups = [
        { name: '写作', items: [
          { name: '改一稿', href: 'rewrite.html', icon: 'edit' },
          { name: '写法包', href: 'skills.html', icon: 'layers' },
          { name: '项目材料', href: 'documents.html', icon: 'file' },
          { name: '方案目录', href: 'framework.html', icon: 'list' }
        ]},
        { name: '行业', items: [
          { name: '资讯', href: 'industry.html', icon: 'feed' },
          { name: '术语', href: 'terms.html', icon: 'book' },
          { name: '常用语', href: 'phrases.html', icon: 'quote' },
          { name: '案例', href: 'cases.html', icon: 'case' }
        ]},
        { name: '个人', items: [
          { name: '语料', href: 'voice.html', icon: 'text' },
          { name: '用词习惯', href: 'habits.html', icon: 'sliders' },
          { name: '我的写法', href: 'calibration.html', icon: 'target' }
        ]},
        { name: '协作', items: [
          { name: '同事看稿', href: 'team.html', icon: 'users' },
          { name: '发布中心', href: 'publish.html', icon: 'send' }
        ]}
      ];
      var CASE_TYPES = [
        { id: 'nonstandard', name: '非标商业' },
        { id: 'curated', name: '策展式商业' },
        { id: 'cluster', name: '集中商业' },
        { id: 'department', name: '传统百货' }
      ];
      var catalog = {};
      navGroups.forEach(function (group) {
        group.items.forEach(function (item) { catalog[item.name] = item; });
      });
      var currentPage = (location.pathname.split('/').pop() || 'index.html');
      document.querySelectorAll('.side .nav, .side nav').forEach(function (nav) {
        var typeParam = new URLSearchParams(location.search).get('type') || '';
        nav.innerHTML = navGroups.map(function (group) {
          return '<div class="nav-group"><div class="nav-group-title">' + group.name + '</div>' + group.items.map(function (item) {
            var on = item.href === currentPage;
            var html = '<button class="' + (on ? 'active on' : '') + '" data-href="' + item.href + '"><span class="nav-ic">' + navIcon(item.icon) + '</span><span>' + item.name + '</span></button>';
            if (item.name === '案例') {
              html += CASE_TYPES.map(function (type) {
                var typeOn = currentPage === 'cases.html' && typeParam === type.id;
                return '<button class="nav-type' + (typeOn ? ' active on' : '') + '" data-href="cases.html?type=' + type.id + '"><span>' + type.name + '</span></button>';
              }).join('');
            }
            return html;
          }).join('') + '</div>';
        }).join('');
      });
     document.querySelectorAll('.logo').forEach(function (logo) {
       logo.style.cursor = 'pointer';
       var title = logo.querySelector('b') || Array.prototype.filter.call(logo.querySelectorAll('span'), function (el) { return el.className.indexOf('mark') < 0; })[0];
       if (title) title.textContent = '商业运营工作台';
       logo.addEventListener('click', function () { location.href = 'index.html'; });
     });
     document.querySelectorAll('.nav button, nav button').forEach(function (item) {
       var href = item.getAttribute('data-href');
       if (!href) {
         var name = Object.keys(catalog).find(function (x) { return item.textContent.indexOf(x) >= 0; });
         href = name && catalog[name].href;
       }
       if (href) item.addEventListener('click', function () { location.href = href; });
     });
    var generate = document.querySelector('[data-rewrite-board]') ? null : Array.from(document.querySelectorAll('button')).find(function (x) { return x.textContent.indexOf('出一稿') >= 0 || x.textContent.indexOf('生成改写稿') >= 0; });
      if (generate) generate.addEventListener('click', function () {
        var required = document.getElementById('scene-required');
        if (!state.rewrite.scenario) {
           generate.textContent = '请先选这篇写给谁';
           if (required) required.textContent = '先选给领导汇报还是给客户讲，再出稿。';
          return;
        }
        fetch('/api/rewrite/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source: state.rewrite.source, scenario: state.rewrite.scenario, demoMode: window.llmConfigured ? false : true }) }).then(function (r) { return r.json().then(function (result) { if (!r.ok) throw new Error('这一稿还没出来，请检查原文后再试'); return result; }); }).then(function (result) { state.rewrite.taskId = result.taskId; state.rewrite.status = result.status; save(); generate.textContent = '正在出稿'; var poll = function () { fetch('/api/tasks/'+result.taskId).then(function(r){return r.json();}).then(function(t){if(t.status==='completed'){state.rewrite.candidate=t.data.candidate;state.rewrite.factDiff=t.data.factDiff;state.rewrite.status='generated';save();generate.textContent=(t.data.factDiff&&t.data.factDiff.intact===false)?'稿已出，数字和原文不一致':'稿已出';}else if(t.status==='failed'){generate.textContent='没出成，请检查模型服务后再试';}else setTimeout(poll,300);}); }; poll(); }).catch(function (error) { generate.textContent = '这一稿还没出来，请检查原文后再试'; });
      });
  var confirm = Array.from(document.querySelectorAll('button')).find(function (x) { return x.textContent.indexOf('确认最终稿') >= 0; });
  if (confirm) confirm.addEventListener('click', function () { state.rewrite.confirmed = true; state.rewrite.status = 'confirmed'; state.expressionRules.sampleCount += 1; save(); confirm.textContent = '已确认最终稿'; });
   if((document.title.indexOf('项目材料')>=0)&&!document.querySelector('[data-doc-form]')){document.querySelector('main').insertAdjacentHTML('beforeend','<form class="panel inline-form" data-doc-form><h2>收一份材料</h2><input name="name" placeholder="材料名称，例如：6号馆招商口径" required><input name="category" placeholder="用在哪一块，例如：招商" required><label class="extract-label">或选一个文件（Word、PPT、Excel、PDF、Markdown、txt）<input type="file" data-doc-upload accept=".docx,.pptx,.xlsx,.pdf,.md,.txt"></label><textarea name="content" placeholder="正文。选文件后会自动读进来" required></textarea><button class="btn primary">收进材料</button></form><section class="panel" data-documents></section>');}
   (function setupDocUpload(){ var up=document.querySelector('[data-doc-upload]'); var form=document.querySelector('[data-doc-form]'); if(!up||!form) return; var ta=form.querySelector('textarea[name=content]'); var nameField=form.querySelector('input[name=name]'); up.onchange=function(){ var file=up.files&&up.files[0]; if(!file) return; var reader=new FileReader(); reader.onload=function(){ var base64=String(reader.result||'').split(',')[1]||''; if(nameField&&!nameField.value) nameField.value=file.name.replace(/\.[^.]+$/,''); ta.value='正在读…'; fetch('/api/documents/extract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({filename:file.name,base64:base64})}).then(function(r){return r.json().then(function(d){if(!r.ok)throw new Error(d.error||'读不出来');return d;});}).then(function(d){ta.value=d.text||'';}).catch(function(e){ta.value='';if(window.banner)banner('error',e.message);}); }; reader.readAsDataURL(file); }; })();
    function setupRewriteScenes() {
      var host = document.querySelector('[data-scene-chips]');
      var required = document.getElementById('scene-required');
      var sub = document.querySelector('.title .sub');
      if (sub && document.title.indexOf('改一稿') >= 0) sub.textContent = '先选这篇写给谁：给领导汇报，还是给客户讲。没选之前，正文先不动。';
      var settingTitle = document.querySelector('.layout .panel h2');
      if (settingTitle && (settingTitle.textContent.indexOf('任务设置') >= 0 || settingTitle.textContent.indexOf('这篇怎么写') >= 0)) settingTitle.textContent = '这篇怎么写';
      if (!host) {
        var sceneLabel = Array.from(document.querySelectorAll('.field label')).find(function (label) { return label.textContent.indexOf('写作场景') >= 0 || label.textContent.indexOf('板块与对象') >= 0; });
        if (!sceneLabel) return;
        sceneLabel.textContent = '这篇写给谁';
        var select = sceneLabel.parentNode.querySelector('.select');
        host = document.createElement('div');
        host.className = 'range';
        host.setAttribute('data-scene-chips', '');
        if (select) select.replaceWith(host);
        else sceneLabel.parentNode.appendChild(host);
        var hint = document.createElement('p');
        hint.className = 'hint';
        hint.style.cssText = 'color:var(--muted);font-size:12px;margin:0 0 8px';
         hint.textContent = '招商分对内汇报和对外演讲；运营、营销、沟通各自成稿。';
        host.before(hint);
        required = document.createElement('p');
        required.id = 'scene-required';
        required.setAttribute('role', 'status');
        required.style.cssText = 'color:#b7791f;font-size:12px;margin:8px 0 0';
        host.after(required);
      }
      var scenes = [
        { id: '招商对内汇报', label: '招商 · 对内汇报' },
        { id: '招商对外演讲', label: '招商 · 对外演讲' },
        { id: '运营方案', label: '运营方案' },
        { id: '营销活动方案', label: '营销活动方案' },
        { id: '沟通方案', label: '沟通方案' }
      ];
      state.rewrite = state.rewrite || {};
      host.innerHTML = scenes.map(function (s) {
        return '<button type="button" class="chip' + (state.rewrite.scenario === s.id ? ' active' : '') + '" data-scene="' + s.id + '">' + s.label + '</button>';
      }).join('');
      host.querySelectorAll('[data-scene]').forEach(function (b) {
        b.onclick = function () {
          state.rewrite.scenario = b.dataset.scene;
          save();
          host.querySelectorAll('[data-scene]').forEach(function (x) { x.classList.toggle('active', x === b); });
          if (required) required.textContent = '这篇按「' + b.dataset.scene + '」来写';
          if (generate && generate.textContent.indexOf('请先选') >= 0) generate.textContent = '出一稿';
        };
      });
      if (required && state.rewrite.scenario) required.textContent = '这篇按「' + state.rewrite.scenario + '」来写';
    }
    setupRewriteScenes();
    function setupRewriteBoard() {
      var board = document.querySelector('[data-rewrite-board]');
      if (!board) return;
      state.rewrite = state.rewrite || {};
      state.rewrite.selectedSkillIds = mapRetiredSkillIds(state.rewrite.selectedSkillIds || []);
      var source = document.querySelector('[data-source]');
      var generateBtn = document.querySelector('[data-generate]');
      var statusEl = document.getElementById('generate-status');
      var intentStatus = document.getElementById('intent-status');
      var results = document.querySelector('[data-results]');
      var AUDIENCES = [
        { id: '给政府看', label: '给政府看', hint: '主管单位、评审、备案材料' },
        { id: '给品牌方看', label: '给品牌方看', hint: '品牌方、合作方、招商洽谈' },
        { id: '给内部看', label: '给内部看', hint: '公司内部、领导汇报' }
      ];
      state.rewrite.intents = (state.rewrite.intents || []).filter(function (name) { return AUDIENCES.some(function (a) { return a.id === name; }); });
      if (!state.rewrite.intents.length && state.rewrite.intent) {
        var legacyIntent = { '给领导的工作汇报': '给内部看', '招商对内汇报': '给内部看', '正式项目汇报': '给内部看', '论文': '给内部看', '对外沟通': '给品牌方看', '招商对外演讲': '给品牌方看', '运营方案': '给品牌方看', '营销活动方案': '给品牌方看', '沟通方案': '给品牌方看', '公众号长文': '给品牌方看' }[state.rewrite.intent];
        if (legacyIntent) state.rewrite.intents = [legacyIntent];
      }
      var chips = document.querySelector('[data-intent-chips]');
      chips.innerHTML = AUDIENCES.map(function (a) {
        var on = state.rewrite.intents.indexOf(a.id) >= 0;
        return '<button type="button" class="chip' + (on ? ' active' : '') + '" data-intent="' + a.id + '" title="' + esc(a.hint) + '">' + a.label + '</button>';
      }).join('');
      function syncGenerate() {
        var count = state.rewrite.intents.length;
        generateBtn.disabled = !count;
        generateBtn.textContent = count ? '出稿' : '先选这篇写给谁';
        if (intentStatus) intentStatus.textContent = count ? '这篇写给：' + state.rewrite.intents.join('、') : '先点选这篇写给谁（可多选），再出稿。';
      }
      chips.querySelectorAll('[data-intent]').forEach(function (b) {
        b.onclick = function () {
          var id = b.dataset.intent;
          var list = state.rewrite.intents;
          list = list.indexOf(id) >= 0 ? list.filter(function (x) { return x !== id; }) : list.concat([id]);
          state.rewrite.intents = list;
          b.classList.toggle('active', list.indexOf(id) >= 0);
          save();
          syncGenerate();
        };
      });
      if (source) {
        source.value = state.rewrite.source || '';
        source.addEventListener('input', function () {
          state.rewrite.source = source.value;
          saveSoon();
          scheduleRelated();
          scheduleTaste();
        });
        if (!String(source.value || '').trim()) {
          fetch('/api/rewrite/exercise').then(function (r) { return r.json(); }).then(function (ex) {
            if (!ex || !ex.source || String(source.value || '').trim()) return;
            state.rewrite.source = ex.source;
            source.value = ex.source;
            if (Array.isArray(ex.audience) && ex.audience.length && !state.rewrite.intents.length) {
              state.rewrite.intents = ex.audience.filter(function (name) { return AUDIENCES.some(function (a) { return a.id === name; }); });
              chips.querySelectorAll('[data-intent]').forEach(function (b) { b.classList.toggle('active', state.rewrite.intents.indexOf(b.dataset.intent) >= 0); });
              syncGenerate();
            }
            save();
            var brief = document.querySelector('[data-exercise-brief]');
            if (!brief && source.parentNode) {
              brief = document.createElement('p');
              brief.className = 'sub';
              brief.setAttribute('data-exercise-brief', '');
              source.parentNode.appendChild(brief);
            }
            if (brief) brief.textContent = (ex.title ? ex.title + '。' : '') + (ex.brief || '') + (ex.notes ? ' ' + ex.notes : '') + ' 想换成自己的稿，直接清空重写。';
            if (typeof scheduleRelated === 'function') scheduleRelated();
          }).catch(function () {});
        }
      }
      var relatedEl = document.querySelector('[data-related-list]');
      var relatedTimer;
      var tasteEl = document.querySelector('[data-taste-result]');
      var tasteTimer;
      var briefCache = null;
      var TASTE_LEVEL = { high: '偏重', medium: '中等', low: '轻' };
      function tastePlaceholder(text) {
        if (tasteEl) tasteEl.innerHTML = '<p>' + (text || '贴稿后，这里会列出命中的 AI 腔痕迹。') + '</p>';
      }
      function scheduleTaste() {
        clearTimeout(tasteTimer);
        tasteTimer = setTimeout(runTaste, 500);
      }
      function runTaste() {
        if (!tasteEl) return;
        var text = (source && source.value || '').trim();
        if (text.length < 12) { tastePlaceholder(); return; }
        fetch('/api/rewrite/detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: text, intents: state.rewrite.intents || [] })
        }).then(function (r) {
          return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || '体检失败'); return d; });
        }).then(renderTaste).catch(function (e) { tastePlaceholder(e.message || '体检暂时不可用。'); });
      }
      function renderTaste(d) {
        if (!tasteEl) return;
        briefCache = d.brief || null;
        var head = '<div class="taste-head"><b class="taste-score lv-' + esc(d.level) + '">' + d.score + '</b>' +
          '<span>AI 味' + (TASTE_LEVEL[d.level] || '') + ' · ' + esc(d.summary) + '</span></div>';
        var dims = '<div class="taste-dims">' + (d.dimensions || []).map(function (item) {
          return '<span class="taste-dim' + (item.flagged ? ' on' : '') + '" title="' + esc(item.note) + '">' +
            esc(item.name) + (item.count ? ' ' + item.count : '') + '</span>';
        }).join('') + '</div>';
        var stats = '<p class="sub">共 ' + d.stats.chars + ' 字 / ' + d.stats.sentences + ' 句 · 平均句长 ' +
          d.stats.avgSentence + ' 字 · 最长 ' + d.stats.longestSentence + ' 字 · 套话密度 ' + d.stats.density + '‰</p>';
        var hits = (d.hits || []).length ? (d.hits || []).map(function (hit) {
          return '<div class="entry"><div class="entry-head"><h3>' + esc(hit.name) + ' · ' + hit.count + ' 处</h3>' +
            '<span class="tag">' + esc(hit.dimension) + '</span></div>' +
            '<p>' + hit.samples.map(esc).join('<br>') + '</p>' +
            '<p class="sub">改法：' + esc(hit.fix) + '</p></div>';
        }).join('') : '<p>没撞上常见的 AI 腔痕迹。数字、专名、引用仍按原文。</p>';
        var review = '<div class="taste-review"><h3>发布前人工复核</h3><ul>' +
          (d.review || []).map(function (item) { return '<li>' + esc(item) + '</li>'; }).join('') + '</ul>' +
          '<p class="sub">' + esc(d.whitelist) + '</p></div>';
        tasteEl.innerHTML = head + dims + stats + hits + review + renderBrief(d.brief);
      }
      function renderBrief(brief) {
        if (!brief) return '';
        var items = (brief.checks || []).map(function (item) {
          return '<li class="' + (item.ok ? 'ok' : 'miss') + '"><b>' + esc(item.name) + '</b>' +
            (item.ok ? '：有。' : '：缺。' + esc(item.advice)) + '</li>';
        }).join('');
        return '<div class="brief-box' + (brief.isSlogan ? ' is-slogan' : '') + '">' +
          '<h3>这篇的落点检查</h3><p>' + esc(brief.summary) + '</p><ul>' + items + '</ul>' +
          (brief.slogans.length ? '<p class="sub">口号词：' + brief.slogans.map(esc).join('、') + '</p>' : '') + '</div>';
      }
      function scheduleRelated() {
        clearTimeout(relatedTimer);
        relatedTimer = setTimeout(loadRelated, 400);
      }
      function loadRelated() {
        if (!relatedEl) return;
        var text = (source && source.value || '').trim();
        if (!text) { relatedEl.innerHTML = '<p>贴稿后，这里会列出相关案例和用词。</p>'; return; }
        fetch('/api/industry/links?q=' + encodeURIComponent(text.slice(0, 2000))).then(function (r) { return r.json(); }).then(function (d) {
          var projects = d.projects || [];
          var terms = d.terms || [];
          if (!projects.length && !terms.length) { relatedEl.innerHTML = '<p>这篇还没撞上已收下的案例或用词。</p>'; return; }
          relatedEl.innerHTML = (projects.length ? '<h3>相关案例</h3>' + projects.map(function (item) {
            var types = (item.commercialTypes || []).map(function (id) {
              var hit = CASE_TYPES.filter(function (type) { return type.id === id; })[0];
              return hit ? hit.name : id;
            }).join('、');
            return '<div class="entry"><h2>' + esc(item.name) + '</h2><p>' + esc((item.articleCount ? '出现 ' + item.articleCount + ' 篇' : '已收下') + (types ? ' · ' + types : '')) + '</p><button class="btn" type="button" data-open-related="' + esc(item.id) + '">打开</button></div>';
          }).join('') : '') + (terms.length ? '<h3>相关用词</h3><p>' + terms.slice(0, 12).map(function (item) { return esc(item.term); }).join('、') + '</p>' : '');
          relatedEl.querySelectorAll('[data-open-related]').forEach(function (btn) {
            btn.onclick = function () { location.href = 'cases.html?id=' + encodeURIComponent(btn.getAttribute('data-open-related')); };
          });
        }).catch(function () { relatedEl.innerHTML = '<p>相关案例暂时读不出。</p>'; });
      }
      loadRelated();
      var applyStyle = document.querySelector('[data-apply-style]');
      var applyIndustry = document.querySelector('[data-apply-industry]');
      var packSelect = document.querySelector('[data-industry-pack]');
      var hint = document.getElementById('industry-hint');
      applyStyle.checked = state.rewrite.applyStyle === true;
      applyIndustry.checked = state.rewrite.applyIndustry === true;
      applyStyle.onchange = function () { state.rewrite.applyStyle = applyStyle.checked; save(); };
      applyIndustry.onchange = function () { state.rewrite.applyIndustry = applyIndustry.checked; save(); renderIndustryHint(); };
      function renderIndustryHint() {
        if (!hint) return;
        if (!applyIndustry.checked) { hint.textContent = ''; return; }
        hint.textContent = '出稿时用已收下的行业用词和案例口径。';
      }
      function loadPacks() {
        return fetch('/api/contexts').then(function (r) { return r.json(); }).then(function (list) {
          var packs = Array.isArray(list) ? list : [];
          var current = packs.filter(function (p) { return p.name === '商业运营'; })[0] || packs[0];
          if (current) state.rewrite.industryPackId = current.id;
          if (packSelect) {
            packSelect.innerHTML = packs.map(function (p) {
              return '<option value="' + esc(p.id) + '"' + (state.rewrite.industryPackId === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>';
            }).join('');
            packSelect.onchange = function () { state.rewrite.industryPackId = packSelect.value; save(); renderIndustryHint(); };
          }
          renderIndustryHint();
        }).catch(function () { renderIndustryHint(); });
      }
      function loadSkills() {
        return fetch('/api/skills').then(function (r) { return r.json(); }).then(function (list) {
          var host = document.querySelector('[data-skill-checks]');
          var skills = (Array.isArray(list) ? list : []).filter(function (s) { return s.enabled !== false; });
          state.rewrite.selectedSkillIds = mapRetiredSkillIds(state.rewrite.selectedSkillIds || []);
          save();
          var grouped = groupBy(skills, skillLayer, ['去 AI', '口气']);
          host.innerHTML = skills.length ? grouped.map(function (group) {
            return foldGroup(group.name, group.items.length + ' 个', group.items.map(function (s) {
              var blocked = s.source && s.source !== 'builtin' && !s.rulesMarkdown;
              var on = state.rewrite.selectedSkillIds.indexOf(s.id) >= 0;
              return '<label class="' + (blocked ? 'disabled' : (on ? 'on' : '')) + '"><input type="checkbox" data-skill-id="' + esc(s.id) + '"' + (on ? ' checked' : '') + (blocked ? ' disabled' : '') + '> <span><b>' + esc(s.name) + '</b><small>' + esc(s.summary || '') + (blocked ? ' 未接入' : '') + '</small></span></label>';
            }).join(''), { key: 'skills-check', open: true });
          }).join('') : '<p>还没有启用的写法包。</p>';
          host.querySelectorAll('[data-skill-id]').forEach(function (box) {
            box.onchange = function () {
              var id = box.getAttribute('data-skill-id');
              state.rewrite.selectedSkillIds = state.rewrite.selectedSkillIds || [];
              if (box.checked) { if (state.rewrite.selectedSkillIds.indexOf(id) < 0) state.rewrite.selectedSkillIds.push(id); }
              else state.rewrite.selectedSkillIds = state.rewrite.selectedSkillIds.filter(function (x) { return x !== id; });
              save();
              var label = box.closest('label');
              if (label) label.classList.toggle('on', box.checked);
            };
          });
        });
      }
      function pollTask(taskId, col) {
        return fetch('/api/tasks/' + taskId).then(function (r) { return r.json(); }).then(function (task) {
          if (task.status === 'completed') {
            var text = (task.data && task.data.candidate) || '';
            var isDemo = (task.data && task.data.demo) === true || /\[演示模式/.test(text);
            if (isDemo) {
              col.setAttribute('data-demo', '1');
              col.querySelector('h3').textContent = (col.querySelector('h3').textContent || '成稿') + '（示例稿）';
            }
            var diff = task.data && task.data.factDiff;
            col.querySelector('[data-result-text]').textContent = text + (diff && diff.intact === false ? '\n\n[数字：缺 ' + (diff.missing || []).join('、') + '；多 ' + (diff.added || []).join('、') + ']' : '') + (isDemo ? '\n\n[这是示例稿，没有调用你的模型]' : '');
            var host = col.querySelector('[data-replacements]');
            var list = (task.data && task.data.industryReplacements) || [];
            if (host) {
              if (!list.length) host.innerHTML = '';
              else {
                host.innerHTML = '<p class="sub">换成的行业用语</p>' + list.map(function (item) {
                  var label = item.from ? (item.from + ' → ' + item.to) : item.to;
                  return '<div class="term-row" data-from="' + esc(item.from || '') + '" data-to="' + esc(item.to || '') + '"><span>' + esc(label) + '</span><button class="btn" type="button" data-accept-term>收下</button><button class="btn" type="button" data-revert-term>改回</button></div>';
                }).join('');
                host.querySelectorAll('[data-accept-term]').forEach(function (b) {
                  b.onclick = function () {
                    var row = b.closest('.term-row');
                    var from = row.getAttribute('data-from') || '';
                    var to = row.getAttribute('data-to') || '';
                    b.disabled = true;
                    fetch('/api/industry/terms/accept', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        packId: packSelect && packSelect.value || '',
                        replacements: [{ from: from, to: to, kind: to.length >= 5 ? 'phrase' : 'term' }],
                        source: (source && source.value) || ''
                      })
                    }).then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || '没收下'); return d; }); }).then(function () {
                      row.querySelector('span').textContent = row.querySelector('span').textContent + '（已收下）';
                      row.querySelectorAll('button').forEach(function (x) { x.disabled = true; });
                    }).catch(function (err) {
                      b.disabled = false;
                      if (statusEl) statusEl.textContent = err.message || '没收下这个词，请再试一次';
                    });
                  };
                });
                host.querySelectorAll('[data-revert-term]').forEach(function (b) {
                  b.onclick = function () {
                    var row = b.closest('.term-row');
                    var from = row.getAttribute('data-from') || '';
                    var to = row.getAttribute('data-to') || '';
                    var box = col.querySelector('[data-result-text]');
                    if (from && to && box) box.textContent = box.textContent.split(to).join(from);
                    row.querySelector('span').textContent = (from || to) + '（已改回）';
                    row.querySelectorAll('button').forEach(function (x) { x.disabled = true; });
                  };
                });
              }
            }
            col.querySelector('[data-keep]').disabled = false;
            return task;
          }
          if (task.status === 'failed') {
            col.querySelector('[data-result-text]').textContent = task.error || '没出成';
            return task;
          }
          return new Promise(function (resolve) { setTimeout(function () { resolve(pollTask(taskId, col)); }, 300); });
        });
      }
      generateBtn.onclick = function () {
        if (!state.rewrite.intents.length) { syncGenerate(); return; }
        var text = (source && source.value || '').trim();
        if (!text) { statusEl.textContent = '先把原文贴进来'; return; }
        if (briefCache && briefCache.isSlogan) {
          statusEl.textContent = '这篇像口号，缺 ' + briefCache.missing.map(function (item) { return item.name; }).join('、') + '。先按原文出稿，数字和事实不会自动补；补齐后更落得住。';
        }
        state.rewrite.source = text;
        var skillIds = mapRetiredSkillIds(state.rewrite.selectedSkillIds || []);
        state.rewrite.selectedSkillIds = skillIds;
        save();
        var payloadBase = { source: text, intents: state.rewrite.intents, applyStyle: applyStyle.checked, applyIndustry: applyIndustry.checked, industryPackId: (packSelect && packSelect.value) || state.rewrite.industryPackId || '', demoMode: window.llmConfigured ? false : true, skillIds: skillIds };
        generateBtn.disabled = true;
        statusEl.textContent = '正在出稿';
        fetch('/api/rewrite/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadBase) }).then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || '这一稿还没出来'); return d; }); }).then(function (d) {
          var ids = d.taskIds && d.taskIds.length ? d.taskIds : (d.taskId ? [d.taskId] : []);
          results.innerHTML = ids.map(function (id, i) {
            return '<article class="result-col panel" data-col="' + i + '"><h3></h3><p class="sub" data-skill-rules></p><div data-result-text>稿还在写</div><div data-used-cases></div><div data-replacements></div><button class="btn" type="button" data-keep disabled>收下这一版</button></article>';
          }).join('') || '<p>没有成稿。</p>';
          var cols = results.querySelectorAll('[data-col]');
          return fetch('/api/skills').then(function (r) { return r.json(); }).then(function (list) {
            var skills = Array.isArray(list) ? list : [];
            return Promise.all(ids.map(function (taskId, i) {
              var col = cols[i];
              var skill = skills.find(function (s) { return s.id === skillIds[i]; });
              col.querySelector('h3').textContent = skill ? skill.name : '成稿';
              col.querySelector('[data-skill-rules]').textContent = skill ? (skill.summary || '') : (skillIds.length ? '' : '未勾写法包，按原文出稿。');
              col.querySelector('[data-keep]').onclick = function () {
                var kept = col.querySelector('[data-result-text]').textContent;
                var clean = kept.split('\n').filter(function (line) { return !/^\[[^\]]+\]$/.test(line.trim()); }).join('\n').trim();
                state.rewrite.final = clean;
                state.rewrite.candidate = clean;
                state.rewrite.source = clean;
                if (source) source.value = clean;
                state.rewrite.status = 'confirmed';
                save();
                statusEl.textContent = '已收下「' + col.querySelector('h3').textContent + '」。要再换口气或行业用语，勾上再出稿。';
              };
              return pollTask(taskId, col);
            }));
          }).then(function () {
            generateBtn.disabled = false;
            syncGenerate();
            var demo = Array.prototype.some.call(cols, function (c) { return c.getAttribute('data-demo') === '1'; });
            statusEl.textContent = demo ? '出的是示例稿，没有调用你的模型。要按你的口气写，先在上面填模型服务。' : (ids.length > 1 ? '几稿都出了，挑一版收下。' : '稿已出');
          });
        }).catch(function (e) {
          generateBtn.disabled = false;
          syncGenerate();
          statusEl.textContent = e.message;
        });
      };
      var form = document.getElementById('llm-form');
      var message = document.getElementById('llm-status');
      function showLlm() { if (!message) return; message.textContent = window.llmConfigured ? '已经接上你的模型，按你的口气出稿' : '还没接你的模型，先出示例稿。填上自己的模型服务就能按你的口气写。'; }
      if (form) {
        fetch('/api/llm/session').then(function (r) { return r.json(); }).then(function (x) {
          window.llmConfigured = x.configured === true;
          if (x.baseUrl) form.baseUrl.value = x.baseUrl;
          if (x.model) form.model.value = x.model;
          showLlm();
        }).catch(function () { window.llmConfigured = false; showLlm(); });
        form.onsubmit = function (e) {
          e.preventDefault();
          fetch('/api/llm/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ baseUrl: form.baseUrl.value, model: form.model.value, apiKey: form.apiKey.value }) }).then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || '没接上'); return d; }); }).then(function (x) {
            window.llmConfigured = x.configured === true;
            form.apiKey.value = '';
            showLlm();
          }).catch(function (err) { message.textContent = err.message; });
        };
      }
      syncGenerate();
      loadPacks();
      loadSkills();
      (function setupCorrect() {
        var runBtn = document.querySelector('[data-correct-run]');
        var acceptBtn = document.querySelector('[data-correct-accept]');
        var sourceEl = document.querySelector('[data-correct-source]');
        var statusEl = document.querySelector('[data-correct-status]');
        var groupsEl = document.querySelector('[data-correct-groups]');
        if (!runBtn || !sourceEl) return;
        var lastDiff = { replacements: [], habits: [], corrected: '' };
        function generatedText() {
          var boxes = document.querySelectorAll('[data-result-text]');
          if (!boxes.length) return state.rewrite.candidate || state.rewrite.source || '';
          return boxes[0].textContent || '';
        }
        function applyToDraft(item) {
          if (!item || !item.from || !item.to) return false;
          var box = document.querySelectorAll('[data-result-text]')[0];
          if (!box) return false;
          box.textContent = box.textContent.split(item.from).join(item.to);
          return true;
        }
        function absorb(replacements, habits) {
          return fetch('/api/rewrite/correct/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              generated: generatedText(),
              corrected: sourceEl.value.trim(),
              replacements: replacements,
              habits: habits,
              packId: packSelect && packSelect.value
            })
          }).then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || '没收下'); return d; }); });
        }
        function markRow(btn) {
          btn.disabled = true;
          btn.textContent = '已改';
          var wrap = btn.closest('.term-row');
          if (wrap) {
            wrap.classList.add('absorbed');
            var box = wrap.querySelector('input');
            if (box) { box.checked = true; box.disabled = true; }
          }
        }
        function renderDiff(diff) {
          lastDiff = diff;
          var reps = diff.replacements || [];
          var habits = diff.habits || [];
          if (!reps.length && !habits.length) {
            groupsEl.innerHTML = '<p>这一稿和成稿一样，没有列出修正。</p>';
            acceptBtn.disabled = true;
            return;
          }
          var html = '';
          if (reps.length) {
            html += '<div class="habit-group"><h3>用词和术语</h3><div class="extract-list">' + reps.map(function (item, i) {
              return '<div class="term-row"><label class="on"><input type="checkbox" checked data-correct-rep="' + i + '"> <span><b>' + esc(item.from) + ' → ' + esc(item.to) + '</b><small>点「改」立刻换到成稿并记下</small></span></label><button class="btn" type="button" data-correct-apply="rep:' + i + '">改</button></div>';
            }).join('') + '</div></div>';
          }
          if (habits.length) {
            html += '<div class="habit-group"><h3>个人口气</h3><div class="extract-list">' + habits.map(function (item, i) {
              return '<div class="term-row"><label class="on"><input type="checkbox" checked data-correct-habit="' + i + '"> <span><b>' + esc(item.name || '人工改稿') + '</b><small>' + esc(item.statement) + '</small></span></label><button class="btn" type="button" data-correct-apply="habit:' + i + '">改</button></div>';
            }).join('') + '</div></div>';
          }
          groupsEl.innerHTML = html;
          acceptBtn.disabled = false;
          groupsEl.querySelectorAll('[data-correct-apply]').forEach(function (btn) {
            btn.onclick = function () {
              var ref = String(btn.getAttribute('data-correct-apply') || '').split(':');
              var kind = ref[0];
              var i = Number(ref[1]);
              var item = kind === 'habit' ? habits[i] : reps[i];
              if (!item) return;
              if (kind === 'habit' && (!item.from || !item.to)) { statusEl.textContent = '这条改法没有结构化原句，勾上后整批收下。'; return; }
              applyToDraft(item);
              var payloadHabit = kind === 'habit' ? [Object.assign({}, item, { dimension: classifyRuleDimension({ name: item.name, statement: item.statement }) })] : [];
              var payloadRep = kind === 'habit' ? [] : [item];
              btn.disabled = true;
              absorb(payloadRep, payloadHabit).then(function () {
                markRow(btn);
                statusEl.textContent = '已把这条改法用到成稿，也记下了。';
              }).catch(function (err) {
                btn.disabled = false;
                statusEl.textContent = err.message;
              });
            };
          });
        }
        runBtn.onclick = function () {
          var corrected = sourceEl.value.trim();
          if (!corrected) { statusEl.textContent = '先把你改过的正文贴进来'; return; }
          statusEl.textContent = '正在对照';
          fetch('/api/rewrite/correct', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ generated: generatedText(), corrected: corrected, packId: packSelect && packSelect.value })
          }).then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || '没对照出来'); return d; }); }).then(function (d) {
            renderDiff(d);
            statusEl.textContent = '勾上要用的修正，再收下。';
          }).catch(function (err) { statusEl.textContent = err.message; });
        };
        acceptBtn.onclick = function () {
          var replacements = [];
          var habits = [];
          groupsEl.querySelectorAll('[data-correct-rep]:checked').forEach(function (box) {
            replacements.push(lastDiff.replacements[Number(box.getAttribute('data-correct-rep'))]);
          });
          groupsEl.querySelectorAll('[data-correct-habit]:checked').forEach(function (box) {
            var item = lastDiff.habits[Number(box.getAttribute('data-correct-habit'))];
            if (item) habits.push(Object.assign({}, item, { dimension: item.dimension || classifyRuleDimension({ name: item.name, statement: item.statement }) }));
          });
          if (!replacements.length && !habits.length) { statusEl.textContent = '先勾上要用的修正。'; return; }
          acceptBtn.disabled = true;
          fetch('/api/rewrite/correct/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ generated: generatedText(), corrected: sourceEl.value.trim(), replacements: replacements, habits: habits, packId: packSelect && packSelect.value })
          }).then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || '没收下'); return d; }); }).then(function () {
            statusEl.textContent = '已收下。下次出稿会按这些用词和口气来。';
            groupsEl.innerHTML = '';
          }).catch(function (err) {
            statusEl.textContent = err.message;
            acceptBtn.disabled = false;
          });
        };
      })();
    }
    setupRewriteBoard();
    function setupRewriteTools() {
      var board = document.querySelector('[data-rewrite-board]');
      if (!board || document.querySelector('[data-rewrite-tools]')) return;
      var anchor = document.querySelector('[data-correct-panel]') || board.querySelector('section:last-of-type') || board;
      var host = document.createElement('div');
      host.setAttribute('data-rewrite-tools', '');
      host.innerHTML = [
        '<section class="panel" data-consistency-panel>',
        '<h2>全稿口径核对</h2>',
        '<p class="sub">把各章正文一起贴进来，或直接点「带上成稿」。会挑出同一指标数值不一致、方案数量对不上、同一对象两种写法。</p>',
        '<textarea data-consistency-source placeholder="把整份稿子的正文按章节贴在这里"></textarea>',
        '<div class="extract-actions">',
        '<button class="btn primary" type="button" data-consistency-run>核对全稿</button>',
        '<button class="btn" type="button" data-consistency-fill>带上成稿</button>',
        '</div>',
        '<p data-consistency-status role="status"></p>',
        '<div data-consistency-result></div>',
        '</section>',
        '<section class="panel" data-material-panel>',
        '<h2>材料读进来 / 稿子导出</h2>',
        '<p class="sub">支持 Word、PPT、Excel、PDF、Markdown、txt。上传后自动抽正文放进「贴稿」。成稿可导出 Word 或 PPT 继续改。</p>',
        '<div class="extract-actions">',
        '<input type="file" data-upload accept=".docx,.pptx,.xlsx,.pdf,.md,.txt" hidden>',
        '<button class="btn" type="button" data-upload-btn>上传 Word/PPT/Excel/PDF</button>',
        '<button class="btn" type="button" data-export="docx">导出 Word</button>',
        '<button class="btn" type="button" data-export="pptx">导出 PPT</button>',
        '</div>',
        '<p data-upload-status role="status"></p>',
        '</section>'
      ].join('');
      anchor.parentNode.insertBefore(host, anchor.nextSibling);

      var consSource = host.querySelector('[data-consistency-source]');
      var consStatus = host.querySelector('[data-consistency-status]');
      var consResult = host.querySelector('[data-consistency-result]');
      var uploadStatus = host.querySelector('[data-upload-status]');
      var fileInput = host.querySelector('[data-upload]');

      host.querySelector('[data-consistency-fill]').onclick = function () {
        var draft = state.rewrite.final || state.rewrite.candidate || '';
        if (!draft.trim()) { consStatus.textContent = '还没有成稿可带，先出一稿。'; return; }
        consSource.value = draft;
        consStatus.textContent = '已带上成稿。可再补上其他章节，然后核对。';
      };
      host.querySelector('[data-consistency-run]').onclick = function () {
        var text = consSource.value.trim();
        if (!text) { consStatus.textContent = '先把整份正文贴进来'; return; }
        var sections = text.split(/\n(?=#{1,3}\s)/).map(function (chunk) {
          var heading = chunk.match(/^#{1,3}\s*(.+)/);
          return { title: heading ? heading[1].trim() : '', text: chunk.replace(/^#{1,3}\s*.+\n?/, '') };
        });
        consStatus.textContent = '正在核对';
        fetch('/api/reports/consistency', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sections: sections }) })
          .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || '核对失败'); return d; }); })
          .then(function (d) {
            consStatus.textContent = d.summary;
            if (!(d.conflicts || []).length) { consResult.innerHTML = '<p class="sub">没发现明显不一致。</p>'; return; }
            consResult.innerHTML = d.conflicts.map(function (conflict) {
              return '<div class="entry"><b>' + esc(conflict.label) + '</b><p>' + esc(conflict.message) + '</p><p class="sub">' + conflict.values.map(function (v) { return esc(v.value) + (v.section ? '（' + esc(v.section) + '）' : ''); }).join(' · ') + '</p></div>';
            }).join('');
          })
          .catch(function (e) { consStatus.textContent = e.message; });
      };

      host.querySelector('[data-upload-btn]').onclick = function () { fileInput.click(); };
      function fillSource(text) {
        var source = document.querySelector('[data-source]');
        state.rewrite.source = text;
        if (source) source.value = text;
        save();
      }
      function readFile(file) {
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
          var base64 = String(reader.result || '').split(',')[1] || '';
          uploadStatus.textContent = '正在读「' + file.name + '」…';
          fetch('/api/documents/extract', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: file.name, base64: base64 }) })
            .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || '这个文件读不出来'); return d; }); })
            .then(function (d) {
              if (d.text) fillSource(d.text);
              uploadStatus.textContent = '读进来了，' + d.chars + ' 字' + (d.warnings && d.warnings.length ? '（' + d.warnings.join('；') + '）' : '') + '，已放进「贴稿」。';
            })
            .catch(function (e) { uploadStatus.textContent = e.message; });
        };
        reader.onerror = function () { uploadStatus.textContent = '这个文件读不出来'; };
        reader.readAsDataURL(file);
      }
      fileInput.onchange = function () { if (fileInput.files && fileInput.files[0]) readFile(fileInput.files[0]); };
      var panel = host.querySelector('[data-material-panel]');
      if (panel) {
        ['dragover', 'dragenter'].forEach(function (name) { panel.addEventListener(name, function (e) { e.preventDefault(); panel.classList.add('on'); }); });
        ['dragleave', 'drop'].forEach(function (name) { panel.addEventListener(name, function (e) { e.preventDefault(); panel.classList.remove('on'); }); });
        panel.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) readFile(e.dataTransfer.files[0]); });
      }

      host.querySelectorAll('[data-export]').forEach(function (b) {
        b.onclick = function () {
          var source = document.querySelector('[data-source]');
          var markdown = state.rewrite.final || state.rewrite.candidate || (source && source.value) || '';
          if (!markdown.trim()) { uploadStatus.textContent = '还没有成稿可导出，先出一稿或贴上正文。'; return; }
          var format = b.getAttribute('data-export');
          var original = b.textContent;
          b.disabled = true;
          b.textContent = '正在导出';
          fetch('/api/exports/document', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ format: format, title: document.title || '商业运营工作台', markdown: markdown }) })
            .then(function (r) { if (!r.ok) return r.json().then(function (d) { throw new Error(d.error || '导出失败'); }); return r.blob(); })
            .then(function (blob) {
              var url = URL.createObjectURL(blob);
              var a = document.createElement('a');
              a.href = url;
              a.download = (document.title || '商业运营工作台') + '.' + format;
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
              uploadStatus.textContent = '导出好了：' + a.download;
            })
            .catch(function (e) { uploadStatus.textContent = e.message; })
            .then(function () { b.disabled = false; b.textContent = original; });
        };
      });
    }
    setupRewriteTools();
    function setupSkillsPage() {
      var host = document.querySelector('[data-skills]');
      if (!host) return;
      function render(list) {
        var skills = list || [];
        host.innerHTML = skills.length ? groupBy(skills, skillLayer, ['去 AI', '口气']).map(function (group) {
          return foldGroup(group.name, group.items.length + ' 个', group.items.map(function (s) {
            var blocked = s.source && s.source !== 'builtin' && !s.rulesMarkdown;
            return '<article class="entry"><b>' + esc(s.name) + '</b><p>' + esc(s.summary || '') + '</p><p class="sub">来源：' + esc(s.sourceRepo || (s.source === 'builtin' ? '工作台自有' : (s.source || '自定义'))) + (blocked ? ' · 未接入' : '') + '</p><button class="btn" type="button" data-skill-toggle="' + esc(s.id) + '">' + (s.enabled === false ? '未启用' : '已启用') + '</button></article>';
          }).join(''), { key: 'skills-page', open: true });
        }).join('') : '<p>还没有写法包。</p>';
        host.querySelectorAll('[data-skill-toggle]').forEach(function (b) {
          b.onclick = function () {
            var current = b.textContent.indexOf('已启用') >= 0;
            fetch('/api/skills/' + b.getAttribute('data-skill-toggle'), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: !current }) }).then(function () { load(); });
          };
        });
      }
      function load() { fetch('/api/skills').then(function (r) { return r.json(); }).then(render); }
      load();
    }
    setupSkillsPage();
    function setupIndustryPacks() {
      var host = document.querySelector('[data-industry-packs]');
      if (!host) return;
      var packs = [];
      var candidates = [];
      var packSelect = document.querySelector('[data-extract-pack]');
      var sourceEl = document.querySelector('[data-extract-source]');
      var urlEl = document.querySelector('[data-extract-url]');
      var hintEl = document.querySelector('[data-extract-hint]');
      var statusEl = document.querySelector('[data-extract-status]');
      var groupsEl = document.querySelector('[data-extract-groups]');
      var runBtn = document.querySelector('[data-extract-run]');
      var fetchBtn = document.querySelector('[data-extract-fetch]');
      var acceptBtn = document.querySelector('[data-extract-accept]');
      var fileInput = document.getElementById('extract-file');
      var panel = document.querySelector('[data-extract-panel]');
      var MAX_BYTES = 5 * 1024 * 1024;
      var projects = [];
      var typesEl = document.querySelector('[data-extract-types]');
      if (typesEl) {
        typesEl.innerHTML = CASE_TYPES.map(function (type) {
          return '<label><input type="checkbox" data-extract-type="' + type.id + '"> ' + type.name + '</label>';
        }).join('');
      }
      function selectedTypes() {
        if (!typesEl) return [];
        return Array.prototype.map.call(typesEl.querySelectorAll('[data-extract-type]:checked'), function (box) { return box.getAttribute('data-extract-type'); });
      }
      function uniqueTerms(list) {
        var seen = {};
        var out = [];
        (list || []).forEach(function (item) {
          var term = String(item || '').trim();
          var key = term.toLocaleLowerCase();
          if (!term || seen[key]) return;
          seen[key] = true;
          out.push(term);
        });
        return out;
      }
      function currentPack() {
        var id = packSelect && packSelect.value;
        if (id) return packs.filter(function (p) { return p.id === id; })[0] || packs[0] || null;
        return packs.filter(function (p) { return p.name === '商业运营'; })[0] || packs[0] || null;
      }
      function render(list) {
        packs = list || [];
        var terms = [];
        var phrases = [];
        packs.forEach(function (p) {
          terms = uniqueTerms(terms.concat(p.terms || []));
          phrases = uniqueTerms(phrases.concat(p.phrases || []));
        });
        host.innerHTML = '<div class="habit-group"><h3>术语</h3><p>' + esc(terms.join('、') || '行业词库还是空的') + '</p></div><div class="habit-group"><h3>习惯用语</h3><p>' + esc(phrases.join('、') || '行业词库还是空的') + '</p></div>';
        if (packSelect) {
          var selected = packSelect.value;
          packSelect.innerHTML = packs.map(function (p) {
            return '<option value="' + esc(p.id) + '"' + (p.id === selected ? ' selected' : '') + '>' + esc(p.name) + '</option>';
          }).join('');
        }
        updateHint();
      }
      function updateHint() {
        if (!hintEl) return;
        if (window.llmConfigured) hintEl.textContent = '已经接上你的模型。抽出的词会进入行业词库。多篇资讯里反复出现的会排到前面。';
        else hintEl.textContent = '还没接你的模型。抽出的词会进入行业词库。多篇资讯里反复出现的会排到前面。';
      }
      function load() { fetch('/api/contexts').then(function (r) { return r.json(); }).then(render); }
      function renderCandidates() {
        if (!groupsEl) return;
        if (!candidates.length) {
          groupsEl.innerHTML = '';
          if (acceptBtn) acceptBtn.disabled = true;
          return;
        }
        function block(kind, title) {
          var items = candidates.filter(function (item) { return item.kind === kind; });
          if (!items.length) return '';
          return '<div class="habit-group"><h3>' + title + ' · ' + items.length + '</h3><div class="extract-list">' + items.map(function (item) {
            var notes = [];
            if (item.packHits > 1) notes.push('已在 ' + item.packHits + ' 篇资讯里出现');
            else if (item.inPack) notes.push('已进行业词库');
            if (item.count) notes.push('这篇出现 ' + item.count + ' 次');
            var count = notes.length ? notes.join('，') : '已进行业词库';
            return '<label><input type="checkbox" checked data-extract-term="' + esc(item.term) + '" data-extract-kind="' + esc(item.kind) + '"> <span><b>' + esc(item.term) + '</b><small>' + count + '</small></span></label>';
          }).join('') + '</div></div>';
        }
        groupsEl.innerHTML = block('term', '术语') + block('phrase', '习惯用语');
        if (acceptBtn) acceptBtn.disabled = !currentPack();
        if (projects.length) {
          groupsEl.innerHTML += '<div class="habit-group"><h3>项目 · ' + projects.length + '</h3><div class="extract-list">' + projects.map(function (item) {
            var note = item.articleCount >= 2 ? ('已在 ' + item.articleCount + ' 篇资讯里出现') : '待建档';
            return '<label><input type="checkbox" data-extract-project="' + esc(item.id || item.name) + '" data-extract-project-name="' + esc(item.name) + '"> <span><b>' + esc(item.name) + '</b><small>' + note + '</small></span></label>';
          }).join('') + '</div></div>';
        }
      }
      function fileKind(file) {
        var name = String(file && file.name || '').toLowerCase();
        if (/\.(pdf|docx?|rtf|xlsx?|pptx?)$/.test(name)) return 'unsupported';
        if (/\.(txt|md|markdown|text)$/.test(name)) return 'text';
        if (file && /^text\//.test(file.type || '')) return 'text';
        return 'unknown';
      }
      function readTextFile(file) {
        return new Promise(function (resolve, reject) {
          if (file.size > MAX_BYTES) { reject(new Error(file.name + ' 超过 5MB，请拆开再传')); return; }
          var reader = new FileReader();
          reader.onload = function () { resolve(String(reader.result || '').replace(/^\uFEFF/, '')); };
          reader.onerror = function () { reject(new Error(file.name + ' 没读出来，请再试一次')); };
          reader.readAsText(file, 'UTF-8');
        });
      }
      function importFiles(fileList) {
        var files = Array.prototype.slice.call(fileList || []);
        if (!files.length) return;
        var unsupported = [];
        var textFiles = [];
        files.forEach(function (file) {
          if (fileKind(file) === 'text') textFiles.push(file);
          else unsupported.push(file.name);
        });
        var unsupportedHint = unsupported.length ? '这些现在读不了：' + unsupported.join('、') + '。请另存成 txt 或 Markdown。' : '';
        if (!textFiles.length) {
          if (statusEl) statusEl.textContent = unsupportedHint || '请选 txt 或 Markdown。';
          return;
        }
        if (statusEl) statusEl.textContent = '正在读入文件';
        var parts = [];
        textFiles.reduce(function (chain, file) {
          return chain.then(function () {
            return readTextFile(file).then(function (text) {
              var body = text.trim();
              if (!body) throw new Error(file.name + ' 是空的');
              if (body.indexOf('\0') >= 0) throw new Error(file.name + ' 不是纯文本');
              parts.push(body);
            });
          });
        }, Promise.resolve()).then(function () {
          if (sourceEl) sourceEl.value = parts.join('\n\n');
          if (statusEl) statusEl.textContent = '已读入 ' + parts.length + ' 篇。点抽出用词。' + (unsupportedHint ? ' ' + unsupportedHint : '');
        }).catch(function (err) {
          if (statusEl) statusEl.textContent = err.message;
        });
      }
      function fetchArticle() {
        var url = urlEl && urlEl.value.trim();
        if (!url) { if (statusEl) statusEl.textContent = '先把资讯链接贴进来'; return; }
        if (fetchBtn) fetchBtn.disabled = true;
        if (statusEl) statusEl.textContent = '正在取正文';
        fetch('/api/industry/fetch-article', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: url })
        }).then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || '这个链接打不开，请把正文贴进来'); return d; }); }).then(function (d) {
          if (sourceEl) sourceEl.value = d.article || '';
          if (urlEl && d.url) urlEl.value = d.url;
          if (statusEl) statusEl.textContent = '已取下正文。核对后再抽出用词。';
        }).catch(function (err) {
          if (statusEl) statusEl.textContent = err.message;
        }).then(function () { if (fetchBtn) fetchBtn.disabled = false; });
      }
      function runExtract() {
        var source = sourceEl && sourceEl.value.trim();
        var url = urlEl && urlEl.value.trim();
        if (!url && !source) { if (statusEl) statusEl.textContent = '先把资讯贴进来，或填一篇资讯链接后点取这篇，或先上传文件。'; return; }
        if (runBtn) runBtn.disabled = true;
        if (statusEl) statusEl.textContent = (!source && url) || /^https?:\/\//i.test(source) ? '正在取正文并抽词' : '正在抽词';
        var payload = { useModel: window.llmConfigured === true, demoMode: window.llmConfigured ? false : true };
        if (url) payload.url = url;
        if (source) payload.source = source;
        var pack = currentPack();
        if (pack) payload.packId = pack.id;
        payload.commercialTypes = selectedTypes();
        fetch('/api/industry/semantic-extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || '没抽出用词，请再试一次'); return d; }); }).then(function (d) {
          candidates = (d.candidates && d.candidates.length ? d.candidates : (d.terms || []).map(function (term) { return { term: term, kind: String(term).length >= 5 ? 'phrase' : 'term', count: 1 }; }));
          projects = d.projects || [];
          renderCandidates();
          if (d.article && sourceEl && (url || d.fetchedFrom)) sourceEl.value = d.article;
          if (!candidates.length) {
            if (statusEl) statusEl.textContent = d.fetchedFrom ? '已取下正文，这篇里没有抽出能用的词。' : (d.useModel ? '这篇里没有抽出能用的词。' : '这篇里没有先挑出用词。换一篇资讯，或接上模型后再抽。');
            return;
          }
          var fetched = d.fetchedFrom ? '已从链接取下正文。' : '';
          if (statusEl) statusEl.textContent = fetched + '已放入行业词库，共 ' + candidates.length + ' 个。多篇资讯里反复出现的会排到前面。';
        }).catch(function (err) {
          if (statusEl) statusEl.textContent = err.message;
        }).then(function () { if (runBtn) runBtn.disabled = false; });
      }
      function acceptSelected() {
        var pack = currentPack();
        if (!pack) { if (statusEl) statusEl.textContent = '词库还在准备，请再点一次收下。'; return; }
        var boxes = groupsEl ? groupsEl.querySelectorAll('input[data-extract-term]:checked') : [];
        var projectBoxes = groupsEl ? groupsEl.querySelectorAll('input[data-extract-project]:checked') : [];
        var terms = pack.terms ? pack.terms.slice() : [];
        var phrases = pack.phrases ? pack.phrases.slice() : [];
        Array.prototype.forEach.call(boxes, function (box) {
          if (box.getAttribute('data-extract-kind') === 'phrase') phrases.push(box.getAttribute('data-extract-term'));
          else terms.push(box.getAttribute('data-extract-term'));
        });
        terms = uniqueTerms(terms);
        phrases = uniqueTerms(phrases);
        if (!boxes.length && !projectBoxes.length) { if (statusEl) statusEl.textContent = '先勾上要用的词或项目。'; return; }
        if (acceptBtn) acceptBtn.disabled = true;
        if (statusEl) statusEl.textContent = '正在收下';
        function saveProjects() {
          var chain = Promise.resolve();
          Array.prototype.forEach.call(projectBoxes, function (box) {
            var id = box.getAttribute('data-extract-project');
            var name = box.getAttribute('data-extract-project-name');
            chain = chain.then(function () {
              if (id && id !== name) {
                return fetch('/api/projects/' + encodeURIComponent(id), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'accepted', commercialTypes: selectedTypes(), terms: terms }) });
              }
              return fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name, commercialTypes: selectedTypes(), terms: terms, status: 'accepted' }) });
            });
          });
          return chain;
        }
        function finish() {
          candidates = [];
          projects = [];
          renderCandidates();
          if (statusEl) statusEl.textContent = '已收下勾上的词' + (projectBoxes.length ? '和项目' : '') + '。';
          load();
        }
        var acceptedTerms = Array.prototype.map.call(boxes, function (box) {
          return { to: box.getAttribute('data-extract-term'), kind: box.getAttribute('data-extract-kind') || 'term' };
        });
        var next = boxes.length ? fetch('/api/contexts/' + encodeURIComponent(pack.id), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ terms: terms, phrases: phrases })
        }).then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || '没收下，请再试一次'); return d; }); }) : Promise.resolve();
        next = next.then(function () {
          if (!acceptedTerms.length) return;
          return fetch('/api/industry/terms/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ packId: pack.id, replacements: acceptedTerms, commercialTypes: selectedTypes(), source: sourceEl && sourceEl.value || '' })
          }).then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || '没收下，请再试一次'); return d; }); });
        });
        next.then(saveProjects).then(finish).catch(function (err) {
          if (statusEl) statusEl.textContent = err.message;
          if (acceptBtn) acceptBtn.disabled = false;
         });
       }
       if (fetchBtn) fetchBtn.addEventListener('click', fetchArticle);
      if (urlEl) urlEl.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') { event.preventDefault(); fetchArticle(); }
      });
      if (runBtn) runBtn.addEventListener('click', runExtract);
      if (acceptBtn) acceptBtn.addEventListener('click', acceptSelected);
      if (groupsEl) groupsEl.addEventListener('change', function (event) {
        var box = event.target;
        if (!box || !box.getAttribute || !(box.getAttribute('data-extract-term') || box.getAttribute('data-extract-project'))) return;
        var label = box.parentNode;
        if (label && label.tagName === 'LABEL') label.classList.toggle('on', box.checked);
      });
      if (fileInput) fileInput.addEventListener('change', function () { importFiles(fileInput.files); fileInput.value = ''; });
      if (panel) {
        panel.addEventListener('dragover', function (event) { event.preventDefault(); });
        panel.addEventListener('drop', function (event) {
          event.preventDefault();
          if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length) importFiles(event.dataTransfer.files);
        });
      }
      fetch('/api/health').then(function (r) { return r.json(); }).then(function (x) {
        window.llmConfigured = x.llmConfigured === true;
        updateHint();
      }).catch(function () { window.llmConfigured = false; updateHint(); });
      load();
    }
    setupIndustryPacks();
    (function setupTermLists() {
      var termHost = document.querySelector('[data-term-list]');
      var phraseHost = document.querySelector('[data-phrase-list]');
      if (!termHost && !phraseHost) return;
      var kind = termHost ? 'term' : 'phrase';
      var host = termHost || phraseHost;
      var searchEl = document.querySelector(termHost ? '[data-term-search]' : '[data-phrase-search]');
      var filterEl = document.querySelector(termHost ? '[data-term-filters]' : '[data-phrase-filters]');
      var countEl = document.querySelector(termHost ? '[data-term-count]' : '[data-phrase-count]');
      var groups = [
        { id: 'type', name: '商业类型', keys: ['策展','非标','传统','百货','购物','mall','街区','奥莱','集中'] },
        { id: 'space', name: '空间和场', keys: ['空间','商场','门店','店铺','动线','中庭','外摆','橱窗','广场','底商','盒子'] },
        { id: 'guest', name: '客群消费', keys: ['消费','打卡','客流','客群','会员','私域','年轻'] },
        { id: 'brand', name: '品牌零售', keys: ['品牌','零售','快闪','买手','旗舰','首店','商户','商铺'] },
        { id: 'ops', name: '招商运营', keys: ['招商','开业','调改','运营','陈列','美陈','落位','进驻','撤场','操盘','定位','调性','营销'] },
        { id: 'asset', name: '资产指标', keys: ['租金','扣点','坪效','去化','空置','出租','资产','收益','转化','联营','租赁'] },
        { id: 'name', name: '项目专名' },
        { id: 'other', name: '其他' }
      ];
      var all = [];
      var active = '';
      var query = '';
      function classify(term) {
        var text = String(term || '');
        if (/[A-Za-z]{3,}/.test(text)) return 'name';
        for (var i = 0; i < groups.length; i += 1) {
          var keys = groups[i].keys || [];
          if (keys.some(function (k) { return text.indexOf(k) >= 0; })) return groups[i].id;
        }
        return 'other';
      }
      function filtered() {
        return all.filter(function (item) {
          if (active && classify(item.term) !== active) return false;
          if (query && String(item.term).toLowerCase().indexOf(query) < 0) return false;
          return true;
        });
      }
      function renderLexicon() {
        var rows = filtered();
        if (countEl) countEl.textContent = rows.length ? ('在看 ' + rows.length + ' / ' + all.length + ' 个') : (all.length ? '没有匹配的词' : '');
        if (filterEl) {
          filterEl.innerHTML = '<button type="button" class="chip' + (!active ? ' active' : '') + '" data-term-group="">全部 · ' + all.length + '</button>' + groups.map(function (g) {
            var n = all.filter(function (item) { return classify(item.term) === g.id; }).length;
            if (!n) return '';
            return '<button type="button" class="chip' + (active === g.id ? ' active' : '') + '" data-term-group="' + g.id + '">' + g.name + ' · ' + n + '</button>';
          }).join('');
          filterEl.querySelectorAll('[data-term-group]').forEach(function (btn) {
            btn.onclick = function () {
              active = btn.getAttribute('data-term-group') || '';
              renderLexicon();
            };
          });
        }
        if (!rows.length) {
          host.innerHTML = all.length ? '<p>没有匹配的词。</p>' : '<p>还没有收下的词。去资讯里抽出再用。</p>';
          return;
        }
        var order = groups.map(function (g) { return g.name; });
        host.innerHTML = groupBy(rows, function (item) {
          var id = classify(item.term);
          var hit = groups.filter(function (g) { return g.id === id; })[0];
          return hit ? hit.name : '其他';
        }, order).map(function (group) {
          return foldGroup(group.name, group.items.length + ' 个', '<div class="term-cloud">' + group.items.map(function (item) {
            var hot = item.articleCount > 1 ? '1' : '0';
            var hits = item.articleCount > 1 ? (item.articleCount + ' 篇') : '';
            var title = (item.articleCount > 1 ? ('已在 ' + item.articleCount + ' 篇资讯里出现') : '已收下') + (item.packName ? ' · ' + item.packName : '');
            return '<span class="term-chip" data-hot="' + hot + '" title="' + esc(title) + '"><b>' + esc(item.term) + '</b>' + (hits ? '<small>' + esc(hits) + '</small>' : '') + '</span>';
          }).join('') + '</div>', { key: 'lexicon', open: true });
        }).join('');
      }
      if (searchEl) searchEl.addEventListener('input', function () {
        query = String(searchEl.value || '').trim().toLowerCase();
        renderLexicon();
      });
      fetch('/api/industry/terms?kind=' + kind).then(function (r) { return r.json(); }).then(function (list) {
        all = list || [];
        renderLexicon();
      }).catch(function () { host.innerHTML = '<p>词库暂时读不出。</p>'; });
    })();
    (function setupCases() {
      var host = document.querySelector('[data-case-list]');
      if (!host) return;
      var typesEl = document.querySelector('[data-case-types]');
      var typeParam = new URLSearchParams(location.search).get('type') || '';
      var idParam = new URLSearchParams(location.search).get('id') || '';
      var detail = document.querySelector('[data-case-detail]');
      function typeNames(ids) {
        return (ids || []).map(function (id) {
          var hit = CASE_TYPES.filter(function (type) { return type.id === id; })[0];
          return hit ? hit.name : id;
        }).join('、');
      }
      function openCase(id) {
        if (!detail || !id) return;
        fetch('/api/projects/' + encodeURIComponent(id)).then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || '档暂时读不出'); return d; }); }).then(function (item) {
          var articles = item.articles || [];
          var status = item.status === 'accepted' ? '已收下' : (item.status === 'candidate' ? '候选 · 出现 ' + (item.articleCount || 0) + ' 篇' : '待建档');
          detail.hidden = false;
          detail.innerHTML = '<h2>' + esc(item.name) + '</h2><p>' + esc(status + (typeNames(item.commercialTypes) ? ' · ' + typeNames(item.commercialTypes) : '')) + '</p><p>相关用词：' + esc((item.terms || []).join('、') || '还没记下') + '</p><div class="case-fields"><label class="extract-label">所在城市 / 区位<input data-case-location value="' + esc(item.location || '') + '"></label><label class="extract-label">体量<input data-case-area value="' + esc(item.area || '') + '" placeholder="例如：12 万平方米"></label><label class="extract-label">开业时间<input data-case-opened value="' + esc(item.openedAt || '') + '" placeholder="例如：2024 年 9 月"></label><label class="extract-label">主力品牌（用、分开）<input data-case-brands value="' + esc((item.anchorBrands || []).join('、')) + '"></label></div><label class="extract-label">亮点（用、分开）</label><textarea data-case-highlights rows="2">' + esc((item.highlights || []).join('、')) + '</textarea><label class="extract-label">特征摘要</label><textarea data-case-features rows="3">' + esc(item.features || '') + '</textarea><div>' + (item.status !== 'accepted' ? '<button class="btn primary" type="button" data-accept-project="' + esc(item.id) + '">收下</button>' : '') + '<button class="btn" type="button" data-save-features>记下这份案例</button></div><h3>出现在这些资讯里</h3>' + (articles.length ? articles.map(function (article) {
            return '<div class="entry"><h2>' + esc(article.title || '资讯') + '</h2><p>' + esc(String(article.body || '').slice(0, 160)) + '</p></div>';
          }).join('') : '<p>还没有记下来源资讯。</p>');
          var acceptBtn = detail.querySelector('[data-accept-project]');
          if (acceptBtn) acceptBtn.onclick = function () {
            fetch('/api/projects/' + encodeURIComponent(item.id), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'accepted' }) }).then(function () { openCase(item.id); });
          };
          var saveBtn = detail.querySelector('[data-save-features]');
          if (saveBtn) saveBtn.onclick = function () {
            function field(selector) { var el = detail.querySelector(selector); return el ? el.value : ''; }
            function splitList(value) { return String(value || '').split(/[、,，;；\n]/).map(function (x) { return x.trim(); }).filter(Boolean); }
            fetch('/api/projects/' + encodeURIComponent(item.id), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ features: field('[data-case-features]'), location: field('[data-case-location]'), area: field('[data-case-area]'), openedAt: field('[data-case-opened]'), anchorBrands: splitList(field('[data-case-brands]')), highlights: splitList(field('[data-case-highlights]')) }) }).then(function () { openCase(item.id); });
          };
        }).catch(function () { detail.hidden = false; detail.innerHTML = '<p>档暂时读不出。</p>'; });
      }
      if (typesEl) {
        typesEl.innerHTML = '<button type="button" class="chip' + (!typeParam ? ' active' : '') + '" data-case-type="">全部</button>' + CASE_TYPES.map(function (type) {
          return '<button type="button" class="chip' + (typeParam === type.id ? ' active' : '') + '" data-case-type="' + type.id + '">' + type.name + '</button>';
        }).join('');
        typesEl.querySelectorAll('[data-case-type]').forEach(function (btn) {
          btn.onclick = function () {
            var next = btn.getAttribute('data-case-type');
            location.href = next ? ('cases.html?type=' + next) : 'cases.html';
          };
        });
      }
      var query = typeParam ? ('?type=' + encodeURIComponent(typeParam) + '&status=accepted') : '';
      fetch('/api/projects' + query).then(function (r) { return r.json(); }).then(function (list) {
        host.innerHTML = (list && list.length) ? list.map(function (item) {
          var types = typeNames(item.commercialTypes);
          var status = item.status === 'accepted' ? '已收下' : (item.status === 'candidate' ? '候选 · 出现 ' + (item.articleCount || 0) + ' 篇' : '待建档');
          return '<div class="entry"><h2>' + esc(item.name) + '</h2><p>' + esc(status + (types ? ' · ' + types : '')) + '</p><button class="btn" type="button" data-open-case="' + esc(item.id) + '">打开</button>' + (item.status !== 'accepted' ? ' <button class="btn" type="button" data-accept-project="' + esc(item.id) + '">收下</button>' : '') + '</div>';
        }).join('') : '<p>还没有案例。同一项目在两篇资讯里出现后，会升为候选。</p>';
        host.querySelectorAll('[data-accept-project]').forEach(function (btn) {
          btn.onclick = function () {
            fetch('/api/projects/' + encodeURIComponent(btn.getAttribute('data-accept-project')), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'accepted' }) }).then(function () { location.reload(); });
          };
        });
        host.querySelectorAll('[data-open-case]').forEach(function (btn) {
          btn.onclick = function () { openCase(btn.getAttribute('data-open-case')); };
        });
        if (idParam) openCase(idParam);
      }).catch(function () { host.innerHTML = '<p>案例暂时读不出。</p>'; });
    })();
   bindForm('[data-doc-form]',function(d){state.documents.push({id:String(Date.now()),name:d.get('name'),meta:d.get('category'),content:d.get('content'),status:'启用'});}); list('documents','[data-documents]',['name','meta']);
   function setupDocumentExport() { if (document.title.indexOf('项目材料') < 0 || document.querySelector('[data-document-export]')) return; var host=document.querySelector('main'), panel=document.createElement('section'); panel.className='panel'; panel.dataset.documentExport='true'; panel.innerHTML='<h2>把材料存到本机</h2><p data-export-info>按章节顺序合成一份 Markdown。</p><button class="btn primary" data-export-markdown>存到本机</button>'; host.appendChild(panel); var info=panel.querySelector('[data-export-info]'), button=panel.querySelector('[data-export-markdown]'); function markdown(){ var docs=state.documents||[], chapters=state.documentChapters||[]; return docs.map(function(doc){ var parts=chapters.filter(function(ch){return !ch.documentId||ch.documentId===doc.id;}); var body=parts.length?parts.sort(function(a,b){return (a.order||0)-(b.order||0);}).map(function(ch){return '## '+(ch.title||'未命名章节')+'\n\n'+(ch.content||'');}).join('\n\n'):(doc.content||''); return '# '+(doc.name||'未命名文档')+'\n\n'+body; }).join('\n\n---\n\n'); } button.onclick=function(){ var exportedAt=new Date().toISOString(), fileName='personal-expression-documents-'+exportedAt.slice(0,10)+'.md', content=markdown()||'# 文档资料\n\n暂无可导出的文档。'; state.exportRecords=state.exportRecords||[]; state.exportRecords.push({id:String(Date.now()),fileName:fileName,exportedAt:exportedAt,documentCount:(state.documents||[]).length}); save(); var link=document.createElement('a'); link.href=URL.createObjectURL(new Blob([content],{type:'text/markdown;charset=utf-8'})); link.download=fileName; link.click(); URL.revokeObjectURL(link.href); info.textContent='已导出 '+fileName+' · '+new Date(exportedAt).toLocaleString(); }; }
   setupDocumentExport();
     (function setupHabitsPage() {
      var host = document.querySelector('[data-rules]');
      if (!host) return;
      var rules = state.rules || [];
      host.innerHTML = rules.length ? groupBy(rules, habitLayer, STYLE_DIMENSIONS.map(function (d) { return d.name; })).map(function (group) {
        return foldGroup(group.name, group.items.length + ' 条', group.items.map(function (x) {
          return '<div class="entry"><h2>' + esc(x.name) + '</h2><p>' + esc(x.meta || x.statement || '') + '</p></div>';
        }).join(''), { key: 'habits', open: false });
      }).join('') : '<p>还没有用词习惯。记下这句话你平时怎么说。</p>';
    })();
    (function setupCalibrationPage() {
      var inboxHost = document.querySelector('[data-calib-inbox]');
      var groupsHost = document.querySelector('[data-calib-groups]');
      if (!groupsHost) return;
      var STATUS_LABEL = { pending: '新', fixed: '在用', counter: '不要了' };
      function rules() { return state.rules || []; }
      function statusOf(rule) {
        if (rule.reviewStatus) return rule.reviewStatus;
        if (rule.confirmed === true || rule.status === 'confirmed') return 'fixed';
        return 'pending';
      }
      function statementOf(rule) {
        return String(rule.statement || rule.meta || rule.name || '').trim() || '（没写内容）';
      }
      function bindActions(host) {
        host.querySelectorAll('[data-calib-status]').forEach(function (btn) {
          btn.onclick = function () {
            var next = btn.getAttribute('data-calib-status');
            var rid = btn.getAttribute('data-calib-id');
            var patch = { reviewStatus: next, confirmed: next === 'fixed', status: next === 'fixed' ? 'confirmed' : 'active' };
            btn.disabled = true;
            fetch('/api/rules/' + encodeURIComponent(rid), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) }).then(function (r) {
              return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || '没改成，请再试一次'); return d; });
            }).then(function (saved) {
              var local = rules().filter(function (rule) { return rule.id === rid; })[0];
              if (local) { local.reviewStatus = next; local.confirmed = next === 'fixed'; local.status = patch.status; }
              if (saved && saved.id) { state.rules = rules().filter(function (rule) { return rule.id !== rid; }); state.rules.push(saved); }
              try { store.save(); } catch (e) {}
              renderAll();
            }).catch(function (err) { btn.disabled = false; banner('error', err.message); });
          };
        });
      }
      function inboxCard(rule) {
        return '<article class="calib-card"><p class="calib-human">' + esc(statementOf(rule)) + '</p><div class="calib-actions">'
          + '<button class="btn primary" type="button" data-calib-status="fixed" data-calib-id="' + esc(rule.id) + '">收下</button>'
          + '<button class="btn" type="button" data-calib-status="counter" data-calib-id="' + esc(rule.id) + '">不要了</button>'
          + '</div></article>';
      }
      function groupCard(rule) {
        var st = statusOf(rule);
        var actions = st === 'fixed'
          ? '<button class="btn" type="button" data-calib-status="counter" data-calib-id="' + esc(rule.id) + '">不要了</button>'
          : '<button class="btn primary" type="button" data-calib-status="fixed" data-calib-id="' + esc(rule.id) + '">再用回来</button>';
        return '<article class="calib-card"><div class="calib-card-head"><span class="calib-badge ' + st + '">' + STATUS_LABEL[st] + '</span></div><p class="calib-human">' + esc(statementOf(rule)) + '</p><div class="calib-actions">' + actions + '</div></article>';
      }
      function renderInbox() {
        if (!inboxHost) return;
        var list = rules().filter(function (rule) { return statusOf(rule) === 'pending'; });
        inboxHost.hidden = !list.length;
        inboxHost.innerHTML = list.length
          ? '<h2>收一下</h2><p class="sub">最近学到的 ' + list.length + ' 条，看一眼，收下或划掉。</p>' + list.map(inboxCard).join('')
          : '';
        bindActions(inboxHost);
      }
      function renderGroups() {
        var groups = STYLE_DIMENSIONS.map(function (dim) {
          return { dim: dim, items: rules().filter(function (rule) { return habitLayer(rule) === dim.name && statusOf(rule) !== 'pending'; }) };
        }).filter(function (g) { return g.items.length; });
        groupsHost.innerHTML = groups.length ? groups.map(function (g) {
          return foldGroup(g.dim.name, g.items.length + ' 条', g.items.map(groupCard).join(''), { key: 'calib', open: true });
        }).join('') : '<p>还没有固定的写法。用下面的输入框记一条，或在「改一稿」里点改，它会自己长出来。</p>';
        bindActions(groupsHost);
      }
      function renderAll() { renderInbox(); renderGroups(); }
      window.__calibrationRefresh = function () {
        fetch('/api/rules').then(function (r) { return r.json(); }).then(function (list) {
          if (Array.isArray(list) && list.length) { state.rules = list; try { store.save(); } catch (e) {} }
          renderAll();
        }).catch(function () { renderAll(); });
      };
      var addBtn = document.querySelector('[data-calib-add]');
      var noteEl = document.querySelector('[data-calib-note]');
      if (addBtn && noteEl) {
        addBtn.addEventListener('click', function () {
          var statement = String(noteEl.value || '').trim();
          if (!statement) { banner('error', '先写一句你想固定的说法'); return; }
          var dimId = classifyRuleDimension({ name: statement, statement: statement });
          var item = { name: statement.slice(0, 24), statement: statement, dimension: dimId, reviewStatus: 'pending', confirmed: false, status: 'active', source: '手记', meta: dimensionName(dimId) };
          addBtn.disabled = true;
          fetch('/api/rules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) }).then(function (r) {
            return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || '没记下，请再试一次'); return d; });
          }).then(function (saved) {
            state.rules = rules().concat([saved && saved.id ? saved : Object.assign({}, item, { id: 'local-' + Date.now() })]);
            try { store.save(); } catch (e) {}
            noteEl.value = '';
            banner('success', '记下了，去上面收一下');
            renderAll();
          }).catch(function (err) { banner('error', err.message); }).then(function () { addBtn.disabled = false; });
        });
      }
      renderAll();
      fetch('/api/rules').then(function (r) { return r.json(); }).then(function (list) {
        if (Array.isArray(list) && list.length) { state.rules = list; try { store.save(); } catch (e) {} renderAll(); }
      }).catch(function () {});
    })();
    (function setupCalibrationPractice() {
      var root = document.querySelector('[data-calib-practice]');
      if (!root) return;

      function esc(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
          return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
        });
      }

      var kindSelect = root.querySelector('[data-practice-kind]');
      var countSelect = root.querySelector('[data-practice-count]');
      var startBtn = root.querySelector('[data-practice-start]');
      var hintEl = root.querySelector('[data-practice-hint]');
      var progressEl = root.querySelector('[data-practice-progress]');
      var listEl = root.querySelector('[data-practice-list]');
      var sourceEl = root.querySelector('[data-practice-source]');
      var scanBtn = root.querySelector('[data-practice-scan]');
      var applyBtn = root.querySelector('[data-practice-apply]');
      var recordBtn = root.querySelector('[data-practice-record]');
      var statusEl = root.querySelector('[data-practice-draft-status]');
      var findingsEl = root.querySelector('[data-practice-findings]');
      var correctedEl = root.querySelector('[data-practice-corrected]');

      if (kindSelect) {
        kindSelect.innerHTML = STYLE_DIMENSIONS.map(function (dim) {
          return '<option value="' + dim.id + '">' + esc(dim.name) + '</option>';
        }).join('');
      }

      root.querySelectorAll('[data-practice-mode]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          root.querySelectorAll('[data-practice-mode]').forEach(function (b) { b.classList.toggle('active', b === btn); });
          var drill = root.querySelector('[data-practice-drill]');
          var draft = root.querySelector('[data-practice-draft]');
          var isDrill = btn.getAttribute('data-practice-mode') === 'drill';
          if (drill) drill.hidden = !isDrill;
          if (draft) draft.hidden = isDrill;
        });
      });

      var session = [];

      function updateProgress() {
        if (!progressEl) return;
        if (!session.length) { progressEl.textContent = ''; return; }
        var done = session.filter(function (item) { return item.done; }).length;
        progressEl.textContent = '已完成 ' + done + ' / ' + session.length + ' 题';
      }

      function diffHtml(item, i) {
        if (!item.diff) return '';
        var reps = item.diff.replacements || [];
        var habits = item.diff.habits || [];
        var html = '';
        if (reps.length) {
          html += '<div class="extract-list">' + reps.map(function (r, j) {
            return '<label class="on"><input type="checkbox" checked data-practice-rep="' + j + '"> <span><b>' + esc(r.from) + ' → ' + esc(r.to) + '</b><small>' + esc(r.reason || r.note || '可替换') + '</small></span></label>';
          }).join('') + '</div>';
        }
        if (habits.length) {
          html += '<div class="extract-list">' + habits.map(function (h, j) {
            return '<label class="on"><input type="checkbox" checked data-practice-habit="' + j + '"> <span><b>' + esc(h.name || '可固化规则') + '</b><small>' + esc(h.statement || h.text || '') + '</small></span></label>';
          }).join('') + '</div>';
        }
        if (!html) html = '<p class="sub">这段和题目一致，没有列出修正。</p>';
        return html;
      }

      function renderSession() {
        if (!listEl) return;
        listEl.innerHTML = session.map(function (item, i) {
          var head = '<div class="practice-card-head"><span class="practice-index">' + (i + 1) + '</span>'
            + (item.done ? '<span class="calib-badge fixed">已完成</span>' : '<span class="practice-count">待改写</span>') + '</div>';
          var prompt = '<p class="practice-prompt">' + esc(item.prompt) + '</p>';
          var textarea = '<textarea data-practice-answer="' + i + '" placeholder="按你平时的说法改写这一段"' + (item.done ? ' disabled' : '') + '>' + esc(item.answer) + '</textarea>';
          var actions = '<div class="calib-actions"><button class="btn" type="button" data-practice-check="' + i + '">对照</button>'
            + '<button class="btn primary" type="button" data-practice-accept="' + i + '"' + (item.diff ? '' : ' disabled') + '>收下勾上的</button></div>';
          var diff = '<div data-practice-diff="' + i + '">' + diffHtml(item, i) + '</div>';
          return '<article class="practice-card' + (item.done ? ' done' : '') + '" data-practice-item="' + i + '">' + head + prompt + textarea + (item.done ? '' : actions + diff) + '</article>';
        }).join('');
        updateProgress();
      }

      function startRound() {
        var kind = kindSelect ? kindSelect.value : 'wording';
        var count = countSelect ? Number(countSelect.value) || 12 : 12;
        if (startBtn) startBtn.disabled = true;
        if (listEl) listEl.innerHTML = '<p class="sub">正在出题</p>';
        fetch('/api/industry/drills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: kind, count: count, packId: (state.rewrite && state.rewrite.industryPackId) || '' })
        }).then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || '没出成题'); return d; }); })
          .then(function (d) {
            session = (d.prompts || []).map(function (p, i) { return { index: i, prompt: p.prompt, answer: '', diff: null, done: false }; });
            if (hintEl) hintEl.textContent = d.hint ? ('这一轮聚焦：' + d.hint) : '';
            renderSession();
          })
          .catch(function (err) { if (listEl) listEl.innerHTML = '<p class="sub">' + esc(err.message) + '</p>'; })
          .then(function () { if (startBtn) startBtn.disabled = false; });
      }

      if (startBtn) startBtn.addEventListener('click', startRound);

      if (listEl) {
        listEl.addEventListener('input', function (e) {
          var ta = e.target.closest('[data-practice-answer]');
          if (!ta) return;
          var item = session[Number(ta.getAttribute('data-practice-answer'))];
          if (item) { item.answer = ta.value; item.diff = null; }
        });
        listEl.addEventListener('click', function (e) {
          var checkBtn = e.target.closest('[data-practice-check]');
          var acceptBtn = e.target.closest('[data-practice-accept]');
          if (checkBtn) {
            var ci = Number(checkBtn.getAttribute('data-practice-check'));
            var citem = session[ci];
            if (!citem) return;
            if (!String(citem.answer || '').trim()) { if (progressEl) progressEl.textContent = '第 ' + (ci + 1) + ' 题先写下你的改法。'; return; }
            checkBtn.disabled = true;
            fetch('/api/rewrite/correct', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ generated: citem.prompt, corrected: citem.answer.trim() })
            }).then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || '没对照出来'); return d; }); })
              .then(function (diff) { citem.diff = diff; renderSession(); })
              .catch(function (err) { checkBtn.disabled = false; if (progressEl) progressEl.textContent = err.message; });
            return;
          }
          if (acceptBtn) {
            var ai = Number(acceptBtn.getAttribute('data-practice-accept'));
            var aitem = session[ai];
            if (!aitem || !aitem.diff) return;
            var card = acceptBtn.closest('[data-practice-item]');
            var reps = [];
            var habits = [];
            card.querySelectorAll('[data-practice-rep]:checked').forEach(function (b) { reps.push(aitem.diff.replacements[Number(b.getAttribute('data-practice-rep'))]); });
            card.querySelectorAll('[data-practice-habit]:checked').forEach(function (b) { habits.push(aitem.diff.habits[Number(b.getAttribute('data-practice-habit'))]); });
            if (!reps.length && !habits.length) { if (progressEl) progressEl.textContent = '先勾上要用的修正。'; return; }
            acceptBtn.disabled = true;
            var kind = kindSelect ? kindSelect.value : 'wording';
            fetch('/api/industry/drills/confirm', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: aitem.prompt, corrected: aitem.answer, habits: habits, dimension: kind })
            }).then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || '没收下'); return d; }); })
              .then(function () { aitem.done = true; renderSession(); if (window.__calibrationRefresh) window.__calibrationRefresh(); })
              .catch(function (err) { acceptBtn.disabled = false; if (progressEl) progressEl.textContent = err.message; });
          }
        });
      }

      var findings = [];

      function scanText(text) { return styleScanFindings(text); }

      function renderFindings() {
        if (!findingsEl) return;
        if (!findings.length) { findingsEl.innerHTML = ''; if (applyBtn) applyBtn.disabled = true; if (recordBtn) recordBtn.disabled = true; return; }
        findingsEl.innerHTML = findings.map(function (f) {
          var suggest = f.suggest ? (' → <code>' + esc(f.suggest) + '</code>') : '';
          return '<label class="practice-finding"><input type="checkbox" checked data-scan-check="' + f._i + '"><span><b>' + dimensionName(f.dimension) + ' · <code>' + esc(f.from) + '</code>' + suggest + '</b><small>' + esc(f.note) + '</small></span></label>';
        }).join('');
        if (applyBtn) applyBtn.disabled = false;
        if (recordBtn) recordBtn.disabled = false;
      }

      if (scanBtn) scanBtn.addEventListener('click', function () {
        var text = String(sourceEl.value || '').trim();
        if (!text) { if (statusEl) statusEl.textContent = '先贴一段稿。'; return; }
        findings = scanText(text);
        renderFindings();
        if (statusEl) statusEl.textContent = findings.length ? ('扫出 ' + findings.length + ' 处，按维度看，勾上要采纳的。') : '这一遍没扫出明显问题。';
        if (applyBtn) applyBtn.disabled = !findings.length;
        if (recordBtn) recordBtn.disabled = !findings.length;
      });

      function checkedFindings() {
        var out = [];
        if (!findingsEl) return out;
        findingsEl.querySelectorAll('[data-scan-check]:checked').forEach(function (b) { out.push(findings[Number(b.getAttribute('data-scan-check'))]); });
        return out;
      }

      if (applyBtn) applyBtn.addEventListener('click', function () {
        var text = String(sourceEl.value || '');
        var result = styleApplyFindings(text, checkedFindings());
        if (correctedEl) correctedEl.textContent = result.text;
        if (statusEl) statusEl.textContent = '采纳 ' + result.changed + ' 处，' + (result.skipped ? (result.skipped + ' 处需手工判断（绝对值/数字）') : '无手工项') + '。';
      });

      if (recordBtn) recordBtn.addEventListener('click', function () {
        var checked = checkedFindings();
        if (!checked.length) { if (statusEl) statusEl.textContent = '先勾上要记的项。'; return; }
        recordBtn.disabled = true;
        Promise.all(checked.map(function (f) {
          var statement = f.note + '：' + f.from + (f.suggest ? (' → ' + f.suggest) : '');
          return fetch('/api/rules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: statement.slice(0, 24), statement: statement, dimension: f.dimension, before: f.from, after: f.suggest || '', reviewStatus: 'pending', status: 'active', sourceRef: '文稿校准', meta: dimensionName(f.dimension) + ' · 文稿校准' })
          }).then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || '没记下'); return d; }); });
        })).then(function (saved) {
          if (statusEl) statusEl.textContent = '已记下 ' + saved.length + ' 条，去上面的维度里确认。';
          if (window.__calibrationRefresh) window.__calibrationRefresh();
        }).catch(function (err) { if (statusEl) statusEl.textContent = err.message; }).then(function () { recordBtn.disabled = false; });
      });
    })();
    (function setupDrills() {
      var panel = document.querySelector('[data-drill-panel]');
      if (!panel) return;
      var kindsEl = document.querySelector('[data-drill-kinds]');
      var hintEl = document.querySelector('[data-drill-hint]');
      var promptEl = document.querySelector('[data-drill-prompt]');
      var answerEl = document.querySelector('[data-drill-answer]');
      var statusEl = document.querySelector('[data-drill-status]');
      var groupsEl = document.querySelector('[data-drill-groups]');
      var runBtn = document.querySelector('[data-drill-run]');
      var confirmBtn = document.querySelector('[data-drill-confirm]');
      var acceptBtn = document.querySelector('[data-drill-accept]');
      var current = { kind: '', prompt: '', diff: { replacements: [], habits: [] } };
      var seq = 0;
      function renderKinds(list) {
        var valid = (list || []).filter(function (item) { return item.id === current.kind; }).length;
        if (!valid) current.kind = (list && list[0] && list[0].id) || 'stance';
        kindsEl.innerHTML = (list || []).map(function (item) {
          return '<button type="button" class="chip' + (item.id === current.kind ? ' active' : '') + '" data-drill-kind="' + esc(item.id) + '">' + esc(item.name) + '</button>';
        }).join('');
        kindsEl.querySelectorAll('[data-drill-kind]').forEach(function (btn) {
          btn.onclick = function () {
            current.kind = btn.getAttribute('data-drill-kind');
            kindsEl.querySelectorAll('[data-drill-kind]').forEach(function (x) { x.classList.toggle('active', x === btn); });
            var hit = list.filter(function (item) { return item.id === current.kind; })[0];
            hintEl.textContent = hit ? hit.hint : '';
          };
        });
        var first = list.filter(function (item) { return item.id === current.kind; })[0] || list[0];
        if (first) hintEl.textContent = first.hint;
      }
      function renderDiff(diff) {
        current.diff = diff;
        var reps = diff.replacements || [];
        var habits = diff.habits || [];
        if (!reps.length && !habits.length) {
          groupsEl.innerHTML = '<p>这一段和题目一样，没有列出修正。</p>';
          acceptBtn.disabled = true;
          return;
        }
        groupsEl.innerHTML = (reps.length ? '<div class="habit-group"><h3>用词</h3><div class="extract-list">' + reps.map(function (item, i) {
          return '<label class="on"><input type="checkbox" checked data-drill-rep="' + i + '"> <span><b>' + esc(item.from) + ' → ' + esc(item.to) + '</b></span></label>';
        }).join('') + '</div></div>' : '') + (habits.length ? '<div class="habit-group"><h3>口气</h3><div class="extract-list">' + habits.map(function (item, i) {
          return '<label class="on"><input type="checkbox" checked data-drill-habit="' + i + '"> <span><b>' + esc(item.name) + '</b><small>' + esc(item.statement) + '</small></span></label>';
        }).join('') + '</div></div>' : '');
        acceptBtn.disabled = false;
      }
      fetch('/api/industry/drills').then(function (r) { return r.json(); }).then(renderKinds).catch(function () { renderKinds([{ id: 'tone', name: '语气', hint: '对内用「我方」陈述。' }]); });
      runBtn.onclick = function () {
        statusEl.textContent = '正在出题';
        fetch('/api/industry/drills', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: current.kind, variant: seq++ }) }).then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || '没出成题'); return d; }); }).then(function (d) {
          current.prompt = d.prompt;
          promptEl.textContent = d.prompt;
          hintEl.textContent = d.hint || hintEl.textContent;
          answerEl.value = '';
          groupsEl.innerHTML = '';
          confirmBtn.disabled = false;
          acceptBtn.disabled = true;
          statusEl.textContent = '按你平时的说法改写，再对照。';
        }).catch(function (err) { statusEl.textContent = err.message; });
      };
      confirmBtn.onclick = function () {
        if (!current.prompt) { statusEl.textContent = '先出一道题。'; return; }
        if (!answerEl.value.trim()) { statusEl.textContent = '先写下你的改法。'; return; }
        fetch('/api/rewrite/correct', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ generated: current.prompt, corrected: answerEl.value.trim() }) }).then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || '没对照出来'); return d; }); }).then(function (d) {
          renderDiff(d);
          statusEl.textContent = '勾上要用的修正，再收下。';
        }).catch(function (err) { statusEl.textContent = err.message; });
      };
      acceptBtn.onclick = function () {
        var replacements = [];
        var habits = [];
        groupsEl.querySelectorAll('[data-drill-rep]:checked').forEach(function (box) { replacements.push(current.diff.replacements[Number(box.getAttribute('data-drill-rep'))]); });
        groupsEl.querySelectorAll('[data-drill-habit]:checked').forEach(function (box) { habits.push(current.diff.habits[Number(box.getAttribute('data-drill-habit'))]); });
        if (!replacements.length && !habits.length) { statusEl.textContent = '先勾上要用的修正。'; return; }
        acceptBtn.disabled = true;
        fetch('/api/industry/drills/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: current.prompt, corrected: answerEl.value.trim(), replacements: replacements, habits: habits }) }).then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || '没收下'); return d; }); }).then(function () {
          statusEl.textContent = '已收下。这些口气会进用词习惯。';
          location.reload();
        }).catch(function (err) { statusEl.textContent = err.message; acceptBtn.disabled = false; });
      };
    })();
    if (document.title.indexOf('改一稿') >= 0 && !document.querySelector('[data-lock-facts]')) {
      var lockHost = document.querySelector('main');
      if (lockHost) {
        var lockPanel = document.createElement('section');
        lockPanel.className = 'panel';
        lockPanel.innerHTML = '<h2>数字按原文</h2><p>先记下原文里的数字。出稿后再看这些数字有没有被改掉。</p><button class="btn" data-lock-facts type="button">按原文记下数字</button><p data-lock-status role="status"></p>';
        lockHost.appendChild(lockPanel);
      }
    }
    document.querySelectorAll('[data-lock-facts]').forEach(function(b){b.onclick=function(){var source=((state.rewrite&&state.rewrite.source)||(document.querySelector('.editor')||{}).innerText||'').trim();var statusEl=document.querySelector('[data-lock-status]');if(!source){(statusEl||b).textContent='先把原文贴进来';return;}b.disabled=true;fetch('/api/rewrite/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({source:source,lock:true})}).then(function(r){return r.json().then(function(d){if(!r.ok)throw new Error(d.error||'没记下数字，请再试一次');return d;});}).then(function(d){state.diagnosis=state.diagnosis||{};state.diagnosis.factsLocked=true;state.diagnosis.lockedContent=d.lockedContent;save();b.textContent='数字已按原文记下';if(statusEl)statusEl.textContent='记下了 '+(d.numberCount||0)+' 个数字：'+((d.lockedContent&&d.lockedContent.numbers)||[]).join('、');}).catch(function(e){if(statusEl)statusEl.textContent=e.message;else b.textContent=e.message;}).then(function(){b.disabled=false;});};});
  function setupTeamReview() {
    var list = document.querySelector('[data-review-list]');
    if (!list) return;
    state.teamReviews = state.teamReviews || {};
    state.reviewHistory = state.reviewHistory || [];
    function persist() { save(); renderHistory(); }
    function renderHistory() {
      var host = document.querySelector('[data-review-history]');
      if (!host) return;
      host.innerHTML = state.reviewHistory.length ? state.reviewHistory.slice().reverse().map(function (item) { return '<div class="entry"><b>' + esc(item.title) + '</b><p>' + esc(item.status) + ' · ' + esc(new Date(item.updatedAt).toLocaleString()) + (item.comment ? ' · ' + esc(item.comment) : '') + '</p></div>'; }).join('') : '<p>暂无审核记录。</p>';
    }
    list.querySelectorAll('.entry').forEach(function (row) {
      var id = row.dataset.reviewId, item = state.teamReviews[id] || { status: '待审核', comments: [] };
      state.teamReviews[id] = item;
      var status = row.querySelector('[data-review-status]'), comments = row.querySelector('[data-review-comments]');
      status.textContent = item.status; status.dataset.reviewStatus = item.status;
      comments.innerHTML = item.comments.map(function (text) { return '<p class="sub">审核评论：' + esc(text) + '</p>'; }).join('');
      status.onclick = function () { item.status = item.status === '已通过' ? '待审核' : '已通过'; state.reviewHistory.push({ title: row.querySelector('h2').textContent, status: item.status, updatedAt: new Date().toISOString() }); persist(); status.textContent = item.status; };
      row.querySelector('[data-review-comment]').onsubmit = function (event) { event.preventDefault(); var text = row.querySelector('textarea').value.trim(); if (!text) return; item.comments.push(text); state.reviewHistory.push({ title: row.querySelector('h2').textContent, status: item.status, comment: text, updatedAt: new Date().toISOString() }); row.querySelector('textarea').value = ''; persist(); comments.innerHTML = item.comments.map(function (comment) { return '<p class="sub">审核评论：' + esc(comment) + '</p>'; }).join(''); };
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
    var presetHost = document.querySelector('[data-framework-presets]');
    if (presetHost) {
      function addPresetNodes(presets, label) {
        presets.forEach(function (preset) {
          nodes.push({ id: 'framework-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8), name: preset.name, description: preset.description || '', priority: preset.priority || '中优先级' });
        });
        render();
        persist('已套用' + label + '，可继续改');
      }
      fetch('/api/frameworks/presets').then(function (r) { return r.json(); }).then(function (list) {
        var presets = Array.isArray(list) ? list : [];
        if (!presets.length) { presetHost.innerHTML = '<p class="sub">骨架暂时读不出来。</p>'; return; }
        presetHost.innerHTML = '<button type="button" class="chip active" data-preset-all>套用整份骨架（' + presets.length + ' 节）</button>' + presets.map(function (preset, index) {
          return '<button type="button" class="chip" data-preset="' + index + '" title="' + esc(preset.description || '') + '">' + esc(preset.name) + '</button>';
        }).join('');
        presetHost.querySelector('[data-preset-all]').onclick = function () { addPresetNodes(presets, '整份骨架'); };
        presetHost.querySelectorAll('[data-preset]').forEach(function (b) {
          b.onclick = function () { addPresetNodes([presets[Number(b.getAttribute('data-preset'))]], '这一节'); };
        });
      }).catch(function () { presetHost.innerHTML = '<p class="sub">骨架暂时读不出来。</p>'; });
    }
    render();
    persist(versions.length ? '最近保存版本 v' + versions[versions.length - 1].version : '框架草稿已保存到本地');
  }
  setupFramework();
  var sample = Array.from(document.querySelectorAll('button')).find(function (x) { return x.textContent.indexOf('保存为样本') >= 0 || x.textContent.indexOf('添加表达样本') >= 0; });
  if (sample) sample.addEventListener('click', function () { state.expressionRules.sampleCount += 1; save(); sample.textContent = '样本已保存'; });
  document.querySelectorAll('.issue').forEach(function (issue) { issue.addEventListener('click', function () { document.querySelectorAll('.issue').forEach(function (x) { x.style.background = ''; }); issue.style.background = '#fff8df'; }); });
  document.querySelectorAll('.search').forEach(function (input) { input.addEventListener('input', function () { document.querySelectorAll('.entry').forEach(function (entry) { entry.hidden = !!input.value && entry.textContent.toLowerCase().indexOf(input.value.toLowerCase()) < 0; }); }); });
  document.querySelectorAll('[data-filter]').forEach(function (button) { button.addEventListener('click', function () { document.querySelectorAll('[data-filter]').forEach(function (x) { x.classList.remove('active'); }); button.classList.add('active'); var value = button.dataset.filter; document.querySelectorAll('[data-category]').forEach(function (item) { item.hidden = value !== 'all' && item.dataset.category !== value; }); }); });
  document.querySelectorAll('[data-toggle-status]').forEach(function (button) { button.addEventListener('click', function () { var enabled = button.dataset.toggleStatus === 'on'; var next = enabled ? '已启用' : '已发布'; button.dataset.toggleStatus = enabled ? 'off' : 'on'; button.textContent = next; button.classList.toggle('active'); var row = button.closest('.entry, .panel'); var label = row && row.querySelector('h2'); state.documents.push({ name: label ? label.textContent : document.title, status: next, updatedAt: new Date().toISOString() }); save(); }); });
    function setupCorpus() {
      var form = document.querySelector('[data-corpus-form]');
      if (!form) return;
      var statusEl = document.getElementById('corpus-status');
      var listEl = document.getElementById('corpus-list');
      var filterScene = 'all';
      var filterKind = 'all';
      var SCENE_ORDER = ['招商对内汇报', '招商对外演讲', '运营方案', '营销活动方案', '沟通方案'];
      var KIND_ORDER = ['整篇方案', '一段口气', '标题写法', '判断句', '表格说明'];
      function sceneLabel(scene) {
        return ({ '招商对内汇报': '招商 · 对内汇报', '招商对外演讲': '招商 · 对外演讲' })[scene] || scene || '未标明写给谁';
      }
      function sortKnown(list, order) {
        return list.slice().sort(function (a, b) {
          var ia = order.indexOf(a); var ib = order.indexOf(b);
          return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
        });
      }
      function dimValue(name) {
        var active = form.querySelector('[data-corpus-dim="' + name + '"] .chip.active');
        return active ? active.getAttribute('data-value') : '';
      }
      function setDim(name, value) {
        form.querySelectorAll('[data-corpus-dim="' + name + '"] .chip').forEach(function (chip) {
          chip.classList.toggle('active', chip.getAttribute('data-value') === value);
        });
      }
      function renderList() {
        if (!listEl) return;
        var items = (state.samples || []).filter(function (item) {
          if (filterScene !== 'all' && item.scene !== filterScene) return false;
          if (filterKind !== 'all' && item.kind !== filterKind) return false;
          return true;
        });
        if (!items.length) {
          listEl.innerHTML = '<p>这一档还没有语料。贴一篇，或上传 txt / Markdown。</p>';
          return;
        }
        function cardHtml(item) {
          var body = String(item.body || '');
          var meta = [item.style, item.rhythm, item.logic].filter(Boolean).join(' · ');
          return '<div class="corpus-card"><strong>' + esc(item.title || item.name || '未命名语料') + '</strong><p>' + esc(body.slice(0, 72)) + (body.length > 72 ? '…' : '') + '</p>' + (meta ? '<p class="meta">' + esc(meta) + '</p>' : '') + '</div>';
        }
        var scenes = [];
        items.forEach(function (item) {
          var scene = item.scene || '未标明写给谁';
          if (scenes.indexOf(scene) < 0) scenes.push(scene);
        });
        listEl.innerHTML = sortKnown(scenes, SCENE_ORDER).map(function (scene) {
          var inScene = items.filter(function (item) { return (item.scene || '未标明写给谁') === scene; });
          var kinds = [];
          inScene.forEach(function (item) {
            var kind = item.kind || '未标明什么料';
            if (kinds.indexOf(kind) < 0) kinds.push(kind);
          });
          var inner = sortKnown(kinds, KIND_ORDER).map(function (kind) {
            var inKind = inScene.filter(function (item) { return (item.kind || '未标明什么料') === kind; });
            var open = (filterKind !== 'all' || inKind.length <= 4) ? ' open' : '';
            return '<details class="catalog-group"' + open + '><summary>' + esc(kind) + ' <small>' + inKind.length + ' 篇</small></summary>' + inKind.map(cardHtml).join('') + '</details>';
          }).join('');
          return '<section class="catalog-scene"><h3>' + esc(sceneLabel(scene)) + ' <small>' + inScene.length + ' 篇</small></h3>' + inner + '</section>';
        }).join('');
      }
      if (form.dataset.bound !== '1') {
        form.dataset.bound = '1';
        form.querySelectorAll('[data-corpus-dim]').forEach(function (dim) {
          dim.querySelectorAll('.chip').forEach(function (chip) {
            chip.addEventListener('click', function () {
              dim.querySelectorAll('.chip').forEach(function (other) { other.classList.remove('active'); });
              chip.classList.add('active');
            });
          });
        });
        document.querySelectorAll('[data-corpus-filter="scene"] [data-scene]').forEach(function (button) {
          button.addEventListener('click', function () {
            filterScene = button.getAttribute('data-scene');
            document.querySelectorAll('[data-corpus-filter="scene"] [data-scene]').forEach(function (other) { other.classList.toggle('active', other === button); });
            renderList();
          });
        });
        document.querySelectorAll('[data-corpus-filter="kind"] [data-kind]').forEach(function (button) {
          button.addEventListener('click', function () {
            filterKind = button.getAttribute('data-kind');
            document.querySelectorAll('[data-corpus-filter="kind"] [data-kind]').forEach(function (other) { other.classList.toggle('active', other === button); });
            renderList();
          });
        });
        var classifyBtn = document.getElementById('corpus-classify');
        var fileInput = document.getElementById('corpus-file');
        var MAX_CORPUS_BYTES = 5 * 1024 * 1024;
        function corpusFileKind(file) {
          var name = String(file && file.name || '').toLowerCase();
          if (/\.(pdf|docx?|rtf|xlsx?|pptx?)$/.test(name)) return 'unsupported';
          if (/\.(txt|md|markdown|text)$/.test(name)) return 'text';
          if (file && /^text\//.test(file.type || '')) return 'text';
          return 'unknown';
        }
        function titleFromFile(file) {
          return String(file && file.name || '').replace(/\.[^.]+$/, '').trim();
        }
        function readTextFile(file) {
          return new Promise(function (resolve, reject) {
            if (file.size > MAX_CORPUS_BYTES) {
              reject(new Error(file.name + ' 超过 5MB，请拆开再传'));
              return;
            }
            var reader = new FileReader();
            reader.onload = function () { resolve(String(reader.result || '').replace(/^\uFEFF/, '')); };
            reader.onerror = function () { reject(new Error(file.name + ' 没读出来，请再试一次')); };
            reader.readAsText(file, 'UTF-8');
          });
        }
        function applyVoice(voice) {
          if (!voice) return;
          if (voice.kind) setDim('kind', voice.kind);
          if (voice.scene) setDim('scene', voice.scene);
          if (voice.style) setDim('style', voice.style);
          if (voice.rhythm) setDim('rhythm', voice.rhythm);
          if (voice.logic) setDim('logic', voice.logic);
        }
        function classifyBody(body) {
          return fetch('/api/samples/clean', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: body }) }).then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || '没分出来，请再试一次'); return d; }); });
        }
        function saveSample(item) {
          return fetch('/api/samples', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) }).then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || '没收下，请再试一次'); return d; }); }).then(function (saved) {
            state.samples = state.samples || [];
            state.samples.unshift(saved);
            save();
            return saved;
          });
        }
        function resetCorpusDims() {
          setDim('kind', '整篇方案');
          setDim('scene', '招商对内汇报');
          setDim('style', '正式汇报');
          setDim('rhythm', '长句链条');
          setDim('logic', '先结论后依据');
        }
        function importFiles(fileList) {
          var files = Array.prototype.slice.call(fileList || []);
          if (!files.length) return;
          var unsupported = [];
          var textFiles = [];
          files.forEach(function (file) {
            if (corpusFileKind(file) === 'text') textFiles.push(file);
            else unsupported.push(file.name);
          });
          var unsupportedHint = unsupported.length ? '这些现在读不了：' + unsupported.join('、') + '。请另存成 txt 或 Markdown。' : '';
          if (!textFiles.length) {
            if (statusEl) statusEl.textContent = unsupportedHint || '请选 txt 或 Markdown。';
            return;
          }
          if (statusEl) statusEl.textContent = '正在读入文件';
          if (textFiles.length === 1) {
            readTextFile(textFiles[0]).then(function (text) {
              var body = text.trim();
              if (!body) throw new Error('这个文件是空的');
              if (body.indexOf('\0') >= 0) throw new Error('这个文件不是纯文本，请另存成 txt 或 Markdown');
              if (form.body) form.body.value = body;
              if (form.title && !(form.title.value || '').trim()) form.title.value = titleFromFile(textFiles[0]);
              return classifyBody(body).then(function (d) {
                var voice = d.voice || {};
                applyVoice(voice);
                if (statusEl) statusEl.textContent = '已读入《' + titleFromFile(textFiles[0]) + '》，分成：' + [voice.kind, voice.style, voice.rhythm, voice.logic].filter(Boolean).join(' · ') + '。不对就改标签，再点收下这篇。' + (unsupportedHint ? ' ' + unsupportedHint : '');
              }).catch(function (err) {
                if (statusEl) statusEl.textContent = '已读入正文。' + err.message + (unsupportedHint ? ' ' + unsupportedHint : '');
              });
            }).catch(function (err) {
              if (statusEl) statusEl.textContent = err.message;
            });
            return;
          }
          var savedCount = 0;
          var errors = [];
          textFiles.reduce(function (chain, file) {
            return chain.then(function () {
              return readTextFile(file).then(function (text) {
                var body = text.trim();
                if (!body) throw new Error(file.name + ' 是空的');
                if (body.indexOf('\0') >= 0) throw new Error(file.name + ' 不是纯文本');
                return saveSample({ title: titleFromFile(file) || body.slice(0, 18), body: body });
              }).then(function () { savedCount += 1; }).catch(function (err) { errors.push(err.message); });
            });
          }, Promise.resolve()).then(function () {
            renderList();
            var parts = [];
            if (savedCount) parts.push('已收下 ' + savedCount + ' 篇。');
            if (unsupportedHint) parts.push(unsupportedHint);
            if (errors.length) parts.push(errors.join(' '));
            if (statusEl) statusEl.textContent = parts.join(' ') || '没有读入文件';
          });
        }
        if (classifyBtn) classifyBtn.addEventListener('click', function () {
          var body = (form.body && form.body.value || '').trim();
          if (!body) { if (statusEl) statusEl.textContent = '先把语料贴进来，或先上传文件'; return; }
          classifyBtn.disabled = true;
          if (statusEl) statusEl.textContent = '正在按固定规则分档';
          classifyBody(body).then(function (d) {
            var voice = d.voice || {};
            applyVoice(voice);
            if (statusEl) statusEl.textContent = '已分成：' + [voice.kind, voice.style, voice.rhythm, voice.logic].filter(Boolean).join(' · ') + '。不对就改标签。';
          }).catch(function (err) {
            if (statusEl) statusEl.textContent = err.message;
          }).then(function () { classifyBtn.disabled = false; });
        });
        if (fileInput) fileInput.addEventListener('change', function () {
          importFiles(fileInput.files);
          fileInput.value = '';
        });
        form.addEventListener('dragover', function (event) { event.preventDefault(); });
        form.addEventListener('drop', function (event) {
          event.preventDefault();
          if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length) importFiles(event.dataTransfer.files);
        });
        form.addEventListener('submit', function (event) {
          event.preventDefault();
          var body = (form.body && form.body.value || '').trim();
          if (!body) { if (statusEl) statusEl.textContent = '先把语料贴进来，或先上传文件'; return; }
          var item = {
            title: (form.title && form.title.value || '').trim() || body.slice(0, 18),
            body: body,
            kind: dimValue('kind'),
            scene: dimValue('scene'),
            style: dimValue('style'),
            rhythm: dimValue('rhythm'),
            logic: dimValue('logic')
          };
          if (statusEl) statusEl.textContent = '正在收下';
          saveSample(item).then(function () {
            form.reset();
            resetCorpusDims();
            if (statusEl) statusEl.textContent = '已收下这篇语料';
            renderList();
          }).catch(function (err) {
            if (statusEl) statusEl.textContent = err.message;
          });
        });
      }
      renderList();
    }
   setupCorpus();
   setupPublish();
   syncState().then(function () { setupCorpus(); });
 })();
