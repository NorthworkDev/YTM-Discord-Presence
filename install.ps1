$ErrorActionPreference = "Stop"

$HostName = "com.ytm.discordpresence"
$ExtensionId = "anjcijgcicclibmfiaincoadifjmnegg"

$InstallDir =
    Join-Path $env:LOCALAPPDATA "YTM Discord Presence"

$HostExe =
    Join-Path $InstallDir "YTMPresence.exe"

$HostManifest =
    Join-Path $InstallDir "$HostName.json"

$ExtensionDir =
    Join-Path $InstallDir "extension"

$RegistryPath =
    "HKCU\Software\Google\Chrome\NativeMessagingHosts\$HostName"

$ReleaseApi =
    "https://api.github.com/repos/NorthworkDev/YTM-Discord-Presence/releases/latest"

Clear-Host

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "       YTM Discord Presence Installer" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

function Download-WithProgress {
    param(
        [string]$Url,
        [string]$OutputFile,
        [string]$Activity
    )

    $request =
        [System.Net.HttpWebRequest]::Create($Url)

    $request.UserAgent =
        "YTM-Discord-Presence-Installer"

    $response =
        $request.GetResponse()

    $total =
        $response.ContentLength

    $inputStream =
        $response.GetResponseStream()

    $outputStream =
        [System.IO.File]::Create(
            $OutputFile
        )

    try {

        $buffer =
            New-Object byte[] 65536

        $downloaded = 0

        while (
            ($read =
                $inputStream.Read(
                    $buffer,
                    0,
                    $buffer.Length
                )
            ) -gt 0
        ) {

            $outputStream.Write(
                $buffer,
                0,
                $read
            )

            $downloaded +=
                $read

            if ($total -gt 0) {

                $percent =
                    [int](
                        (
                            $downloaded /
                            $total
                        ) * 100
                    )

                $currentMB =
                    [math]::Round(
                        $downloaded / 1MB,
                        2
                    )

                $totalMB =
                    [math]::Round(
                        $total / 1MB,
                        2
                    )

                Write-Progress `
                    -Activity $Activity `
                    -Status "$currentMB MB / $totalMB MB" `
                    -PercentComplete $percent
            }
        }

        Write-Progress `
            -Activity $Activity `
            -Completed

    }
    finally {

        $outputStream.Dispose()
        $inputStream.Dispose()
        $response.Dispose()

    }
}

Write-Host "[1/6] Checking latest GitHub release..." `
    -ForegroundColor Yellow

$headers = @{
    "User-Agent" =
        "YTM-Discord-Presence-Installer"
}

$release =
    Invoke-RestMethod `
        -Uri $ReleaseApi `
        -Headers $headers `
        -Method Get

$nativeAsset =
    $release.assets |
    Where-Object {
        $_.name -eq "YTMPresence.exe"
    } |
    Select-Object -First 1

$extensionAsset =
    $release.assets |
    Where-Object {
        $_.name -eq "YTM-Discord-Presence-extension.zip"
    } |
    Select-Object -First 1

if (-not $nativeAsset) {
    throw "YTMPresence.exe was not found in the latest GitHub release."
}

if (-not $extensionAsset) {
    throw "YTM-Discord-Presence-extension.zip was not found in the latest GitHub release."
}

Write-Host ""
Write-Host "Latest release: $($release.tag_name)" `
    -ForegroundColor Green

Write-Host "Native helper: $($nativeAsset.name)" `
    -ForegroundColor Green

Write-Host "Extension package: $($extensionAsset.name)" `
    -ForegroundColor Green

Write-Host ""
Write-Host "[2/6] Preparing installation directories..." `
    -ForegroundColor Yellow

if (-not (Test-Path $InstallDir)) {

    New-Item `
        -ItemType Directory `
        -Path $InstallDir `
        -Force |
        Out-Null

}

if (Test-Path $ExtensionDir) {

    Remove-Item `
        $ExtensionDir `
        -Recurse `
        -Force

}

New-Item `
    -ItemType Directory `
    -Path $ExtensionDir `
    -Force |
    Out-Null

Write-Host "Install location:" `
    -ForegroundColor DarkGray

Write-Host $InstallDir

Write-Host ""
Write-Host "[3/6] Downloading native helper..." `
    -ForegroundColor Yellow

$tempExe =
    Join-Path `
        $env:TEMP `
        "YTMPresence-download.exe"

if (Test-Path $tempExe) {

    Remove-Item `
        $tempExe `
        -Force

}

Download-WithProgress `
    -Url $nativeAsset.browser_download_url `
    -OutputFile $tempExe `
    -Activity "Downloading YTMPresence.exe"

Copy-Item `
    -Path $tempExe `
    -Destination $HostExe `
    -Force

Remove-Item `
    $tempExe `
    -Force `
    -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Native helper installed." `
    -ForegroundColor Green

Write-Host ""
Write-Host "[4/6] Downloading Chrome extension..." `
    -ForegroundColor Yellow

$tempZip =
    Join-Path `
        $env:TEMP `
        "YTM-Discord-Presence-extension.zip"

if (Test-Path $tempZip) {

    Remove-Item `
        $tempZip `
        -Force

}

Download-WithProgress `
    -Url $extensionAsset.browser_download_url `
    -OutputFile $tempZip `
    -Activity "Downloading Chrome extension"

Write-Host ""
Write-Host "Extracting Chrome extension..." `
    -ForegroundColor Yellow

Expand-Archive `
    -Path $tempZip `
    -DestinationPath $ExtensionDir `
    -Force

Remove-Item `
    $tempZip `
    -Force `
    -ErrorAction SilentlyContinue

$ExtensionManifest =
    Join-Path `
        $ExtensionDir `
        "manifest.json"

if (-not (Test-Path $ExtensionManifest)) {

    throw "The extension package was extracted, but manifest.json was not found."

}

Write-Host "Chrome extension extracted successfully." `
    -ForegroundColor Green

Write-Host ""
Write-Host "[5/6] Configuring Chrome Native Messaging..." `
    -ForegroundColor Yellow

$escapedExePath =
    $HostExe.Replace(
        "\",
        "\\"
    )

$manifest = @"
{
  "name": "$HostName",
  "description": "YouTube Music Discord Presence native host",
  "path": "$escapedExePath",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://$ExtensionId/"
  ]
}
"@

Set-Content `
    -Path $HostManifest `
    -Value $manifest `
    -Encoding UTF8

reg.exe add `
    $RegistryPath `
    /ve `
    /t REG_SZ `
    /d $HostManifest `
    /f |
    Out-Null

Write-Host "Chrome Native Messaging registered." `
    -ForegroundColor Green

Write-Host ""
Write-Host "[6/6] Verifying installation..." `
    -ForegroundColor Yellow

if (-not (Test-Path $HostExe)) {
    throw "YTMPresence.exe could not be verified."
}

if (-not (Test-Path $ExtensionManifest)) {
    throw "Chrome extension manifest could not be verified."
}

$registryCheck =
    reg.exe query `
        $RegistryPath `
        2>$null

if (-not $registryCheck) {
    throw "Chrome Native Messaging registration could not be verified."
}

Write-Host "Native helper: OK" `
    -ForegroundColor Green

Write-Host "Chrome extension files: OK" `
    -ForegroundColor Green

Write-Host "Native Messaging: OK" `
    -ForegroundColor Green

Write-Host ""
Write-Host "==================================================" `
    -ForegroundColor Green

Write-Host "        INSTALLATION COMPLETE" `
    -ForegroundColor Green

Write-Host "==================================================" `
    -ForegroundColor Green

Write-Host ""

Write-Host "Native helper:"
Write-Host "  $HostExe"

Write-Host ""
Write-Host "Chrome extension:"
Write-Host "  $ExtensionDir"

Write-Host ""
Write-Host "Extension manifest:"
Write-Host "  $ExtensionManifest"

Write-Host ""
Write-Host "Chrome Native Messaging: READY" `
    -ForegroundColor Green

Write-Host ""
Write-Host "IMPORTANT:" `
    -ForegroundColor Yellow

Write-Host "The extension files are installed and ready for"
Write-Host "Chrome's Load unpacked feature."

Write-Host ""
Write-Host "No Node.js or server.js is required."
Write-Host ""

Write-Host "Installation finished successfully." `
    -ForegroundColor Green

Write-Host ""
