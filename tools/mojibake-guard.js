const fs = require('node:fs');
const path = require('node:path');

const MOJIBAKE_PATTERNS = [
  '\uFFFD',
  '脙',
  '脗',
  '妫ｆ牠',
  '閹存垳',
  '閹绘劕',
  '閸掑棙',
  '鐎瑰本',
  '娣囶喖',
  '闁挎瑥',
  '閿�',
  '閿欏',
  '閳',
  '娑�',
  '娴�',
  '棣栭',
  '鎴戜',
  '鎻愬',
  '鍒嗘瀽',
  '瀹屾暣',
  '淇',
  '鎶ュ憡',
  '濉啓',
  '瀛╁瓙',
  '澶勭悊',
  '澶辫触',
  '棰勮',
  '鍚庡洖',
  '璇婃柇',
  '璁茶В',
  '缁冧範',
  '鎺屾彙'
];

const TEXT_EXTENSIONS = new Set(['.js', '.json', '.wxml']);

function normalizePath(filePath) {
  return filePath.split(path.sep).join('/');
}

function collectFiles(inputPath, files = []) {
  if (!fs.existsSync(inputPath)) {
    return files;
  }
  const stat = fs.statSync(inputPath);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(inputPath)) {
      collectFiles(path.join(inputPath, entry), files);
    }
    return files;
  }
  if (TEXT_EXTENSIONS.has(path.extname(inputPath))) {
    files.push(inputPath);
  }
  return files;
}

function scanTextForMojibake(text, source = '<text>') {
  const findings = [];
  const lines = text.split(/\r?\n/);
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    for (const pattern of MOJIBAKE_PATTERNS) {
      if (!line.includes(pattern)) {
        continue;
      }
      findings.push({
        path: source,
        line: lineIndex + 1,
        pattern,
        snippet: line.trim().slice(0, 160)
      });
    }
  }
  return findings;
}

function scanFilesForMojibake(files, options = {}) {
  const root = options.root || process.cwd();
  const findings = [];
  for (const file of files) {
    const absolute = path.resolve(root, file);
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
      continue;
    }
    const text = fs.readFileSync(absolute, 'utf8');
    findings.push(...scanTextForMojibake(text, normalizePath(path.relative(root, absolute))));
  }
  return findings;
}

function runCli(argv) {
  const json = argv.includes('--json');
  const args = argv.filter((arg) => arg !== '--json');
  const root = process.cwd();
  const targets = args.length > 0 ? args : ['scoremap-miniapp/app.json', 'scoremap-miniapp/routes.js'];
  const files = [...new Set(targets.flatMap((target) => collectFiles(path.resolve(root, target))))];
  const findings = scanFilesForMojibake(files, { root });
  const payload = {
    status: findings.length === 0 ? 'PASS' : 'REPAIR_REQUIRED',
    scannedFiles: files.map((file) => normalizePath(path.relative(root, file))).sort(),
    patterns: MOJIBAKE_PATTERNS,
    findings
  };
  if (json) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  } else {
    process.stdout.write(`mojibake guard: ${payload.status}, findings=${findings.length}\n`);
    for (const finding of findings) {
      process.stdout.write(`${finding.path}:${finding.line} [${finding.pattern}] ${finding.snippet}\n`);
    }
  }
  return findings.length === 0 ? 0 : 2;
}

if (require.main === module) {
  process.exitCode = runCli(process.argv.slice(2));
}

module.exports = {
  MOJIBAKE_PATTERNS,
  scanTextForMojibake,
  scanFilesForMojibake
};
