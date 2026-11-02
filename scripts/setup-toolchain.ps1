$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$toolsRoot = Join-Path $env:LOCALAPPDATA 'PleosRoutines/toolchain'
New-Item -ItemType Directory -Force $toolsRoot | Out-Null
function Get-VerifiedZip($Url, $Hash, $Destination, $ExtractTo) {
    if (-not (Test-Path -LiteralPath $Destination)) { Invoke-WebRequest $Url -OutFile $Destination }
    if ((Get-FileHash -LiteralPath $Destination -Algorithm SHA256).Hash.ToLowerInvariant() -ne $Hash.ToLowerInvariant()) { throw "Checksum mismatch: $Destination" }
    Expand-Archive -LiteralPath $Destination -DestinationPath $ExtractTo -Force
}
if (-not (Test-Path (Join-Path $toolsRoot 'java17'))) {
    $release = Invoke-RestMethod 'https://api.adoptium.net/v3/assets/latest/17/hotspot?architecture=x64&image_type=jdk&os=windows&vendor=eclipse'
    $package = $release[0].binary.package
    Get-VerifiedZip $package.link $package.checksum (Join-Path $toolsRoot 'jdk.zip') (Join-Path $toolsRoot 'java17')
}
$env:JAVA_HOME = (Get-ChildItem (Join-Path $toolsRoot 'java17') -Directory | Select-Object -First 1).FullName
$env:ANDROID_HOME = Join-Path $toolsRoot 'sdk'
if (-not (Test-Path (Join-Path $env:ANDROID_HOME 'cmdline-tools/latest/bin/sdkmanager.bat'))) {
    Get-VerifiedZip 'https://dl.google.com/android/repository/commandlinetools-win-15859902_latest.zip' '90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a' (Join-Path $toolsRoot 'commandline.zip') (Join-Path $toolsRoot 'commandline')
    New-Item -ItemType Directory -Force (Join-Path $env:ANDROID_HOME 'cmdline-tools/latest') | Out-Null
    Copy-Item (Join-Path $toolsRoot 'commandline/cmdline-tools/*') (Join-Path $env:ANDROID_HOME 'cmdline-tools/latest') -Recurse -Force
}
$sdkManager = Join-Path $env:ANDROID_HOME 'cmdline-tools/latest/bin/sdkmanager.bat'
1..100 | ForEach-Object { 'y' } | & $sdkManager "--sdk_root=$env:ANDROID_HOME" --licenses
if ($LASTEXITCODE -ne 0) { throw 'SDK license setup failed.' }
& $sdkManager "--sdk_root=$env:ANDROID_HOME" 'platform-tools' 'platforms;android-35' 'build-tools;35.0.0'
if ($LASTEXITCODE -ne 0) { throw 'SDK installation failed.' }
Write-Output "Toolchain ready: $toolsRoot"
