const fs = require('node:fs');
const path = require('node:path');

class CloudBaseFileAdapter {
  constructor({ envId, rootDir, db, tcbFactory } = {}) {
    if (!envId) throw new Error('CloudBaseFileAdapter requires envId.');
    if (!rootDir) throw new Error('CloudBaseFileAdapter requires rootDir.');
    if (!db) throw new Error('CloudBaseFileAdapter requires db.');
    this.envId = envId;
    this.rootDir = rootDir;
    this.db = db;
    this.tcbFactory = tcbFactory;
    this.appPromise = null;
    this.remoteCalls = [];
    this.pendingUploads = new Set();
  }

  assertCloudbase() {
    return {
      status: 'INFO',
      adapter: 'cloudbase-file',
      envId: this.envId,
      rootDir: this.rootDir,
      pendingUploads: this.pendingUploads.size,
      remoteCalls: this.remoteCalls.slice(-20)
    };
  }

  uploadBuffer({ id, ownerId, orderId, originalName, buffer, mimeType = 'application/octet-stream' }) {
    if (!id || !ownerId || !orderId) {
      throw new Error('uploadBuffer requires id, ownerId, and orderId.');
    }
    const safeName = path.basename(originalName || `${id}.bin`);
    const localPath = path.join(this.rootDir, ownerId, orderId, `${id}-${safeName}`);
    const cloudPath = `scoremap/${ownerId}/${orderId}/${id}-${safeName}`;
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    fs.writeFileSync(localPath, buffer);
    const record = this.db.insert('upload_files', {
      id,
      ownerId,
      orderId,
      originalName: safeName,
      mimeType,
      storagePath: localPath,
      cloudPath,
      fileId: `cloudbase://${this.envId}/${cloudPath}`,
      size: Buffer.byteLength(buffer),
      adapter: 'cloudbase-file',
      uploadStatus: 'pending'
    });
    this.queueUpload({ localPath, cloudPath, recordId: record.id });
    return record;
  }

  downloadFile(fileId) {
    const rows = this.db.find('upload_files', (row) => row.fileId === fileId);
    if (rows.length !== 1) {
      throw new Error(`CloudBase file cache not found: ${fileId}.`);
    }
    const record = rows[0];
    return {
      ...record,
      buffer: fs.readFileSync(record.storagePath)
    };
  }

  queueUpload({ localPath, cloudPath, recordId }) {
    const task = this.uploadLocalFile({ localPath, cloudPath, recordId })
      .catch((error) => {
        this.remoteCalls.push({ method: 'uploadFile:error', cloudPath, message: error.message });
        this.db.update('upload_files', recordId, {
          uploadStatus: 'failed',
          uploadError: error.message
        });
      })
      .finally(() => {
        this.pendingUploads.delete(task);
      });
    this.pendingUploads.add(task);
  }

  async uploadLocalFile({ localPath, cloudPath, recordId }) {
    const app = await this.getApp();
    const result = await app.uploadFile({ cloudPath, fileContent: fs.createReadStream(localPath) });
    this.remoteCalls.push({ method: 'uploadFile', cloudPath });
    this.db.update('upload_files', recordId, {
      uploadStatus: 'uploaded',
      cloudFileId: result.fileID || result.fileId || ''
    });
  }

  async flushPendingUploads() {
    await Promise.allSettled(Array.from(this.pendingUploads));
    return this.assertCloudbase();
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

  async loadTcb() {
    if (this.tcbFactory) return this.tcbFactory;
    const imported = await import('@cloudbase/node-sdk');
    return imported.default || imported;
  }
}

module.exports = {
  CloudBaseFileAdapter
};
