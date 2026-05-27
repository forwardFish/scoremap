#!/usr/bin/env node
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const fs = require('node:fs');
const path = require('node:path');
const { getPrimaryEvidencePath, getFallbackEvidencePath, writeJsonEvidence } = require('../../shared/evidence-paths');
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const projectRoot = path.resolve(__dirname, '..', '..');
const reportPath = path.join(projectRoot, 'docs', 'REAL_LLM_STUDENT_UPLOAD_ACCEPTANCE_REPORT.md');
const machineRelativePath = path.join('real-llm-student-upload', 'student-upload-real-llm-summary.json');
const checkRelativePath = path.join('real-llm-student-upload', 'report-self-check.json');
const machinePath = resolveLatestEvidencePath(projectRoot, machineRelativePath);

function main() {
  const failures = [];
  const reportExists = fs.existsSync(reportPath);
  const machineExists = fs.existsSync(machinePath);
  if (!reportExists) failures.push(`Missing report: ${relative(reportPath)}`);
  if (!machineExists) failures.push(`Missing machine evidence: ${relative(machinePath)}`);
  if (!reportExists || !machineExists) return finish(failures);

  const report = fs.readFileSync(reportPath, 'utf8');
  const machine = JSON.parse(fs.readFileSync(machinePath, 'utf8'));
  const dbPath = path.join(projectRoot, machine.evidence.databaseSnapshot);
  const db = fs.existsSync(dbPath) ? JSON.parse(fs.readFileSync(dbPath, 'utf8')) : null;
  const evidencePaths = [
    machine.evidence.machineSummary,
    machine.evidence.databaseSnapshot,
    machine.evidence.copiedInput,
    machine.evidence.exportedReport
  ].filter(Boolean);

  for (const evidencePath of evidencePaths) {
    if (!fs.existsSync(path.join(projectRoot, evidencePath))) {
      failures.push(`Missing referenced evidence: ${evidencePath}`);
    }
  }
  if (machine.model.model !== 'deepseek-v4-pro') failures.push(`Model mismatch in machine evidence: ${machine.model.model}`);
  if (machine.model.providerId !== 'deepseek') failures.push(`Provider mismatch in machine evidence: ${machine.model.providerId}`);
  if (machine.model.baseUrl !== 'https://api.deepseek.com') failures.push(`Base URL mismatch in machine evidence: ${machine.model.baseUrl}`);
  if (machine.model.keyPresent !== true) failures.push('Machine evidence does not confirm keyPresent=true.');
  if (!['env', 'scoremap-server-env', 'scoremap-root-env', 'printersheet-server-env'].includes(machine.model.keySource)) {
    failures.push(`Machine evidence has invalid keySource: ${machine.model.keySource || 'none'}.`);
  }
  if (machine.model.keyRedacted !== true) failures.push('Machine evidence does not confirm keyRedacted=true.');
  if (!report.includes('Model: deepseek-v4-pro')) failures.push('Report does not state Model: deepseek-v4-pro.');
  if (!report.includes(`API key source: ${machine.model.keySource}`)) failures.push('Report key source does not match machine evidence.');
  if (!report.includes('API key redacted: true')) failures.push('Report does not state API key redacted: true.');
  if (machine.order && !report.includes(`Order: ${machine.order.id}`)) failures.push('Report order id does not match machine evidence.');
  if (machine.upload && !report.includes(`Upload: ${machine.upload.id}`)) failures.push('Report upload id does not match machine evidence.');
  if (machine.evidence.exportedReport && !report.includes(machine.evidence.exportedReport)) failures.push('Report export path does not match machine evidence.');
  if (machine.status !== 'PASS') failures.push(`Machine evidence status is ${machine.status}.`);
  if (machine.checks.missingPrompts.length > 0) failures.push(`Missing prompt ids: ${machine.checks.missingPrompts.join(', ')}`);
  if (machine.checks.failedTraceCount !== 0) failures.push(`Failed trace count is ${machine.checks.failedTraceCount}.`);
  if (machine.checks.modelMismatchCount !== 0) failures.push(`Model mismatch count is ${machine.checks.modelMismatchCount}.`);
  if (machine.checks.secretLeak !== false) failures.push('Machine evidence reports a secret leak.');
  if (hasSecretLikeText(report)) failures.push('Report contains a secret-shaped value.');
  if (hasSecretLikeText(JSON.stringify(machine))) failures.push('Machine evidence contains a secret-shaped value.');
  if (hasSecretLikeText(JSON.stringify(machine.traces || []))) failures.push('Machine trace summary contains a secret-shaped value.');
  if (report.includes('Student upload + real model verdict: **PASS**') && machine.status !== 'PASS') {
    failures.push('Report claims PASS while machine evidence is not PASS.');
  }
  if (db) {
    if (hasSecretLikeText(JSON.stringify(db))) failures.push('DB snapshot contains a secret-shaped value.');
    const order = machine.order ? findRow(db, 'diagnosis_orders', machine.order.id) : null;
    const upload = machine.upload ? findRow(db, 'upload_files', machine.upload.id) : null;
    const fullDecision = machine.order ? findRow(db, 'diagnosis_decisions', `decision-${machine.order.id}-full`) : null;
    const exportRow = machine.report && machine.report.export ? findRow(db, 'report_exports', machine.report.export.exportId) : null;
    if (!order) failures.push('DB snapshot does not contain reported order.');
    if (!upload) failures.push('DB snapshot does not contain reported upload.');
    if (!fullDecision) failures.push('DB snapshot does not contain reported full decision.');
    if (!exportRow) failures.push('DB snapshot does not contain reported export.');
    const traceRows = rows(db, 'ai_model_traces').filter((trace) => machine.checks.requiredPromptIds.includes(trace.promptId));
    if (traceRows.length !== machine.checks.requiredPromptIds.length) failures.push('DB snapshot trace count does not match required prompt count.');
    for (const trace of traceRows) {
      if (trace.model !== 'deepseek-v4-pro') failures.push(`DB trace ${trace.traceId} used model ${trace.model}.`);
      if (trace.providerId !== 'deepseek') failures.push(`DB trace ${trace.traceId} used provider ${trace.providerId}.`);
      if (trace.status !== 'SUCCESS') failures.push(`DB trace ${trace.traceId} status is ${trace.status}.`);
    }
  } else {
    failures.push(`Missing DB snapshot: ${machine.evidence.databaseSnapshot}`);
  }

  const status = failures.length === 0 ? 'PASS' : 'FAIL';
  const result = {
    status,
    checkedAt: new Date().toISOString(),
    report: relative(reportPath),
    machineEvidence: relative(machinePath),
    checkedEvidence: evidencePaths,
    failures
  };
  const checkPath = writeJsonEvidence(projectRoot, checkRelativePath, result);

  const selfCheckLine = status === 'PASS'
    ? `- Report self-check: PASS (报告准确性已校验; ${relative(checkPath)})`
    : `- Report self-check: FAIL (${relative(checkPath)})`;
  if (/- Report self-check: .*/.test(report)) {
    const updated = report.replace(/- Report self-check: .*/, selfCheckLine);
    fs.writeFileSync(reportPath, updated, 'utf8');
  }

  console.log(`REAL_LLM_REPORT_SELF_CHECK: ${status}`);
  console.log(`Evidence: ${relative(checkPath)}`);
  if (status !== 'PASS') process.exit(1);
}

function finish(failures) {
  const result = {
    status: 'FAIL',
    checkedAt: new Date().toISOString(),
    report: relative(reportPath),
    machineEvidence: relative(machinePath),
    checkedEvidence: [],
    failures
  };
  const checkPath = writeJsonEvidence(projectRoot, checkRelativePath, result);
  console.log('REAL_LLM_REPORT_SELF_CHECK: FAIL');
  console.log(`Evidence: ${relative(checkPath)}`);
  process.exit(1);
}

function relative(filePath) {
  return path.relative(projectRoot, filePath).replace(/\\/g, '/');
}

function rows(db, tableName) {
  return Array.isArray(db && db[tableName]) ? db[tableName] : [];
}

function findRow(db, tableName, id) {
  return rows(db, tableName).find((row) => row.id === id);
}

function hasSecretLikeText(text) {
  return /sk-[A-Za-z0-9]{12,}|AKID[A-Za-z0-9]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----/i.test(String(text || ''));
}

function resolveLatestEvidencePath(projectRoot, relativePath) {
  const primaryPath = getPrimaryEvidencePath(projectRoot, relativePath);
  const fallbackPath = getFallbackEvidencePath(projectRoot, relativePath);
  const candidates = [primaryPath, fallbackPath].filter((candidate) => fs.existsSync(candidate));
  if (candidates.length === 0) {
    return fallbackPath;
  }
  candidates.sort((left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs);
  return candidates[0];
}

main();
