const fs = require('node:fs');
const path = require('node:path');

const PRIMARY_ROOT = path.join('docs', 'auto-execute', 'evidence');
const FALLBACK_ROOT = path.join('.runtime', 'evidence');

function getPrimaryEvidencePath(projectRoot, relativePath) {
  return path.join(projectRoot, PRIMARY_ROOT, relativePath);
}

function getFallbackEvidencePath(projectRoot, relativePath) {
  return path.join(projectRoot, FALLBACK_ROOT, relativePath);
}

function isAccessError(error) {
  return error && (error.code === 'EPERM' || error.code === 'EACCES');
}

function writeEvidenceFile(projectRoot, relativePath, content) {
  const primaryPath = getPrimaryEvidencePath(projectRoot, relativePath);
  try {
    fs.mkdirSync(path.dirname(primaryPath), { recursive: true });
    fs.writeFileSync(primaryPath, content);
    return primaryPath;
  } catch (error) {
    if (!isAccessError(error)) {
      throw error;
    }
  }

  const fallbackPath = getFallbackEvidencePath(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fallbackPath), { recursive: true });
  fs.writeFileSync(fallbackPath, content);
  return fallbackPath;
}

function writeJsonEvidence(projectRoot, relativePath, payload) {
  return writeEvidenceFile(projectRoot, relativePath, `${JSON.stringify(payload, null, 2)}\n`);
}

function copyEvidenceFile(projectRoot, relativePath, sourcePath) {
  return writeEvidenceFile(projectRoot, relativePath, fs.readFileSync(sourcePath));
}

function resolveEvidenceReadPath(projectRoot, relativePath) {
  const primaryPath = getPrimaryEvidencePath(projectRoot, relativePath);
  if (fs.existsSync(primaryPath)) {
    return primaryPath;
  }
  return getFallbackEvidencePath(projectRoot, relativePath);
}

module.exports = {
  getPrimaryEvidencePath,
  copyEvidenceFile,
  resolveEvidenceReadPath,
  writeEvidenceFile,
  writeJsonEvidence
};
