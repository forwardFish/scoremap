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

function resolveWritableEvidencePath(projectRoot, relativePath) {
  const primaryPath = getPrimaryEvidencePath(projectRoot, relativePath);
  if (supportsAtomicWrite(primaryPath)) {
    return primaryPath;
  }
  return getFallbackEvidencePath(projectRoot, relativePath);
}

function resolveWritableEvidenceDir(projectRoot, relativeDir) {
  const probeRelativePath = path.join(relativeDir || '', `.write-probe-${process.pid}-${Date.now()}.tmp`);
  return path.dirname(resolveWritableEvidencePath(projectRoot, probeRelativePath));
}

function isAccessError(error) {
  return error && (error.code === 'EPERM' || error.code === 'EACCES' || error.code === 'UNKNOWN');
}

function supportsAtomicWrite(targetPath) {
  const directory = path.dirname(targetPath);
  const probeStem = path.join(directory, `.write-probe-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const probeTmpPath = `${probeStem}.tmp`;
  const probeFinalPath = `${probeStem}.final`;
  try {
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(probeTmpPath, 'probe');
    fs.renameSync(probeTmpPath, probeFinalPath);
    fs.rmSync(probeFinalPath, { force: true });
    return true;
  } catch (error) {
    if (!isAccessError(error) && error.code !== 'EBUSY') {
      throw error;
    }
    try {
      fs.rmSync(probeTmpPath, { force: true });
    } catch {}
    try {
      fs.rmSync(probeFinalPath, { force: true });
    } catch {}
    return false;
  }
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
  resolveWritableEvidenceDir,
  resolveWritableEvidencePath,
  getFallbackEvidencePath,
  getPrimaryEvidencePath,
  copyEvidenceFile,
  resolveEvidenceReadPath,
  writeEvidenceFile,
  writeJsonEvidence
};
