function createLocalFixtureStore() {
  const tables = {
    users: new Map([['local-user-scoremap-t06', { id: 'local-user-scoremap-t06', role: 'parent_owner' }]]),
    diagnosis_orders: new Map(),
    upload_files: new Map(),
    ai_analysis_tasks: new Map(),
    diagnosis_decisions: new Map(),
    payments: new Map(),
    report_exports: new Map(),
    feedbacks: new Map()
  };

  function upsert(tableName, row) {
    tables[tableName].set(row.id, { ...tables[tableName].get(row.id), ...row });
    return read(tableName, row.id);
  }

  function read(tableName, id) {
    const row = tables[tableName].get(id);
    return row ? { ...row } : null;
  }

  function list(tableName) {
    return Array.from(tables[tableName].values()).map((row) => ({ ...row }));
  }

  function snapshot() {
    return Object.fromEntries(Object.keys(tables).map((name) => [name, list(name)]));
  }

  return { list, read, snapshot, upsert };
}

module.exports = { createLocalFixtureStore };
