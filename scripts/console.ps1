param([string]$Serial = 'emulator-5554')
. (Join-Path $PSScriptRoot '../environment.ps1')
& "$env:ANDROID_HOME/platform-tools/adb.exe" -s $Serial forward tcp:8088 tcp:8088
if ($LASTEXITCODE -ne 0) { throw 'Start the Pleos emulator first.' }
Write-Output 'Virtual Console: http://127.0.0.1:8088/'
