const fs = require('node:fs');

const RETRYABLE_FS_ERRORS = new Set(['EPERM', 'EACCES', 'EBUSY']);

function writeFileWithRetry(absolutePath, content) {
  const tmpPath = `${absolutePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, content);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      fs.renameSync(tmpPath, absolutePath);
      return;
    } catch (error) {
      if (!RETRYABLE_FS_ERRORS.has(error.code)) throw error;
      try {
        fs.rmSync(absolutePath, { force: true });
        fs.renameSync(tmpPath, absolutePath);
        return;
      } catch (retryError) {
        if (!RETRYABLE_FS_ERRORS.has(retryError.code)) throw retryError;
        sleepSync(10 * (attempt + 1));
      }
    }
  }
  fs.writeFileSync(absolutePath, content);
  removeFileWithRetry(tmpPath);
}

function removeFileWithRetry(filePath, attempts = 10) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      fs.rmSync(filePath, { force: true });
      return true;
    } catch (error) {
      if (!RETRYABLE_FS_ERRORS.has(error.code)) throw error;
      sleepSync(25 * (attempt + 1));
    }
  }
  return false;
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

module.exports = {
  removeFileWithRetry,
  writeFileWithRetry
};
