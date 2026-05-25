const fs = require('node:fs');
const path = require('node:path');

const TABLES = [
  'users',
  'diagnosis_orders',
  'upload_files',
  'ai_analysis_tasks',
  'diagnosis_decisions',
  'diagnosis_questions',
  'question_interactions',
  'ai_model_traces',
  'payments',
  'report_exports',
  'feedbacks'
];

function emptyState() {
  return Object.fromEntries(TABLES.map((name) => [name, []]));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

class LocalJsonDbAdapter {
  constructor(filePath) {
    if (!filePath) {
      throw new Error('LocalJsonDbAdapter requires a local file path.');
    }
    this.filePath = filePath;
    this.saveCounter = 0;
    this.state = this.load();
  }

  load() {
    if (!fs.existsSync(this.filePath)) {
      return emptyState();
    }
    const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
    return { ...emptyState(), ...parsed };
  }

  save() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const tmpPath = `${this.filePath}.${process.pid}.${Date.now()}.${this.saveCounter++}.tmp`;
    fs.writeFileSync(tmpPath, `${JSON.stringify(this.state, null, 2)}\n`);
    replaceFileWithRetry(tmpPath, this.filePath);
  }

  reset(seed = {}) {
    this.state = { ...emptyState(), ...clone(seed) };
    this.save();
    return this.snapshot();
  }

  snapshot() {
    return clone(this.state);
  }

  insert(tableName, record) {
    const table = this.getTable(tableName);
    if (!record || !record.id) {
      throw new Error(`Missing id for ${tableName} insert.`);
    }
    if (table.some((item) => item.id === record.id)) {
      throw new Error(`Duplicate id ${record.id} for ${tableName}.`);
    }
    const item = {
      ...clone(record),
      createdAt: record.createdAt || nowIso(),
      updatedAt: record.updatedAt || nowIso()
    };
    table.push(item);
    this.save();
    return clone(item);
  }

  upsert(tableName, record) {
    const table = this.getTable(tableName);
    if (!record || !record.id) {
      throw new Error(`Missing id for ${tableName} upsert.`);
    }
    const index = table.findIndex((item) => item.id === record.id);
    if (index === -1) {
      return this.insert(tableName, record);
    }
    table[index] = {
      ...table[index],
      ...clone(record),
      updatedAt: record.updatedAt || nowIso()
    };
    this.save();
    return clone(table[index]);
  }

  update(tableName, id, patch) {
    const table = this.getTable(tableName);
    const index = table.findIndex((item) => item.id === id);
    if (index === -1) {
      return null;
    }
    table[index] = {
      ...table[index],
      ...clone(patch),
      id,
      updatedAt: patch.updatedAt || nowIso()
    };
    this.save();
    return clone(table[index]);
  }

  read(tableName, id) {
    const item = this.getTable(tableName).find((record) => record.id === id);
    return item ? clone(item) : null;
  }

  find(tableName, predicate) {
    return clone(this.getTable(tableName).filter(predicate));
  }

  all(tableName) {
    return clone(this.getTable(tableName));
  }

  assertReadback(tableName, id, expectedPatch = {}) {
    const readback = this.read(tableName, id);
    if (!readback) {
      throw new Error(`Readback failed: ${tableName}.${id} does not exist.`);
    }
    for (const [key, value] of Object.entries(expectedPatch)) {
      if (readback[key] !== value) {
        throw new Error(`Readback failed: ${tableName}.${id}.${key} expected ${value}, got ${readback[key]}.`);
      }
    }
    return readback;
  }

  getTable(tableName) {
    if (!TABLES.includes(tableName)) {
      throw new Error(`Unknown local table: ${tableName}.`);
    }
    return this.state[tableName];
  }
}

function replaceFileWithRetry(tmpPath, targetPath) {
  const attempts = 8;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      fs.renameSync(tmpPath, targetPath);
      return;
    } catch (error) {
      if (!['EPERM', 'EACCES', 'EBUSY'].includes(error.code) || attempt === attempts - 1) {
        throw error;
      }
      try {
        fs.rmSync(targetPath, { force: true });
        fs.renameSync(tmpPath, targetPath);
        return;
      } catch (retryError) {
        if (!['EPERM', 'EACCES', 'EBUSY'].includes(retryError.code) || attempt === attempts - 1) {
          throw retryError;
        }
        sleepSync(10 * (attempt + 1));
      }
    }
  }
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

module.exports = {
  LocalJsonDbAdapter,
  TABLES
};
