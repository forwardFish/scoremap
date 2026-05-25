const { LocalTencentCloudMockAdapter } = require('./local-tencent-cloud-mock');
const { LocalWechatPayMockAdapter } = require('./local-wechat-pay-mock');
const { LocalJsonDbAdapter } = require('../db/local-json-db');

function createLocalAdapters({ dbPath, cloudRootDir }) {
  const db = new LocalJsonDbAdapter(dbPath);
  return {
    db,
    cloud: new LocalTencentCloudMockAdapter({ rootDir: cloudRootDir, db }),
    payment: new LocalWechatPayMockAdapter({ db })
  };
}

module.exports = {
  LocalJsonDbAdapter,
  LocalTencentCloudMockAdapter,
  LocalWechatPayMockAdapter,
  createLocalAdapters
};
