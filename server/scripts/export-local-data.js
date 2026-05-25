const fs = require('node:fs');
const path = require('node:path');
const { LocalJsonDbAdapter, TABLES } = require('../src/db/local-json-db');

function exportLocalData({ dbPath, outputPath }) {
  if (!dbPath) throw new Error('dbPath is required.');
  if (!outputPath) throw new Error('outputPath is required.');
  const db = new LocalJsonDbAdapter(dbPath);
  const snapshot = db.snapshot();
  const exportPayload = {
    status: 'PASS',
    exportedAt: new Date(0).toISOString(),
    localOnly: true,
    tables: Object.fromEntries(TABLES.map((table) => [table, snapshot[table] || []]))
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(exportPayload, null, 2)}\n`, 'utf8');
  return exportPayload;
}

if (require.main === module) {
  const dbPath = process.argv[2] || process.env.SCOREMAP_LOCAL_DB_PATH;
  const outputPath = process.argv[3] || process.env.SCOREMAP_EXPORT_OUTPUT_PATH;
  try {
    const result = exportLocalData({ dbPath, outputPath });
    process.stdout.write(`${JSON.stringify({ status: result.status, outputPath })}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

module.exports = {
  exportLocalData
};
