Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
batPath = Chr(34) & currentDir & "\iniciar_desktop.bat" & Chr(34)
WshShell.Run batPath, 0, False
Set WshShell = Nothing
Set fso = Nothing
