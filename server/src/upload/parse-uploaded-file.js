const path = require('node:path');
const mammoth = require('mammoth');
const { PDFParse } = require('pdf-parse');

const SUPPORTED_UPLOAD_EXTENSIONS = new Set(['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.webp']);
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

function effectiveExtension(file = {}) {
  const candidates = [file.originalName, file.originalname, file.name, file.filename];
  for (const item of candidates) {
    const ext = path.extname(String(item || '')).toLowerCase();
    if (ext) return ext;
  }
  const mime = String(file.mimeType || file.mimetype || '').toLowerCase();
  if (mime.includes('pdf')) return '.pdf';
  if (mime.includes('wordprocessingml')) return '.docx';
  if (mime.includes('msword')) return '.doc';
  if (mime.includes('png')) return '.png';
  if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg';
  if (mime.includes('webp')) return '.webp';
  return '';
}

function createUploadParseError(message, code = 'UPLOAD_PARSE_FAILED') {
  const error = new Error(message);
  error.code = code;
  return error;
}

async function parseUploadedBuffer(file = {}, buffer = Buffer.alloc(0)) {
  const ext = effectiveExtension(file);
  if (!SUPPORTED_UPLOAD_EXTENSIONS.has(ext)) {
    throw createUploadParseError('Only PDF, Word, PNG, JPG, JPEG, and WEBP files are supported.', 'UNSUPPORTED_UPLOAD_TYPE');
  }
  if (ext === '.doc') {
    throw createUploadParseError('Legacy .doc files cannot be text-parsed locally. Please save as .docx and upload again.', 'LEGACY_DOC_UNSUPPORTED');
  }
  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ buffer });
    return normalizeParsedText(result.value);
  }
  if (ext === '.pdf') {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText().finally(() => parser.destroy());
    return normalizeParsedText(result.text);
  }
  if (IMAGE_EXTENSIONS.has(ext)) {
    return '[image upload accepted; OCR is not enabled in local scoremap runtime]';
  }
  return '';
}

function normalizeParsedText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

module.exports = {
  SUPPORTED_UPLOAD_EXTENSIONS,
  effectiveExtension,
  parseUploadedBuffer
};
