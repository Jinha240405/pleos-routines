$ErrorActionPreference = 'Stop'
$workspacePath = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$toolchainPath = Join-Path $workspacePath 'work/android-toolchain'
$jdkFolder = Get-ChildItem -LiteralPath (Join-Path $toolchainPath 'java17') -Directory | Select-Object -First 1
if (-not $jdkFolder) { throw 'JDK 17 installation is not complete.' }
$env:JAVA_HOME = $jdkFolder.FullName
$env:ANDROID_HOME = Join-Path $toolchainPath 'sdk'
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:ANDROID_USER_HOME = Join-Path $toolchainPath 'android-user'
$env:ANDROID_AVD_HOME = Join-Path $toolchainPath 'avd'
$env:GRADLE_USER_HOME = Join-Path $toolchainPath 'gradle-cache'
$env:STUDIO_PROPERTIES = Join-Path $toolchainPath 'studio.properties'
$env:Path = "$env:JAVA_HOME/bin;$env:ANDROID_HOME/platform-tools;$env:ANDROID_HOME/emulator;$env:ANDROID_HOME/cmdline-tools/latest/bin;$env:Path"

