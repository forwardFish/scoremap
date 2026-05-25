const DEFAULT_FORBIDDEN_PATTERNS = [
  /api\.mch\.weixin\.qq\.com/i,
  /weixin\.qq\.com\/pay/i,
  /tcb-api\.tencentcloudapi\.com/i,
  /tencentcloudapi\.com/i,
  /cloudbase\.net/i,
  /mongodb(\+srv)?:\/\//i,
  /mysql:\/\//i,
  /postgres(ql)?:\/\//i,
  /redis:\/\//i,
  /prod(uction)?[-_.]?(api|db|cloud)/i
];

function getLocalOnlyFlag(env = process.env) {
  return env.LOCAL_ONLY === undefined ? 'true' : String(env.LOCAL_ONLY).toLowerCase();
}

function assertLocalOnlyEnvironment(env = process.env) {
  const localOnly = getLocalOnlyFlag(env);
  if (localOnly !== 'true') {
    throw new Error('LOCAL_ONLY must be true for scoremap runtime scaffold.');
  }

  const adapterMode = env.SCOREMAP_ADAPTER_MODE || 'local-mock';
  if (adapterMode !== 'local-mock') {
    throw new Error('SCOREMAP_ADAPTER_MODE must remain local-mock.');
  }

  return {
    status: 'PASS',
    localOnly: true,
    adapterMode,
    paymentAdapter: 'local-wechat-pay-mock',
    cloudAdapter: 'local-tencent-cloud-mock',
    databaseAdapter: 'local-in-memory-db'
  };
}

function scanTextForForbiddenRemoteCalls(text, patterns = DEFAULT_FORBIDDEN_PATTERNS) {
  const matches = [];
  for (const pattern of patterns) {
    if (pattern.test(text)) {
      matches.push(pattern.toString());
    }
  }
  return matches;
}

module.exports = {
  DEFAULT_FORBIDDEN_PATTERNS,
  assertLocalOnlyEnvironment,
  getLocalOnlyFlag,
  scanTextForForbiddenRemoteCalls
};
