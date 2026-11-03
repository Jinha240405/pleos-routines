param([string]$Serial = 'emulator-5554')
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../environment.ps1')
$adbTool = Join-Path $env:ANDROID_HOME 'platform-tools/adb.exe'
$deviceState = & $adbTool -s $Serial get-state
if ($LASTEXITCODE -ne 0 -or $deviceState -ne 'device') { throw 'Start a Pleos emulator before running device verification.' }
$env:ANDROID_SERIAL = $Serial
Push-Location (Join-Path $PSScriptRoot '..')
try {
    & ./gradlew.bat --no-daemon --max-workers=1 connectedDebugAndroidTest
    if ($LASTEXITCODE -ne 0) { throw 'Android instrumentation failed. See app/build/reports/androidTests/connected/debug.' }
} finally { Pop-Location }
