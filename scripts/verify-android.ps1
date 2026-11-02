param([string]$Serial='emulator-5554')
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot '../environment.ps1')
$adbTool=Join-Path $env:ANDROID_HOME 'platform-tools/adb.exe'
$artifactDir=Join-Path $PSScriptRoot '../artifacts'
function Read-AndroidUi {
    & $adbTool -s $Serial shell uiautomator dump /sdcard/Download/routines-ui.xml | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'UI snapshot failed.' }
    & $adbTool -s $Serial pull /sdcard/Download/routines-ui.xml (Join-Path $artifactDir 'routines-ui.xml') 2>&1 | Out-Null
    return [xml](Get-Content -LiteralPath (Join-Path $artifactDir 'routines-ui.xml') -Raw)
}
function Click-AndroidId([xml]$Ui,[string]$Id) {
    $node=$Ui.SelectSingleNode("//node[@resource-id='$Id']")
    if (-not $node) { throw "Missing UI element: $Id" }
    $bounds=[regex]::Matches($node.bounds,'\d+') | ForEach-Object {[int]$_.Value}
    $x=[int](($bounds[0]+$bounds[2])/2);$y=[int](($bounds[1]+$bounds[3])/2)
    & $adbTool -s $Serial shell input tap $x $y
}
function Capture-Android([string]$Name) {
    & $adbTool -s $Serial shell screencap -p /sdcard/Download/routines-capture.png
    & $adbTool -s $Serial pull /sdcard/Download/routines-capture.png (Join-Path $artifactDir $Name) 2>&1 | Out-Null
}
$ui=Read-AndroidUi
Click-AndroidId $ui 'runButton'
Start-Sleep -Seconds 2
$ui=Read-AndroidUi
Click-AndroidId $ui 'resultButton'
$ui=Read-AndroidUi
$state=$ui.SelectSingleNode("//node[@resource-id='executionState']").text
$climate=$ui.SelectSingleNode("//node[@resource-id='climateValue']").text
$fan=$ui.SelectSingleNode("//node[@resource-id='fanValue']").text
if ($state -ne '실행 완료' -or $climate -ne '22°C' -or $fan -ne '3단계') { throw "Native test failed: $state / $climate / $fan" }
Capture-Android 'android-simulation.png'
Click-AndroidId $ui 'vehicleMode'
$ui=Read-AndroidUi
Click-AndroidId $ui 'probeButton'
Start-Sleep -Seconds 2
$ui=Read-AndroidUi
Capture-Android 'android-sdk-door.png'
$result=[ordered]@{simulation=$state;climate=$climate;fan=$fan;door=$ui.SelectSingleNode("//node[@resource-id='doorValue']").text;nativeText=@($ui.SelectNodes('//node') | Where-Object {$_.text -match 'SDK|조회|지원|도어'} | ForEach-Object {$_.text})}
$result | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $artifactDir 'android-verification.json') -Encoding utf8
$result | ConvertTo-Json -Depth 4
