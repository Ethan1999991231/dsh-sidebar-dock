# Publishes dsh-sidebar-dock to npm in one step.
#
#   .\publish.ps1
#
# npm requires two-factor authentication for every publish. An authenticator-app
# account needs the 6-digit TOTP; a security-key account (Windows Hello, Touch ID,
# YubiKey) authenticates through the browser and needs no code at all — for that
# account leave the OTP prompt empty.
#
# Run it from the repository root. Nothing is published unless the version in
# package.json is new.
#
# npm writes notices and 404s to stderr. Under $ErrorActionPreference = 'Stop',
# Windows PowerShell 5.1 turns that into a NativeCommandError and kills the
# script before it can ask for the OTP — which is exactly what a first publish
# (npm view -> 404) hits. Every npm call below therefore runs with 'Continue'
# and is judged by its exit code instead.

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Invoke-Npm {
  param([string[]] $Arguments)
  $previous = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $lines = @(& npm @Arguments 2>&1 | ForEach-Object { "$_" })
    [pscustomobject]@{ Code = $LASTEXITCODE; Lines = $lines }
  }
  finally {
    $ErrorActionPreference = $previous
  }
}

Push-Location $root
try {
  $version = (Get-Content package.json -Raw | ConvertFrom-Json).version
  Write-Host "package version: $version"

  $who = Invoke-Npm @('whoami')
  if ($who.Code -ne 0) {
    Write-Host 'Not signed in to npm — the stored token is rejected (npm whoami failed).' -ForegroundColor Red
    Write-Host 'Run:  npm login' -ForegroundColor Yellow
    Write-Host 'then run .\publish.ps1 again.' -ForegroundColor Yellow
    exit 1
  }
  Write-Host "npm user: $($who.Lines -join ' ')"

  $existing = Invoke-Npm @('view', "dsh-sidebar-dock@$version", 'version')
  if ($existing.Code -eq 0 -and ($existing.Lines -join '') -match '\d+\.\d+\.\d+') {
    Write-Host "dsh-sidebar-dock@$version is already on npm — bump the version first." -ForegroundColor Yellow
    exit 1
  }

  node scripts/prepare-npm.mjs
  if ($LASTEXITCODE -ne 0) { throw 'prepare-npm.mjs failed' }

  Write-Host ''
  Write-Host 'Two-factor authentication:'
  Write-Host '  - authenticator app (6-digit TOTP): paste the code below'
  Write-Host '  - security key / Windows Hello: leave empty and press Enter,'
  Write-Host '    npm will authenticate in the browser'
  $otp = Read-Host 'OTP (Enter to skip)'
  $otpArgs = @()
  if ($otp -match '^\d{6}$') {
    $otpArgs = @('--otp', $otp)
  }
  elseif ("$otp".Trim() -ne '') {
    Write-Host 'That is neither empty nor a 6-digit TOTP. Recovery codes do not work here and trigger a 72h lock.' -ForegroundColor Red
    exit 1
  }

  Push-Location dist-npm
  try {
    # Published without capturing stdout: npm only prints the real
    # "https://www.npmjs.com/auth/cli/<id>" browser link when its stdout is a
    # terminal. Through a pipe (or a redirected log) it redacts the id to "***"
    # and the web-authentication flow becomes impossible to complete.
    $ErrorActionPreference = 'Continue'
    & npm publish --access public @otpArgs
    $code = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    if ($code -ne 0) { throw "npm publish failed (exit $code)" }
  }
  finally { Pop-Location }

  $published = Invoke-Npm @('view', 'dsh-sidebar-dock', 'version')
  if ($published.Code -eq 0) { $published.Lines | ForEach-Object { Write-Host $_ } }
  Write-Host "published: https://www.npmjs.com/package/dsh-sidebar-dock" -ForegroundColor Green
}
finally { Pop-Location }
