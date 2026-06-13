param(
  [string]$ProjectRoot = "D:\lyh\agent\agent-frame\scoremap",
  [string]$StartAt = "",
  [int]$TimeoutSeconds = 1800,
  [switch]$RerunCompleted
)

$ErrorActionPreference = "Stop"

function New-Dir($Path) {
  New-Item -ItemType Directory -Force -Path $Path | Out-Null
}

function Write-JsonFile($Path, $Value) {
  $json = $Value | ConvertTo-Json -Depth 20
  Set-Content -LiteralPath $Path -Value $json -Encoding UTF8
}

function Get-TaskStatus($Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    return $null
  }
  try {
    return (Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json).status
  } catch {
    return "INVALID_JSON"
  }
}

function Invoke-CodexChild($TaskId, $PromptPath, $LogPath, $Root, $Timeout) {
  $tmp = Join-Path (Join-Path $Root "temp") "codex-child-tmp"
  New-Dir $tmp

  $prefix = @"
EXECUTION CONSTRAINTS:
- Complete only this child task. Do not start the next V143 task.
- Use narrow inspection and minimal edits; avoid broad repo exploration.
- Before exit, always write the assigned docs/auto-execute/results/$TaskId.json and docs/auto-execute/latest/$TaskId-HANDOFF.md with honest status.
- Keep all execution local-only. No real Tencent Cloud, WeChat Pay, online DB, real model provider, or production service calls.

"@
  $prompt = $prefix + (Get-Content -LiteralPath $PromptPath -Raw)

  $psi = [System.Diagnostics.ProcessStartInfo]::new()
  $psi.FileName = "codex.cmd"
  $quotedRoot = '"' + ($Root -replace '"', '\"') + '"'
  $psi.Arguments = "exec --disable hooks --cd $quotedRoot -"
  $psi.WorkingDirectory = $Root
  $psi.UseShellExecute = $false
  $psi.RedirectStandardInput = $true
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.Environment["TMP"] = $tmp
  $psi.Environment["TEMP"] = $tmp
  $psi.Environment.Remove("CODEX_HOME")

  $process = [System.Diagnostics.Process]::Start($psi)
  $promptBytes = [System.Text.Encoding]::UTF8.GetBytes($prompt)
  $process.StandardInput.BaseStream.Write($promptBytes, 0, $promptBytes.Length)
  $process.StandardInput.BaseStream.Flush()
  $process.StandardInput.Close()

  $stdoutTask = $process.StandardOutput.ReadToEndAsync()
  $stderrTask = $process.StandardError.ReadToEndAsync()
  $completed = $process.WaitForExit($Timeout * 1000)

  if (-not $completed) {
    try { $process.Kill($true) } catch {}
  }

  $stdout = $stdoutTask.GetAwaiter().GetResult()
  $stderr = $stderrTask.GetAwaiter().GetResult()
  $logBody = @(
    "taskId=$TaskId"
    "startedAt=$((Get-Date).ToString('o'))"
    "completed=$completed"
    "exitCode=$(if ($completed) { $process.ExitCode } else { 'TIMEOUT' })"
    "prompt=$PromptPath"
    ""
    "===== STDOUT ====="
    $stdout
    ""
    "===== STDERR ====="
    $stderr
  ) -join [Environment]::NewLine
  Set-Content -LiteralPath $LogPath -Value $logBody -Encoding UTF8

  if (-not $completed) {
    return @{ exitCode = 124; reason = "codex child timed out after $Timeout seconds"; log = $LogPath }
  }
  return @{ exitCode = $process.ExitCode; reason = "codex child exited $($process.ExitCode)"; log = $LogPath }
}

$root = (Resolve-Path -LiteralPath $ProjectRoot).Path
$taskDir = Join-Path $root "docs\auto-execute\scoremap-v143-mvp-tasks"
$resultDir = Join-Path $root "docs\auto-execute\results"
$latestDir = Join-Path $root "docs\auto-execute\latest"
$logDir = Join-Path $root "docs\auto-execute\logs\V143-T00"
$evidenceDir = Join-Path $root "docs\auto-execute\evidence\v143\orchestrator"
New-Dir $resultDir
New-Dir $latestDir
New-Dir $logDir
New-Dir $evidenceDir

$tasks = @(
  @{ id = "V143-00"; file = "V143-00-intake-harness-and-v143-source-of-truth.md" },
  @{ id = "V143-01"; file = "V143-01-final-gate-scope-and-traceability-bootstrap.md" },
  @{ id = "V143-02"; file = "V143-02-local-schema-and-ai-report-contract.md" },
  @{ id = "V143-03"; file = "V143-03-orders-uploads-and-preview-analysis-apis.md" },
  @{ id = "V143-04"; file = "V143-04-payments-entitlements-and-full-report-apis.md" },
  @{ id = "V143-05"; file = "V143-05-repair-drawer-interactions-apis.md" },
  @{ id = "V143-06"; file = "V143-06-save-reports-my-reports-feedback-and-export-apis.md" },
  @{ id = "V143-07"; file = "V143-07-design-tokens-navigation-and-mojibake-guard.md" },
  @{ id = "V143-08"; file = "V143-08-c01-home-upload-page.md" },
  @{ id = "V143-09"; file = "V143-09-c02-student-info-and-authorization-page.md" },
  @{ id = "V143-10"; file = "V143-10-c03-analysis-and-c04-failure-states.md" },
  @{ id = "V143-11"; file = "V143-11-c05-preview-with-1-yuan-half-screen-payment.md" },
  @{ id = "V143-12"; file = "V143-12-c07-basic-result-with-9-9-full-report-payment.md" },
  @{ id = "V143-13"; file = "V143-13-c10-full-report-five-cards.md" },
  @{ id = "V143-14"; file = "V143-14-c13-repair-drawer-state-machine-and-c10-writeback.md" },
  @{ id = "V143-15"; file = "V143-15-c11-c12-merged-my-reports-recovery.md" },
  @{ id = "V143-16"; file = "V143-16-api-db-readback-and-frontend-backend-contract-e2e.md" },
  @{ id = "V143-17"; file = "V143-17-owner-click-e2e-o143-01-to-12.md" },
  @{ id = "V143-18"; file = "V143-18-v143-visual-pixel-harness-and-repair-loop.md" },
  @{ id = "V143-19"; file = "V143-19-build-safety-guards-final-gate-and-delivery-report.md" }
)

$allowedDone = @("PASS", "PASS_WITH_LIMITATION", "PASS_NEEDS_MANUAL_UI_REVIEW")
$started = @()
$completedTasks = @()
$skipped = @()
$childResults = @()
$blockers = @()
$stoppedAt = $null
$stopReason = $null
$startIndex = 0
if ($StartAt) {
  $match = $tasks | Where-Object { $_.id -eq $StartAt } | Select-Object -First 1
  if (-not $match) {
    throw "Unknown StartAt task: $StartAt"
  }
  $startIndex = [array]::IndexOf($tasks.id, $StartAt)
}

for ($i = $startIndex; $i -lt $tasks.Count; $i++) {
  $task = $tasks[$i]
  $taskId = $task.id
  $promptPath = Join-Path $taskDir $task.file
  $resultPath = Join-Path $resultDir "$taskId.json"
  $handoffPath = Join-Path $latestDir "$taskId-HANDOFF.md"
  $existingStatus = Get-TaskStatus $resultPath

  if ((-not $RerunCompleted) -and ($allowedDone -contains $existingStatus) -and (Test-Path -LiteralPath $handoffPath)) {
    $skipped += $taskId
    $completedTasks += $taskId
    $childResults += @{
      taskId = $taskId
      status = $existingStatus
      skipped = $true
      resultPath = "docs\auto-execute\results\$taskId.json"
      handoffPath = "docs\auto-execute\latest\$taskId-HANDOFF.md"
    }
    continue
  }

  if (-not (Test-Path -LiteralPath $promptPath)) {
    $stoppedAt = $taskId
    $stopReason = "Missing task prompt: $promptPath"
    break
  }

  $started += $taskId
  $logPath = Join-Path $logDir "$taskId.child.once.log"
  $run = Invoke-CodexChild $taskId $promptPath $logPath $root $TimeoutSeconds
  $status = Get-TaskStatus $resultPath
  $handoffExists = Test-Path -LiteralPath $handoffPath

  $record = @{
    taskId = $taskId
    status = $status
    skipped = $false
    exitCode = $run.exitCode
    reason = $run.reason
    resultPath = "docs\auto-execute\results\$taskId.json"
    handoffPath = "docs\auto-execute\latest\$taskId-HANDOFF.md"
    childLog = "docs\auto-execute\logs\V143-T00\$taskId.child.once.log"
  }
  $childResults += $record

  if (($run.exitCode -ne 0) -or (-not $status) -or (-not $handoffExists) -or (-not ($allowedDone -contains $status))) {
    $stoppedAt = $taskId
    $stopReason = "Task $taskId did not complete acceptably: exit=$($run.exitCode), status=$status, handoffExists=$handoffExists"
    $blockers += $record
    break
  }

  $completedTasks += $taskId
}

$queueComplete = (-not $stoppedAt) -and ($completedTasks.Count -eq $tasks.Count)
$finalGateVerdict = $null
if ($queueComplete) {
  $finalGateLog = Join-Path $logDir "V143-final-gate.once.log"
  $finalGate = Start-Process -FilePath "powershell.exe" -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", ".\scripts\acceptance\run-final-gate.ps1",
    "-Scope", "v143-mvp"
  ) -WorkingDirectory $root -Wait -PassThru -NoNewWindow -RedirectStandardOutput $finalGateLog -RedirectStandardError "$finalGateLog.err"
  $summaryPath = Join-Path $root "docs\auto-execute\evidence\final-gate\v143-mvp\summary.json"
  if (Test-Path -LiteralPath $summaryPath) {
    try {
      $summary = Get-Content -LiteralPath $summaryPath -Raw | ConvertFrom-Json
      if ($summary.PSObject.Properties.Name -contains "finalVerdict") {
        $finalGateVerdict = $summary.finalVerdict
      } elseif ($summary.PSObject.Properties.Name -contains "status") {
        $finalGateVerdict = $summary.status
      }
    } catch {}
  }
  if (($finalGate.ExitCode -ne 0) -and (-not ($allowedDone -contains $finalGateVerdict))) {
    $stoppedAt = "FINAL-GATE"
    $stopReason = "Final gate exited $($finalGate.ExitCode) without readable final verdict."
    $queueComplete = $false
  }
}

$result = @{
  taskId = "V143-T00"
  status = $(if ($queueComplete) { "PASS_WITH_LIMITATION" } else { "HARD_FAIL" })
  generatedAt = (Get-Date).ToString("o")
  queueComplete = $queueComplete
  startedTasks = $started
  completedTasks = $completedTasks
  skippedCompletedTasks = $skipped
  stoppedAt = $stoppedAt
  stopReason = $stopReason
  childResults = $childResults
  blockers = $blockers
  finalGateVerdict = $finalGateVerdict
  evidence = @(
    "docs\auto-execute\evidence\v143\orchestrator\queue-state.json",
    "docs\auto-execute\evidence\v143\orchestrator\child-results-summary.json",
    "docs\auto-execute\results\V143-T00.json",
    "docs\auto-execute\latest\V143-T00-HANDOFF.md"
  )
  executionNotes = @(
    "This one-shot runner preserves default CODEX_HOME so codex.cmd can use the existing login.",
    "It overrides TMP/TEMP to temp/codex-child-tmp to avoid stale OMX arg0 temp access-denied failures.",
    "It runs codex.cmd exec --disable hooks for each child to avoid hook/tool-loop stalls observed in V143-02."
  )
}

Write-JsonFile (Join-Path $evidenceDir "queue-state.json") $result
Write-JsonFile (Join-Path $evidenceDir "child-results-summary.json") @{ childResults = $childResults; blockers = $blockers }
Write-JsonFile (Join-Path $resultDir "V143-T00.json") $result

$handoffLines = @(
  "# V143-T00 HANDOFF",
  "",
  "## Queue Status",
  "- Status: $($result.status)",
  "- Queue complete: $queueComplete",
  "- Started tasks this run: $($started -join ', ')",
  "- Completed or accepted tasks: $($completedTasks -join ', ')",
  "- Skipped existing completed tasks: $($skipped -join ', ')",
  "- Stopped at: $stoppedAt",
  "- Stop reason: $stopReason",
  "- Final gate verdict: $finalGateVerdict",
  "",
  "## One-Shot Resume Command",
  "",
  '````powershell',
  "powershell -NoProfile -ExecutionPolicy Bypass -File 'D:\lyh\agent\agent-frame\scoremap\scripts\auto-execute\run-v143-queue-once.ps1' -ProjectRoot 'D:\lyh\agent\agent-frame\scoremap'",
  '````',
  "",
  "## Runtime Wrapper",
  "- Preserve default CODEX_HOME/auth.",
  "- Override TMP/TEMP to temp/codex-child-tmp.",
  "- Run each child with codex.cmd exec --disable hooks.",
  "- Fail closed on nonzero exit, missing result JSON, missing HANDOFF, or non-accepted status.",
  "",
  "## Evidence",
  "- docs/auto-execute/results/V143-T00.json",
  "- docs/auto-execute/evidence/v143/orchestrator/queue-state.json",
  "- docs/auto-execute/evidence/v143/orchestrator/child-results-summary.json",
  "- docs/auto-execute/logs/V143-T00/*.child.once.log"
)
$handoff = $handoffLines -join [Environment]::NewLine
Set-Content -LiteralPath (Join-Path $latestDir "V143-T00-HANDOFF.md") -Value $handoff -Encoding UTF8

Write-Output "queueComplete=$queueComplete"
Write-Output "status=$($result.status)"
Write-Output "stoppedAt=$stoppedAt"
Write-Output "stopReason=$stopReason"

if ($queueComplete) {
  exit 0
}
exit 1
