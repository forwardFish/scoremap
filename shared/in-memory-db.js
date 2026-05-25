function createInMemoryDb(seed = {}) {
  const tables = {
    users: new Map(),
    diagnosis_orders: new Map(),
    upload_files: new Map(),
    ai_analysis_tasks: new Map(),
    diagnosis_decisions: new Map(),
    diagnosis_questions: new Map(),
    question_interactions: new Map(),
    ai_model_traces: new Map(),
    payments: new Map(),
    report_exports: new Map(),
    feedbacks: new Map()
  };

  for (const [tableName, rows] of Object.entries(seed)) {
    if (!tables[tableName]) {
      throw new Error(`Unknown table: ${tableName}`);
    }
    for (const row of rows) {
      tables[tableName].set(row.id, { ...row });
    }
  }

  function insert(tableName, row) {
    const table = getTable(tableName);
    if (!row.id) {
      throw new Error(`Missing id for ${tableName} insert.`);
    }
    const record = { ...row, createdAt: row.createdAt || new Date(0).toISOString() };
    table.set(record.id, record);
    return { ...record };
  }

  function read(tableName, id) {
    const table = getTable(tableName);
    const record = table.get(id);
    return record ? { ...record } : null;
  }

  function all(tableName) {
    return Array.from(getTable(tableName).values()).map((row) => ({ ...row }));
  }

  function getTable(tableName) {
    const table = tables[tableName];
    if (!table) {
      throw new Error(`Unknown table: ${tableName}`);
    }
    return table;
  }

  return { all, insert, read };
}

module.exports = { createInMemoryDb };
