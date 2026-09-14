'use strict';

const zlib = require('node:zlib');
const { readZip } = require('./zip');

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodeEntities(text) {
  return String(text || '')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-zA-Z]+);/g, (match, name) => (ENTITIES[name] != null ? ENTITIES[name] : match));
}

function xmlToText(xml) {
  return decodeEntities(
    String(xml || '')
      .replace(/<w:tab[^>]*\/>/g, '\t')
      .replace(/<w:br[^>]*\/>/g, '\n')
      .replace(/<\/w:p>/g, '\n')
      .replace(/<\/a:p>/g, '\n')
      .replace(/<[^>]+>/g, '')
  ).replace(/\u0000/g, '');
}

function cleanText(text) {
  return String(text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractDocx(zip) {
  const main = zip.entries['word/document.xml'];
  if (!main) throw new Error('这个 Word 文件里没有正文');
  return cleanText(xmlToText(main.toString('utf8')));
}

function extractPptx(zip) {
  const slides = zip.list
    .map(item => item.name)
    .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/(\d+)\.xml$/)[1]) - Number(b.match(/(\d+)\.xml$/)[1]));
  if (!slides.length) throw new Error('这个 PPT 文件里没有幻灯片');
  const parts = slides.map((name, index) => {
    const text = xmlToText(zip.entries[name].toString('utf8')).split('\n').map(line => line.trim()).filter(Boolean).join('\n');
    return '## 第 ' + (index + 1) + ' 页\n\n' + text;
  });
  return cleanText(parts.join('\n\n'));
}

function extractSharedStrings(zip) {
  const xml = zip.entries['xl/sharedStrings.xml'];
  if (!xml) return [];
  const out = [];
  String(xml.toString('utf8')).replace(/<si>([\s\S]*?)<\/si>/g, (_, inner) => {
    const runs = [...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(match => decodeEntities(match[1]));
    out.push(runs.join(''));
    return '';
  });
  return out;
}

function extractXlsx(zip) {
  const shared = extractSharedStrings(zip);
  const sheets = zip.list
    .map(item => item.name)
    .filter(name => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/(\d+)\.xml$/)[1]) - Number(b.match(/(\d+)\.xml$/)[1]));
  if (!sheets.length) throw new Error('这个 Excel 文件里没有工作表');
  const blocks = sheets.map(name => {
    const xml = zip.entries[name].toString('utf8');
    const rows = [];
    String(xml).replace(/<row[^>]*>([\s\S]*?)<\/row>/g, (_, rowXml) => {
      const cells = [];
      rowXml.replace(/<c([^>]*)>([\s\S]*?)<\/c>/g, (_, attrs, inner) => {
        const type = (attrs.match(/t="([^"]+)"/) || [])[1];
        if (type === 'inlineStr') {
          const text = [...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(match => decodeEntities(match[1])).join('');
          cells.push(text);
        } else {
          const value = (inner.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
          if (value == null) { cells.push(''); return ''; }
          cells.push(type === 's' ? (shared[Number(value)] || '') : decodeEntities(value));
        }
        return '';
      });
      rows.push(cells.join('\t'));
      return '';
    });
    return rows.filter(row => row.trim()).join('\n');
  });
  return cleanText(blocks.join('\n\n'));
}

function extractPdf(buffer) {
  const warnings = [];
  const chunks = [];
  const raw = buffer.toString('latin1');
  const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;
  while ((match = streamRe.exec(raw)) !== null) {
    let content = Buffer.from(match[1], 'latin1');
    try { content = zlib.inflateSync(content); } catch (_) { /* 明文流 */ }
    const text = content.toString('latin1');
    if (!/(BT|Tj|TJ)/.test(text)) continue;
    const pieces = [];
    text.replace(/\(((?:\\.|[^()\\])*)\)\s*(?:Tj|'|")/g, (_, value) => {
      pieces.push(value.replace(/\\([()\\])/g, '$1'));
      return '';
    });
    text.replace(/\[([^\]]*)\]\s*TJ/g, (_, array) => {
      array.replace(/\((?:\\.|[^()\\])*\)/g, part => {
        pieces.push(part.slice(1, -1).replace(/\\([()\\])/g, '$1'));
        return '';
      });
      return '';
    });
    if (pieces.length) chunks.push(pieces.join(''));
  }
  if (!chunks.length) {
    warnings.push('这个 PDF 可能没有可提取的文字层（扫描件需先做 OCR）。');
    return { text: '', warnings };
  }
  warnings.push('PDF 文字按版式抽取，中文可能出现断行或乱序，请核对后再用。');
  return { text: cleanText(chunks.join('\n')), warnings };
}

function detectKind(filename) {
  const name = String(filename || '').toLowerCase();
  if (name.endsWith('.docx')) return 'docx';
  if (name.endsWith('.pptx')) return 'pptx';
  if (name.endsWith('.xlsx')) return 'xlsx';
  if (name.endsWith('.pdf')) return 'pdf';
  if (name.endsWith('.md') || name.endsWith('.markdown')) return 'markdown';
  if (name.endsWith('.txt') || name.endsWith('.text')) return 'txt';
  return '';
}

function extractDocument(filename, buffer) {
  const kind = detectKind(filename);
  if (kind === 'markdown' || kind === 'txt') return { format: kind, text: cleanText(buffer.toString('utf8')), warnings: [] };
  if (kind === 'pdf') return { format: 'pdf', ...extractPdf(buffer) };
  if (!kind) return { format: '', text: '', warnings: ['暂不支持这种格式，请上传 docx、pptx、xlsx、pdf、md 或 txt。'] };
  const zip = readZip(buffer);
  if (kind === 'docx') return { format: 'docx', text: extractDocx(zip), warnings: [] };
  if (kind === 'pptx') return { format: 'pptx', text: extractPptx(zip), warnings: [] };
  return { format: 'xlsx', text: extractXlsx(zip), warnings: [] };
}

module.exports = { extractDocument, detectKind, cleanText, decodeEntities };
