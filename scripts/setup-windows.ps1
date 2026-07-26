# V-GPU Windows 1-Click Environment Setup Script
# Run this script in PowerShell as Administrator

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   V-GPU Windows Development Environment Setup  " -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check for Administrator privileges
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[!] Warning: It is recommended to run this script as Administrator." -ForegroundColor Yellow
}

# 1. Install Node.js
Write-Host "[1/4] Checking Node.js..." -ForegroundColor Green
if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Host " -> Node.js is already installed: $(node --version)" -ForegroundColor Gray
} else {
    Write-Host " -> Installing Node.js LTS via winget..." -ForegroundColor Yellow
    winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
}

# 2. Install Rust & Cargo via Rustup
Write-Host "[2/4] Checking Rust environment..." -ForegroundColor Green
if (Get-Command rustc -ErrorAction SilentlyContinue) {
    Write-Host " -> Rust is already installed: $(rustc --version)" -ForegroundColor Gray
} else {
    Write-Host " -> Installing Rustup via winget..." -ForegroundColor Yellow
    winget install --id Rust.Rustup -e --accept-source-agreements --accept-package-agreements
    Write-Host " -> Initializing default stable toolchain..." -ForegroundColor Yellow
    rustup default stable
    rustup target add x86_64-pc-windows-msvc
}

# 3. Install Visual Studio 2022 Build Tools (C++ Workload)
Write-Host "[3/4] Checking Visual Studio C++ Build Tools..." -ForegroundColor Green
$vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
if (Test-Path $vswhere) {
    $vsInstall = & $vswhere -latest -property installationPath
    if ($vsInstall) {
        Write-Host " -> Visual Studio Build Tools detected at: $vsInstall" -ForegroundColor Gray
    } else {
        Write-Host " -> Installing Visual Studio C++ Build Tools via winget..." -ForegroundColor Yellow
        winget install --id Microsoft.VisualStudio.2022.BuildTools --override "--passive --wait --add Microsoft.VisualStudio.Workload.VCTools;includeRecommended" -e --accept-source-agreements --accept-package-agreements
    }
} else {
    Write-Host " -> Installing Visual Studio C++ Build Tools via winget..." -ForegroundColor Yellow
    winget install --id Microsoft.VisualStudio.2022.BuildTools --override "--passive --wait --add Microsoft.VisualStudio.Workload.VCTools;includeRecommended" -e --accept-source-agreements --accept-package-agreements
}

# 4. Check WebView2 Runtime
Write-Host "[4/4] Checking WebView2 Runtime..." -ForegroundColor Green
$wv2 = Get-ItemProperty -Path "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-F0E3A77F6622}" -ErrorAction SilentlyContinue
if ($wv2) {
    Write-Host " -> Microsoft Edge WebView2 Runtime is installed." -ForegroundColor Gray
} else {
    Write-Host " -> Installing WebView2 Evergreen Runtime..." -ForegroundColor Yellow
    winget install --id Microsoft.EdgeWebView2Runtime -e --accept-source-agreements --accept-package-agreements
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host " Setup Complete! Restart PowerShell/Terminal.  " -ForegroundColor Cyan
Write-Host " To start dev mode: npm run tauri dev          " -ForegroundColor Cyan
Write-Host " To build Windows installer: scripts\build-windows.bat" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
