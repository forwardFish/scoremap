const { LocalTencentCloudMockAdapter } = require('./local-tencent-cloud-mock');
const { LocalWechatPayMockAdapter } = require('./local-wechat-pay-mock');
const { WechatPayProvider } = require('./wechat-pay-provider');
const { CloudBaseMirrorDbAdapter } = require('./cloudbase-db');
const { CloudBaseFileAdapter } = require('./cloudbase-file');
const { LocalJsonDbAdapter } = require('../db/local-json-db');

function createLocalAdapters({ dbPath, cloudRootDir }) {
  const db = new LocalJsonDbAdapter(dbPath);
  return {
    db,
    cloud: new LocalTencentCloudMockAdapter({ rootDir: cloudRootDir, db }),
    payment: new LocalWechatPayMockAdapter({ db })
  };
}

function createAdapters({ env, fetchImpl } = {}) {
  if (!env) throw new Error('createAdapters requires env.');
  const db = env.dbProvider === 'cloudbase'
    ? new CloudBaseMirrorDbAdapter({ envId: env.cloudbaseEnvId, localDbPath: env.localDbPath })
    : new LocalJsonDbAdapter(env.localDbPath);
  return {
    db,
    cloud: env.fileProvider === 'cloudbase'
      ? new CloudBaseFileAdapter({ envId: env.cloudbaseEnvId, rootDir: env.cloudRootDir, db })
      : new LocalTencentCloudMockAdapter({ rootDir: env.cloudRootDir, db }),
    payment: env.paymentProvider === 'wechat'
      ? new WechatPayProvider({ db, env, fetchImpl })
      : new LocalWechatPayMockAdapter({ db })
  };
}

module.exports = {
  LocalJsonDbAdapter,
  LocalTencentCloudMockAdapter,
  LocalWechatPayMockAdapter,
  CloudBaseFileAdapter,
  CloudBaseMirrorDbAdapter,
  WechatPayProvider,
  createAdapters,
  createLocalAdapters
};
