const fs = require('node:fs');
const path = require('node:path');
const { writeEvidenceFile } = require('../../../shared/evidence-paths');

function writeLocalPdf({ filePath, title, lines }) {
  const content = buildMinimalPdf(title, lines);
  const normalizedPath = String(filePath).replace(/\\/g, '/');
  const marker = '/docs/auto-execute/evidence/';
  const markerIndex = normalizedPath.indexOf(marker);
  const resolvedPath = markerIndex >= 0
    ? writeEvidenceFile(
      path.resolve(__dirname, '..', '..', '..'),
      normalizedPath.slice(markerIndex + marker.length).replace(/\//g, path.sep),
      content
    )
    : writeDirectPdf(filePath, content);
  return {
    filePath: resolvedPath,
    byteLength: fs.statSync(resolvedPath).size,
    format: 'application/pdf'
  };
}

function writeDirectPdf(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'binary');
  return filePath;
}

function buildMinimalPdf(title, lines) {
  const safeLines = [title, ...lines].map((line) => escapePdfText(String(line || '')));
  const textCommands = safeLines.map((line, index) => {
    const y = 760 - index * 24;
    return `BT /F1 12 Tf 54 ${Math.max(y, 72)} Td (${line}) Tj ET`;
  }).join('\n');
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${Buffer.byteLength(textCommands, 'binary')} >> stream\n${textCommands}\nendstream endobj`
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, 'binary'));
    pdf += `${object}\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, 'binary');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return pdf;
}

function escapePdfText(value) {
  return value
    .replace(/[^\x20-\x7E]/g, '?')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

module.exports = { writeLocalPdf };
