# SDINC.dev - daily picomatch upstream check (run at 09:00 MSK by Task Scheduler).
#
# On go-signal (PR #194 merged AND picomatch > 4.0.7 published):
#   - `npm ci` to pick up the patched version in the lock file.
#   - Hardens .github/workflows/pages.yml (drops the KNOWN-VULNERABLE fallback
#     on the npm audit step, turning it into a hard gate).
#   - Stages + commits lock file + workflow. Does NOT push (user reviews).
# On no-go: logs NO-GO and exits 0 silently.
#
# Log: logs/picomatch-check.log (one line per run, ISO timestamp).

$ErrorActionPreference = 'Stop'

$repo = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $repo 'logs'
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$logFile = Join-Path $logDir 'picomatch-check.log'

function Write-Log([string]$msg) {
  $ts = Get-Date -Format 'yyyy-MM-ddTHH:mm:ss'
  $line = '[' + $ts + '] ' + $msg
  Add-Content -Path $logFile -Value $line -Encoding ASCII
  Write-Host $line
}

# --- 1. go-signal check ---
$rawPr = & gh pr view 194 --repo micromatch/picomatch --json state,mergedAt 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Log ('ERROR: gh pr view failed: ' + ($rawPr -join ' '))
  exit 1
}
$prObj = ($rawPr -join "`n") | ConvertFrom-Json

$latest = & npm view picomatch dist-tags.latest 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Log ('ERROR: npm view failed: ' + ($latest -join ' '))
  exit 1
}
$latest = ($latest -join '').Trim()

$merged = ($prObj.mergedAt -ne $null) -and ($prObj.state -eq 'MERGED')

# Semver: is the latest published picomatch newer than 4.0.7?
$parts = $latest -split '\.'
$isNew = $false
if ($parts.Count -eq 3) {
  $maj = [int]$parts[0]
  $min = [int]$parts[1]
  $pat = [int]$parts[2]
  if ($maj -gt 4) {
    $isNew = $true
  } elseif ($maj -eq 4) {
    if ($min -gt 0) {
      $isNew = $true
    } elseif ($min -eq 0 -and $pat -gt 7) {
      $isNew = $true
    }
  }
}

if (-not $merged -or -not $isNew) {
  Write-Log ('NO-GO  PR#194 state=' + $prObj.state + ' merged=' + $merged + ' latest=' + $latest + ' - waiting')
  exit 0
}

# --- 2. go-signal: take action ---
Write-Log ('GOSIGNAL  PR#194 merged, picomatch ' + $latest + ' published. Running npm ci + hardening audit gate.')

Push-Location $repo
try {
  & npm ci
  if ($LASTEXITCODE -ne 0) { throw 'npm ci failed' }

  $wfPath = Join-Path $repo '.github\workflows\pages.yml'
  if (-not (Test-Path $wfPath)) { throw 'workflow not found: ' + $wfPath }

  $content = Get-Content -Path $wfPath -Raw
  # Drop the " || echo KNOWN ..." fallback on the npm audit run line,
  # turning it into a hard gate. Idempotent: no-op if already hardened.
  $pattern = '(\s*run:\s*npm audit --audit-level=low)(\s*\|\| echo.*)'
  $replacement = '$1'
  $replaced = [regex]::Replace($content, $pattern, $replacement, 'Multiline')
  if ($replaced -eq $content) {
    Write-Log 'GOSIGNAL-NOTE: pages.yml already hardened (no-op).'
  } else {
    Set-Content -Path $wfPath -Value $replaced -Encoding UTF8
    Write-Log 'GOSIGNAL: pages.yml hardened (hard npm audit gate).'
  }

  & git add package-lock.json .github/workflows/pages.yml
  & git commit -m 'security: picomatch patched - harden npm audit gate (auto-check)'
  if ($LASTEXITCODE -ne 0) {
    Write-Log 'GOSIGNAL-NOTE: git commit skipped (nothing to commit).'
  }

  Write-Log 'GOSIGNAL-DONE: lock file + workflow updated. PENDING: user review + git push.'
}
finally {
  Pop-Location
}
