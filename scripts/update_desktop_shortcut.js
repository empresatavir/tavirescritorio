const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');

const projectDir = path.resolve(__dirname, '..');
const icoPath = path.join(projectDir, 'assets', 'tavir.ico');
const vbsLauncher = path.join(projectDir, 'abrir_escritorio.vbs');

// Script VBS usando SpecialFolders("Desktop")
const updateVbs = `
Set WshShell = CreateObject("WScript.Shell")
desktopPath = WshShell.SpecialFolders("Desktop")
shortcutPath = desktopPath & "\\TAVIR Escritorio.lnk"

Set shortcut = WshShell.CreateShortcut(shortcutPath)
shortcut.TargetPath = "wscript.exe"
shortcut.Arguments = Chr(34) & "${vbsLauncher.replace(/\\/g, '\\\\')}" & Chr(34)
shortcut.WorkingDirectory = "${projectDir.replace(/\\/g, '\\\\')}"
shortcut.Description = "TAVIR Escritório — Plataforma Desktop Nativa"
shortcut.IconLocation = "${icoPath.replace(/\\/g, '\\\\')},0"
shortcut.Save

WScript.Echo "Atalho salvo em: " & shortcutPath
`;

const tempVbsPath = path.join(projectDir, 'scripts', 'temp_shortcut.vbs');
fs.writeFileSync(tempVbsPath, updateVbs, 'latin1'); // Salva em latin1 (ANSI) para compatibilidade nativa com cscript

try {
  const out = execSync(`cscript //nologo "${tempVbsPath}"`, { encoding: 'utf8' });
  console.log('[TAVIR Shortcut]', out.trim());
} catch (err) {
  console.error('Erro ao atualizar atalho:', err);
} finally {
  if (fs.existsSync(tempVbsPath)) fs.unlinkSync(tempVbsPath);
}
