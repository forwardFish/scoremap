const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  resolveRealAiConfig,
  summarizePayload
} = require('../src/ai');
const { loadRealAiEnv } = require('../src/ai/real-env-loader');

test('real LLM acceptance config matches printersheet DeepSeek defaults without exposing key', () => {
  const config = resolveRealAiConfig({
    AI_PROVIDER: 'deepseek',
    AI_API_KEY: 'test-key',
    AI_BASE_URL: DEFAULT_BASE_URL,
    AI_MODEL: DEFAULT_MODEL,
    AI_MOCK_MODE: 'false',
    AI_FALLBACK_TO_MOCK: 'false'
  });

  assert.equal(config.providerId, 'deepseek');
  assert.equal(config.baseUrl, 'https://api.deepseek.com');
  assert.equal(config.model, 'deepseek-v4-pro');
  assert.equal(config.keyPresent, true);
  assert.equal(config.apiKey, 'test-key');
});

test('real LLM acceptance rejects mock and fallback modes', () => {
  assert.throws(() => resolveRealAiConfig({
    AI_API_KEY: 'test-key',
    AI_MOCK_MODE: 'true'
  }), /AI_MOCK_MODE=true/);

  assert.throws(() => resolveRealAiConfig({
    AI_API_KEY: 'test-key',
    AI_FALLBACK_TO_MOCK: 'true'
  }), /AI_FALLBACK_TO_MOCK=true/);
});

test('real LLM acceptance locks model and endpoint', () => {
  assert.throws(() => resolveRealAiConfig({
    AI_API_KEY: 'test-key',
    AI_BASE_URL: 'https://example.test',
    AI_MODEL: DEFAULT_MODEL
  }), /AI_BASE_URL/);

  assert.throws(() => resolveRealAiConfig({
    AI_API_KEY: 'test-key',
    AI_BASE_URL: DEFAULT_BASE_URL,
    AI_MODEL: 'deepseek-chat'
  }), /AI_MODEL/);
});

test('real LLM env loader keeps shell env key precedence and fills missing allowlisted values', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scoremap-real-env-'));
  const scoremapEnv = path.join(dir, 'scoremap.env');
  fs.writeFileSync(scoremapEnv, [
    'AI_API_KEY=file-key',
    `AI_BASE_URL=${DEFAULT_BASE_URL}`,
    `AI_MODEL=${DEFAULT_MODEL}`,
    'AUTH_SECRET=must-not-load'
  ].join('\n'), 'utf8');

  const loaded = loadRealAiEnv({
    baseEnv: {
      AI_PROVIDER: 'deepseek',
      AI_API_KEY: 'shell-key',
      AI_MOCK_MODE: 'false',
      AI_FALLBACK_TO_MOCK: 'false'
    },
    candidates: [{ source: 'scoremap-server-env', path: scoremapEnv }]
  });

  assert.equal(loaded.env.AI_API_KEY, 'shell-key');
  assert.equal(loaded.env.AI_BASE_URL, DEFAULT_BASE_URL);
  assert.equal(loaded.env.AI_MODEL, DEFAULT_MODEL);
  assert.equal(loaded.env.AUTH_SECRET, undefined);
  assert.equal(loaded.keyPresent, true);
  assert.equal(loaded.keySource, 'env');
});

test('real LLM env loader prefers scoremap env before printersheet fallback', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scoremap-real-env-'));
  const scoremapEnv = path.join(dir, 'scoremap.env');
  const printersheetEnv = path.join(dir, 'printersheet.env');
  fs.writeFileSync(scoremapEnv, [
    'AI_PROVIDER=deepseek',
    'DEEPSEEK_API_KEY=scoremap-key',
    `AI_BASE_URL=${DEFAULT_BASE_URL}`,
    `AI_MODEL=${DEFAULT_MODEL}`
  ].join('\n'), 'utf8');
  fs.writeFileSync(printersheetEnv, [
    'AI_PROVIDER=deepseek',
    'DEEPSEEK_API_KEY=printersheet-key',
    `AI_BASE_URL=${DEFAULT_BASE_URL}`,
    `AI_MODEL=${DEFAULT_MODEL}`
  ].join('\n'), 'utf8');

  const loaded = loadRealAiEnv({
    baseEnv: {},
    candidates: [
      { source: 'scoremap-server-env', path: scoremapEnv },
      { source: 'printersheet-server-env', path: printersheetEnv }
    ]
  });

  assert.equal(loaded.env.DEEPSEEK_API_KEY, 'scoremap-key');
  assert.equal(loaded.keySource, 'scoremap-server-env');
});

test('real LLM env loader falls back to printersheet env when local scoremap env is missing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scoremap-real-env-'));
  const printersheetEnv = path.join(dir, 'printersheet.env');
  fs.writeFileSync(printersheetEnv, [
    'AI_PROVIDER=deepseek',
    'DEEPSEEK_API_KEY=printersheet-key',
    `DEEPSEEK_BASE_URL=${DEFAULT_BASE_URL}`,
    `DEEPSEEK_MODEL=${DEFAULT_MODEL}`,
    'AI_MOCK_MODE=false',
    'AI_FALLBACK_TO_MOCK=false'
  ].join('\n'), 'utf8');

  const loaded = loadRealAiEnv({
    baseEnv: {},
    candidates: [
      { source: 'scoremap-server-env', path: path.join(dir, 'missing.env') },
      { source: 'scoremap-root-env', path: path.join(dir, 'also-missing.env') },
      { source: 'printersheet-server-env', path: printersheetEnv }
    ]
  });
  const config = resolveRealAiConfig(loaded.env);

  assert.equal(loaded.env.DEEPSEEK_API_KEY, 'printersheet-key');
  assert.equal(loaded.keySource, 'printersheet-server-env');
  assert.equal(config.providerId, 'deepseek');
  assert.equal(config.baseUrl, DEFAULT_BASE_URL);
  assert.equal(config.model, DEFAULT_MODEL);
});

test('real LLM summaries never include raw API key values', () => {
  const rawKey = 'sk-test-secret-value-1234567890';
  const summary = summarizePayload({
    AI_API_KEY: rawKey,
    nested: { DEEPSEEK_API_KEY: rawKey }
  });

  assert.equal(JSON.stringify(summary).includes(rawKey), false);
});
