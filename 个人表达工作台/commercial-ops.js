 'use strict';

 const { extractDocument } = require('./doc-extract');
 const { buildDocx, buildPptx } = require('./ooxml-export');

 const COMMERCIAL_TYPES = [
   { id: 'nonstandard', name: '非标商业' },
   { id: 'curated', name: '策展式商业' },
   { id: 'cluster', name: '集中商业' },
   { id: 'department', name: '传统百货' }
 ];

 const AUDIENCES = [
   { id: '给政府看', label: '给政府看', hint: '讲区域价值、就业、税收、产业带动和政策契合；少讲租金与商业机密，语气克制。' },
   { id: '给品牌方看', label: '给品牌方看', hint: '讲客群、客流、消费力、周边配套、同层品牌和开业节奏，写清品牌能得到什么。' },
   { id: '给内部看', label: '给内部看', hint: '讲租金测算、成本、出租率、风险、退出条件和进度责任；用「我方」，数字完整可追责。' }
 ];

 const FRAMEWORK_PRESETS = [
   { name: '项目判断与定位', description: '一句话说清这是什么项目、给谁、凭什么是它。先给结论，再给依据。', priority: '高优先级' },
   { name: '区位与客群', description: '周边人口、消费力、交通与配套；核心客群是谁，有多大，为什么来。', priority: '高优先级' },
   { name: '市场与同类项目', description: '同类项目现状、空档和借鉴点。客观陈述，不做绝对化比较。', priority: '中优先级' },
   { name: '业态配比', description: '各业态占比、面积和主力店。给出配比表，说明每个业态承担什么。', priority: '高优先级' },
   { name: '品牌落位', description: '分层落位、首店与主力品牌、意向与储备名单。标清哪些已谈、哪些在谈。', priority: '高优先级' },
   { name: '租金测算', description: '面积、单价、出租率和年租金；分业态测算，给出区间与假设。', priority: '高优先级' },
   { name: '招商政策与合作条件', description: '免租期、装补、扣点与联营条件；分品牌层级给政策。', priority: '中优先级' },
   { name: '开业节奏与分期', description: '筹备、招商、装修、开业的时间节点与阶段目标。', priority: '中优先级' },
   { name: '风险与应对', description: '招商、租金、工期和竞争风险，逐条给应对与责任。', priority: '中优先级' }
 ];

 const DRILL_KINDS = [
   { id: 'stance', name: '立场与人称', hint: '对内用「我方」陈述。客观点讲双方各自承担什么。' },
   { id: 'wording', name: '用词', hint: '换成你平时会说的那个词，不用宣传腔和行话。' },
   { id: 'syntax', name: '句式', hint: '一句一个判断。长句拆开，转折改陈述。' },
   { id: 'order', name: '语序与焦点', hint: '先写结论，再写依据。先立标杆再说落地。' },
   { id: 'rhetoric', name: '修辞', hint: '去掉赋能、打造、闭环、抓手。事实自己说话。' },
   { id: 'rhythm', name: '节奏与详略', hint: '场景段展开，判断段精简。长短句交错。' },
   { id: 'discourse', name: '篇章与标题', hint: '标题即判断。看完标题就知道这页说什么。' },
   { id: 'facts', name: '数字与专名', hint: '数字、专名、引用按原文，不改写不四舍五入。' },
   { id: 'boundary', name: '边界与反例', hint: '不说最、第一、唯一、独有。留有余地。' }
 ];

  const PROJECT_MARK = /广场|天地|mall|万华|麓|太古|印力|龙湖|大悦城|百货|奥莱|IFS|K11|万象|喜茶|盒马|宜家|SKP|太古里|万象城/i;

 function fail(message, status) {
   const error = new Error(message);
   error.status = status || 400;
   throw error;
 }

 function typeName(id) {
   const found = COMMERCIAL_TYPES.find(item => item.id === id);
   return found ? found.name : '';
 }

 function normalizeCommercialTypes(raw) {
   const list = Array.isArray(raw) ? raw : (raw == null || raw === '' ? [] : [raw]);
   const out = [];
   const seen = new Set();
   list.forEach(item => {
     const value = String(item || '').trim();
     if (!value) return;
     const match = COMMERCIAL_TYPES.find(type => type.id === value || type.name === value);
     if (!match) fail('商业类型只能是非标商业、策展式商业、集中商业、传统百货');
     if (!seen.has(match.id)) {
       seen.add(match.id);
       out.push(match.id);
     }
   });
   return out;
 }

  function looksLikeProject(term) {
    const value = String(term || '').trim();
    if (value.length < 2 || value.length > 12) return false;
    if (/^\d/.test(value)) return false;
    if (/[的是和与在了把被将到及或]/.test(value)) return false;
    return PROJECT_MARK.test(value);
  }

  function extractProjects(article, candidates) {
    const seen = new Set();
    const out = [];
    const text = String(article || '');
    function add(name, count) {
      const term = String(name || '').trim();
      if (!term || seen.has(term) || !text.includes(term) || !looksLikeProject(term)) return;
      seen.add(term);
      const hits = Number(count) || (text.split(term).length - 1);
      out.push({ name: term, count: hits || 1, articleCount: 1 });
    }
    (candidates || []).forEach(item => add(item.term || item.name, item.count));
    text.split(/[^\u4e00-\u9fffA-Za-z]+/).filter(Boolean).forEach(run => {
      const max = Math.min(12, run.length);
      for (let n = 2; n <= max; n += 1) {
        for (let i = 0; i + n <= run.length; i += 1) add(run.slice(i, i + n));
      }
    });
    return out
      .sort((a, b) => (b.count - a.count) || (a.name.length - b.name.length))
      .filter(item => !out.some(other => other.name !== item.name && item.name.includes(other.name) && other.count >= item.count))
      .slice(0, 40);
  }

  function countArticlesWithName(articles, name) {
    const term = String(name || '').trim();
    if (!term) return 0;
    return (articles || []).filter(row => String(row.body || '').includes(term)).length;
  }

  function articleIdsForName(articles, name) {
    const term = String(name || '').trim();
    if (!term) return [];
    return (articles || []).filter(row => String(row.body || '').includes(term)).map(row => row.id).filter(Boolean);
  }

 function uniqueBy(list, keyFn) {
   const seen = new Set();
   const out = [];
   (list || []).forEach(item => {
     const key = keyFn(item);
     if (!key || seen.has(key)) return;
     seen.add(key);
     out.push(item);
   });
   return out;
 }

 function splitSentences(text) {
   return String(text || '').split(/[。！？\n]/).map(item => item.trim()).filter(Boolean);
 }

  function findPair(fromSentence, toSentence) {
    const from = String(fromSentence || '');
    const to = String(toSentence || '');
    if (!from || !to || from === to) return null;
    const max = 240;
    const left = from.length > max ? from.slice(0, max) : from;
    const right = to.length > max ? to.slice(0, max) : to;
    let i = 0;
    const shared = Math.min(left.length, right.length);
    while (i < shared && left[i] === right[i]) i += 1;
    let a = left.length;
    let b = right.length;
    while (a > i && b > i && left[a - 1] === right[b - 1]) {
      a -= 1;
      b -= 1;
    }
    let fromMid = left.slice(i, a).trim();
    let toMid = right.slice(i, b).trim();
    if (/^[\d%％.\s]+$/.test(fromMid) || /^[\d%％.\s]+$/.test(toMid)) return null;
    if (fromMid.length < 2 || toMid.length < 2 || fromMid === toMid) return null;
    if (fromMid.length > 12) fromMid = fromMid.slice(0, 12);
    if (toMid.length > 12) toMid = toMid.slice(0, 12);
    return { from: fromMid, to: toMid, kind: toMid.length >= 5 ? 'phrase' : 'term' };
  }

 function diffRewrite(generated, corrected) {
   const left = String(generated || '').trim();
   const right = String(corrected || '').trim();
   if (!right) fail('先把你改过的这一稿贴进来');
   const replacements = [];
   const habits = [];
   const leftSentences = splitSentences(left);
   const rightSentences = splitSentences(right);
   const count = Math.max(leftSentences.length, rightSentences.length);
   for (let i = 0; i < count; i += 1) {
     const from = leftSentences[i] || '';
     const to = rightSentences[i] || '';
     if (!from || !to || from === to) continue;
     const pair = findPair(from, to);
     if (pair) replacements.push(pair);
      if (from.length >= 4 && to.length >= 4) {
        habits.push({
          name: '人工校对',
          layer: '用词和口径',
          from,
          to,
          statement: '「' + from.slice(0, 48) + '」改成「' + to.slice(0, 48) + '」'
        });
      }
   }
   if (!replacements.length && left && right && left !== right) {
     const pair = findPair(left.slice(0, 80), right.slice(0, 80));
     if (pair) replacements.push(pair);
   }
   return {
     replacements: uniqueBy(replacements, item => item.from + '→' + item.to),
     habits: uniqueBy(habits, item => item.statement).slice(0, 12)
   };
 }

 function pickTerms(pack, count) {
   const terms = [].concat((pack && pack.terms) || [], (pack && pack.phrases) || []).map(item => String(item).split(/\s*(?:→|->)\s*/)[0].trim()).filter(Boolean);
   return terms.slice(0, count);
 }

  function pickFour(terms, offset) {
    const pool = (terms && terms.length) ? terms : ['非标商业', '主力店', '客流', '租金'];
    const start = Math.abs(Number(offset) || 0) % pool.length;
    return [0, 1, 2, 3].map(step => pool[(start + step) % pool.length]);
  }

  function makeDrill(kindId, pack, variant) {
    const kind = DRILL_KINDS.find(item => item.id === kindId) || DRILL_KINDS[0];
    const terms = pickTerms(pack, 4);
    const index = Math.abs(Number(variant) || 0);
    const [a, b, c, d] = pickFour(terms, Math.floor(index / 3));
    const templates = {
      stance: [
        '我们打造了' + a + '，我们抢客流，竞品做不到，我们能打赢。',
        '我们不必再组' + b + '团队，合作方会把' + c + '做起来，我们省心。',
        '我方认为' + a + '是我们的核心优势，别人复制不了。'
      ],
      wording: [
        '通过优化' + c + '结构，可以有效提升项目的核心竞争力和综合价值。',
        '以' + a + '为引擎，以' + b + '为抓手，打造' + c + '闭环，全面赋能招商。',
        '本项目致力于打造区域标杆，构建' + a + '生态矩阵。'
      ],
      syntax: [
        a + '依托' + b + '形成全天候消费场景并在此基础上持续放大' + c + '价值最终实现场内品牌协同发展。',
        '项目整体定位清晰，但是在' + b + '落位上仍有调整空间，不过不影响' + c + '的基本盘。',
        '我们要把' + a + '做好，同时把' + b + '做好，并且把' + c + '做好，最终把' + d + '做好。'
      ],
      order: [
        '我们已和' + b + '谈成合作，参考了成都太古里的做法，效果值得期待。',
        '先说' + c + '的增长数据，再说我们怎么对接' + a + '，最后说结论。',
        '项目周边' + c + '一般，但我们是' + a + '，所以能站住。'
      ],
      rhetoric: [
        a + '拥有独特的核心优势，赋能商家、打造闭环、抓手清晰，别人复制不了。',
        '本项目将构建' + a + '的生态矩阵，形成' + b + '的强力抓手，打通' + c + '的任督二脉。',
        '以' + a + '为引擎，以' + b + '为闭环，全方位赋能' + c + '，打造行业标杆。'
      ],
      rhythm: [
        '接下来汇报项目情况。项目位于核心区位。周边客群稳定。' + a + '有基础。' + b + '待优化。',
        a + '的定位、' + b + '的组合、' + c + '的动线、' + d + '的口径，都要在今天这页讲清楚，而且要讲得让领导听得明白、记得住、能复述。',
        '关于' + a + '，我们做了大量调研，形成了完整判断，下面分三个方面汇报。'
      ],
      discourse: [
        '调研结论。以下是本次调研的主要内容。',
        '关于' + b + '落位的说明：' + b + '落位受多因素影响，需要综合判断。',
        '本页介绍' + a + '相关情况，包括背景、现状和后续计划。'
      ],
      facts: [
        a + '约 20000 平方米，预计出租率能到 95%，年租金大概 2000 万左右。',
        '项目已于去年开业，面积约 3.8 万方，客流达到每天五万人。',
        a + '占比约 45%，' + b + '约 30%，其余为' + c + '，合计约 1.2 亿元。'
      ],
      boundary: [
        a + '是区域内最大的' + b + '中心，也是唯一一家，竞争优势明显。',
        '本项目拥有国内一流的' + a + '，是最具价值的' + b + '，别人复制不了。',
        '我们的' + c + '是最好的，租金一定谈得下来，底线不能退。'
      ]
    };
    const list = templates[kind.id] || templates.wording;
    const picked = index % list.length;
    return { kind: kind.id, name: kind.name, hint: kind.hint, prompt: list[picked], terms: terms, variant: index };
  }

  function makeDrills(kindId, pack, count) {
    const total = Math.max(1, Math.min(20, Number(count) || 1));
    const out = [];
    for (let i = 0; i < total; i += 1) out.push(makeDrill(kindId, pack, i));
    return out;
  }

 function flattenTerms(packs, kind) {
   const out = [];
   (packs || []).forEach(pack => {
     const hits = pack.termHits && typeof pack.termHits === 'object' ? pack.termHits : {};
     const list = kind === 'phrase' ? (pack.phrases || []) : (pack.terms || []);
     list.forEach(term => {
       const text = String(term || '').trim();
       if (!text) return;
       out.push({
         term: text,
         kind: kind || 'term',
         packId: pack.id,
         packName: pack.name,
         articleCount: Number(hits[text.split(/\s*(?:→|->)\s*/)[0]] || hits[text] || 0)
       });
     });
   });
   return out.sort((a, b) => (b.articleCount - a.articleCount) || (b.term.length - a.term.length));
 }

  function matchProjects(projects, source) {
    const text = String(source || '');
    if (!text.trim()) return [];
    return (projects || [])
      .filter(item => item.status === 'accepted')
      .filter(item => {
        if (text.includes(item.name)) return true;
        if ((item.commercialTypes || []).map(typeName).some(name => name && text.includes(name))) return true;
        return (item.terms || []).some(term => {
          const from = String(term).split(/\s*(?:→|->)\s*/)[0];
          return from && from.length >= 2 && text.includes(from);
        });
      })
      .sort((a, b) => (Number(b.articleCount) || 0) - (Number(a.articleCount) || 0));
  }

 function searchProjects(projects, source) {
    const text = String(source || '').trim();
    return (projects || [])
      .filter(item => item.status === 'accepted')
      .filter(item => {
        if (!text) return true;
        if (String(item.name || '').includes(text) || text.includes(item.name)) return true;
        if ((item.commercialTypes || []).map(typeName).some(name => name && (name.includes(text) || text.includes(name)))) return true;
        return (item.terms || []).some(term => {
          return String(term || '').split(/\s*(?:→|->)\s*/).some(part => part && (part.includes(text) || text.includes(part)));
        });
      })
      .sort((a, b) => (Number(b.articleCount) || 0) - (Number(a.articleCount) || 0));
  }

 function industryCasePrompt(projects) {
   if (!projects.length) return '';
   return '相关案例（按重复率写入口径，保持数字原值）：\n' + projects.map(item => {
     const types = (item.commercialTypes || []).map(typeName).filter(Boolean).join('、');
     return '- ' + item.name + (types ? ' · ' + types : '') + (item.features ? '：' + String(item.features).slice(0, 80) : '');
   }).join('\n');
 }

  function upsertProjectFromExtract(api, user, item, articleId, types) {
    const name = String(item.name || '').trim();
    if (!name) return null;
    const articleRow = articleId ? api.listResources(user, 'article').find(row => row.id === articleId) : null;
    const snippet = splitSentences(articleRow && articleRow.body).find(row => row.includes(name)) || '';
    const features = String(snippet).slice(0, 120);
    const existing = api.listResources(user, 'project').find(row => row.name === name);
    if (!existing) {
      const articleIds = articleId ? [articleId] : [];
      const articleCount = articleIds.length;
      const status = articleCount >= 2 ? 'candidate' : 'pending';
      return api.resource(user, 'project', {
        name,
        commercialTypes: types,
        features,
        terms: [],
        articleIds,
        articleCount,
        domain: 'commercial-ops',
        status
      });
    }
    const articleIds = Array.isArray(existing.articleIds) ? existing.articleIds.slice() : [];
    if (articleId && !articleIds.includes(articleId)) articleIds.push(articleId);
    const articleCount = articleIds.length;
    const status = existing.status === 'accepted' ? 'accepted' : (articleCount >= 2 ? 'candidate' : (existing.status || 'pending'));
    const commercialTypes = uniqueBy([].concat(existing.commercialTypes || [], types || []), String);
    const patch = { articleIds, articleCount, status, commercialTypes };
    if (!existing.features && features) patch.features = features;
    return api.updateResource(user, 'project', existing.id, patch);
  }

  function linkAcceptedTerms(api, user, terms, types, source) {
    const list = (terms || []).map(item => String(item || '').split(/\s*(?:→|->)\s*/).pop().trim()).filter(Boolean);
    if (!list.length) return [];
    const projects = matchProjects(api.listResources(user, 'project'), source);
    return projects.map(project => {
      const mergedTerms = uniqueBy([].concat(project.terms || [], list), String);
      const mergedTypes = uniqueBy([].concat(project.commercialTypes || [], types || []), String);
      const row = api.updateResource(user, 'project', project.id, { terms: mergedTerms, commercialTypes: mergedTypes });
      writeLinks(api, user, row);
      return row;
    });
  }

  function writeLinks(api, user, project) {
    if (!project || !project.id) return;
    const existing = api.listResources(user, 'link').filter(item => item.projectId === project.id);
    const seen = new Set(existing.map(item => String(item.commercialType || '') + '\0' + String(item.term || '')));
    const types = project.commercialTypes || [];
    const terms = (project.terms || []).length ? project.terms : (project.name ? [project.name] : []);
    types.forEach(type => {
      terms.forEach(term => {
        const value = String(term || '').trim();
        if (!value) return;
        const key = type + '\0' + value;
        if (seen.has(key)) return;
        seen.add(key);
        api.resource(user, 'link', {
          projectId: project.id,
          projectName: project.name,
          commercialType: type,
          term: value,
          articleCount: project.articleCount,
          status: 'active'
        });
      });
    });
  }

  const UNIT_BASE = { '亿元': '亿', '亿': '亿', '万元': '万', '万': '万', '元': '元', '平方米': '平方米', '平米': '平方米', '㎡': '平方米', '方': '平方米', '个': '个', '家': '家', '人': '人', '%': '%', '％': '%' };
  const UNIT_SCALE = { '亿元': 1e8, '亿': 1e8, '万元': 1e4, '万': 1e4, '元': 1, '平方米': 1, '平米': 1, '㎡': 1, '方': 1, '个': 1, '家': 1, '人': 1, '%': 1, '％': 1 };
  const CN_NUM = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10, '两': 2 };
   const NUMBER_RE = /([\u4e00-\u9fff]{0,12}?)\s*(\d[\d,]*(?:\.\d+)?)\s*(亿元|万元|平方米|平米|㎡|亿|万|元|%|％|个|家|人|方)/g;

  function collectNumbers(text, title) {
    const out = [];
    let match;
    const re = new RegExp(NUMBER_RE.source, 'g');
    while ((match = re.exec(text)) !== null) {
      const label = match[1].replace(/[的了在与和及或等约为是达共超过将近、，,]/g, '').slice(-3);
      const value = Number(match[2].replace(/,/g, ''));
      if (!Number.isFinite(value)) continue;
      out.push({
        label,
        raw: (match[1] + match[2] + match[3]).trim(),
        base: UNIT_BASE[match[3]],
        scaled: value * UNIT_SCALE[match[3]],
        section: title || '',
        snippet: text.slice(Math.max(0, match.index - 10), match.index + match[0].length).trim()
      });
    }
    return out;
  }

  function consistencyReport(sections) {
    const list = (sections || []).map(section => ({ title: String(section.title || ''), text: String(section.text || '') })).filter(section => section.text.trim());
    if (!list.length) fail('先贴至少一段正文，再做核对');
    const tokens = [];
    list.forEach(section => collectNumbers(section.text, section.title).forEach(token => tokens.push(token)));
    const groups = new Map();
    tokens.forEach(token => {
      if (token.label.length < 2) return;
      const key = token.label + '|' + token.base;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(token);
    });
    const conflicts = [];
    groups.forEach((rows, key) => {
      const distinct = [...new Set(rows.map(row => row.scaled))];
      if (distinct.length < 2) return;
      conflicts.push({
        type: 'number',
        level: 'high',
        label: key.split('|')[0] + '（' + key.split('|')[1] + '）',
        message: '同一指标出现了不同数值，需统一',
        values: rows.map(row => ({ value: row.raw, section: row.section, snippet: row.snippet }))
      });
    });
    const allText = list.map(section => section.text).join('\n');
    const countRe = /([一二三四五六七八九十两\d]+)\s*[个套种项]\s*(方案|板块|业态|章节|部分|项目|品牌)/g;
    let countMatch;
    while ((countMatch = countRe.exec(allText)) !== null) {
      const stated = CN_NUM[countMatch[1]] || Number(countMatch[1]);
      if (!stated || stated > 30) continue;
      const noun = countMatch[2];
      const pattern = noun === '方案' ? /方案[一二三四五六七八九十\d]/g : new RegExp(noun + '[一二三四五六七八九十\\d]', 'g');
      const found = [...new Set(allText.match(pattern) || [])];
      if (found.length && found.length !== stated) conflicts.push({ type: 'count', level: 'high', label: '数量对不上', message: '文中写「' + countMatch[0] + '」，实际只能数出 ' + found.length + ' 个', values: found.map(item => ({ value: item, section: '', snippet: item })) });
    }
    const entities = [...new Set(allText.match(/[\u4e00-\u9fff]{2,8}(?:购物中心|广场|天地|中心|街区|商场|项目|城|里)/g) || [])];
    const byHead = new Map();
    entities.forEach(name => {
      if (name.length < 4) return;
      const head = name.slice(0, 2);
      if (!byHead.has(head)) byHead.set(head, []);
      byHead.get(head).push(name);
    });
    byHead.forEach((names, head) => {
      const distinct = [...new Set(names)];
      if (distinct.length > 1) conflicts.push({ type: 'name', level: 'low', label: head + '…', message: '同一对象可能有两种写法，确认用哪一个', values: distinct.map(item => ({ value: item, section: '', snippet: item })) });
    });
    conflicts.sort((a, b) => (a.level === 'high' ? 0 : 1) - (b.level === 'high' ? 0 : 1));
    return { checked: { sections: list.length, numbers: tokens.length, entities: entities.length }, conflicts, summary: conflicts.length ? '发现 ' + conflicts.length + ' 处需要核对' : '没发现明显不一致' };
  }

  function readRawBody(req, limit) {
    return new Promise((resolve, reject) => {
      let size = 0;
      const chunks = [];
      req.on('data', chunk => {
        size += chunk.length;
        if (size > limit) { reject(Object.assign(new Error('文件太大，请压缩后再传'), { status: 413 })); req.destroy(); return; }
        chunks.push(chunk);
      });
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', reject);
    });
  }

  async function handle(req, res, url, api) {
   const parts = url.pathname.split('/').filter(Boolean);
   const method = req.method;
   const user = api.user;

   if (method === 'GET' && url.pathname === '/api/industry/types') {
     return api.json(res, 200, COMMERCIAL_TYPES);
   }

   if (method === 'GET' && url.pathname === '/api/industry/terms') {
     api.requirePermission(req, 'read');
     const kind = url.searchParams.get('kind') === 'phrase' ? 'phrase' : 'term';
     return api.json(res, 200, flattenTerms(api.listResources(user, 'context'), kind));
   }

   if (method === 'GET' && url.pathname === '/api/industry/drills') {
     return api.json(res, 200, DRILL_KINDS);
   }

   if (method === 'POST' && url.pathname === '/api/industry/drills') {
     api.requirePermission(req, 'write');
     const body = await api.parseBody(req);
     const packs = api.listResources(user, 'context');
     const pack = packs.find(item => item.id === body.packId) || packs[0] || null;
     if (body.count) {
       const prompts = makeDrills(body.kind || body.type, pack, body.count);
       return api.json(res, 200, { kind: prompts[0].kind, name: prompts[0].name, hint: prompts[0].hint, prompts });
     }
     const drill = makeDrill(body.kind || body.type, pack);
     return api.json(res, 200, drill);
   }

   if (method === 'POST' && url.pathname === '/api/industry/drills/confirm') {
     api.requirePermission(req, 'write');
     const body = await api.parseBody(req);
     const prompt = api.validateText(body.prompt || body.source, 'prompt');
     const corrected = api.validateText(body.corrected || body.answer, 'corrected');
     const diff = diffRewrite(prompt, corrected);
     const acceptedHabits = [];
     (Array.isArray(body.habits) ? body.habits : diff.habits).forEach(item => {
       const statement = String(item.statement || item.text || '').trim();
       if (!statement) return;
       acceptedHabits.push(api.resource(user, 'rule', {
         name: item.name || '人工校对',
         statement,
         text: statement,
         layer: item.layer || '用词和口径',
         dimension: item.dimension || body.dimension || '',
         scene: body.scene || '',
         sourceRef: body.sourceRef || '',
         confirmed: true,
         status: 'confirmed',
         source: 'drill'
       }));
     });
     const packs = api.listResources(user, 'context');
     const pack = packs.find(item => item.id === body.packId) || packs[0] || null;
     const acceptedTerms = [];
     if (pack && Array.isArray(body.replacements) && body.replacements.length) {
       const terms = (pack.terms || []).slice();
       const phrases = (pack.phrases || []).slice();
       body.replacements.forEach(item => {
         const from = String(item.from || '').trim();
         const to = String(item.to || '').trim();
         if (!from || !to) return;
         const mapped = from + '→' + to;
         if (item.kind === 'phrase') phrases.push(mapped);
         else terms.push(mapped);
         acceptedTerms.push(mapped);
       });
       api.updateResource(user, 'context', pack.id, { terms: uniqueBy(terms, String), phrases: uniqueBy(phrases, String) });
     }
     if (corrected.length >= 20) {
       api.resource(user, 'sample', { title: '人工校对', body: corrected, scene: body.intent || '', kind: '判断', source: 'drill' });
     }
     return api.json(res, 200, { habits: acceptedHabits, terms: acceptedTerms, diff });
   }

   if (method === 'GET' && url.pathname === '/api/industry/links') {
     api.requirePermission(req, 'read');
     const source = String(url.searchParams.get('q') || url.searchParams.get('source') || '');
     const links = api.listResources(user, 'link');
     const projects = searchProjects(api.listResources(user, 'project'), source);
     const terms = flattenTerms(api.listResources(user, 'context'), 'term').filter(item => !source || source.includes(item.term.split(/\s*(?:→|->)\s*/)[0]));
     const filtered = source
       ? links.filter(item => source.includes(item.term) || projects.some(project => project.id === item.projectId || project.name === item.projectName))
       : links;
     filtered.sort((a, b) => (Number(b.articleCount) || 0) - (Number(a.articleCount) || 0));
     return api.json(res, 200, { links: filtered, projects, terms });
   }

   if (parts[1] === 'articles' && parts.length === 2) {
     api.requirePermission(req, method === 'GET' ? 'read' : 'write');
     if (method === 'GET') return api.json(res, 200, api.listResources(user, 'article'));
     if (method === 'POST') {
       const body = await api.parseBody(req);
       const article = api.validateText(body.body || body.article || body.text, 'body');
       const types = normalizeCommercialTypes(body.commercialTypes || body.types);
       const created = api.resource(user, 'article', {
         title: String(body.title || '').trim() || article.slice(0, 24),
         body: article,
         url: String(body.url || '').trim(),
         commercialTypes: types,
         domain: 'commercial-ops',
         status: 'active'
       });
       return api.json(res, 201, created);
     }
   }

   if (parts[1] === 'projects' && parts.length === 2) {
     api.requirePermission(req, method === 'GET' ? 'read' : 'write');
     if (method === 'GET') {
       const type = url.searchParams.get('type');
       const status = url.searchParams.get('status');
       const typeId = type ? normalizeCommercialTypes([type])[0] : '';
       let items = api.listResources(user, 'project');
       if (typeId) items = items.filter(item => (item.commercialTypes || []).includes(typeId));
       if (status) items = items.filter(item => item.status === status);
        else if (typeId) items = items.filter(item => item.status === 'accepted');
       return api.json(res, 200, items);
     }
           if (method === 'POST') {
        const body = await api.parseBody(req);
        const name = api.validateText(body.name, 'name', 80);
        const types = normalizeCommercialTypes(body.commercialTypes || body.types);
        const terms = Array.isArray(body.terms) ? body.terms : [];
        const articles = api.listResources(user, 'article');
        const articleIds = uniqueBy([].concat(Array.isArray(body.articleIds) ? body.articleIds : [], articleIdsForName(articles, name)), String);
        const features = String(body.features || '').trim();
        const detail = {
          location: String(body.location || '').trim(),
          area: String(body.area || '').trim(),
          openedAt: String(body.openedAt || '').trim(),
          anchorBrands: uniqueBy(Array.isArray(body.anchorBrands) ? body.anchorBrands : [], String),
          highlights: uniqueBy(Array.isArray(body.highlights) ? body.highlights : [], String)
        };
        const existing = api.listResources(user, 'project').find(row => row.name === name);
        const payload = {
          name,
          commercialTypes: types,
          features,
          terms,
          articleIds,
          articleCount: articleIds.length || 1,
          domain: 'commercial-ops',
          status: body.status === 'candidate' ? 'candidate' : 'accepted',
          ...detail
        };
        if (existing) {
          payload.commercialTypes = uniqueBy([].concat(existing.commercialTypes || [], types), String);
          payload.terms = uniqueBy([].concat(existing.terms || [], terms), String);
          payload.articleIds = uniqueBy([].concat(existing.articleIds || [], articleIds), String);
          payload.articleCount = payload.articleIds.length || existing.articleCount || 1;
          payload.anchorBrands = uniqueBy([].concat(existing.anchorBrands || [], detail.anchorBrands), String);
          payload.highlights = uniqueBy([].concat(existing.highlights || [], detail.highlights), String);
          if (!features) payload.features = existing.features || '';
          if (!detail.location) payload.location = existing.location || '';
          if (!detail.area) payload.area = existing.area || '';
          if (!detail.openedAt) payload.openedAt = existing.openedAt || '';
          const updated = api.updateResource(user, 'project', existing.id, payload);
          writeLinks(api, user, updated);
          return api.json(res, 200, updated);
        }
        const created = api.resource(user, 'project', payload);
        writeLinks(api, user, created);
        return api.json(res, 201, created);
     }
   }

   if (parts[1] === 'projects' && parts[2] && parts.length === 3) {
     api.requirePermission(req, method === 'GET' ? 'read' : 'write');
     const current = api.listResources(user, 'project').find(item => item.id === parts[2]);
     if (!current) fail('resource not found', 404);
     if (method === 'GET') {
       const articles = api.listResources(user, 'article').filter(item => (current.articleIds || []).includes(item.id));
       return api.json(res, 200, { ...current, articles });
     }
     if (method === 'PATCH') {
       const body = await api.parseBody(req);
       const patch = {};
       if (body.name) patch.name = api.validateText(body.name, 'name', 80);
       if (body.features != null) patch.features = String(body.features);
       if (body.terms) patch.terms = Array.isArray(body.terms) ? body.terms : [];
        if (body.status === 'accepted' || body.status === 'candidate') patch.status = body.status;
        if (body.commercialTypes || body.types) patch.commercialTypes = normalizeCommercialTypes(body.commercialTypes || body.types);
        if (body.location != null) patch.location = String(body.location);
        if (body.area != null) patch.area = String(body.area);
        if (body.openedAt != null) patch.openedAt = String(body.openedAt);
        if (body.anchorBrands) patch.anchorBrands = uniqueBy(Array.isArray(body.anchorBrands) ? body.anchorBrands : [], String);
        if (body.highlights) patch.highlights = uniqueBy(Array.isArray(body.highlights) ? body.highlights : [], String);
        const updated = api.updateResource(user, 'project', parts[2], patch);
        writeLinks(api, user, updated);
        return api.json(res, 200, updated);
     }
   }

   if (method === 'POST' && url.pathname === '/api/rewrite/correct') {
     api.requirePermission(req, 'write');
     const body = await api.parseBody(req);
     const generated = String(body.generated || body.candidate || '');
     const corrected = api.validateText(body.corrected || body.final || body.source, 'corrected');
     const diff = diffRewrite(generated || body.source || '', corrected);
     return api.json(res, 200, { ...diff, corrected });
   }

   if (method === 'POST' && url.pathname === '/api/rewrite/correct/accept') {
     api.requirePermission(req, 'write');
     const body = await api.parseBody(req);
     const generated = String(body.generated || '');
     const corrected = api.validateText(body.corrected, 'corrected');
     const diff = diffRewrite(generated, corrected);
     const replacements = Array.isArray(body.replacements) ? body.replacements : diff.replacements;
     const habits = Array.isArray(body.habits) ? body.habits : diff.habits;
     const packs = api.listResources(user, 'context');
     const pack = packs.find(item => item.id === body.packId) || packs[0] || null;
     if (pack && replacements.length) {
       const terms = (pack.terms || []).slice();
       const phrases = (pack.phrases || []).slice();
       replacements.forEach(item => {
         const mapped = String(item.from || '').trim() + '→' + String(item.to || '').trim();
         if (!item.from || !item.to) return;
         if (item.kind === 'phrase') phrases.push(mapped);
         else terms.push(mapped);
       });
       api.updateResource(user, 'context', pack.id, { terms: uniqueBy(terms, String), phrases: uniqueBy(phrases, String) });
     }
      const savedHabits = habits.map(item => api.resource(user, 'rule', {
        name: item.name || '人工改稿',
        statement: item.statement,
        text: item.statement,
        layer: item.layer || '用词和口径',
        dimension: item.dimension || '',
        confirmed: true,
        status: 'confirmed',
        source: 'rewrite-correct'
      }));
     if (corrected.length >= 20) {
       api.resource(user, 'sample', { title: '改过的这一稿', body: corrected, kind: '判断', source: 'rewrite-correct' });
     }
     return api.json(res, 200, { replacements, habits: savedHabits });
   }

   
    if (method === 'POST' && url.pathname === '/api/industry/terms/accept') {
      api.requirePermission(req, 'write');
      const body = await api.parseBody(req);
      const packs = api.listResources(user, 'context');
      const pack = packs.find(item => item.id === body.packId) || packs[0] || null;
      const replacements = Array.isArray(body.replacements) ? body.replacements : [];
      const acceptedTerms = [];
      if (pack && replacements.length) {
        const terms = (pack.terms || []).slice();
        const phrases = (pack.phrases || []).slice();
        replacements.forEach(item => {
          const from = String(item.from || '').trim();
          const to = String(item.to || item.term || '').trim();
          if (!to) return;
          const mapped = from && from !== to ? from + '→' + to : to;
          if (item.kind === 'phrase' || to.length >= 5) phrases.push(mapped);
          else terms.push(mapped);
          acceptedTerms.push(mapped);
        });
        api.updateResource(user, 'context', pack.id, { terms: uniqueBy(terms, String), phrases: uniqueBy(phrases, String) });
      }
      const types = normalizeCommercialTypes(body.commercialTypes || body.types || []);
      const source = String(body.source || body.article || '');
      const projects = linkAcceptedTerms(api, user, acceptedTerms, types, source);
   return api.json(res, 200, { terms: acceptedTerms, projects });
 }

   if (method === 'GET' && url.pathname === '/api/rewrite/audiences') {
     return api.json(res, 200, AUDIENCES);
   }

   if (method === 'GET' && url.pathname === '/api/frameworks/presets') {
     return api.json(res, 200, FRAMEWORK_PRESETS);
   }

   if (method === 'POST' && url.pathname === '/api/reports/consistency') {
     api.requirePermission(req, 'read');
     const body = await api.parseBody(req);
     let sections = Array.isArray(body.sections) ? body.sections : [];
     if (!sections.length && body.text) sections = [{ title: body.title || '正文', text: String(body.text) }];
     if (!sections.length && Array.isArray(body.documentIds) && body.documentIds.length) {
       const ids = body.documentIds.map(String);
       sections = api.listResources(user, 'document')
         .filter(doc => ids.includes(doc.id))
         .map(doc => ({ title: doc.name || '材料', text: doc.content || '' }));
     }
     return api.json(res, 200, consistencyReport(sections));
   }

   if (method === 'POST' && url.pathname === '/api/documents/extract') {
     api.requirePermission(req, 'write');
     const raw = await readRawBody(req, 25 * 1024 * 1024);
     let body;
     try { body = JSON.parse(raw.toString('utf8') || '{}'); } catch (_) { fail('上传内容读不出来'); }
     const filename = String(body.filename || '').slice(0, 200);
     const base64 = String(body.base64 || '').replace(/^data:[^,]*,/, '');
     if (!base64) fail('没有收到文件内容');
     let result;
     try { result = extractDocument(filename, Buffer.from(base64, 'base64')); } catch (error) { fail(error.message || '这个文件解析不了'); }
     const name = filename.replace(/\.[^.]+$/, '') || '未命名材料';
     const document = result.text
       ? api.resource(user, 'document', {
         name,
         category: '材料',
         content: result.text,
         kind: result.format,
         chars: result.text.length,
         source: filename,
         status: 'active'
       })
       : null;
     return api.json(res, 200, { filename, format: result.format, chars: result.text.length, warnings: result.warnings || [], text: result.text, document });
   }

   if (method === 'POST' && url.pathname === '/api/exports/document') {
     api.requirePermission(req, 'write');
     const body = await api.parseBody(req);
     const format = String(body.format || '').toLowerCase();
     if (format !== 'docx' && format !== 'pptx') fail('导出格式只支持 docx 或 pptx');
     const markdown = String(body.markdown || body.content || '');
     if (!markdown.trim()) fail('先有内容再导出');
     const title = String(body.title || '商业运营工作台').slice(0, 120);
     const buffer = format === 'docx' ? buildDocx({ title, markdown }) : buildPptx({ title, markdown });
     const safeTitle = title.replace(/[\\/:*?"<>|\s]+/g, '-').slice(0, 60) || '方案';
     res.writeHead(200, {
       'Content-Type': format === 'docx'
         ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
         : 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
       'Content-Disposition': "attachment; filename*=UTF-8''" + encodeURIComponent(safeTitle + '.' + format),
       'Content-Length': buffer.length,
       'Cache-Control': 'no-store'
     });
     res.end(buffer);
     return true;
   }

return false;
 }

 module.exports = {
   COMMERCIAL_TYPES,
   DRILL_KINDS,
   AUDIENCES,
   FRAMEWORK_PRESETS,
   normalizeCommercialTypes,
   consistencyReport,
   extractProjects,
    countArticlesWithName,
    articleIdsForName,
   diffRewrite,
   makeDrill,
   makeDrills,
   flattenTerms,
   matchProjects,
   industryCasePrompt,
   upsertProjectFromExtract,
   handle
 };
