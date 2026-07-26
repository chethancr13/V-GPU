# V-GPU Windows Compatibility & Setup Guide

This guide provides step-by-step instructions for running and building the V-GPU Tauri & Rust application on Windows.

---

## ⚡ Quick Start: Running in your IDE (VS Code / Cursor) on Windows

If you have cloned this repository and opened it in your IDE on Windows, follow these simple steps:

### 1️⃣ First-Time Setup (Run ONLY Once after Cloning)

1. Open your IDE Terminal (`Ctrl + ~` or `Terminal -> New Terminal`).
2. Run the 1-click environment setup script:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\setup-windows.ps1
   ```
   *(This automatically installs Node.js, Rust, Cargo, Visual Studio C++ Build Tools, and WebView2 via Windows `winget`).*

3. **Close and reopen your IDE terminal** so Windows loads the updated environment variables.
4. Install package dependencies:
   ```bash
   npm install
   ```

---

### 2️⃣ Commands Cheat Sheet for your IDE Terminal

| Action / Goal | Command to Type in IDE Terminal | Description |
| :--- | :--- | :--- |
| **First-Time Setup** | `powershell -ExecutionPolicy Bypass -File scripts\setup-windows.ps1` | Installs all Windows build tools automatically |
| **Run Desktop App (Dev Mode)** | `npm run tauri dev` | Starts Python backend, React frontend & launches live Desktop App |
| **Run via Python Launcher** | `python vgpu_launcher.py tauri` | Alternative launcher command |
| **Build `.exe` / `.msi` Installer** | `scripts\build-windows.bat` | Compiles standalone Windows installers into `frontend\src-tauri\target\release\bundle\` |

---

## Option 1: Zero-Setup Pre-Built App (Recommended for Non-Developer Users)

If you only want to **run the V-GPU desktop application** on Windows without setting up development tools:

1. Go to the **GitHub Releases** page of this repository.
2. Download the latest Windows installer:
   - `V-GPU_0.1.0_x64-setup.exe` (NSIS Installer) OR
   - `V-GPU_0.1.0_x64_en-US.msi` (MSI Windows Installer)
3. Double-click to install and launch V-GPU.

> **Note**: You do **NOT** need Rust, Cargo, Visual Studio Build Tools, or Node.js to run the pre-built installer.

---

## Option 2: 1-Click Automated Developer Setup (For Developers)

If you want to modify code or build V-GPU locally on Windows, all required dependencies can be installed automatically using our PowerShell setup script.

### Prerequisites Installation (Automated)

1. Open **PowerShell** as **Administrator**.
2. Run the automated environment setup script:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\setup-windows.ps1
   ```
3. Restart your PowerShell / Command Prompt window when completed.

This script uses Windows Package Manager (`winget`) to install:
- **Node.js LTS**
- **Rustup & Cargo** (`x86_64-pc-windows-msvc` target)
- **Visual Studio 2022 C++ Build Tools** (MSVC v143 & C++ Workload)
- **Microsoft Edge WebView2 Runtime**

---

## Building the Windows App Locally

Once your environment is set up, you can compile and package the app for Windows:

### 1-Click Local Build Command
In Command Prompt or PowerShell, run:
```cmd
scripts\build-windows.bat
```

### Manual Build Commands
```cmd
cd frontend
npm install
npm run tauri build
```
Built binaries and installers will be saved in:
- `frontend\src-tauri\target\release\bundle\msi\`
- `frontend\src-tauri\target\release\bundle\nsis\`

---

## Running Development Mode on Windows

To start hot-reloading dev mode:
```cmd
npm run tauri dev
```
or via the Python launcher:
```cmd
python vgpu_launcher.py tauri
```

---

## Automated CI/CD Pipeline (GitHub Actions)

When you push code or publish a new release tag (e.g., `v1.0.0`), the GitHub Actions workflow defined in `.github/workflows/build-windows.yml` will automatically:
1. Spin up a Windows runner (`windows-latest`).
2. Compile the Rust backend and React frontend.
3. Generate standalone `.msi` and `.exe` installers.
4. Attach them to GitHub Releases.
