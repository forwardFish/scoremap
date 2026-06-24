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

function Redact-EnvName {
  param([string]$Name)
  if ($Name.Length -le 4) { return '***' }
  return "$($Name.Substring(0, 2))***$($Name.Substring($Name.Length - 2))"
}

$scanRoots = @('server', 'scoremap-miniapp', 'shared', 'tests', 'scripts', 'docs/auto-execute/results', 'docs/auto-execute/latest', 'docs/auto-execute/evidence') |
  ForEach-Object { Join-Path $projectRootPath $_ } |
  Where-Object { Test-Path -LiteralPath $_ }

$excludedPathFragments = @(
  '\node_modules\',
  '\.git\',
  '\docs\auto-execute\evidence\safety\',
  '\docs\auto-execute\evidence\screenshot-pixel\harness\runs\',
  '\docs\auto-execute\evidence\backend-api-report\local-report-exports\',
  '\docs\auto-execute\evidence\real-llm-student-upload\local-cloud\',
  '\docs\auto-execute\evidence\real-llm-student-upload\local-report-exports\',
  '\docs\auto-execute\evidence\tmp-icon-thumbnails\'
)

$scanFileExtensions = @(
  '.cjs',
  '.css',
  '.env',
  '.html',
  '.js',
  '.json',
  '.log',
  '.md',
  '.mjs',
  '.ps1',
  '.txt',
  '.wxml',
  '.wxss',
  '.yaml',
  '.yml'
)

$secretValuePatterns = @(
  @{ name = 'wechat-or-tencent-secret-assignment'; pattern = '(?i)(appsecret|app_secret|secret_key|api_key|private_key|access_token|refresh_token|mch_key|merchant_key)\s*[:=]\s*["''](?<value>[A-Za-z0-9_\-+/=]{16,})["'']' },
  @{ name = 'openid-assignment'; pattern = '(?i)(openid|open_id)\s*[:=]\s*["''](?<value>[A-Za-z0-9_\-]{12,})["'']' },
  @{ name = 'merchant-id-assignment'; pattern = '(?i)(mch_id|merchant_id)\s*[:=]\s*["''](?<value>[0-9]{8,})["'']' },
  @{ name = 'pem-private-key'; pattern = '-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----' },
  @{ name = 'bearer-token'; pattern = '(?i)bearer\s+[A-Za-z0-9_\-\.=]{24,}' },
  @{ name = 'generic-live-secret-token'; pattern = '(?i)(live|prod|production)[A-Za-z0-9_\-]{0,12}(secret|token|key)[A-Za-z0-9_\-]{8,}' }
)

$allowedPlaceholderPrefixes = @('local-', 'mock-', 'test-', 'sample-', 'anon-', 'owner-', 'user-', 'openid-', 'union-', 'session-', 'scoremap-')
$allowedPlaceholderFragments = @('-mock-', '-test-', '-sample-', '-devtools-', '-migration-', '-login-flow')

function Test-AllowedPlaceholderValue {
  param([string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return $false
  }

  foreach ($prefix in $allowedPlaceholderPrefixes) {
    if ($Value.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
      return $true
    }
  }

  foreach ($fragment in $allowedPlaceholderFragments) {
    if ($Value.IndexOf($fragment, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
      return $true
    }
  }

  return $false
}

$allowedFilesWithSecretVocabulary = @(
  'scripts/acceptance/check-report-integrity.ps1',
  'scripts/acceptance/run-secret-guard.ps1',
  'docs/auto-execute/scoremap-development-standard.md',
  'docs/auto-execute/scoremap-software-test-standard.md',
  'docs/auto-execute/scoremap-standard-test-plan.md',
  'docs/auto-execute/scoremap-final-acceptance-gate.md',
  'docs/auto-execute/scoremap-tasks/T17-local-only-guards-secret-scan.md'
)

$findings = New-Object System.Collections.Generic.List[object]
$scannedFiles = 0

foreach ($root in $scanRoots) {
  Get-ChildItem -LiteralPath $root -Recurse -File |
    Where-Object {
      $path = $_.FullName
      foreach ($fragment in $excludedPathFragments) {
        if ($path.Contains($fragment)) { return $false }
      }
      if ($scanFileExtensions -notcontains $_.Extension.ToLowerInvariant()) {
        return $false
      }
      return $true
    } |
    ForEach-Object {
      $scannedFiles += 1
      $relative = Get-RelativePath $_.FullName
      $text = Get-Content -Raw -LiteralPath $_.FullName
      if ($null -eq $text) {
        $text = ''
      }
      foreach ($entry in $secretValuePatterns) {
        $matches = [regex]::Matches($text, $entry.pattern)
        foreach ($match in $matches) {
          $valueGroup = $match.Groups['value']
          if ($valueGroup.Success -and (Test-AllowedPlaceholderValue $valueGroup.Value)) {
            continue
          }
          if ($allowedFilesWithSecretVocabulary -notcontains $relative) {
            $findings.Add([ordered]@{
              file = $relative
              pattern = $entry.name
              classification = 'HARD_FAIL'
              valueRedacted = $true
            })
          }
        }
      }
    }
}

$envNameFindings = New-Object System.Collections.Generic.List[object]
Get-ChildItem Env: |
  Where-Object { $_.Name -match '(?i)(secret|token|private|password|mch|merchant|openid|appsecret|api[_-]?key)' } |
  ForEach-Object {
    $envNameFindings.Add([ordered]@{
      name = (Redact-EnvName $_.Name)
      classification = 'INFO_REDACTED_ENV_NAME_ONLY'
      valueScanned = $false
    })
  }

$secretLikeFileNames = New-Object System.Collections.Generic.List[object]
foreach ($root in $scanRoots) {
  Get-ChildItem -LiteralPath $root -Recurse -File |
    Where-Object {
      $path = $_.FullName
      foreach ($fragment in $excludedPathFragments) {
        if ($path.Contains($fragment)) { return $false }
      }
      return ($_.Name -match '(?i)(client_secret|private_key|\.pem$|\.key$|prod.*secret|merchant.*secret)')
    } |
    ForEach-Object {
      $secretLikeFileNames.Add([ordered]@{
        file = Get-RelativePath $_.FullName
        classification = 'HARD_FAIL'
      })
    }
}

foreach ($fileFinding in $secretLikeFileNames) {
  $findings.Add([ordered]@{
    file = $fileFinding.file
    pattern = 'secret-like-filename'
    classification = $fileFinding.classification
    valueRedacted = $true
  })
}

$result = [ordered]@{
  taskId = 'T17'
  guard = 'secret-guard'
  status = if ($findings.Count -eq 0) { 'PASS' } else { 'HARD_FAIL' }
  checkedAt = (Get-Date).ToUniversalTime().ToString('o')
  scannedRoots = @('server', 'scoremap-miniapp', 'shared', 'tests', 'scripts', 'docs/auto-execute/results', 'docs/auto-execute/latest', 'docs/auto-execute/evidence')
  scannedFileCount = $scannedFiles
  projectEnvPolicy = [ordered]@{
    envValuesWrittenToEvidence = $false
    envNamesRedacted = $true
    matchingEnvNames = $envNameFindings
  }
  findings = $findings
  allowedDocumentationVocabulary = $allowedFilesWithSecretVocabulary
  notes = @(
    'Documentation that names forbidden categories is allowed only in listed control docs and guard scripts.',
    'Local mock placeholders such as local-, mock-, test-, sample-, anon-, owner-, and user- identifiers are not classified as real secrets.'
  )
}

$outPath = Join-Path $evidenceDir 'secret-guard.json'
$result | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $outPath -Encoding UTF8

if ($result.status -ne 'PASS') {
  Write-Host "run-secret-guard: $($result.status). Evidence: docs/auto-execute/evidence/safety/secret-guard.json"
  exit 1
}

Write-Host "run-secret-guard: PASS. Evidence: docs/auto-execute/evidence/safety/secret-guard.json"
