(function (global) {
  'use strict';

  var STORAGE_KEY = 'expression-workbench-state';
  var LEGACY_KEY = 'expression-workbench-mvp';
  var SCHEMA_VERSION = 2;
  var seed = {
    schemaVersion: SCHEMA_VERSION,
    theme: 'blue',
    rewrite: { source: '', candidate: '', final: '', status: 'draft', confirmed: false },
    expressionRules: { sampleCount: 0, confirmedCount: 86, pendingCount: 12 },
    industries: { activeContext: '地产', entries: [], frameworks: [], frameworkVersions: [] },
    documents: [], documentProjects: [], documentChapters: [], exportRecords: [], rules: [], comments: [], diagnosis: { factsLocked: false },
    releases: [],
    reviews: []
  };

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function merge(base, value) {
    if (!value || typeof value !== 'object') return base;
    Object.keys(base).forEach(function (key) {
      if (value[key] && typeof base[key] === 'object' && !Array.isArray(base[key])) merge(base[key], value[key]);
      else if (value[key] !== undefined) base[key] = value[key];
    });
    return base;
  }
  function migrate(raw) {
    var next = clone(seed);
    if (!raw || typeof raw !== 'object') return next;
    if (raw.schemaVersion === 2) return merge(next, raw);
    next.theme = raw.theme || next.theme;
    next.rewrite.source = raw.source || '';
    next.rewrite.candidate = raw.candidate || '';
    next.rewrite.final = raw.final || '';
    next.rewrite.confirmed = raw.confirmed === true;
    next.rewrite.status = next.rewrite.confirmed ? 'confirmed' : (next.rewrite.candidate ? 'generated' : 'draft');
    next.expressionRules.sampleCount = Number(raw.samples) || 0;
    return next;
  }
  function read() {
    var raw;
    try { raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (e) { raw = null; }
    if (!raw) {
      try { raw = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null'); } catch (e2) { raw = null; }
    }
    return migrate(raw);
  }
  var state = read();
  function save() { state.schemaVersion = SCHEMA_VERSION; localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function update(mutator) { mutator(state); save(); return state; }
  global.ExpressionStore = { key: STORAGE_KEY, version: SCHEMA_VERSION, state: state, save: save, update: update };
})(window);
