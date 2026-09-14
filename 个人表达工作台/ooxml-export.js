'use strict';

const { writeZip } = require('./zip');

function xmlEsc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
  })[char]);
}

function parseBlocks(markdown) {
  const lines = String(markdown || '').replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) { i += 1; continue; }
    if (/^\|/.test(trimmed)) {
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        const cells = lines[i].trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
        if (!cells.every(cell => /^:?-{2,}:?$/.test(cell))) rows.push(cells);
        i += 1;
      }
      if (rows.length) blocks.push({ type: 'table', rows });
      continue;
    }
    const heading = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (heading) { blocks.push({ type: 'h', level: heading[1].length, text: heading[2].trim() }); i += 1; continue; }
    const bullet = trimmed.match(/^[-*+]\s+(.*)$/);
    if (bullet) { blocks.push({ type: 'li', text: bullet[1].trim() }); i += 1; continue; }
    blocks.push({ type: 'p', text: trimmed });
    i += 1;
  }
  return blocks;
}

const T = {
  docxHead: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
  wNs: 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
};

function docxRun(text, bold) {
  return '<w:r>' + (bold ? '<w:rPr><w:b/></w:rPr>' : '') + '<w:t xml:space="preserve">' + xmlEsc(text) + '</w:t></w:r>';
}

function docxParagraph(text, style, bold) {
  return '<w:p>' + (style ? '<w:pPr><w:pStyle w:val="' + style + '"/></w:pPr>' : '') + docxRun(text, bold) + '</w:p>';
}

function docxTable(rows) {
  const borders = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
    .map(side => '<w:' + side + ' w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>').join('') + '</w:tblBorders>';
  const body = rows.map((cells, rowIndex) => '<w:tr>' + cells.map(cell =>
    '<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr>' + docxParagraph(cell, rowIndex === 0 ? '' : '', rowIndex === 0) + '</w:tc>'
  ).join('') + '</w:tr>').join('');
  return '<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/>' + borders + '</w:tblPr>' + body + '</w:tbl>';
}

function buildDocx({ title, markdown }) {
  const blocks = parseBlocks(markdown);
  const body = [];
  if (title) body.push(docxParagraph(title, 'Title'));
  blocks.forEach(block => {
    if (block.type === 'h') body.push(docxParagraph(block.text, block.level === 1 ? 'Heading1' : block.level === 2 ? 'Heading2' : 'Heading3'));
    else if (block.type === 'li') body.push(docxParagraph('• ' + block.text, 'ListParagraph'));
    else if (block.type === 'table') body.push(docxTable(block.rows));
    else body.push(docxParagraph(block.text));
  });
  body.push('<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="851" w:footer="992" w:gutter="0"/></w:sectPr>');
  const document = T.docxHead + '<w:document ' + T.wNs + '><w:body>' + body.join('') + '</w:body></w:document>';

  const styles = T.docxHead + '<w:styles ' + T.wNs + '>'
    + '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft YaHei"/><w:sz w:val="21"/></w:rPr></w:rPrDefault>'
    + '<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>'
    + '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>'
    + '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="center"/><w:spacing w:after="240"/></w:pPr><w:rPr><w:b/><w:sz w:val="44"/></w:rPr></w:style>'
    + '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style>'
    + '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="200" w:after="100"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style>'
    + '<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="160" w:after="80"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style>'
    + '<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/></w:style>'
    + '</w:styles>';

  const contentTypes = T.docxHead + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    + '<Default Extension="xml" ContentType="application/xml"/>'
    + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
    + '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
    + '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
    + '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>'
    + '</Types>';

  const rels = T.docxHead + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
    + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
    + '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>'
    + '</Relationships>';

  const docRels = T.docxHead + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
    + '</Relationships>';

  const stamp = new Date().toISOString();
  const core = T.docxHead + '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
    + '<dc:title>' + xmlEsc(title || '商业运营工作台') + '</dc:title><dc:creator>商业运营工作台</dc:creator><cp:lastModifiedBy>商业运营工作台</cp:lastModifiedBy>'
    + '<dcterms:created xsi:type="dcterms:W3CDTF">' + stamp + '</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">' + stamp + '</dcterms:modified></cp:coreProperties>';

  const app = T.docxHead + '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>商业运营工作台</Application></Properties>';

  return writeZip({
    '[Content_Types].xml': contentTypes,
    '_rels/.rels': rels,
    'word/document.xml': document,
    'word/styles.xml': styles,
    'word/_rels/document.xml.rels': docRels,
    'docProps/core.xml': core,
    'docProps/app.xml': app
  });
}

const P_NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';

function slideParagraph(text, bold) {
  return '<a:p><a:r>' + (bold ? '<a:rPr lang="zh-CN" b="1"/>' : '<a:rPr lang="zh-CN" dirty="0"/>') + '<a:t>' + xmlEsc(text) + '</a:t></a:r></a:p>';
}

function slideXml(title, lines) {
  const body = (lines.length ? lines : ['']).map(line => slideParagraph(line.text, line.bold)).join('');
  return T.docxHead + '<p:sld ' + P_NS + '><p:cSld><p:spTree>'
    + '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>'
    + '<p:sp><p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/>' + slideParagraph(title, false) + '</p:txBody></p:sp>'
    + '<p:sp><p:nvSpPr><p:cNvPr id="3" name="Content"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph idx="1"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/>' + body + '</p:txBody></p:sp>'
    + '</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>';
}

function buildSlides(title, markdown) {
  const blocks = parseBlocks(markdown);
  const groups = [];
  let current = null;
  blocks.forEach(block => {
    if (block.type === 'h' && block.level === 1) {
      current = { title: block.text, lines: [] };
      groups.push(current);
      return;
    }
    if (!current) { current = { title: title || '方案', lines: [] }; groups.push(current); }
    if (block.type === 'table') block.rows.forEach((row, index) => current.lines.push({ text: row.join('  |  '), bold: index === 0 }));
    else if (block.type === 'h') current.lines.push({ text: block.text, bold: true });
    else current.lines.push({ text: block.text, bold: false });
  });
  if (!groups.length) groups.push({ title: title || '方案', lines: [] });
  return groups;
}

const CLR_MAP = '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>';

function themeXml() {
  const accents = ['4472C4', 'ED7D31', 'A5A5A5', 'FFC000', '5B9BD5', '70AD47']
    .map((color, index) => '<a:accent' + (index + 1) + '><a:srgbClr val="' + color + '"/></a:accent' + (index + 1) + '>').join('');
  return T.docxHead + '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme"><a:themeElements>'
    + '<a:clrScheme name="Office"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>'
    + '<a:dk2><a:srgbClr val="44546A"/></a:dk2><a:lt2><a:srgbClr val="E7E6E6"/></a:lt2>' + accents
    + '<a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme>'
    + '<a:fontScheme name="Office"><a:majorFont><a:latin typeface="Calibri Light"/><a:ea typeface="Microsoft YaHei"/><a:cs typeface=""/></a:majorFont>'
    + '<a:minorFont><a:latin typeface="Calibri"/><a:ea typeface="Microsoft YaHei"/><a:cs typeface=""/></a:minorFont></a:fontScheme>'
    + '<a:fmtScheme name="Office">'
    + '<a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"><a:tint val="85000"/></a:schemeClr></a:solidFill><a:solidFill><a:schemeClr val="phClr"><a:shade val="85000"/></a:schemeClr></a:solidFill></a:fillStyleLst>'
    + '<a:lnStyleLst><a:ln w="6350" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln>'
    + '<a:ln w="12700" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln>'
    + '<a:ln w="19050" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln></a:lnStyleLst>'
    + '<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>'
    + '<a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"><a:tint val="95000"/></a:schemeClr></a:solidFill><a:solidFill><a:schemeClr val="phClr"><a:shade val="95000"/></a:schemeClr></a:solidFill></a:bgFillStyleLst>'
    + '</a:fmtScheme></a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>';
}

function buildPptx({ title, markdown }) {
  const slides = buildSlides(title, markdown);
  const files = {};
  const slideOverrides = slides.map((_, index) => '<Override PartName="/ppt/slides/slide' + (index + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>').join('');
  files['[Content_Types].xml'] = T.docxHead + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
    + '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>'
    + '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>'
    + '<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>'
    + '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>'
    + slideOverrides
    + '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
    + '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>';

  files['_rels/.rels'] = T.docxHead + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>'
    + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
    + '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>';

  const slideIds = slides.map((_, index) => '<p:sldId id="' + (256 + index) + '" r:id="rId' + (index + 2) + '"/>').join('');
  files['ppt/presentation.xml'] = T.docxHead + '<p:presentation ' + P_NS + ' saveSubsetFonts="1">'
    + '<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>'
    + '<p:sldIdLst>' + slideIds + '</p:sldIdLst>'
    + '<p:sldSz cx="12192000" cy="6858000" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>';

  const presRels = slides.map((_, index) => '<Relationship Id="rId' + (index + 2) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide' + (index + 1) + '.xml"/>').join('');
  files['ppt/_rels/presentation.xml.rels'] = T.docxHead + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>'
    + presRels + '</Relationships>';

  files['ppt/slideMasters/slideMaster1.xml'] = T.docxHead + '<p:sldMaster ' + P_NS + '><p:cSld><p:spTree>'
    + '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>'
    + CLR_MAP + '<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>'
    + '<p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>';
  files['ppt/slideMasters/_rels/slideMaster1.xml.rels'] = T.docxHead + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>'
    + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>';

  files['ppt/slideLayouts/slideLayout1.xml'] = T.docxHead + '<p:sldLayout ' + P_NS + ' type="titleAndContent" preserve="1"><p:cSld name="Title and Content"><p:spTree>'
    + '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>'
    + '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>';
  files['ppt/slideLayouts/_rels/slideLayout1.xml.rels'] = T.docxHead + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>';

  files['ppt/theme/theme1.xml'] = themeXml();

  slides.forEach((slide, index) => {
    const number = index + 1;
    files['ppt/slides/slide' + number + '.xml'] = slideXml(slide.title, slide.lines);
    files['ppt/slides/_rels/slide' + number + '.xml.rels'] = T.docxHead + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>';
  });

  const stamp = new Date().toISOString();
  files['docProps/core.xml'] = T.docxHead + '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
    + '<dc:title>' + xmlEsc(title || '商业运营工作台') + '</dc:title><dc:creator>商业运营工作台</dc:creator><cp:lastModifiedBy>商业运营工作台</cp:lastModifiedBy>'
    + '<dcterms:created xsi:type="dcterms:W3CDTF">' + stamp + '</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">' + stamp + '</dcterms:modified></cp:coreProperties>';
  files['docProps/app.xml'] = T.docxHead + '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>商业运营工作台</Application></Properties>';

  return writeZip(files);
}

module.exports = { buildDocx, buildPptx, parseBlocks };
