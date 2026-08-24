$ErrorActionPreference = "SilentlyContinue"

$HostName =
    "com.ytm.discordpresence"

$InstallDir =
    Join-Path `
        $env:LOCALAPPDATA `
        "YTM Discord Presence"

$RegistryPath =
    "HKCU\Software\Google\Chrome\NativeMessagingHosts\$HostName"

Clear-Host

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "      YTM Discord Presence Uninstaller" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] Removing Chrome Native Messaging..." `
    -ForegroundColor Yellow

reg.exe delete `
    $RegistryPath `
    /f |
    Out-Null

Write-Progress `
    -Activity "Removing Native Messaging" `
    -Completed

Write-Host "[2/3] Removing YTM Discord Presence files..." `
    -ForegroundColor Yellow

if (Test-Path $InstallDir) {

    Remove-Item `
        $InstallDir `
        -Recurse `
        -Force

}

Write-Progress `
    -Activity "Removing application files" `
    -Completed

Write-Host "[3/3] Cleaning up..." `
    -ForegroundColor Yellow

Start-Sleep -Milliseconds 300

Write-Progress `
    -Activity "Cleaning up" `
    -Completed

Write-Host ""
Write-Host "==================================================" `
    -ForegroundColor Green

Write-Host "       UNINSTALLATION COMPLETE" `
    -ForegroundColor Green

Write-Host "==================================================" `
    -ForegroundColor Green

Write-Host ""
Write-Host "Native helper removed." `
    -ForegroundColor Green

Write-Host "Extension files removed." `
    -ForegroundColor Green

Write-Host ""
Write-Host "NOTE: Chrome does not automatically uninstall"
Write-Host "the extension registration from this script."
Write-Host ""
