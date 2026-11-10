. (Join-Path $PSScriptRoot '../environment.ps1')
$projectPath = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$studioExecutable = Join-Path $toolchainPath 'android-studio/bin/studio64.exe'
if (-not (Test-Path -LiteralPath $studioExecutable)) { throw 'Android Studio is not installed.' }
# This is an interactive IDE window the user explicitly requested an environment for.
Start-Process -FilePath $studioExecutable -ArgumentList @('"' + $projectPath + '"')

