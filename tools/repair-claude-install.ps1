param(
  [string]$MsixPath = "$env:TEMP\Claude-3890133963.msix",
  [string]$LogPath = "$env:TEMP\ClaudeRepair.log"
)

$ErrorActionPreference = "Continue"

function Write-Step {
  param([string]$Message)
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
  Write-Host $line
  Add-Content -Path $LogPath -Value $line
}

Remove-Item -LiteralPath $LogPath -Force -ErrorAction SilentlyContinue
Write-Step "Claude repair started"
Write-Step "MSIX: $MsixPath"

$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Step "ERROR: This script must run as Administrator."
  exit 10
}

if (-not (Test-Path -LiteralPath $MsixPath)) {
  Write-Step "ERROR: MSIX not found: $MsixPath"
  exit 11
}

Write-Step "Stopping Claude-related processes"
Get-Process | Where-Object { $_.ProcessName -match "Claude|Anthropic" } | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Step "Removing CoworkVMService if present"
$svc = Get-Service -Name CoworkVMService -ErrorAction SilentlyContinue
if ($svc) {
  Stop-Service -Name CoworkVMService -Force -ErrorAction SilentlyContinue
  sc.exe delete CoworkVMService | Out-String | Add-Content -Path $LogPath
} else {
  Write-Step "CoworkVMService is not installed"
}

Write-Step "Removing existing Claude AppX packages for all users"
$packages = @(Get-AppxPackage -AllUsers -Name "*Claude*" -ErrorAction SilentlyContinue)
if ($packages.Count -eq 0) {
  Write-Step "No enumerable Claude AppX package found"
} else {
  foreach ($pkg in $packages) {
    Write-Step "Removing $($pkg.PackageFullName)"
    try {
      Remove-AppxPackage -Package $pkg.PackageFullName -AllUsers -ErrorAction Stop
      Write-Step "Removed $($pkg.PackageFullName)"
    } catch {
      Write-Step "Remove failed for $($pkg.PackageFullName): $($_.Exception.Message)"
    }
  }
}

Write-Step "Removing provisioned Claude package if present"
$prov = @(Get-AppxProvisionedPackage -Online | Where-Object { $_.DisplayName -like "*Claude*" })
foreach ($p in $prov) {
  Write-Step "Removing provisioned $($p.PackageName)"
  Remove-AppxProvisionedPackage -Online -PackageName $p.PackageName -ErrorAction SilentlyContinue | Out-String | Add-Content -Path $LogPath
}

Write-Step "Installing Claude MSIX"
try {
  Add-AppxPackage -Path $MsixPath -ForceApplicationShutdown -ErrorAction Stop
  Write-Step "SUCCESS: Add-AppxPackage completed"
  Get-AppxPackage -Name "*Claude*" | Select-Object Name,PackageFullName,InstallLocation,Status | Format-List | Out-String | Add-Content -Path $LogPath
  exit 0
} catch {
  Write-Step "ERROR: Add-AppxPackage failed: $($_.Exception.Message)"
  Write-Step "Recent AppXDeploymentServer Claude events:"
  Get-WinEvent -LogName "Microsoft-Windows-AppXDeploymentServer/Operational" -MaxEvents 60 |
    Where-Object { $_.Message -match "Claude|0x80073CF6|0x800703FA|0x80073D05|RegistrationChanged" } |
    Select-Object TimeCreated, Id, Message |
    Format-List | Out-String | Add-Content -Path $LogPath
  exit 20
}
