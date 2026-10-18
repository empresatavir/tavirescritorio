# sessionStart: alinha master (ff-only) se working tree limpa e injeta status no contexto.
$ErrorActionPreference = "SilentlyContinue"
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$null = [Console]::In.ReadToEnd()

$root = if ($env:CURSOR_PROJECT_DIR) { $env:CURSOR_PROJECT_DIR } else { (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path }
Set-Location $root

$bat = Join-Path $root "alinhar_master.bat"
$msg = "Git: alinhar_master nao executado."

if (Test-Path $bat) {
  $p = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "`"$bat`" --no-pause --quiet" -Wait -PassThru -NoNewWindow -WorkingDirectory $root
  $code = $p.ExitCode
  if ($code -eq 0) {
    $msg = "Git: master local verificado/alinhado com origin/master (alinhar_master.bat)."
  } elseif ($code -eq 2) {
    $msg = "Git: master remoto tem commits novos, mas a working tree esta suja — rode alinhar_master.bat apos salvar/commitar."
  } else {
    $msg = "Git: nao foi possivel alinhar master automaticamente (exit $code). Rode alinhar_master.bat manualmente."
  }
}

$payload = @{ additional_context = $msg } | ConvertTo-Json -Compress
[Console]::Out.Write($payload)
