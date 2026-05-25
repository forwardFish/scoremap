param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
)

$ErrorActionPreference = 'Stop'

function Add-Failure {
  param([string]$Message)
  $script:Failures += $Message
}

function Read-JsonFile {
  param([string]$Path)
  try {
    return Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json
  } catch {
    Add-Failure "Invalid JSON: $Path :: $($_.Exception.Message)"
    return $null
  }
}

function Require-RelativeFile {
  param([string]$RelativePath)
  $path = Join-Path $script:Root $RelativePath
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    Add-Failure "Missing required file: $RelativePath"
  }
}

function Require-RelativeDirectory {
  param([string]$RelativePath)
  $path = Join-Path $script:Root $RelativePath
  if (-not (Test-Path -LiteralPath $path -PathType Container)) {
    Add-Failure "Missing required directory: $RelativePath"
  }
}

$script:Failures = @()
$script:Root = (Resolve-Path -LiteralPath $ProjectRoot).Path

$requiredAsciiFiles = @(
  'docs/auto-execute/scoremap-auto-execute-master-plan.md',
  'docs/auto-execute/scoremap-requirement-traceability-matrix.md',
  'docs/auto-execute/scoremap-ui-reference-map.md',
  'docs/auto-execute/scoremap-api-db-contract-matrix.md',
  'docs/auto-execute/scoremap-standard-test-plan.md',
  'docs/auto-execute/scoremap-owner-scenario-matrix.md',
  'docs/auto-execute/scoremap-final-acceptance-gate.md',
  'docs/auto-execute/scoremap-tasks/T00-intake-harness-and-source-of-truth.md',
  'docs/auto-execute/evidence/documentation+harness/source-inventory.json',
  'docs/auto-execute/evidence/documentation+harness/gap-list.json',
  'docs/auto-execute/evidence/documentation+harness/acceptance-status.json',
  'docs/auto-execute/evidence/documentation+harness/result-json-schema.json',
  'docs/auto-execute/results/T00.json',
  'docs/auto-execute/latest/T00-HANDOFF.md',
  'docs/auto-execute/latest/T00-integrity.log',
  'docs/auto-execute/latest/run-id.txt',
  'docs/auto-execute/latest/machine-summary.json',
  'docs/auto-execute/latest/gap-list.json',
  'docs/auto-execute/latest/repair-plan.md',
  'docs/auto-execute/latest/next-agent-action.md',
  'docs/auto-execute/latest/verification-results.md',
  'docs/auto-execute/latest/blockers.md'
)

foreach ($relative in $requiredAsciiFiles) {
  Require-RelativeFile $relative
}

$requiredAsciiDirectories = @(
  'docs/auto-execute/latest',
  'docs/auto-execute/results',
  'docs/auto-execute/evidence/documentation+harness'
)

foreach ($relative in $requiredAsciiDirectories) {
  Require-RelativeDirectory $relative
}

$docsRoot = Join-Path $Root 'docs'
$prdFiles = @(Get-ChildItem -LiteralPath $docsRoot -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -like '*PRD_MVP_v1.2*' })
if ($prdFiles.Count -lt 1) {
  Add-Failure 'Missing PRD v1.2 file under docs/.'
}

$uiRoot = Join-Path $docsRoot 'UI'
$miniappUiDirs = @(Get-ChildItem -LiteralPath $uiRoot -Directory -ErrorAction SilentlyContinue)
if ($miniappUiDirs.Count -lt 1) {
  Add-Failure 'Missing UI subdirectory under docs/UI.'
} else {
  $miniappUiDir = $miniappUiDirs |
    Where-Object {
      Test-Path -LiteralPath (Join-Path $_.FullName 'stitch_codex_development_blueprints') -PathType Container
    } |
    Select-Object -First 1
  if ($null -eq $miniappUiDir) {
    $miniappUiDir = $miniappUiDirs[0]
  }

  $uiAssetCount = @(Get-ChildItem -LiteralPath $miniappUiDir.FullName -File -Filter '*.png' -ErrorAction SilentlyContinue).Count
  if ($uiAssetCount -lt 6) {
    Add-Failure 'Expected at least 6 UI PNG reference files.'
  }

  $stitchDirs = @(Get-ChildItem -LiteralPath $miniappUiDir.FullName -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -eq 'stitch_codex_development_blueprints' })
  if ($stitchDirs.Count -lt 1) {
    Add-Failure 'Missing Stitch blueprint directory.'
  } else {
    $stitchHtmlCount = @(Get-ChildItem -LiteralPath $stitchDirs[0].FullName -Recurse -File -Filter 'code.html' -ErrorAction SilentlyContinue).Count
    if ($stitchHtmlCount -lt 6) {
      Add-Failure 'Expected at least 6 Stitch code.html blueprint files.'
    }
  }
}

$resultPath = Join-Path $Root 'docs/auto-execute/results/T00.json'
$result = $null
if (Test-Path -LiteralPath $resultPath) {
  $result = Read-JsonFile $resultPath
}

if ($null -ne $result) {
  $requiredProperties = @(
    'taskId',
    'status',
    'implementedFiles',
    'tests',
    'pageEvidence',
    'apiEvidence',
    'dbEvidence',
    'visualEvidence',
    'ownerJourneyEvidence',
    'localOnlyEvidence',
    'knownGaps'
  )

  foreach ($property in $requiredProperties) {
    if (-not ($result.PSObject.Properties.Name -contains $property)) {
      Add-Failure "T00.json missing property: $property"
    }
  }

  if ($result.taskId -ne 'T00') {
    Add-Failure 'T00.json taskId must be T00.'
  }

  $allowedStatuses = @('PASS', 'REPAIR_REQUIRED', 'PASS_WITH_LIMITATION', 'PASS_NEEDS_MANUAL_UI_REVIEW', 'BLOCKED_BY_ENVIRONMENT', 'HARD_FAIL')
  if ($allowedStatuses -notcontains $result.status) {
    Add-Failure "T00.json has unsupported status: $($result.status)"
  }

  $referencedPaths = @()
  $referencedPaths += @($result.implementedFiles)
  $referencedPaths += @($result.localOnlyEvidence)
  $referencedPaths += @($result.knownGaps)
  foreach ($relative in $referencedPaths) {
    if ($relative -is [string] -and $relative.Trim().Length -gt 0) {
      $candidate = Join-Path $Root $relative
      if (-not (Test-Path -LiteralPath $candidate)) {
        Add-Failure "T00.json references missing path: $relative"
      }
    }
  }

  if (-not $result.tests -or @($result.tests).Count -lt 1) {
    Add-Failure 'T00.json must include at least one test command result.'
  }
}

$inventoryPath = Join-Path $Root 'docs/auto-execute/evidence/documentation+harness/source-inventory.json'
$inventory = $null
if (Test-Path -LiteralPath $inventoryPath) {
  $inventory = Read-JsonFile $inventoryPath
}

if ($null -ne $inventory) {
  if (-not $inventory.localOnlyPolicy -or $inventory.localOnlyPolicy.LOCAL_ONLY -ne $true) {
    Add-Failure 'source-inventory.json must assert LOCAL_ONLY=true.'
  }
  if (-not $inventory.sources -or @($inventory.sources).Count -lt 10) {
    Add-Failure 'source-inventory.json must list source-of-truth inputs.'
  }
}

$scanRoots = @(
  'docs/auto-execute/results',
  'docs/auto-execute/latest',
  'docs/auto-execute/evidence/documentation+harness'
)
$secretPattern = '(?i)(secret[_-]?key|api[_-]?key|private[_-]?key|access[_-]?token|refresh[_-]?token|mch[_-]?id|prod[_-]?openid)'
foreach ($relativeRoot in $scanRoots) {
  $scanRoot = Join-Path $Root $relativeRoot
  if (Test-Path -LiteralPath $scanRoot) {
    $matches = Get-ChildItem -LiteralPath $scanRoot -Recurse -File |
      Select-String -Pattern $secretPattern -AllMatches
    foreach ($match in $matches) {
      Add-Failure "Potential secret marker in $($match.Path):$($match.LineNumber)"
    }
  }
}

if ($Failures.Count -gt 0) {
  Write-Host 'REPORT_INTEGRITY: FAIL'
  $Failures | ForEach-Object { Write-Host "- $_" }
  exit 1
}

Write-Host 'REPORT_INTEGRITY: PASS'
Write-Host "Checked root: $Root"
Write-Host "Checked files: $($requiredAsciiFiles.Count)"
Write-Host "Checked directories: $($requiredAsciiDirectories.Count)"
