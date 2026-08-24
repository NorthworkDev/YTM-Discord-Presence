$ErrorActionPreference = "Stop"

$HostName = "com.ytm.discordpresence"
$ExtensionId = "glbnhdknaoidcnihblllkdfkmhjlgdoo"

$InstallDir = Join-Path $env:LOCALAPPDATA "YTM Discord Presence"
$HostExe = Join-Path $InstallDir "YTMPresence.exe"
$HostManifest = Join-Path $InstallDir "$HostName.json"

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
        [string]$OutputFile
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

            $downloaded += $read

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
                    -Activity "Downloading YTMPresence.exe" `
                    -Status "$currentMB MB / $totalMB MB" `
                    -PercentComplete $percent
            }
        }

        Write-Progress `
            -Activity "Downloading YTMPresence.exe" `
            -Completed

    }
    finally {

        $outputStream.Dispose()
        $inputStream.Dispose()
        $response.Dispose()

    }
}

# ============================================================
# STEP 1
# ============================================================

Write-Host "[1/5] Checking latest GitHub release..." `
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

$asset =
    $release.assets |
    Where-Object {
        $_.name -eq "YTMPresence.exe"
    } |
    Select-Object -First 1

if (-not $asset) {
    throw "YTMPresence.exe was not found in the latest GitHub release."
}

Write-Host ""
Write-Host "Latest release: $($release.tag_name)" `
    -ForegroundColor Green

Write-Host "Asset: $($asset.name)" `
    -ForegroundColor Green

# ============================================================
# STEP 2
# ============================================================

Write-Host ""
Write-Host "[2/5] Preparing installation directory..." `
    -ForegroundColor Yellow

if (-not (Test-Path $InstallDir)) {

    New-Item `
        -ItemType Directory `
        -Path $InstallDir `
        -Force |
        Out-Null

}

Write-Host "Install location:" `
    -ForegroundColor DarkGray

Write-Host $InstallDir

# ============================================================
# STEP 3
# ============================================================

Write-Host ""
Write-Host "[3/5] Downloading native helper..." `
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
    -Url $asset.browser_download_url `
    -OutputFile $tempExe

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

# ============================================================
# STEP 4
# ============================================================

Write-Host ""
Write-Host "[4/5] Configuring Chrome Native Messaging..." `
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

Write-Host "Native Messaging registered." `
    -ForegroundColor Green

# ============================================================
# STEP 5
# ============================================================

Write-Host ""
Write-Host "[5/5] Verifying installation..." `
    -ForegroundColor Yellow

if (-not (Test-Path $HostExe)) {
    throw "YTMPresence.exe could not be verified."
}

$registryCheck =
    reg.exe query `
        $RegistryPath `
        2>$null

if (-not $registryCheck) {
    throw "Chrome Native Messaging registration could not be verified."
}

Write-Host "Helper verified." `
    -ForegroundColor Green

Write-Host "Registry verified." `
    -ForegroundColor Green

# ============================================================
# DONE
# ============================================================

Write-Host ""
Write-Host "==================================================" `
    -ForegroundColor Green

Write-Host "        INSTALLATION COMPLETE" `
    -ForegroundColor Green

Write-Host "==================================================" `
    -ForegroundColor Green

Write-Host ""

Write-Host "YTM Discord Presence is installed." `
    -ForegroundColor Green

Write-Host ""
Write-Host "Installed helper:"
Write-Host $HostExe

Write-Host ""
Write-Host "Chrome Native Messaging: READY" `
    -ForegroundColor Green

Write-Host ""
Write-Host "Open YouTube Music and play a song." `
    -ForegroundColor Cyan

Write-Host ""
Write-Host "No Node.js or server.js is required."
Write-Host ""