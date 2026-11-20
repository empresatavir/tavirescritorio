[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$LabArgs
)

$ErrorActionPreference = 'Stop'
$Utf8NoBom = [System.Text.UTF8Encoding]::new($false)
[Console]::InputEncoding = $Utf8NoBom
[Console]::OutputEncoding = $Utf8NoBom
$OutputEncoding = $Utf8NoBom
$env:PYTHONUTF8 = '1'
$env:PYTHONIOENCODING = 'utf-8'
$ProjectPath = $PSScriptRoot
$PythonPath = Join-Path $ProjectPath '.runtime\venv\Scripts\python.exe'
$BrowserPath = Join-Path $ProjectPath '.runtime\browsers'
$RunnerPath = Join-Path $ProjectPath 'scrapling_lab.py'

if (-not (Test-Path -LiteralPath $PythonPath)) {
    Write-Error 'STL-RUNTIME-001: runtime ausente. Execute install.ps1 antes do primeiro uso.'
    exit 2
}

$env:PLAYWRIGHT_BROWSERS_PATH = $BrowserPath
& $PythonPath $RunnerPath @LabArgs
exit $LASTEXITCODE
