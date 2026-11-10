param([switch]$Install, [switch]$Release)
. (Join-Path $PSScriptRoot 'environment.ps1')
Push-Location $PSScriptRoot
try {
    if ($Release) {
        foreach ($variable in @('ROUTINE_KEYSTORE', 'ROUTINE_STORE_PASSWORD', 'ROUTINE_KEY_ALIAS', 'ROUTINE_KEY_PASSWORD')) {
            if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($variable))) {
                throw "Missing $variable. See docs/RELEASE.md for release signing."
            }
        }
        if (-not (Test-Path -LiteralPath $env:ROUTINE_KEYSTORE -PathType Leaf)) { throw 'Signing keystore does not exist.' }
    }
    if (-not (Test-Path (Join-Path $PSScriptRoot 'node_modules/vite'))) {
        & npm.cmd ci
        if ($LASTEXITCODE -ne 0) { throw 'Web dependency installation failed.' }
    }
    $buildTask = if ($Release) { 'assembleRelease' } else { 'assembleDebug' }
    $variant = if ($Release) { 'release' } else { 'debug' }
    & ./gradlew.bat --no-daemon --max-workers=1 $buildTask
    if ($LASTEXITCODE -ne 0) { throw 'Gradle build failed.' }
    if ($Install) {
        & adb install -r (Join-Path $PSScriptRoot "app/build/outputs/apk/$variant/app-$variant.apk")
        if ($LASTEXITCODE -ne 0) { throw 'APK installation failed.' }
        & adb shell am start -n 'dev.pleoslab/.MainActivity'
    }
} finally { Pop-Location }

