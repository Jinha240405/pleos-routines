param([string]$Archive = (Join-Path $env:LOCALAPPDATA 'PleosRoutines/toolchain/pleos-connect-2.1.0.zip'))
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../environment.ps1')
$feedUrl = 'https://nexus-playground.pleos.ai/repository/raw-releases/connect-avd/2.x/crp-sys-img.xml'
[xml]$catalog = (Invoke-WebRequest -Uri $feedUrl).Content
$package = $catalog.DocumentElement.remotePackage
$download = $package.archives.archive.complete
if (-not (Test-Path -LiteralPath $Archive)) {
    & curl.exe --fail --location --retry 3 --output $Archive $download.url
    if ($LASTEXITCODE -ne 0) { throw 'Pleos image download failed.' }
}
if ((Get-Item -LiteralPath $Archive).Length -ne [long]$download.size) { throw 'The download is incomplete.' }
if ((Get-FileHash -LiteralPath $Archive -Algorithm SHA1).Hash.ToLowerInvariant() -ne $download.checksum) { throw 'Pleos image checksum mismatch.' }
$sdkRoot = [IO.Path]::GetFullPath($env:ANDROID_HOME).TrimEnd('\')
$imageDir = [IO.Path]::GetFullPath((Join-Path $sdkRoot 'system-images/android-34/pleos_car_emulator/x86_64'))
if (-not $imageDir.StartsWith($sdkRoot + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Image path is outside SDK.' }
if (-not (Test-Path -LiteralPath (Join-Path $imageDir 'system.img'))) {
    $staging = Join-Path (Split-Path $Archive -Parent) 'pleos-image-unpack'
    if (Test-Path -LiteralPath $staging) { throw "Existing extraction directory requires inspection: $staging" }
    [IO.Compression.ZipFile]::ExtractToDirectory($Archive, $staging)
    $source = [IO.Path]::GetFullPath((Join-Path $staging 'crp_avd_out_x86_64'))
    $stagingRoot = [IO.Path]::GetFullPath($staging).TrimEnd('\')
    if (-not $source.StartsWith($stagingRoot + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Extraction path is outside staging.' }
    if (Test-Path -LiteralPath $imageDir) { throw "Target already exists; inspect before replacing: $imageDir" }
    New-Item -ItemType Directory -Force -Path (Split-Path $imageDir -Parent) | Out-Null
    Move-Item -LiteralPath $source -Destination $imageDir
}
# Let the current Android tools generate their current package schema.
$localManifest = Join-Path $imageDir 'package.xml'
if (-not (Test-Path -LiteralPath $localManifest)) {
    & "$env:ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager.bat" --list_installed "--sdk_root=$env:ANDROID_HOME" | Out-Null
}
[xml]$registry = Get-Content -LiteralPath $localManifest -Raw
$registry.DocumentElement.localPackage.SetAttribute('path', $package.path)
$registry.DocumentElement.localPackage.'display-name' = $package.'display-name'
$registry.DocumentElement.localPackage.revision.major = $package.revision.major
foreach ($oldLicense in @($registry.DocumentElement.SelectNodes('license'))) { $null = $registry.DocumentElement.RemoveChild($oldLicense) }
$license = $registry.ImportNode($catalog.DocumentElement.license, $true)
$null = $registry.DocumentElement.InsertBefore($license, $registry.DocumentElement.localPackage)
$registry.DocumentElement.localPackage.'uses-license'.SetAttribute('ref', $catalog.DocumentElement.license.id)
$registry.Save($localManifest)
Write-Output "Verified and installed: $imageDir"
if (-not (Test-Path -LiteralPath (Join-Path $env:ANDROID_USER_HOME 'avd/Pleos_Connect_v2_1.ini'))) {
    'no' | & "$env:ANDROID_HOME/cmdline-tools/latest/bin/avdmanager.bat" create avd --name Pleos_Connect_v2_1 --package $package.path --device 'Pleos_Connect_v2_0'
    if ($LASTEXITCODE -ne 0) { throw 'AVD creation failed.' }
}
Write-Output 'Run ./start-emulator.ps1, then ./build.ps1 -Install.'
