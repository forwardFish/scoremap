param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$projectRootPath = (Resolve-Path -LiteralPath $ProjectRoot).Path
$evidenceDir = Join-Path $projectRootPath 'docs\auto-execute\evidence\safety'
New-Item -ItemType Directory -Force -Path $evidenceDir | Out-Null

function Get-RelativePath {
  param([string]$Path)
  $resolved = (Resolve-Path -LiteralPath $Path).Path
  if ($resolved.StartsWith($projectRootPath, [System.StringComparison]::OrdinalIgnoreCase)) {
    return $resolved.Substring($projectRootPath.Length).TrimStart('\', '/').Replace('\', '/')
  }
  return $resolved.Replace('\', '/')
}

function Read-JsonFile {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    return $null
  }
  return Get-Content -Raw -LiteralPath $Path | ConvertFrom-Json
}

$requiredEvidence = @(
  'docs/auto-execute/evidence/api-db-e2e/assertions.json',
  'docs/auto-execute/evidence/api-db-e2e/summary.json',
  'docs/auto-execute/evidence/api-db-e2e/api-trace.json',
  'docs/auto-execute/evidence/api-db-e2e/db-snapshot.json',
  'docs/auto-execute/evidence/api-db/summary.json',
  'docs/auto-execute/evidence/owner/journey-summary.json',
  'docs/auto-execute/evidence/visual-harness/summary.json',
  'docs/auto-execute/evidence/visual/summary.json'
)

$failures = New-Object System.Collections.Generic.List[object]
$evidenceChecks = New-Object System.Collections.Generic.List[object]

foreach ($relative in $requiredEvidence) {
  $fullPath = Join-Path $projectRootPath $relative
  $exists = Test-Path -LiteralPath $fullPath
  $evidenceChecks.Add([ordered]@{
    path = $relative
    exists = $exists
    status = if ($exists) { 'PASS' } else { 'FAIL' }
  })
  if (-not $exists) {
    $failures.Add([ordered]@{ type = 'missingEvidence'; path = $relative })
  }
}

$assertionsPath = Join-Path $projectRootPath 'docs\auto-execute\evidence\api-db-e2e\assertions.json'
$summaryPath = Join-Path $projectRootPath 'docs\auto-execute\evidence\api-db-e2e\summary.json'
$apiSummaryPath = Join-Path $projectRootPath 'docs\auto-execute\evidence\api-db\summary.json'
$assertions = Read-JsonFile $assertionsPath
$summary = Read-JsonFile $summaryPath
$apiSummary = Read-JsonFile $apiSummaryPath

$localAssertions = @()
if ($assertions -and ($assertions.PSObject.Properties.Name -contains 'localOnlyEvidence') -and $assertions.localOnlyEvidence) {
  $localAssertions += $assertions.localOnlyEvidence
}
if ($summary -and ($summary.PSObject.Properties.Name -contains 'localOnly') -and $summary.localOnly) {
  $localAssertions += $summary.localOnly
}
if ($apiSummary -and ($apiSummary.PSObject.Properties.Name -contains 'localOnly') -and $apiSummary.localOnly) {
  $localAssertions += $apiSummary.localOnly
}

$localOnlyValues = @()
foreach ($item in $localAssertions) {
  if ($item.PSObject.Properties.Name -contains 'environment' -and $null -ne $item.environment) {
    $localOnlyValues += $item.environment
  } else {
    $localOnlyValues += $item
  }
}

$expectedAdapterMarkers = @(
  'LOCAL_ONLY',
  'SCOREMAP_ADAPTER_MODE',
  'local-mock',
  'local-wechat-pay-mock',
  'local-tencent-cloud-mock',
  'local-json-db',
  'local-in-memory-db'
)

$serializedLocalEvidence = ($localAssertions | ConvertTo-Json -Depth 20)
foreach ($marker in $expectedAdapterMarkers) {
  $present = $serializedLocalEvidence -match [regex]::Escape($marker)
  if (-not $present) {
    $failures.Add([ordered]@{ type = 'missingLocalOnlyMarker'; marker = $marker })
  }
}

if ($serializedLocalEvidence -notmatch '"remoteCalls"\s*:\s*\[\s*\]') {
  $failures.Add([ordered]@{ type = 'remoteCallEvidenceNotEmptyOrMissing'; detail = 'Expected remoteCalls: [] in local-only evidence.' })
}

$forbiddenPatterns = @(
  @{ name = 'wechat-pay-production-host'; pattern = 'api\.mch\.weixin\.qq\.com' },
  @{ name = 'wechat-pay-web-host'; pattern = 'weixin\.qq\.com/pay' },
  @{ name = 'tencentcloud-api-host'; pattern = 'tencentcloudapi\.com' },
  @{ name = 'cloudbase-host'; pattern = 'cloudbase\.net' },
  @{ name = 'mongodb-url'; pattern = 'mongodb(\+srv)?://' },
  @{ name = 'mysql-url'; pattern = 'mysql://' },
  @{ name = 'postgres-url'; pattern = 'postgres(ql)?://' },
  @{ name = 'redis-url'; pattern = 'redis://' },
  @{ name = 'production-api-db-cloud-marker'; pattern = 'prod(uction)?[-_.]?(api|db|cloud)' }
)

$allowedSentinelFiles = @(
  'shared/local-only.js',
  'server/src/adapters/wechat-pay-provider.js',
  'scripts/acceptance/run-local-only-guard.ps1',
  'docs/auto-execute/scoremap-auto-execute-master-plan.md',
  'docs/auto-execute/scoremap-development-standard.md',
  'docs/auto-execute/scoremap-software-test-standard.md',
  'docs/auto-execute/scoremap-standard-test-plan.md',
  'docs/auto-execute/scoremap-final-acceptance-gate.md',
  'docs/auto-execute/scoremap-tasks/T17-local-only-guards-secret-scan.md'
)

$scanRoots = @('server', 'scoremap-miniapp', 'shared', 'tests', 'scripts', 'docs/auto-execute/evidence') |
  ForEach-Object { Join-Path $projectRootPath $_ } |
  Where-Object { Test-Path -LiteralPath $_ }

$remoteFindings = New-Object System.Collections.Generic.List[object]
$scannedFileCount = 0
foreach ($root in $scanRoots) {
  Get-ChildItem -LiteralPath $root -Recurse -File |
    Where-Object {
      $_.FullName -notmatch '\\node_modules\\' -and
      $_.FullName -notmatch '\\\.git\\' -and
      $_.FullName -notmatch '\\docs\\auto-execute\\evidence\\safety\\'
    } |
    ForEach-Object {
      $scannedFileCount += 1
      $relative = Get-RelativePath $_.FullName
      $text = Get-Content -Raw -LiteralPath $_.FullName
      foreach ($entry in $forbiddenPatterns) {
        if ($text -match $entry.pattern -and ($allowedSentinelFiles -notcontains $relative)) {
          $remoteFindings.Add([ordered]@{
            file = $relative
            pattern = $entry.name
          })
        }
      }
    }
}

if ($remoteFindings.Count -gt 0) {
  foreach ($finding in $remoteFindings) {
    $failures.Add([ordered]@{ type = 'forbiddenRemoteReference'; file = $finding.file; pattern = $finding.pattern })
  }
}

$result = [ordered]@{
  taskId = 'T17'
  guard = 'local-only'
  status = if ($failures.Count -eq 0) { 'PASS' } else { 'HARD_FAIL' }
  checkedAt = (Get-Date).ToUniversalTime().ToString('o')
  environment = [ordered]@{
    LOCAL_ONLY = if ($env:LOCAL_ONLY) { $env:LOCAL_ONLY } else { 'true (defaulted by local runtime)' }
    SCOREMAP_ADAPTER_MODE = if ($env:SCOREMAP_ADAPTER_MODE) { $env:SCOREMAP_ADAPTER_MODE } else { 'local-mock (defaulted by local runtime)' }
    processEnvValuesRedacted = $true
  }
  requiredEvidence = $evidenceChecks
  localOnlyAssertions = $localAssertions
  remoteScan = [ordered]@{
    scannedRoots = @('server', 'scoremap-miniapp', 'shared', 'tests', 'scripts', 'docs/auto-execute/evidence')
    scannedFileCount = $scannedFileCount
    allowedSentinelFiles = $allowedSentinelFiles
    findings = $remoteFindings
  }
  apiEvidence = @('docs/auto-execute/evidence/api-db-e2e/api-trace.json', 'docs/auto-execute/evidence/api-db/summary.json')
  dbEvidence = @('docs/auto-execute/evidence/api-db-e2e/db-snapshot.json')
  pageEvidence = @('docs/auto-execute/evidence/owner/journey-summary.json')
  visualEvidence = @('docs/auto-execute/evidence/visual-harness/summary.json', 'docs/auto-execute/evidence/visual/summary.json')
  ownerJourneyEvidence = @('docs/auto-execute/evidence/owner/journey-summary.json')
  failures = $failures
}

$outPath = Join-Path $evidenceDir 'local-only.json'
$result | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $outPath -Encoding UTF8

if ($result.status -ne 'PASS') {
  Write-Host "run-local-only-guard: $($result.status). Evidence: docs/auto-execute/evidence/safety/local-only.json"
  exit 1
}

Write-Host "run-local-only-guard: PASS. Evidence: docs/auto-execute/evidence/safety/local-only.json"
