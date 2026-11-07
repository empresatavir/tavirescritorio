const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectDir = path.resolve(__dirname, '..');
const vbsTarget = path.join(projectDir, 'abrir_escritorio.vbs');

// Cria arquivo .vbs temporário usando SpecialFolders("Desktop") nativo do Windows
const tempVbs = path.join(projectDir, 'temp_create_shortcut.vbs');
const vbsScript = `
Set oWS = WScript.CreateObject("WScript.Shell")
desktopDir = oWS.SpecialFolders("Desktop")
sLinkFile = desktopDir & "\\TAVIR Escritorio.lnk"
Set oLink = oWS.CreateShortcut(sLinkFile)
oLink.TargetPath = "wscript.exe"
oLink.Arguments = """${vbsTarget.replace(/\\/g, '\\\\')}"""
oLink.WorkingDirectory = "${projectDir.replace(/\\/g, '\\\\')}"
oLink.Description = "TAVIR Escritorio - Sistema Operacional Local-First"
oLink.Save
WScript.Echo "Atalho criado em: " & sLinkFile
`;

fs.writeFileSync(tempVbs, vbsScript, 'utf8');

try {
  const out = execSync(`cscript //nologo "${tempVbs}"`, { encoding: 'utf8' });
  console.log(out.trim());
} catch (err) {
  console.error('Erro ao executar cscript:', err.message);
} finally {
  if (fs.existsSync(tempVbs)) fs.unlinkSync(tempVbs);
}
