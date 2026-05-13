# Pico's TTRPG Toolkit - one-shot starter for local dev.
#
# Usage (from the repo root):
#   npm start                  # just start
#   npm start -- -Reset        # clear DB + uploads, re-seed
#   npm start -- -NoMigrate    # skip prisma migrate
#
# What it does:
#   1. Ensures .env exists (copies .env.example + generates SESSION_KEY).
#   2. Installs npm dependencies if node_modules is missing.
#   3. Frees ports 3000 and 5173 if previous processes are holding them.
#   4. Runs Prisma migrate + seed (idempotent).
#   5. Starts `npm run dev` (server + web with hot reload).

param(
    [switch]$Reset,
    [switch]$NoMigrate
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

function Write-Step {
    param([string]$Message)
    Write-Host ''
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Clear-DevPort {
    param([int]$Port)
    $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
        try {
            $procId = $c.OwningProcess
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            Write-Host "   killed process on port $Port (pid $procId)" -ForegroundColor Yellow
        } catch {
            # already gone
        }
    }
}

Write-Step '.env'
if (-not (Test-Path '.env')) {
    if (-not (Test-Path '.env.example')) {
        Write-Host '   missing .env.example - bail.' -ForegroundColor Red
        exit 1
    }
    Copy-Item '.env.example' '.env'
    $bytes = New-Object byte[] 32
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $key = [Convert]::ToBase64String($bytes)
    $content = Get-Content '.env'
    $content = $content -replace '^SESSION_KEY=.*', ('SESSION_KEY="' + $key + '"')
    Set-Content -Path '.env' -Value $content
    Write-Host "   created .env (generated SESSION_KEY). Default GM password is 'changeme' - edit .env to change it." -ForegroundColor Green
} else {
    Write-Host '   .env exists' -ForegroundColor Green
}

Write-Step 'dependencies'
if (-not (Test-Path 'node_modules')) {
    Write-Host '   installing npm packages (this may take a few minutes)...'
    npm install
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} else {
    Write-Host '   node_modules present' -ForegroundColor Green
}

if ($Reset) {
    Write-Step 'reset'
    Remove-Item -Recurse -Force 'apps/server/data' -ErrorAction SilentlyContinue
    Write-Host '   wiped apps/server/data' -ForegroundColor Yellow
}

if (-not $NoMigrate) {
    Write-Step 'database'
    npm run migrate -w apps/server -- --name auto
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    npm run seed -w apps/server
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Step 'ports'
Clear-DevPort -Port 3000
Clear-DevPort -Port 5173
Write-Host '   ports 3000 and 5173 ready' -ForegroundColor Green

Write-Step 'starting dev'
Write-Host '   server: http://localhost:3000'
Write-Host '   web   : http://localhost:5173'
Write-Host ''
npm run dev
