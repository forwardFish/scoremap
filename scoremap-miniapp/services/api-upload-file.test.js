const assert = require('node:assert/strict');
const { test } = require('node:test');

test('miniapp uploadDiagnosisFiles sends Word file path and originalName through wx.uploadFile', async () => {
  const previousWx = global.wx;
  const storage = {};
  let uploadOptions = null;
  global.wx = {
    getStorageSync(key) {
      return storage[key] || '';
    },
    setStorageSync(key, value) {
      storage[key] = value;
    },
    uploadFile(options) {
      uploadOptions = options;
      options.success({
        statusCode: 200,
        data: JSON.stringify({ status: 'uploaded', orderId: 'order-docx-runtime', uploadedCount: 1 })
      });
    }
  };

  try {
    delete require.cache[require.resolve('./api')];
    const api = require('./api');
    const storageApi = require('../utils/storage');
    storageApi.setOrderToken('order-docx-runtime', 'local-order-token-order-docx-runtime');

    const result = await api.uploadDiagnosisFiles({
      orderId: 'order-docx-runtime',
      authorizationAccepted: true,
      files: [{
        id: 'upload-docx-runtime',
        tempFilePath: 'wxfile://scoremap-word-sample.docx',
        name: 'scoremap-word-sample.docx',
        size: 12345,
        localOnly: true
      }]
    });

    assert.equal(result.status, 'uploaded');
    assert.equal(uploadOptions.filePath, 'wxfile://scoremap-word-sample.docx');
    assert.equal(uploadOptions.name, 'files');
    assert.equal(uploadOptions.formData.authorizationAccepted, 'true');
    assert.equal(uploadOptions.formData.uploadId, 'upload-docx-runtime');
    assert.equal(uploadOptions.formData.originalName, 'scoremap-word-sample.docx');
    assert.equal(uploadOptions.header['x-order-token'], 'local-order-token-order-docx-runtime');
    assert.match(uploadOptions.url, /\/api\/diagnosis-orders\/order-docx-runtime\/uploads$/);
  } finally {
    delete require.cache[require.resolve('./api')];
    global.wx = previousWx;
  }
});
