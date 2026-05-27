param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
  [string]$Scope = 'ai-tutor-v13'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$root = (Resolve-Path -LiteralPath $ProjectRoot).Path
$latestDir = Join-Path $root 'docs/auto-execute/latest'
New-Item -ItemType Directory -Force -Path $latestDir | Out-Null

$failures = New-Object System.Collections.Generic.List[string]

function Add-Failure {
  param([string]$Message)
  $script:failures.Add($Message) | Out-Null
}

function Test-RelativeFile {
  param([string]$RelativePath)
  return Test-Path -LiteralPath (Join-Path $script:root $RelativePath) -PathType Leaf
}

function Require-File {
  param([string]$RelativePath)
  if (-not (Test-RelativeFile $RelativePath)) {
    Add-Failure "Missing required file: $RelativePath"
  }
}

function Test-Json {
  param([string]$RelativePath)
  if (-not (Test-RelativeFile $RelativePath)) {
    Add-Failure "Missing JSON: $RelativePath"
    return
  }
  try {
    Get-Content -LiteralPath (Join-Path $script:root $RelativePath) -Raw -Encoding UTF8 | ConvertFrom-Json | Out-Null
  } catch {
    Add-Failure "Invalid JSON: $RelativePath :: $($_.Exception.Message)"
  }
}

if ($Scope -ne 'ai-tutor-v13') {
  Add-Failure "Unsupported report-integrity scope '$Scope'."
}

$requiredDocs = @(
  'docs/auto-execute/scoremap-ai-tutor-v13-master-plan.md',
  'docs/auto-execute/scoremap-ai-tutor-v13-acceptance-standard.md',
  'docs/auto-execute/scoremap-ai-tutor-v13-requirement-traceability-matrix.md',
  'docs/auto-execute/scoremap-ai-tutor-v13-ui-reference-map.md',
  'docs/auto-execute/scoremap-ai-tutor-v13-api-db-contract-matrix.md',
  'docs/auto-execute/scoremap-ai-tutor-v13-standard-test-plan.md',
  'docs/auto-execute/scoremap-ai-tutor-v13-owner-scenario-matrix.md',
  'docs/auto-execute/scoremap-ai-tutor-v13-final-acceptance-gate.md'
)

foreach ($doc in $requiredDocs) {
  Require-File $doc
}

for ($i = 19; $i -le 33; $i++) {
  $taskId = 'T{0:00}' -f $i
  Test-Json "docs/auto-execute/results/$taskId.json"
  Require-File "docs/auto-execute/latest/$taskId-HANDOFF.md"
}

$requiredEvidence = @(
  'docs/auto-execute/evidence/final-gate/T33-summary.json',
  'docs/auto-execute/evidence/safety/local-only.json',
  'docs/auto-execute/evidence/safety/secret-guard.json',
  'docs/auto-execute/evidence/owner/all-pages-ai-tutor-v13.json',
  'docs/auto-execute/evidence/api-db/T32-trace-manifest.json',
  'docs/auto-execute/evidence/api-db/T32-api-branches.json',
  'docs/auto-execute/evidence/api-db/T32-db-readback.json',
  'docs/auto-execute/evidence/llm/T32-llm-trace-manifest.json',
  'docs/auto-execute/evidence/visual-harness/ai-tutor-v13/ai-tutor/summary.json',
  'docs/auto-execute/evidence/visual-harness/ai-tutor-v13/wrong-question-detail/summary.json',
  'docs/auto-execute/evidence/visual-harness/ai-tutor-v13/answer-feedback/summary.json',
  'docs/auto-execute/evidence/visual-harness/ai-tutor-v13/full-report/summary.json',
  'docs/auto-execute/evidence/visual-harness/ai-tutor-v13/similar-exercise/summary.json'
)

foreach ($path in $requiredEvidence) {
  Require-File $path
}

$scanFiles = @($requiredDocs) + @(
  'docs/AUTO_EXECUTE_DELIVERY_REPORT.md',
  'docs/auto-execute/results/T33.json',
  'docs/auto-execute/latest/T33-HANDOFF.md'
)
$mojibakePatterns = @([char]0xFFFD, 'Ã', 'Â')
foreach ($relative in $scanFiles) {
  if (-not (Test-RelativeFile $relative)) {
    continue
  }
  $text = Get-Content -LiteralPath (Join-Path $root $relative) -Raw -Encoding UTF8
  foreach ($pattern in $mojibakePatterns) {
    if ($text -match $pattern) {
      Add-Failure "Mojibake marker '$pattern' found in $relative"
    }
  }
  $fenceCount = ([regex]::Matches($text, '```|~~~')).Count
  if (($fenceCount % 2) -ne 0) {
    Add-Failure "Unbalanced Markdown fence in $relative"
  }
}

$logPath = Join-Path $latestDir 'T33-integrity.log'
if ($failures.Count -gt 0) {
  @('REPORT_INTEGRITY: FAIL') + @($failures | ForEach-Object { "- $_" }) |
    Set-Content -LiteralPath $logPath -Encoding UTF8
  Write-Host 'REPORT_INTEGRITY: FAIL'
  $failures | ForEach-Object { Write-Host "- $_" }
  exit 1
}

@(
  'REPORT_INTEGRITY: PASS',
  "Scope: $Scope",
  "Checked docs: $($requiredDocs.Count)",
  "Checked evidence: $($requiredEvidence.Count)"
) | Set-Content -LiteralPath $logPath -Encoding UTF8

Write-Host 'REPORT_INTEGRITY: PASS'
Write-Host 'Evidence: docs/auto-execute/latest/T33-integrity.log'
