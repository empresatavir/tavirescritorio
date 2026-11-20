[CmdletBinding()]
param(
    [switch]$CheckOnly,
    [switch]$SkipBrowser
)

$ErrorActionPreference = 'Stop'
$Utf8NoBom = [System.Text.UTF8Encoding]::new($false)
[Console]::InputEncoding = $Utf8NoBom
[Console]::OutputEncoding = $Utf8NoBom
$OutputEncoding = $Utf8NoBom
$env:PYTHONUTF8 = '1'
$env:PYTHONIOENCODING = 'utf-8'
$ProjectPath = $PSScriptRoot
$RuntimePath = Join-Path $ProjectPath '.runtime'
$VenvPath = Join-Path $RuntimePath 'venv'
$PythonPath = Join-Path $VenvPath 'Scripts\python.exe'
$BrowserPath = Join-Path $RuntimePath 'browsers'
$LockPath = Join-Path $ProjectPath 'requirements.lock'
$RunnerPath = Join-Path $ProjectPath 'scrapling_lab.py'
$InstallReportPath = Join-Path $RuntimePath 'install-report.json'

if ($CheckOnly) {
    if (-not (Test-Path -LiteralPath $PythonPath)) {
        throw 'STL-RUNTIME-001: runtime ausente. Execute install.ps1 sem -CheckOnly.'
    }
    $env:PLAYWRIGHT_BROWSERS_PATH = $BrowserPath
    & $PythonPath $RunnerPath check
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    & $PythonPath -m pip check
    exit $LASTEXITCODE
}

if (-not (Test-Path -LiteralPath $LockPath)) {
    throw 'STL-INSTALL-001: requirements.lock ausente; a instalação foi bloqueada.'
}

New-Item -ItemType Directory -Path $RuntimePath -Force | Out-Null
New-Item -ItemType Directory -Path $BrowserPath -Force | Out-Null

if (-not (Test-Path -LiteralPath $PythonPath)) {
    & py -3.12 -m venv $VenvPath
    if ($LASTEXITCODE -ne 0) { throw 'STL-INSTALL-002: não foi possível criar o venv Python 3.12.' }
}

$env:PLAYWRIGHT_BROWSERS_PATH = $BrowserPath
& $PythonPath -m pip install --disable-pip-version-check --only-binary=:all: --require-hashes --report $InstallReportPath -r $LockPath
if ($LASTEXITCODE -ne 0) { throw 'STL-INSTALL-003: dependências não foram instaladas; o runtime pode ser recriado.' }

if (-not $SkipBrowser) {
    & $PythonPath -m playwright install chromium
    if ($LASTEXITCODE -ne 0) { throw 'STL-INSTALL-004: Chromium dedicado não foi instalado.' }
}

& $PythonPath -m pip check
if ($LASTEXITCODE -ne 0) { throw 'STL-INSTALL-005: a árvore instalada possui dependência inconsistente.' }

& $PythonPath $RunnerPath check
exit $LASTEXITCODE
