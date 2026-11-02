param([switch]$Install)
. (Join-Path $PSScriptRoot 'environment.ps1')
Push-Location $PSScriptRoot
try {
    if (-not (Test-Path (Join-Path $PSScriptRoot 'node_modules/blockly'))) {
        & npm.cmd ci
        if ($LASTEXITCODE -ne 0) { throw 'Web dependency installation failed.' }
    }
    & ./gradlew.bat --no-daemon --max-workers=1 assembleDebug
    if ($LASTEXITCODE -ne 0) { throw 'Gradle build failed.' }
    if ($Install) {
        & adb install -r (Join-Path $PSScriptRoot 'app/build/outputs/apk/debug/app-debug.apk')
        if ($LASTEXITCODE -ne 0) { throw 'APK installation failed.' }
        & adb shell am start -n 'dev.pleoslab/.MainActivity'
    }
} finally { Pop-Location }

