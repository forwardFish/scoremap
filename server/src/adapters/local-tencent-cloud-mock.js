const fs = require('node:fs');
const path = require('node:path');

class LocalTencentCloudMockAdapter {
  constructor({ rootDir, db }) {
    if (!rootDir) {
      throw new Error('LocalTencentCloudMockAdapter requires rootDir.');
    }
    this.rootDir = rootDir;
    this.db = db;
    this.remoteCalls = [];
  }

  assertLocalOnly() {
    return {
      status: 'PASS',
      adapter: 'local-tencent-cloud-mock',
      rootDir: this.rootDir,
      remoteCalls: this.remoteCalls.slice()
    };
  }

  uploadBuffer({ id, ownerId, orderId, originalName, buffer, mimeType = 'application/octet-stream' }) {
    if (!id || !ownerId || !orderId) {
      throw new Error('uploadBuffer requires id, ownerId, and orderId.');
    }
    const safeName = path.basename(originalName || `${id}.bin`);
    const storagePath = path.join(this.rootDir, ownerId, orderId, `${id}-${safeName}`);
    fs.mkdirSync(path.dirname(storagePath), { recursive: true });
    fs.writeFileSync(storagePath, buffer);
    const record = {
      id,
      ownerId,
      orderId,
      originalName: safeName,
      mimeType,
      storagePath,
      cloudPath: `local-mock://${ownerId}/${orderId}/${id}-${safeName}`,
      fileId: `local-cloud-file-${id}`,
      size: Buffer.byteLength(buffer),
      adapter: 'local-tencent-cloud-mock'
    };
    return this.db.insert('upload_files', record);
  }

  downloadFile(fileId) {
    const rows = this.db.find('upload_files', (row) => row.fileId === fileId);
    if (rows.length !== 1) {
      throw new Error(`Local mock file not found: ${fileId}.`);
    }
    const record = rows[0];
    return {
      ...record,
      buffer: fs.readFileSync(record.storagePath)
    };
  }
}

module.exports = { LocalTencentCloudMockAdapter };
