const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

const REFERENCE_ENV_KEYS = new Set([
  'AI_API_KEY',
  'AI_BASE_URL',
  'AI_FALLBACK_TO_MOCK',
  'AI_MOCK_MODE',
  'AI_MODEL',
  'AI_TIMEOUT_MS',
  'AUTH_SECRET',
  'DEEPSEEK_API_KEY',
  'PAYMENT_PROVIDER',
  'PUBLIC_BASE_URL',
  'REQUEST_TIMEOUT_MS',
  'WECHAT_APP_ID',
  'WECHAT_APP_SECRET',
  'WECHAT_PAY_API_V3_KEY',
  'WECHAT_PAY_DESCRIPTION',
  'WECHAT_PAY_MCH_ID',
  'WECHAT_PAY_MERCHANT_CERT',
  'WECHAT_PAY_MERCHANT_CERT_PATH',
  'WECHAT_PAY_NOTIFY_URL',
  'WECHAT_PAY_PLATFORM_CERT',
  'WECHAT_PAY_PLATFORM_CERT_PATH',
  'WECHAT_PAY_PRIVATE_KEY',
  'WECHAT_PAY_PRIVATE_KEY_PATH',
  'WECHAT_PAY_SERIAL_NO',
  'WECHAT_PAY_SKIP_NOTIFY_SIGNATURE',
  'WECHAT_PAY_TEST_AMOUNT_CENTS'
]);

function loadEnv(options = {}) {
  const root = path.resolve(options.root || path.join(__dirname, '..', '..', '..'));
  const serverRoot = path.join(root, 'server');
  const merged = { ...process.env };

  mergeEnvFile(merged, path.join(serverRoot, '.env'));
  mergeEnvFile(merged, path.join(root, '.env'));
  mergeEnvFile(merged, path.resolve(root, '..', 'printersheet', 'ai-exam-miniapp', 'server', '.env'), {
    allowlist: REFERENCE_ENV_KEYS
  });

  const port = Number(merged.PORT || options.port || 3101);
  const publicBaseUrl = merged.PUBLIC_BASE_URL || `http://127.0.0.1:${port}`;
  const dbPath = resolveFromRoot(root, merged.LOCAL_DB_PATH || path.join('.runtime', 'server', 'scoremap-local-db.json'));
  const cloudRootDir = resolveFromRoot(root, merged.LOCAL_CLOUD_ROOT || path.join('.runtime', 'server', 'local-cloud'));
  const exportRootDir = resolveFromRoot(root, merged.LOCAL_REPORT_EXPORT_ROOT || path.join('.runtime', 'server', 'report-exports'));

  const paymentProvider = String(merged.PAYMENT_PROVIDER || 'local').toLowerCase();
  const nodeEnv = merged.NODE_ENV || 'development';

  return {
    root,
    serverRoot,
    nodeEnv,
    port,
    publicBaseUrl,
    requestTimeoutMs: Number(merged.REQUEST_TIMEOUT_MS || 10000),
    authSecret: merged.AUTH_SECRET || 'scoremap-local-dev-auth-secret',
    localDbPath: dbPath,
    cloudRootDir,
    exportRootDir,
    paymentProvider,
    localMockEnabled: paymentProvider !== 'wechat',
    wechatAppId: merged.WECHAT_APP_ID || '',
    wechatAppSecret: merged.WECHAT_APP_SECRET || '',
    wechatPayMchId: merged.WECHAT_PAY_MCH_ID || '',
    wechatPaySerialNo: merged.WECHAT_PAY_SERIAL_NO || '',
    wechatPayPrivateKey: merged.WECHAT_PAY_PRIVATE_KEY || readSecretFile(merged.WECHAT_PAY_PRIVATE_KEY_PATH),
    wechatPayMerchantCert: merged.WECHAT_PAY_MERCHANT_CERT || readSecretFile(merged.WECHAT_PAY_MERCHANT_CERT_PATH),
    wechatPayApiV3Key: merged.WECHAT_PAY_API_V3_KEY || '',
    wechatPayPlatformCert: merged.WECHAT_PAY_PLATFORM_CERT || readSecretFile(merged.WECHAT_PAY_PLATFORM_CERT_PATH),
    wechatPayNotifyUrl: merged.WECHAT_PAY_NOTIFY_URL || `${publicBaseUrl}/api/payments/wechat/notify`,
    wechatPayDescription: merged.WECHAT_PAY_DESCRIPTION || 'Scoremap score improvement report',
    wechatPaySkipNotifySignature: merged.WECHAT_PAY_SKIP_NOTIFY_SIGNATURE === 'true' && nodeEnv !== 'production',
    wechatPayTestAmountCents: Math.max(1, Number(merged.WECHAT_PAY_TEST_AMOUNT_CENTS || 1))
  };
}

function mergeEnvFile(target, filePath, options = {}) {
  if (!filePath || !fs.existsSync(filePath)) return target;
  const parsed = dotenv.parse(fs.readFileSync(filePath));
  const allowlist = options.allowlist || null;
  for (const [key, value] of Object.entries(parsed)) {
    if (allowlist && !allowlist.has(key)) continue;
    if (target[key] === undefined || target[key] === '') {
      target[key] = value;
    }
  }
  return target;
}

function resolveFromRoot(root, value) {
  return path.isAbsolute(value) ? value : path.resolve(root, value);
}

function readSecretFile(filePath) {
  const resolved = String(filePath || '').trim();
  if (!resolved) return '';
  const absolute = path.resolve(resolved);
  if (!fs.existsSync(absolute)) return '';
  return fs.readFileSync(absolute, 'utf8');
}

module.exports = {
  REFERENCE_ENV_KEYS,
  loadEnv,
  mergeEnvFile,
  readSecretFile
};
