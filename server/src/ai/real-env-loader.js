const fs = require('node:fs');
const path = require('node:path');

const ALLOWED_ENV_KEYS = [
  'AI_PROVIDER',
  'AI_API_KEY',
  'AI_BASE_URL',
  'AI_MODEL',
  'DEEPSEEK_API_KEY',
  'DEEPSEEK_BASE_URL',
  'DEEPSEEK_MODEL',
  'AI_MOCK_MODE',
  'AI_FALLBACK_TO_MOCK',
  'AI_REQUEST_TIMEOUT_MS',
  'AI_MAX_TOKENS'
];

const KEY_NAMES = ['AI_API_KEY', 'DEEPSEEK_API_KEY'];

function defaultRealAiEnvCandidates(projectRoot) {
  return [
    { source: 'scoremap-server-env', path: path.join(projectRoot, 'server', '.env') },
    { source: 'scoremap-root-env', path: path.join(projectRoot, '.env') },
    { source: 'printersheet-server-env', path: path.resolve(projectRoot, '..', 'printersheet', 'ai-exam-miniapp', 'server', '.env') }
  ];
}

function loadRealAiEnv({ baseEnv = process.env, candidates = [] } = {}) {
  const merged = {};
  const loadedSources = [];
  let keySource = null;

  for (const key of ALLOWED_ENV_KEYS) {
    if (Object.prototype.hasOwnProperty.call(baseEnv, key) && baseEnv[key] !== undefined && baseEnv[key] !== '') {
      merged[key] = String(baseEnv[key]);
    }
  }
  if (hasKey(merged)) keySource = 'env';

  for (const candidate of candidates) {
    if (!candidate || !candidate.path || !fs.existsSync(candidate.path)) continue;
    const parsed = parseEnvText(fs.readFileSync(candidate.path, 'utf8'));
    let used = false;
    for (const key of ALLOWED_ENV_KEYS) {
      if (!Object.prototype.hasOwnProperty.call(parsed, key)) continue;
      if (merged[key] === undefined || merged[key] === '') {
        merged[key] = parsed[key];
        used = true;
      }
    }
    if (used) loadedSources.push(candidate.source);
    if (!keySource && hasKey(parsed)) keySource = candidate.source;
  }

  return {
    env: merged,
    keyPresent: hasKey(merged),
    keySource,
    loadedSources
  };
}

function parseEnvText(text) {
  const parsed = {};
  for (const rawLine of String(text || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const key = match[1];
    if (!ALLOWED_ENV_KEYS.includes(key)) continue;
    parsed[key] = parseEnvValue(match[2]);
  }
  return parsed;
}

function parseEnvValue(value) {
  let text = String(value || '').trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    text = text.slice(1, -1);
  } else {
    const hashIndex = text.search(/\s#/);
    if (hashIndex >= 0) text = text.slice(0, hashIndex).trim();
  }
  return text.replace(/\\n/g, '\n');
}

function hasKey(env) {
  return KEY_NAMES.some((key) => Boolean(env[key]));
}

module.exports = {
  ALLOWED_ENV_KEYS,
  defaultRealAiEnvCandidates,
  loadRealAiEnv,
  parseEnvText
};
