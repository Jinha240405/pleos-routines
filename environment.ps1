$ErrorActionPreference = 'Stop'
$workspacePath = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$legacyToolchainPath = Join-Path $workspacePath 'work/android-toolchain'
$localToolchainPath = Join-Path $env:LOCALAPPDATA 'PleosRoutines/toolchain'
$toolchainPath = if ($env:PLEOS_TOOLCHAIN) { $env:PLEOS_TOOLCHAIN } elseif (Test-Path $legacyToolchainPath) { $legacyToolchainPath } else { $localToolchainPath }
if (-not $env:JAVA_HOME) {
    $jdkFolder = Get-ChildItem -LiteralPath (Join-Path $toolchainPath 'java17') -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $jdkFolder) { throw 'Set JAVA_HOME to JDK 17 or run ./scripts/setup-toolchain.ps1.' }
    $env:JAVA_HOME = $jdkFolder.FullName
}
if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME = Join-Path $toolchainPath 'sdk' }
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
if (-not $env:ANDROID_USER_HOME) { $env:ANDROID_USER_HOME = Join-Path $toolchainPath 'android-user' }
if (-not $env:ANDROID_AVD_HOME) {
    $legacyAvdPath = Join-Path $toolchainPath 'avd'
    $env:ANDROID_AVD_HOME = if (Test-Path -LiteralPath $legacyAvdPath) { $legacyAvdPath } else { Join-Path $env:ANDROID_USER_HOME 'avd' }
}
if (-not $env:GRADLE_USER_HOME) { $env:GRADLE_USER_HOME = Join-Path $toolchainPath 'gradle-cache' }
$env:STUDIO_PROPERTIES = Join-Path $toolchainPath 'studio.properties'
$env:Path = "$env:JAVA_HOME/bin;$env:ANDROID_HOME/platform-tools;$env:ANDROID_HOME/emulator;$env:ANDROID_HOME/cmdline-tools/latest/bin;$env:Path"

