param(
    [switch]$AllowLowMemory,
    [switch]$Headless,
    [ValidateSet('auto', 'host', 'swiftshader_indirect')][string]$Gpu = 'auto',
    [switch]$DisableVulkan
)
. (Join-Path $PSScriptRoot '../environment.ps1')
$availableGB = (Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1MB
if ($availableGB -lt 5 -and -not $AllowLowMemory) {
    throw ('Available RAM: {0:N1} GB. Close unused apps to free at least 5 GB before starting the 4 GB Pleos emulator.' -f $availableGB)
}
$emulatorArgs = @('-avd','Pleos_Connect_v2_1','-memory','4096','-no-snapshot','-gpu',$Gpu,'-no-boot-anim')
if ($Headless) { $emulatorArgs += '-no-window' }
if ($DisableVulkan) { $emulatorArgs += @('-feature', '-Vulkan') }
& (Join-Path $env:ANDROID_HOME 'emulator/emulator.exe') @emulatorArgs

