# Publishes dsh-sidebar-dock to npm in one step.
#
#   .\publish.ps1
#
# npm requires a 6-digit TOTP for every publish. The hold on the account ends
# 2026-11-04 11:14 UTC (20:14 Asia/Tokyo) — before that every publish is
# rejected with 403 whether or not the code is correct.
#
# Run it from the repository root. Nothing is published unless the version in
# package.json is new.

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Push-Location $root
try {
  $version = (Get-Content package.json -Raw | ConvertFrom-Json).version
  Write-Host "package version: $version"

  $existing = npm view "dsh-sidebar-dock@$version" version 2>$null
  if ($LASTEXITCODE -eq 0 -and $existing) {
    Write-Host "dsh-sidebar-dock@$version is already on npm — bump the version first." -ForegroundColor Yellow
    exit 1
  }

  node scripts/prepare-npm.mjs
  if ($LASTEXITCODE -ne 0) { throw 'prepare-npm.mjs failed' }

  Write-Host ''
  Write-Host 'Paste the 6-digit code from your authenticator app (not a recovery code):'
  $otp = Read-Host 'OTP'
  if ($otp -notmatch '^\d{6}$') {
    Write-Host 'That is not a 6-digit TOTP. Recovery codes do not work here and trigger a 72h lock.' -ForegroundColor Red
    exit 1
  }

  Push-Location dist-npm
  try {
    npm publish --access public --otp $otp
    if ($LASTEXITCODE -ne 0) { throw 'npm publish failed' }
  }
  finally { Pop-Location }

  npm view dsh-sidebar-dock version
  Write-Host "published: https://www.npmjs.com/package/dsh-sidebar-dock" -ForegroundColor Green
}
finally { Pop-Location }
