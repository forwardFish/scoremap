const crypto = require('node:crypto');

const SECRET_KEY_PATTERN = /(api[-_]?key|authorization|bearer|token|secret|password|credential|private[-_]?key)/i;

class LocalAiTraceStore {
  constructor({ db } = {}) {
    this.rows = [];
    this.db = db || null;
  }

  insert(row) {
    const traceId = row.traceId || `trace-${row.promptId.toLowerCase()}-${String(this.rows.length + 1).padStart(4, '0')}`;
    const trace = {
      id: traceId,
      traceId,
      promptId: row.promptId,
      modelAdapter: row.modelAdapter,
      requestSummary: row.requestSummary,
      responseSummary: row.responseSummary || null,
      status: row.status,
      errorCode: row.errorCode || null,
      latencyMs: Number.isFinite(row.latencyMs) ? row.latencyMs : 0,
      costEstimateCents: Number.isFinite(row.costEstimateCents) ? row.costEstimateCents : 0,
      model: row.model || null,
      providerId: row.providerId || null,
      localOnly: row.localOnly === true,
      createdAt: row.createdAt || new Date(0).toISOString()
    };
    this.rows.push(trace);
    if (this.db) {
      this.db.upsert('ai_model_traces', trace);
    }
    return { ...trace };
  }

  all() {
    if (this.db) {
      return this.db.all('ai_model_traces');
    }
    return this.rows.map((row) => ({ ...row }));
  }

  findByPromptId(promptId) {
    return this.all().filter((row) => row.promptId === promptId);
  }
}

function summarizePayload(payload) {
  return summarizeValue(payload, '$');
}

function summarizeValue(value, path) {
  if (value === null || value === undefined) return { type: String(value) };
  if (Buffer.isBuffer(value)) return { type: 'buffer', byteLength: value.length, sha256: hashText(value.toString('base64')) };
  if (Array.isArray(value)) {
    return { type: 'array', length: value.length, items: value.slice(0, 5).map((item, index) => summarizeValue(item, `${path}[${index}]`)) };
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value);
    return {
      type: 'object',
      keys: entries.map(([key]) => key).sort(),
      fields: Object.fromEntries(entries.slice(0, 20).map(([key, item]) => [
        key,
        SECRET_KEY_PATTERN.test(key) ? { type: 'redacted', redacted: true } : summarizeValue(item, `${path}.${key}`)
      ]))
    };
  }
  if (typeof value === 'string') return { type: 'string', length: value.length, sha256: hashText(value), redacted: SECRET_KEY_PATTERN.test(path) };
  if (typeof value === 'number' || typeof value === 'boolean') return { type: typeof value, value };
  return { type: typeof value };
}

function hashText(text) {
  return crypto.createHash('sha256').update(String(text)).digest('hex').slice(0, 16);
}

function containsSecretLikeText(value) {
  return /sk-[A-Za-z0-9]{12,}|AKID[A-Za-z0-9]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----/i.test(JSON.stringify(value));
}

module.exports = { LocalAiTraceStore, containsSecretLikeText, summarizePayload };
