const { LocalJsonDbAdapter, TABLES } = require('../db/local-json-db');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeDoc(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return clone(rest);
}

class CloudBaseMirrorDbAdapter extends LocalJsonDbAdapter {
  constructor({ envId, localDbPath, tableNames = TABLES, tcbFactory } = {}) {
    super(localDbPath);
    if (!envId) throw new Error('CloudBaseMirrorDbAdapter requires envId.');
    this.envId = envId;
    this.tableNames = tableNames;
    this.tcbFactory = tcbFactory;
    this.appPromise = null;
    this.dbPromise = null;
    this.remoteCalls = [];
    this.pendingWrites = new Set();
  }

  assertCloudbase() {
    return {
      status: 'INFO',
      adapter: 'cloudbase-mirror-db',
      envId: this.envId,
      pendingWrites: this.pendingWrites.size,
      remoteCalls: this.remoteCalls.slice(-20)
    };
  }

  insert(tableName, record) {
    const item = super.insert(tableName, record);
    this.queueMirrorSet(tableName, item);
    return item;
  }

  upsert(tableName, record) {
    const item = super.upsert(tableName, record);
    this.queueMirrorSet(tableName, item);
    return item;
  }

  update(tableName, id, patch) {
    const item = super.update(tableName, id, patch);
    if (item) this.queueMirrorSet(tableName, item);
    return item;
  }

  reset(seed = {}) {
    const snapshot = super.reset(seed);
    for (const tableName of this.tableNames) {
      for (const item of snapshot[tableName] || []) {
        this.queueMirrorSet(tableName, item);
      }
    }
    return snapshot;
  }

  async getApp() {
    if (!this.appPromise) {
      this.appPromise = this.loadTcb().then((tcb) => tcb.init({
        env: this.envId,
        secretId: process.env.TENCENTCLOUD_SECRETID,
        secretKey: process.env.TENCENTCLOUD_SECRETKEY
      }));
    }
    return this.appPromise;
  }

  async getDb() {
    if (!this.dbPromise) {
      this.dbPromise = this.getApp().then((app) => app.database());
    }
    return this.dbPromise;
  }

  async getCollection(tableName) {
    if (!this.tableNames.includes(tableName)) throw new Error(`Unknown CloudBase table: ${tableName}.`);
    const db = await this.getDb();
    return db.collection(tableName);
  }

  async findRemoteById(tableName, id) {
    const collection = await this.getCollection(tableName);
    const result = await collection.doc(id).get();
    this.remoteCalls.push({ method: 'get', tableName, id });
    return normalizeDoc(result.data && result.data[0]);
  }

  queueMirrorSet(tableName, item) {
    const task = this.mirrorSet(tableName, item)
      .catch((error) => {
        this.remoteCalls.push({ method: 'set:error', tableName, id: item.id, message: error.message });
      })
      .finally(() => {
        this.pendingWrites.delete(task);
      });
    this.pendingWrites.add(task);
  }

  async mirrorSet(tableName, item) {
    const collection = await this.getCollection(tableName);
    await collection.doc(item.id).set(clone(item));
    this.remoteCalls.push({ method: 'set', tableName, id: item.id });
  }

  async flushPendingWrites() {
    await Promise.allSettled(Array.from(this.pendingWrites));
    return this.assertCloudbase();
  }

  async loadTcb() {
    if (this.tcbFactory) return this.tcbFactory;
    const imported = await import('@cloudbase/node-sdk');
    return imported.default || imported;
  }
}

module.exports = {
  CloudBaseMirrorDbAdapter
};
