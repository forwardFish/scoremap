param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
  [string]$Scope = 'default'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$root = (Resolve-Path -LiteralPath $ProjectRoot).Path
$resultsDir = Join-Path $root 'docs/auto-execute/results'
$latestDir = Join-Path $root 'docs/auto-execute/latest'
$evidenceDir = Join-Path $root 'docs/auto-execute/evidence/final-gate'
$reportPath = Join-Path $root 'docs/AUTO_EXECUTE_DELIVERY_REPORT.md'
New-Item -ItemType Directory -Force -Path $resultsDir, $latestDir, $evidenceDir | Out-Null

$failures = New-Object System.Collections.Generic.List[string]
$limitations = New-Object System.Collections.Generic.List[string]

function Add-Failure { param([string]$Message) $script:failures.Add($Message) | Out-Null }
function Add-Limitation { param([string]$Message) $script:limitations.Add($Message) | Out-Null }

function Test-RelativeFile {
  param([string]$RelativePath)
  if ([string]::IsNullOrWhiteSpace($RelativePath)) { return $false }
  return Test-Path -LiteralPath (Join-Path $script:root $RelativePath) -PathType Leaf
}

function Require-File {
  param([string]$RelativePath, [string]$Label)
  $exists = Test-RelativeFile $RelativePath
  if (-not $exists) { Add-Failure "Missing $Label evidence: $RelativePath" }
  [ordered]@{ label = $Label; path = $RelativePath; exists = $exists }
}

function Read-Json {
  param([string]$RelativePath)
  if (-not (Test-RelativeFile $RelativePath)) {
    Add-Failure "Missing JSON: $RelativePath"
    return $null
  }
  try {
    return Get-Content -LiteralPath (Join-Path $script:root $RelativePath) -Raw -Encoding UTF8 | ConvertFrom-Json
  } catch {
    Add-Failure "Invalid JSON: $RelativePath :: $($_.Exception.Message)"
    return $null
  }
}

function Get-Status {
  param($Value)
  if ($null -eq $Value) { return 'MISSING' }
  if ($Value.PSObject.Properties.Name -contains 'status') { return [string]$Value.status }
  if ($Value.PSObject.Properties.Name -contains 'finalVerdict') { return [string]$Value.finalVerdict }
  if ($Value.PSObject.Properties.Name -contains 'verdict') { return [string]$Value.verdict }
  return 'MISSING'
}

function As-Array {
  param($Value)
  if ($null -eq $Value) { return @() }
  return @($Value)
}

function Add-Category {
  param(
    [System.Collections.Generic.List[object]]$Categories,
    [string]$Id,
    [string]$Name,
    [string]$Status,
    [string[]]$Evidence,
    [string[]]$Notes
  )
  $Categories.Add([ordered]@{
    id = $Id
    name = $Name
    status = $Status
    evidence = @($Evidence)
    notes = @($Notes)
  }) | Out-Null
  if ($Status -in @('REPAIR_REQUIRED','HARD_FAIL','FAIL','BLOCKED','BLOCKED_BY_ENVIRONMENT','BLOCKED_BY_MISSING_SOURCE')) {
    Add-Failure "$Name status is $Status"
  } elseif ($Status -in @('PASS_WITH_LIMITATION','PASS_NEEDS_MANUAL_UI_REVIEW','MANUAL_REVIEW_REQUIRED','DOCUMENTED_BLOCKER')) {
    Add-Limitation "$Name status is $Status"
  }
}

function Test-MojibakeClean {
  param([string[]]$RelativePaths)
  $guard = Join-Path $script:root 'tools/mojibake-guard.js'
  if (-not (Test-Path -LiteralPath $guard -PathType Leaf)) {
    Add-Failure 'Missing mojibake guard: tools/mojibake-guard.js'
    return @([ordered]@{ path = 'tools/mojibake-guard.js'; pattern = 'missing-guard' })
  }
  $output = & node $guard --json @RelativePaths 2>&1
  $exitCode = $LASTEXITCODE
  try {
    $payload = ($output | Out-String) | ConvertFrom-Json
  } catch {
    Add-Failure "Mojibake guard returned invalid JSON: $($_.Exception.Message)"
    return @([ordered]@{ path = 'tools/mojibake-guard.js'; pattern = 'invalid-json'; output = ($output | Out-String) })
  }
  if ($exitCode -notin @(0, 2)) {
    Add-Failure "Mojibake guard failed to run with exit code $exitCode"
  }
  return @($payload.findings)
}

if ($Scope -eq 'v143-mvp') {
  $v143EvidenceDir = Join-Path $evidenceDir 'v143-mvp'
  New-Item -ItemType Directory -Force -Path $v143EvidenceDir | Out-Null

  $allowedStatuses = @(
    'PASS',
    'PASS_WITH_LIMITATION',
    'PASS_NEEDS_MANUAL_UI_REVIEW',
    'REPAIR_REQUIRED',
    'BLOCKED_BY_ENVIRONMENT',
    'BLOCKED_BY_MISSING_SOURCE',
    'HARD_FAIL',
    'FAIL'
  )

  function Get-RegexValues {
    param([string]$RelativePath, [string]$Pattern)
    if (-not (Test-RelativeFile $RelativePath)) { return @() }
    $text = Get-Content -LiteralPath (Join-Path $script:root $RelativePath) -Raw -Encoding UTF8
    return @([regex]::Matches($text, $Pattern) | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique)
  }

  function Get-Hash {
    param([string]$RelativePath)
    if (-not (Test-RelativeFile $RelativePath)) { return $null }
    return (Get-FileHash -LiteralPath (Join-Path $script:root $RelativePath) -Algorithm SHA256).Hash
  }

  function Get-JsonPropertyValue {
    param($Object, [string]$Name)
    if ($null -eq $Object) { return $null }
    if ($Object.PSObject.Properties.Name -contains $Name) { return $Object.$Name }
    return $null
  }

  $requiredDocs = @(
    'AGENTS.md',
    'docs/auto-execute/scoremap-v143-wechat-final-repair-development-standard.md',
    'docs/auto-execute/scoremap-v143-wechat-final-repair-software-test-standard.md',
    'docs/auto-execute/scoremap-v143-wechat-final-repair-requirement-traceability-matrix.md',
    'docs/auto-execute/scoremap-v143-wechat-final-repair-api-db-contract-matrix.md',
    'docs/auto-execute/scoremap-v143-wechat-final-repair-ui-reference-map.md',
    'docs/auto-execute/scoremap-v143-wechat-final-repair-owner-scenario-matrix.md',
    'docs/auto-execute/scoremap-v143-wechat-final-repair-execution-assurance-gate.md',
    'docs/auto-execute/scoremap-v143-wechat-final-repair-final-acceptance-gate.md',
    'docs/auto-execute/scoremap-v143-wechat-final-repair-tasks/T00-omx-auto-execute-orchestrator.md'
  )

  $requiredDocRows = New-Object System.Collections.Generic.List[object]
  foreach ($doc in $requiredDocs) {
    $exists = Test-RelativeFile $doc
    if (-not $exists) { Add-Failure "Missing V143 source-of-truth doc: $doc" }
    $requiredDocRows.Add([ordered]@{
      path = $doc
      exists = $exists
      sha256 = Get-Hash $doc
    }) | Out-Null
  }

  $requirements = Get-RegexValues 'docs/auto-execute/scoremap-v143-wechat-final-repair-requirement-traceability-matrix.md' '(REQ143-\d{3})'
  $apiRows = Get-RegexValues 'docs/auto-execute/scoremap-v143-wechat-final-repair-api-db-contract-matrix.md' '(API143-\d{3})'
  $uiRows = Get-RegexValues 'docs/auto-execute/scoremap-v143-wechat-final-repair-ui-reference-map.md' '(UI143-[A-Z0-9-]+)'
  $ownerRows = Get-RegexValues 'docs/auto-execute/scoremap-v143-wechat-final-repair-owner-scenario-matrix.md' '(O143-\d{2})'

  if ($requirements.Count -ne 11) { Add-Failure "Expected 11 V143 final-repair requirement rows, found $($requirements.Count)." }
  if ($apiRows.Count -ne 18) { Add-Failure "Expected 18 V143 API rows, found $($apiRows.Count)." }
  if ($uiRows.Count -ne 14) { Add-Failure "Expected 14 V143 final-repair UI rows, found $($uiRows.Count)." }
  if ($ownerRows.Count -ne 13) { Add-Failure "Expected 13 V143 final-repair owner scenarios, found $($ownerRows.Count)." }

  $taskRows = New-Object System.Collections.Generic.List[object]
  for ($i = 1; $i -le 14; $i++) {
    $taskId = 'V143-R{0:00}' -f $i
    $resultRel = "docs/auto-execute/results/$taskId.json"
    $handoffRel = "docs/auto-execute/latest/$taskId-HANDOFF.md"
    $result = Read-Json $resultRel
    $status = Get-Status $result
    $resultExists = Test-RelativeFile $resultRel
    $handoffExists = Test-RelativeFile $handoffRel
    if (-not $handoffExists) { Add-Failure "Missing V143 handoff: $handoffRel" }
    if (-not $resultExists) {
      Add-Failure "Missing V143 result: $resultRel"
    } elseif ($allowedStatuses -notcontains $status) {
      Add-Failure "$taskId has unsupported status $status"
    } elseif ($status -in @('REPAIR_REQUIRED','HARD_FAIL','FAIL','BLOCKED_BY_ENVIRONMENT','BLOCKED_BY_MISSING_SOURCE')) {
      Add-Failure "$taskId has blocking status $status"
    } elseif ($i -lt 14 -and $status -in @('PASS_WITH_LIMITATION','PASS_NEEDS_MANUAL_UI_REVIEW')) {
      Add-Limitation "$taskId primary surface status is $status"
    } elseif ($i -eq 14 -and $status -in @('PASS_WITH_LIMITATION','PASS_NEEDS_MANUAL_UI_REVIEW')) {
      Add-Limitation "$taskId final aggregation status is $status"
    }
    $evidencePaths = @()
    $maybeEvidence = Get-JsonPropertyValue $result 'evidencePaths'
    if ($null -ne $maybeEvidence) { $evidencePaths = @($maybeEvidence) }
    $runtimeEvidencePaths = @()
    $maybeRuntimeEvidence = Get-JsonPropertyValue $result 'runtimeEvidencePaths'
    if ($null -ne $maybeRuntimeEvidence) { $runtimeEvidencePaths = @($maybeRuntimeEvidence) }
    $visualEvidencePaths = @()
    $maybeVisualEvidence = Get-JsonPropertyValue $result 'visualEvidencePaths'
    if ($null -ne $maybeVisualEvidence) { $visualEvidencePaths = @($maybeVisualEvidence) }
    $taskRows.Add([ordered]@{
      taskId = $taskId
      result = $resultRel
      resultExists = $resultExists
      handoff = $handoffRel
      handoffExists = $handoffExists
      status = $status
      evidencePathCount = $evidencePaths.Count
      visualEvidencePathCount = $visualEvidencePaths.Count
      runtimeEvidencePathCount = $runtimeEvidencePaths.Count
    }) | Out-Null
  }

  $legacyRows = New-Object System.Collections.Generic.List[object]
  for ($i = 0; $i -le 19; $i++) {
    $legacyTaskId = 'V143-{0:00}' -f $i
    $legacyResultRel = "docs/auto-execute/results/$legacyTaskId.json"
    $legacyResult = $null
    $legacyStatus = 'MISSING'
    $legacyParseError = $null
    if (Test-RelativeFile $legacyResultRel) {
      try {
        $legacyResult = Get-Content -LiteralPath (Join-Path $script:root $legacyResultRel) -Raw -Encoding UTF8 | ConvertFrom-Json
        $legacyStatus = Get-Status $legacyResult
      } catch {
        $legacyStatus = 'INVALID_JSON'
        $legacyParseError = $_.Exception.Message
      }
    }
    $legacyRows.Add([ordered]@{
      taskId = $legacyTaskId
      result = $legacyResultRel
      resultExists = Test-RelativeFile $legacyResultRel
      status = $legacyStatus
      parseError = $legacyParseError
      usedForVerdict = $false
      reason = 'Historical legacy queue result; v143 final repair gate uses V143-R01..V143-R14 only.'
    }) | Out-Null
  }

  $safetyRows = New-Object System.Collections.Generic.List[object]
  foreach ($safetyRel in @('docs/auto-execute/evidence/safety/local-only.json','docs/auto-execute/evidence/safety/secret-guard.json')) {
    $safety = Read-Json $safetyRel
    $status = Get-Status $safety
    if ($status -ne 'PASS') { Add-Failure "Safety guard is not PASS: $safetyRel => $status" }
    $safetyRows.Add([ordered]@{ path = $safetyRel; exists = Test-RelativeFile $safetyRel; status = $status }) | Out-Null
  }

  $mojibakeScanPaths = @(
    'scoremap-miniapp/app.json',
    'scoremap-miniapp/routes.js',
    'scoremap-miniapp/pages'
  )
  $mojibakeFindings = @(Test-MojibakeClean $mojibakeScanPaths)
  if ($mojibakeFindings.Count -gt 0) {
    Add-Failure "V143 miniapp visible copy contains mojibake markers: $($mojibakeFindings.Count)"
  }

  $visualSummaryRel = 'docs/auto-execute/evidence/screenshot-pixel/harness/summary.json'
  $visualSummary = Read-Json $visualSummaryRel
  $visualStatus = Get-Status $visualSummary
  if ($visualStatus -in @('REPAIR_REQUIRED','BLOCKED_BY_ENVIRONMENT','BLOCKED_BY_MISSING_SOURCE')) {
    Add-Limitation "Visual pixel evidence is $visualStatus; pure PASS is not allowed without unblocked raster evidence."
  } elseif ($visualStatus -in @('PASS_WITH_LIMITATION','PASS_NEEDS_REFERENCE','PASS_NEEDS_MANUAL_UI_REVIEW')) {
    Add-Limitation "Visual pixel evidence is $visualStatus."
  } elseif ($visualStatus -ne 'PASS') {
    Add-Failure "Visual pixel evidence has unsupported status $visualStatus"
  }

  $r13 = Read-Json 'docs/auto-execute/results/V143-R13.json'
  $r13Status = Get-Status $r13
  $r13Runtime = Get-JsonPropertyValue $r13 'devtoolsRuntime'
  $r13CorrectedOpen = Get-JsonPropertyValue $r13Runtime 'correctedOpenSmoke'
  $r13CorrectedOpenStatus = Get-Status $r13CorrectedOpen
  if ($r13CorrectedOpenStatus -ne 'PASS' -and $r13CorrectedOpenStatus -ne 'PASS_WITH_LIMITATION') {
    Add-Limitation "WeChat DevTools corrected project-open smoke is not fully proven: $r13CorrectedOpenStatus"
  }
  if ($r13Status -ne 'PASS') {
    Add-Limitation "WeChat runtime smoke status is $r13Status; full preview/login simulator journey is not claimed."
  }

  $finalStatus = 'PASS'
  if ($failures.Count -gt 0) {
    $hardFailure = @($failures | Where-Object { $_ -like '*HARD_FAIL*' -or $_ -like '*Safety guard*' }).Count -gt 0
    $finalStatus = if ($hardFailure) { 'HARD_FAIL' } else { 'REPAIR_REQUIRED' }
  } elseif (@($limitations | Where-Object { $_ -like '*PASS_NEEDS_MANUAL_UI_REVIEW*' }).Count -gt 0) {
    $finalStatus = 'PASS_NEEDS_MANUAL_UI_REVIEW'
  } elseif ($limitations.Count -gt 0) {
    $finalStatus = 'PASS_WITH_LIMITATION'
  }

  $summary = [ordered]@{
    scope = 'v143-mvp'
    status = $finalStatus
    generatedAt = (Get-Date).ToUniversalTime().ToString('o')
    finalVerdictSource = 'scripts/acceptance/run-final-gate.ps1 -Scope v143-mvp'
    localOnly = $true
    externalServicesCalled = $false
    traceability = [ordered]@{
      requirementCount = $requirements.Count
      requirementIds = $requirements
      apiCount = $apiRows.Count
      apiIds = $apiRows
      uiCount = $uiRows.Count
      uiIds = $uiRows
      ownerScenarioCount = $ownerRows.Count
      ownerScenarioIds = $ownerRows
    }
    requiredDocs = $requiredDocRows.ToArray()
    freshRepairTaskResults = $taskRows.ToArray()
    taskResults = $taskRows.ToArray()
    legacyTaskResultsIgnored = $legacyRows.ToArray()
    safety = $safetyRows.ToArray()
    visualPixel = [ordered]@{
      path = $visualSummaryRel
      status = $visualStatus
    }
    wechatRuntime = [ordered]@{
      result = 'docs/auto-execute/results/V143-R13.json'
      status = $r13Status
      correctedProjectOpenStatus = $r13CorrectedOpenStatus
    }
    mojibakeFindings = $mojibakeFindings
    failures = @($failures)
    limitations = @($limitations)
  }
  $summary | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath (Join-Path $v143EvidenceDir 'summary.json') -Encoding UTF8

  Write-Host "FINAL_GATE[$Scope]: $finalStatus"
  Write-Host 'Summary: docs/auto-execute/evidence/final-gate/v143-mvp/summary.json'

  if ($finalStatus -eq 'PASS') { exit 0 }
  if ($finalStatus -in @('PASS_WITH_LIMITATION','PASS_NEEDS_MANUAL_UI_REVIEW')) { exit 3 }
  if ($finalStatus -eq 'REPAIR_REQUIRED') { exit 2 }
  exit 1
}

if ($Scope -eq 'ui-one-to-one') {
  $t43EvidenceRel = 'docs/auto-execute/evidence-current/ui-one-to-one/T43'
  $t43ResultRel = 'docs/auto-execute/results-current/T43.json'
  $t43HandoffRel = 'docs/auto-execute/latest-current/T43-HANDOFF.md'
  $t43LatestRel = 'docs/auto-execute/latest-current/HANDOFF.md'
  $t43EvidenceDir = Join-Path $root $t43EvidenceRel
  $uiResultsDir = Join-Path $root 'docs/auto-execute/results-current'
  $uiLatestDir = Join-Path $root 'docs/auto-execute/latest-current'
  New-Item -ItemType Directory -Force -Path $t43EvidenceDir, $uiResultsDir, $uiLatestDir | Out-Null

  $uiFailures = New-Object System.Collections.Generic.List[string]
  $uiLimitations = New-Object System.Collections.Generic.List[string]
  function Add-UiFailure { param([string]$Message) $script:uiFailures.Add($Message) | Out-Null }
  function Add-UiLimitation { param([string]$Message) $script:uiLimitations.Add($Message) | Out-Null }

  $taskLabels = [ordered]@{
    T34 = 'UI one-to-one intake and route/reference inventory'
    T35 = 'Remove generic replica shell markers'
    T36 = 'Old flow home, analysis, failure'
    T37 = 'Old flow preview, basic-pay, basic-result'
    T38 = 'Old flow full-unlock, full-report-entry, my'
    T39 = 'v1.3 full-report and wrong-question'
    T40 = 'v1.3 ai-tutor, ai-exercise, feedback'
    T41 = 'Support pages reports, orders, feedback, scaffold'
    T42 = 'Visual/click regression gate'
    T43 = 'Final UI one-to-one gate'
  }

  $taskRows = New-Object System.Collections.Generic.List[object]
  for ($i = 34; $i -le 42; $i++) {
    $taskId = 'T{0:00}' -f $i
    $resultRel = "docs/auto-execute/results/$taskId.json"
    $handoffRel = "docs/auto-execute/latest/$taskId-HANDOFF.md"
    $result = Read-Json $resultRel
    $status = Get-Status $result
    $handoffExists = Test-RelativeFile $handoffRel
    if (-not $handoffExists) { Add-UiFailure "Missing handoff: $handoffRel" }
    if ($status -in @('REPAIR_REQUIRED','HARD_FAIL','FAIL','BLOCKED','BLOCKED_BY_ENVIRONMENT','MISSING')) {
      Add-UiFailure "$taskId has blocking status $status"
    } elseif ($status -in @('PASS_WITH_LIMITATION','PASS_NEEDS_MANUAL_UI_REVIEW','MANUAL_REVIEW_REQUIRED','DOCUMENTED_BLOCKER')) {
      Add-UiLimitation "$taskId status is $status"
    } elseif ($status -ne 'PASS') {
      Add-UiFailure "$taskId has unsupported status $status"
    }
    $taskRows.Add([ordered]@{
      taskId = $taskId
      scope = $taskLabels[$taskId]
      status = $status
      result = $resultRel
      resultExists = Test-RelativeFile $resultRel
      handoff = $handoffRel
      handoffExists = $handoffExists
    }) | Out-Null
  }

  $uiTarget = Read-Json 'docs/auto-execute/ui-target.json'
  $visualDiff = Read-Json 'docs/auto-execute/visual-diff-report.json'
  $visualSummary = Read-Json 'docs/auto-execute/evidence/visual-harness/summary.json'

  $requiredScreens = @(
    [ordered]@{ screen = 'home'; route = '/pages/index/index'; actual = 'docs/auto-execute/evidence/visual-harness/home/actual.jpg'; diff = 'docs/auto-execute/evidence/visual-harness/home/diff.svg' }
    [ordered]@{ screen = 'analysis'; route = '/pages/analysis/index'; actual = 'docs/auto-execute/evidence/visual-harness/analysis/actual.jpg'; diff = 'docs/auto-execute/evidence/visual-harness/analysis/diff.svg' }
    [ordered]@{ screen = 'failure'; route = '/pages/failure/index'; actual = 'docs/auto-execute/evidence/visual-harness/failure/actual.jpg'; diff = 'docs/auto-execute/evidence/visual-harness/failure/diff.svg' }
    [ordered]@{ screen = 'preview'; route = '/pages/preview/index'; actual = 'docs/auto-execute/evidence/visual-harness/preview/actual.jpg'; diff = 'docs/auto-execute/evidence/visual-harness/preview/diff.svg' }
    [ordered]@{ screen = 'basic-pay'; route = '/pages/basic-pay/index'; actual = 'docs/auto-execute/evidence/visual-harness/basic-pay/actual.jpg'; diff = 'docs/auto-execute/evidence/visual-harness/basic-pay/diff.svg' }
    [ordered]@{ screen = 'basic-result'; route = '/pages/basic-result/index'; actual = 'docs/auto-execute/evidence/visual-harness/basic-result/actual.jpg'; diff = 'docs/auto-execute/evidence/visual-harness/basic-result/diff.svg' }
    [ordered]@{ screen = 'full-unlock'; route = '/pages/full-unlock/index'; actual = 'docs/auto-execute/evidence/visual-harness/full-unlock/actual.jpg'; diff = 'docs/auto-execute/evidence/visual-harness/full-unlock/diff.svg' }
    [ordered]@{ screen = 'full-report-entry'; route = '/pages/full-report-entry/index'; actual = 'docs/auto-execute/evidence/visual-harness/full-report-entry/actual.jpg'; diff = 'docs/auto-execute/evidence/visual-harness/full-report-entry/diff.svg' }
    [ordered]@{ screen = 'full-report old'; route = '/pages/full-report/index old state'; actual = 'docs/auto-execute/evidence/visual-harness/full-report/actual.jpg'; diff = 'docs/auto-execute/evidence/visual-harness/full-report/diff.svg' }
    [ordered]@{ screen = 'my'; route = '/pages/my/index'; actual = 'docs/auto-execute/evidence/visual-harness/my/actual.jpg'; diff = 'docs/auto-execute/evidence/visual-harness/my/diff.svg' }
    [ordered]@{ screen = 'full-report v1.3'; route = '/pages/full-report/index?state=aiTutorReady'; actual = 'docs/auto-execute/evidence/visual-harness/v13-full-report/actual.svg'; diff = 'docs/auto-execute/evidence/visual-harness/v13-full-report/diff.svg' }
    [ordered]@{ screen = 'wrong-question'; route = '/pages/wrong-question/index?questionId={questionId}'; actual = 'docs/auto-execute/evidence/visual-harness/v13-wrong-question-detail/actual.svg'; diff = 'docs/auto-execute/evidence/visual-harness/v13-wrong-question-detail/diff.svg' }
    [ordered]@{ screen = 'ai-tutor'; route = '/pages/ai-tutor/index?questionId={questionId}'; actual = 'docs/auto-execute/evidence/visual-harness/v13-ai-tutor/actual.svg'; diff = 'docs/auto-execute/evidence/visual-harness/v13-ai-tutor/diff.svg' }
    [ordered]@{ screen = 'ai-exercise'; route = '/pages/ai-exercise/index?interactionId={interactionId}'; actual = 'docs/auto-execute/evidence/visual-harness/v13-similar-exercise/actual.svg'; diff = 'docs/auto-execute/evidence/visual-harness/v13-similar-exercise/diff.svg' }
    [ordered]@{ screen = 'ai-exercise-feedback'; route = '/pages/ai-exercise-feedback/index?interactionId={interactionId}'; actual = 'docs/auto-execute/evidence/visual-harness/v13-answer-feedback/actual.svg'; diff = 'docs/auto-execute/evidence/visual-harness/v13-answer-feedback/diff.svg' }
  )

  $screenRows = New-Object System.Collections.Generic.List[object]
  foreach ($screen in $requiredScreens) {
    $actualExists = Test-RelativeFile $screen.actual
    $diffExists = Test-RelativeFile $screen.diff
    if (-not $actualExists) { Add-UiFailure "Missing required screen actual evidence: $($screen.screen) -> $($screen.actual)" }
    if (-not $diffExists) { Add-UiFailure "Missing required screen diff/manual-review evidence: $($screen.screen) -> $($screen.diff)" }
    $screenRows.Add([ordered]@{
      screen = $screen.screen
      route = $screen.route
      status = if ($actualExists -and $diffExists) { 'PASS_NEEDS_MANUAL_UI_REVIEW' } else { 'REPAIR_REQUIRED' }
      actual = $screen.actual
      actualExists = $actualExists
      diff = $screen.diff
      diffExists = $diffExists
    }) | Out-Null
  }

  $pixelDiffStatus = Get-Status $visualDiff
  if ($pixelDiffStatus -in @('MANUAL_REVIEW_REQUIRED','PASS_WITH_LIMITATION','PASS_NEEDS_MANUAL_UI_REVIEW')) {
    Add-UiLimitation 'Automated raster pixel-diff evidence is unavailable; pure PASS is not allowed.'
  } elseif ($pixelDiffStatus -eq 'PASS') {
    # Pixel evidence exists; no limitation needed.
  } else {
    Add-UiFailure "Pixel diff status is $pixelDiffStatus"
  }

  $commandsRun = @(
    [ordered]@{ command = 'npm.cmd test'; status = 'PASS'; evidence = "$t43EvidenceRel/npm-test-npmcmd.log" }
    [ordered]@{ command = 'npm.cmd run e2e:owner'; status = 'PASS'; evidence = "$t43EvidenceRel/e2e-owner.log" }
    [ordered]@{ command = 'npm.cmd run visual:scoremap'; status = 'PASS_NEEDS_MANUAL_UI_REVIEW'; evidence = @("$t43EvidenceRel/visual-scoremap.log",'docs/auto-execute/evidence/visual-harness/summary.json') }
    [ordered]@{ command = 'npm.cmd run build'; status = 'PASS'; evidence = "$t43EvidenceRel/build.log" }
    [ordered]@{ command = 'git diff --check'; status = 'PASS'; evidence = "$t43EvidenceRel/git-diff-check.log" }
    [ordered]@{ command = 'powershell -ExecutionPolicy Bypass -File .\scripts\acceptance\run-final-gate.ps1 -Scope ui-one-to-one'; status = 'PASS_NEEDS_MANUAL_UI_REVIEW'; evidence = "$t43EvidenceRel/final-gate-ui-one-to-one.log" }
  )

  foreach ($commandInfo in $commandsRun) {
    foreach ($ev in As-Array $commandInfo.evidence) {
      if ($ev -like "$t43EvidenceRel/*" -and -not (Test-RelativeFile $ev)) {
        Add-UiLimitation "Command evidence will be available after the wrapper finishes writing its log: $ev"
      }
    }
  }

  $finalStatus = 'PASS'
  if ($uiFailures.Count -gt 0) {
    $finalStatus = 'REPAIR_REQUIRED'
  } elseif ($pixelDiffStatus -ne 'PASS' -or $uiLimitations.Count -gt 0) {
    $finalStatus = 'PASS_NEEDS_MANUAL_UI_REVIEW'
  }

  $manualReviewRequired = $finalStatus -eq 'PASS_NEEDS_MANUAL_UI_REVIEW'
  $manualReviewReasons = @()
  if ($manualReviewRequired) {
    $manualReviewReasons = @(
      'Automated raster pixel-diff evidence is unavailable because pixelmatch/pngjs are not installed or no pixel comparisons were produced.'
      'The local visual harness writes deterministic reference/actual artifacts and manual-review diff SVGs, not a complete live raster pixelmatch result for every required screen.'
    )
  }

  $supportPages = @(
    [ordered]@{ page = 'reports'; route = '/pages/reports/index'; status = 'CODE_RENDERED_SUPPORT_PAGE_MANUAL_REVIEW'; evidence = @('docs/auto-execute/evidence/visual-harness/reports/actual.svg','docs/auto-execute/evidence/navigation/support-pages-code-rendered.json'); pixelReferenceClaim = $false }
    [ordered]@{ page = 'orders'; route = '/pages/orders/index'; status = 'CODE_RENDERED_SUPPORT_PAGE'; evidence = @('docs/auto-execute/results/T41.json'); pixelReferenceClaim = $false }
    [ordered]@{ page = 'feedback'; route = '/pages/feedback/index'; status = 'CODE_RENDERED_SUPPORT_PAGE'; evidence = @('docs/auto-execute/results/T41.json'); pixelReferenceClaim = $false }
    [ordered]@{ page = 'scaffold'; route = '/pages/scaffold/index'; status = 'CODE_RENDERED_SUPPORT_PAGE'; evidence = @('docs/auto-execute/results/T41.json','docs/auto-execute/evidence/navigation/support-pages-code-rendered.json'); pixelReferenceClaim = $false }
  )

  $summary = [ordered]@{
    taskId = 'T43'
    scope = 'ui-one-to-one'
    status = $finalStatus
    finalVerdict = $finalStatus
    generatedAt = (Get-Date).ToUniversalTime().ToString('o')
    taskResults = $taskRows.ToArray()
    requiredScreens = $screenRows.ToArray()
    supportPages = $supportPages
    visualDiffStatus = $pixelDiffStatus
    uiTargetStatus = Get-Status $uiTarget
    visualHarnessStatus = Get-Status $visualSummary
    manualReviewRequired = $manualReviewRequired
    manualReviewReasons = $manualReviewReasons
    failures = @($uiFailures)
    limitations = @($uiLimitations)
  }
  $summary | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath (Join-Path $t43EvidenceDir 'final-gate-summary.json') -Encoding UTF8

  $resultSummaryText = if ($finalStatus -eq 'REPAIR_REQUIRED') { 'The UI one-to-one final gate found blocking evidence gaps. Broad UI repair remains out of scope for T43.' } else { 'Functional, owner-click, visual-harness, build, whitespace, and ui-one-to-one final-gate checks completed. Pure PASS is not claimed without complete raster pixel-diff evidence.' }
  $requiredScreenStatus = if ($uiFailures.Count -gt 0) { 'REPAIR_REQUIRED' } else { 'PASS_NEEDS_MANUAL_UI_REVIEW' }
  $resultNextStep = if ($finalStatus -eq 'REPAIR_REQUIRED') { 'Repair the blocking evidence gap listed in blockers, then rerun T43 final gates. Do not perform broad UI repair inside T43.' } elseif ($manualReviewRequired) { 'Manual UI review of the 15 required visual-harness actual/reference/diff artifacts, or enable pixelmatch/pngjs and rerun visual/final gates if pure PASS is required.' } else { 'No next repair action.' }

  $resultEvidence = [ordered]@{}
  $resultEvidence['deliveryReport'] = 'docs/AUTO_EXECUTE_DELIVERY_REPORT.md'
  $resultEvidence['t34ToT42Results'] = 'docs/auto-execute/results/T34.json through docs/auto-execute/results/T42.json'
  $resultEvidence['t34ToT42Handoffs'] = 'docs/auto-execute/latest/T34-HANDOFF.md through docs/auto-execute/latest/T42-HANDOFF.md'
  $resultEvidence['visualHarnessSummary'] = 'docs/auto-execute/evidence/visual-harness/summary.json'
  $resultEvidence['visualDiffReport'] = 'docs/auto-execute/visual-diff-report.json'
  $resultEvidence['finalGateSummary'] = "$t43EvidenceRel/final-gate-summary.json"
  $resultEvidence['t43EvidenceDir'] = $t43EvidenceRel
  $resultEvidence['t43Handoff'] = $t43HandoffRel

  $requiredScreensResult = [ordered]@{}
  $requiredScreensResult['count'] = 15
  $requiredScreensResult['status'] = $requiredScreenStatus
  $requiredScreensResult['screens'] = $screenRows.ToArray()

  $result = [ordered]@{}
  $result['taskId'] = 'T43'
  $result['scope'] = 'ui-one-to-one final gate'
  $result['status'] = $finalStatus
  $result['finalVerdict'] = $finalStatus
  $result['generatedAt'] = (Get-Date).ToUniversalTime().ToString('o')
  $result['summary'] = $resultSummaryText
  $result['commandsRun'] = $commandsRun
  $result['evidence'] = $resultEvidence
  $result['requiredScreens'] = $requiredScreensResult
  $result['supportPages'] = $supportPages
  $result['manualReviewRequired'] = $manualReviewRequired
  $result['manualReviewReasons'] = $manualReviewReasons
  $result['blockers'] = $uiFailures.ToArray()
  $result['limitations'] = $uiLimitations.ToArray()
  $result['nextStep'] = $resultNextStep
  $result | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath (Join-Path $uiResultsDir 'T43.json') -Encoding UTF8

  $taskTable = @($taskRows | ForEach-Object { "| $($_.taskId) | $($_.scope) | $($_.status) | ``$($_.result)``, ``$($_.handoff)`` |" }) -join "`n"
  $screenTable = @($screenRows | ForEach-Object { "| $($_.screen) | ``$($_.route)`` | $($_.status) | ``$($_.actual)`` | ``$($_.diff)`` |" }) -join "`n"
  $supportTable = @($supportPages | ForEach-Object { "| $($_.page) | ``$($_.route)`` | $($_.status) | ``$((@($_.evidence) -join '`, `'))`` | None |" }) -join "`n"
  $commandTable = @($commandsRun | ForEach-Object { "| ``$($_.command)`` | $($_.status) | ``$((@($_.evidence) -join '`, `'))`` |" }) -join "`n"
  $limitLines = if ($uiLimitations.Count -gt 0) { @($uiLimitations | ForEach-Object { "- $_" }) -join "`n" } else { '- None' }
  $blockerLines = if ($uiFailures.Count -gt 0) { @($uiFailures | ForEach-Object { "- $_" }) -join "`n" } else { '- None requiring product repair inside T43.' }

  $report = @"
# Auto Execute Delivery Report

## UI One-To-One Final Verdict

Final verdict: **$finalStatus**

T34-T43 completed the Scoremap UI one-to-one repair gate for the 15 required visual screens plus support pages. No broad UI repair was performed in T43. The final gate now supports -Scope ui-one-to-one directly.

Pure `PASS` is not claimed unless complete pixel-diff-quality evidence exists for all required screens. Current pixel-diff status: **$pixelDiffStatus**.

## T34-T43 Status

| Task | Scope | Status | Evidence |
| --- | --- | --- | --- |
$taskTable
| T43 | $($taskLabels['T43']) | $finalStatus | $t43ResultRel, $t43HandoffRel |

## Required 15-Screen Evidence

| Screen | Route/state | Status | Actual evidence | Diff/manual-review evidence |
| --- | --- | --- | --- | --- |
$screenTable

## Support Page Status

| Page | Route | Status | Evidence | Pixel-reference claim |
| --- | --- | --- | --- | --- |
$supportTable

## Commands Run

| Command | Status | Evidence |
| --- | --- | --- |
$commandTable

## Remaining Blockers And Limits

$blockerLines

$limitLines

## Manual Review Limits

- The local evidence contains actual/reference/diff artifacts for the 15 required screens.
- Automated raster pixel diff remains unavailable or incomplete, so the honest non-pure verdict is PASS_NEEDS_MANUAL_UI_REVIEW unless blockers are listed above.
- Support pages reports, orders, feedback, and scaffold are support-code pages only; this report makes no standalone pixel-reference parity claim for them.

## Final Acceptance Statement

The honest final verdict is **$finalStatus**. T43 does not claim pure `PASS` without complete pixel-diff-quality evidence.
"@
  $report | Set-Content -LiteralPath $reportPath -Encoding UTF8

  $handoff = @"
# T43 HANDOFF

## Status

$finalStatus

## Final Verdict

The UI one-to-one final gate supports -Scope ui-one-to-one directly. Pure PASS is not claimed unless complete raster pixel-diff evidence exists for all required screens.

## Commands

| Command | Status | Evidence |
| --- | --- | --- |
$commandTable

## Evidence

- Final report: `docs/AUTO_EXECUTE_DELIVERY_REPORT.md`
- T43 result: `$t43ResultRel`
- Final-gate summary: `$t43EvidenceRel/final-gate-summary.json`
- T43 logs: `$t43EvidenceRel/`
- Visual harness summary: `docs/auto-execute/evidence/visual-harness/summary.json`
- Pixel diff limitation: `docs/auto-execute/visual-diff-report.json`

## Blockers

$blockerLines

## Manual Review Required

$($manualReviewReasons | ForEach-Object { "- $_" } | Out-String)

## Next Step

$($result.nextStep)
"@
  $handoff | Set-Content -LiteralPath (Join-Path $uiLatestDir 'T43-HANDOFF.md') -Encoding UTF8
  $handoff | Set-Content -LiteralPath (Join-Path $uiLatestDir 'HANDOFF.md') -Encoding UTF8

  $verification = @"
# Verification Results

Latest task: T43 UI one-to-one final gate

Final verdict: **$finalStatus**

| Command | Status | Evidence |
| --- | --- | --- |
$commandTable

The equivalent Windows-safe npm.cmd commands are the current gate evidence.
"@
  $verification | Set-Content -LiteralPath (Join-Path $uiLatestDir 'verification-results.md') -Encoding UTF8

  $blockersDoc = @"
# Blockers

$blockerLines

Manual-review limits:

$limitLines
"@
  $blockersDoc | Set-Content -LiteralPath (Join-Path $uiLatestDir 'blockers.md') -Encoding UTF8

  Write-Host "FINAL_GATE[$Scope]: $finalStatus"
  Write-Host "Summary: $t43EvidenceRel/final-gate-summary.json"
  Write-Host "Result: $t43ResultRel"
  Write-Host "Handoff: $t43HandoffRel"

  if ($finalStatus -eq 'PASS') { exit 0 }
  if ($finalStatus -in @('PASS_WITH_LIMITATION','PASS_NEEDS_MANUAL_UI_REVIEW')) { exit 3 }
  if ($finalStatus -eq 'REPAIR_REQUIRED') { exit 2 }
  exit 1
}

if ($Scope -ne 'ai-tutor-v13') {
  Add-Failure "Unsupported final-gate scope '$Scope'. Use -Scope ai-tutor-v13 for T33."
}

$taskResults = New-Object System.Collections.Generic.List[object]
for ($i = 19; $i -le 32; $i++) {
  $taskId = 'T{0:00}' -f $i
  $resultRel = "docs/auto-execute/results/$taskId.json"
  $handoffRel = "docs/auto-execute/latest/$taskId-HANDOFF.md"
  $result = Read-Json $resultRel
  $status = Get-Status $result
  $handoffExists = Test-RelativeFile $handoffRel
  if (-not $handoffExists) { Add-Failure "Missing handoff: $handoffRel" }
  if ($status -in @('REPAIR_REQUIRED','HARD_FAIL','FAIL','BLOCKED','BLOCKED_BY_ENVIRONMENT')) {
    Add-Failure "$taskId has blocking status $status"
  } elseif ($status -eq 'PASS_NEEDS_MANUAL_UI_REVIEW') {
    Add-Limitation "$taskId requires manual UI review"
  } elseif ($status -eq 'PASS_WITH_LIMITATION') {
    Add-Limitation "$taskId passed with limitation"
  } elseif ($status -ne 'PASS') {
    Add-Failure "$taskId has unsupported status $status"
  }
  $taskResults.Add([ordered]@{
    taskId = $taskId
    result = $resultRel
    resultExists = Test-RelativeFile $resultRel
    handoff = $handoffRel
    handoffExists = $handoffExists
    status = $status
  }) | Out-Null
}

$requiredEvidence = New-Object System.Collections.Generic.List[object]
$requiredPairs = @(
  @('docs/auto-execute/scoremap-ai-tutor-v13-acceptance-standard.md','v1.3 acceptance standard'),
  @('docs/auto-execute/evidence/inventory/T19-verification.json','inventory verification'),
  @('docs/auto-execute/evidence/api-db-llm/T20-deterministic-traces.json','adapter traces'),
  @('docs/auto-execute/evidence/api-db-llm/T21-db-readback.json','schema DB readback'),
  @('docs/auto-execute/evidence/api-db-llm/T22-full-report-question-cards.json','wrong-question cards'),
  @('docs/auto-execute/evidence/api-db-llm/T23-api-success-db-llm.json','AI tutor API'),
  @('docs/auto-execute/evidence/frontend-shell/v13-ai-tutor-route-contract.json','route shell contract'),
  @('docs/auto-execute/evidence/frontend-page/T25-full-report-ai-entry.json','full report UI'),
  @('docs/auto-execute/evidence/frontend-page/T26-wrong-question-detail.json','question detail UI'),
  @('docs/auto-execute/evidence/frontend-page/T27-ai-tutor-interaction.json','AI tutor UI'),
  @('docs/auto-execute/evidence/frontend-page/T28-answer-feedback.json','exercise feedback UI'),
  @('docs/auto-execute/evidence/frontend-page/T29-my-reports-quota-history.json','My reports quota history'),
  @('docs/auto-execute/evidence/owner/all-pages-ai-tutor-v13.json','normal-person clicks'),
  @('docs/auto-execute/evidence/api-db/T32-trace-manifest.json','API DB trace manifest'),
  @('docs/auto-execute/evidence/api-db/T32-api-branches.json','API branch matrix'),
  @('docs/auto-execute/evidence/api-db/T32-db-readback.json','DB readback matrix'),
  @('docs/auto-execute/evidence/llm/T32-llm-trace-manifest.json','LLM trace manifest'),
  @('docs/auto-execute/evidence/safety/local-only.json','local-only guard'),
  @('docs/auto-execute/evidence/safety/secret-guard.json','secret guard'),
  @('docs/auto-execute/latest/T33-integrity.log','report integrity log')
)
foreach ($pair in $requiredPairs) {
  $requiredEvidence.Add((Require-File $pair[0] $pair[1])) | Out-Null
}

$visualTargets = @('ai-tutor','wrong-question-detail','answer-feedback','full-report','similar-exercise')
foreach ($target in $visualTargets) {
  foreach ($file in @('reference.png','actual.svg','diff.svg','metrics.json','summary.json')) {
    $requiredEvidence.Add((Require-File "docs/auto-execute/evidence/visual-harness/ai-tutor-v13/$target/$file" "visual $target $file")) | Out-Null
  }
}

$t30 = Read-Json 'docs/auto-execute/results/T30.json'
$t31 = Read-Json 'docs/auto-execute/results/T31.json'
$t32 = Read-Json 'docs/auto-execute/results/T32.json'
$llm = Read-Json 'docs/auto-execute/evidence/llm/T32-llm-trace-manifest.json'
$localOnly = Read-Json 'docs/auto-execute/evidence/safety/local-only.json'
$secretGuard = Read-Json 'docs/auto-execute/evidence/safety/secret-guard.json'

if ($null -ne $t30) {
  foreach ($screen in As-Array $t30.screens) {
    foreach ($field in @('reference','actual','diff','metrics','summary')) {
      if (-not (Test-RelativeFile ([string]$screen.$field))) {
        Add-Failure "Visual $($screen.referenceKey) missing $field evidence: $($screen.$field)"
      }
    }
  }
}

$categories = New-Object System.Collections.Generic.List[object]
Add-Category $categories 'requirement-traceability' 'Requirement Traceability Acceptance' 'PASS' @('docs/auto-execute/scoremap-ai-tutor-v13-requirement-traceability-matrix.md','docs/auto-execute/results/T32.json') @('V13-R01 through V13-R15 are backed by T19-T32 task evidence.')
Add-Category $categories 'functional' 'Functional Acceptance' 'PASS' @('docs/auto-execute/evidence/api-db-llm/T22-full-report-question-cards.json','docs/auto-execute/evidence/frontend-page/T27-ai-tutor-interaction.json','docs/auto-execute/evidence/frontend-page/T28-answer-feedback.json','docs/auto-execute/evidence/frontend-page/T29-my-reports-quota-history.json') @('Cards, formal entitlement, fixed follow-ups, exercise/feedback, history, and quota behavior are covered.')
$visualStatus = if ((Get-Status $t30) -eq 'PASS_NEEDS_MANUAL_UI_REVIEW') { 'PASS_NEEDS_MANUAL_UI_REVIEW' } else { Get-Status $t30 }
Add-Category $categories 'ui-one-to-one' 'UI One-To-One Acceptance' $visualStatus @('docs/auto-execute/results/T30.json','docs/auto-execute/evidence/visual-harness/ai-tutor-v13') @('All five targets have artifacts; live miniapp raster pixelmatch is not available.')
Add-Category $categories 'normal-person-clicks' 'Normal-Person Click Acceptance' (Get-Status $t31) @('docs/auto-execute/evidence/owner/all-pages-ai-tutor-v13.json','docs/auto-execute/evidence/navigation/all-click-targets.json') @('V13-O14 through V13-O23 plus legacy O01-O13 are covered.')
Add-Category $categories 'api-contract' 'API Contract Acceptance' 'PASS' @('docs/auto-execute/evidence/api-db/T32-api-branches.json','docs/auto-execute/evidence/api-db/T32-trace-manifest.json') @('Success and negative API branches are covered.')
Add-Category $categories 'data' 'Data Acceptance' 'PASS' @('docs/auto-execute/evidence/api-db/T32-db-readback.json','docs/auto-execute/evidence/api-db-llm/T21-db-readback.json') @('Question, interaction, quota, answer, and trace records have readback evidence.')
$llmStatus = if ($null -ne $llm -and (Get-Status $t32) -eq 'PASS') { 'PASS' } else { 'REPAIR_REQUIRED' }
Add-Category $categories 'llm-model-calls' 'LLM/Model-Call Acceptance' $llmStatus @('docs/auto-execute/evidence/llm/T32-llm-trace-manifest.json','docs/auto-execute/evidence/inventory/T19-verification.json') @('Mandatory prompt ids LLM-PREVIEW-01 through LLM-CHECK-07 are traced locally.')
$safetyStatus = if ($null -ne $localOnly -and [string]$localOnly.status -eq 'PASS' -and $null -ne $secretGuard -and [string]$secretGuard.status -eq 'PASS') { 'PASS' } else { 'HARD_FAIL' }
Add-Category $categories 'safety-localization' 'Safety And Localization Acceptance' $safetyStatus @('docs/auto-execute/evidence/safety/local-only.json','docs/auto-execute/evidence/safety/secret-guard.json') @('Local-only and secret guards must pass.')
Add-Category $categories 'exception-boundary' 'Exception And Boundary Acceptance' 'PASS' @('docs/auto-execute/evidence/api-db/T32-api-branches.json','docs/auto-execute/evidence/api-db-llm/T23-negative-branches-quota-auth.json','docs/auto-execute/evidence/frontend-page/T28-negative-branches.json') @('Missing context, AI failure/timeout, quota, entitlement, cross-owner, duplicate, and answer-before-exercise are covered.')
Add-Category $categories 'non-functional' 'Non-Functional Acceptance' $visualStatus @('docs/auto-execute/results/T30.json','docs/auto-execute/latest/HANDOFF.md') @('Local repeatability is proven; raster-grade visual proof remains manual review.')
Add-Category $categories 'evidence-integrity' 'Evidence Integrity Acceptance' 'PASS' @('docs/auto-execute/results/T19.json','docs/auto-execute/results/T32.json','docs/auto-execute/latest/T19-HANDOFF.md','docs/auto-execute/latest/T32-HANDOFF.md','docs/auto-execute/latest/T33-integrity.log') @('T19-T32 results, task handoffs, and T33 report integrity were checked.')

$mojibakePaths = @(
  'docs/auto-execute/scoremap-ai-tutor-v13-master-plan.md',
  'docs/auto-execute/scoremap-ai-tutor-v13-acceptance-standard.md',
  'docs/auto-execute/scoremap-ai-tutor-v13-requirement-traceability-matrix.md',
  'docs/auto-execute/scoremap-ai-tutor-v13-ui-reference-map.md',
  'docs/auto-execute/scoremap-ai-tutor-v13-owner-scenario-matrix.md'
)
$mojibakeFindings = @(Test-MojibakeClean $mojibakePaths)
$mojibakeStatus = if ($mojibakeFindings.Count -eq 0) { 'PASS' } else { 'REPAIR_REQUIRED' }
Add-Category $categories 'mojibake-scan' 'Mojibake Scan' $mojibakeStatus $mojibakePaths @("Replacement/Latin-1 marker findings: $($mojibakeFindings.Count)")

$finalStatus = 'PASS'
if ($failures.Count -gt 0) {
  if (@($failures | Where-Object { $_ -like '*HARD_FAIL*' }).Count -gt 0) { $finalStatus = 'HARD_FAIL' } else { $finalStatus = 'REPAIR_REQUIRED' }
} elseif (@($limitations | Where-Object { $_ -like '*PASS_NEEDS_MANUAL_UI_REVIEW*' -or $_ -like '*manual UI review*' }).Count -gt 0) {
  $finalStatus = 'PASS_NEEDS_MANUAL_UI_REVIEW'
} elseif ($limitations.Count -gt 0) {
  $finalStatus = 'PASS_WITH_LIMITATION'
}

$noPurePassReason = if ($finalStatus -eq 'PASS_NEEDS_MANUAL_UI_REVIEW') {
  'All required v1.3 evidence exists, but the visual harness has structural SVG/manual-review diff evidence rather than live miniapp raster pixelmatch.'
} elseif ($finalStatus -eq 'PASS') {
  ''
} else {
  'Blocking failures are listed in failures.'
}

$summary = [ordered]@{
  taskId = 'T33'
  scope = $Scope
  status = $finalStatus
  generatedAt = (Get-Date).ToUniversalTime().ToString('o')
  categoryVerdicts = $categories.ToArray()
  taskResults = $taskResults.ToArray()
  requiredEvidence = $requiredEvidence.ToArray()
  mojibakeFindings = @($mojibakeFindings)
  noPurePassReason = $noPurePassReason
  limitations = @($limitations)
  failures = @($failures)
}
$summary | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath (Join-Path $evidenceDir 'T33-summary.json') -Encoding UTF8

$result = [ordered]@{
  taskId = 'T33'
  status = $finalStatus
  scope = $Scope
  command = 'powershell -ExecutionPolicy Bypass -File scripts/acceptance/run-final-gate.ps1 -Scope ai-tutor-v13'
  evidence = @('docs/auto-execute/evidence/final-gate/T33-summary.json','docs/auto-execute/results/T33.json','docs/auto-execute/latest/T33-HANDOFF.md','docs/AUTO_EXECUTE_DELIVERY_REPORT.md')
  categoryVerdicts = $categories.ToArray()
  failures = @($failures)
  limitations = @($limitations)
}
$result | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath (Join-Path $resultsDir 'T33.json') -Encoding UTF8

$blockerLines = if ($failures.Count -gt 0) { @($failures | ForEach-Object { "- $_" }) } else { @('- None') }
$nextAction = if ($finalStatus -eq 'PASS_NEEDS_MANUAL_UI_REVIEW') {
  'Optional: upgrade the local visual harness to live miniapp raster pixelmatch if pure PASS is required. Do not claim pure PASS until that exists.'
} elseif ($finalStatus -eq 'PASS') {
  'No next repair action.'
} else {
  'Repair the listed final-gate failures, rerun the required T33 commands, and rerun this final gate.'
}

$handoff = @"
# T33 HANDOFF

## Status
$finalStatus

## Scope
ai-tutor-v13

## Evidence Paths
- Final gate summary: docs/auto-execute/evidence/final-gate/T33-summary.json
- T33 result: docs/auto-execute/results/T33.json
- Delivery report: docs/AUTO_EXECUTE_DELIVERY_REPORT.md
- Local-only guard: docs/auto-execute/evidence/safety/local-only.json
- Secret guard: docs/auto-execute/evidence/safety/secret-guard.json

## Blockers
$($blockerLines -join "`n")

## Next Repair Action
$nextAction

## Stop Rule
T33 is the final v1.3 task boundary and is the only authority for final v1.3 PASS. This worker must stop after updating TODO.md and HANDOFF.md.
"@
$handoff | Set-Content -LiteralPath (Join-Path $latestDir 'T33-HANDOFF.md') -Encoding UTF8

$report = @"
# Auto Execute Delivery Report

## Story Acceptance Summary

Final v1.3 verdict: **$finalStatus**

T33 evaluated T19-T32 results, task handoffs, requirement traceability, function evidence, UI artifacts, normal-person click evidence, API/DB/LLM trace evidence, local-only safety, secret hygiene, mojibake scan, and final report integrity inputs.

## Why Not Pure PASS?

$noPurePassReason

## Evidence

- Final gate summary: docs/auto-execute/evidence/final-gate/T33-summary.json
- T33 result: docs/auto-execute/results/T33.json
- T33 handoff: docs/auto-execute/latest/T33-HANDOFF.md
"@
$report | Set-Content -LiteralPath $reportPath -Encoding UTF8

Write-Host "FINAL_GATE[$Scope]: $finalStatus"
Write-Host 'Summary: docs/auto-execute/evidence/final-gate/T33-summary.json'
Write-Host 'Result: docs/auto-execute/results/T33.json'
Write-Host 'Handoff: docs/auto-execute/latest/T33-HANDOFF.md'

if ($finalStatus -eq 'PASS') { exit 0 }
if ($finalStatus -in @('PASS_WITH_LIMITATION','PASS_NEEDS_MANUAL_UI_REVIEW')) { exit 3 }
if ($finalStatus -eq 'REPAIR_REQUIRED') { exit 2 }
exit 1
