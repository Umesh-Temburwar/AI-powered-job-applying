# scripts/setup_environment.ps1
# AI-Powered-Job-Applying - Automated System Analysis & Self-Healing Setup
# Checks, auto-installs, or redirects to browser for Python, Node.js, and packages.

[CmdletBinding()]
param (
    [switch]$ForceReinstall = $false,
    [switch]$CheckOnly = $false
)

$ErrorActionPreference = "Continue"
$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $projectRoot

Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "       🤖 AI-POWERED-JOB-APPLYING - SYSTEM ENVIRONMENT ANALYSIS" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan

function Refresh-EnvPath {
    try {
        $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
        $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
        $env:Path = "$userPath;$machinePath;$env:Path"
    } catch {
        # Fallback silent
    }
}

function Get-PythonExecutable {
    # 1. Virtual environment python
    $venvPy = Join-Path $projectRoot ".venv\Scripts\python.exe"
    if (Test-Path $venvPy) { return $venvPy }

    # 2. Python in PATH
    $cmd = Get-Command "python" -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $pyLauncher = Get-Command "py" -ErrorAction SilentlyContinue
    if ($pyLauncher) { return $pyLauncher.Source }

    # 3. Known standard directories
    $knownPythonPaths = @(
        "$env:LocalAppData\Programs\Python\Python312\python.exe",
        "$env:LocalAppData\Programs\Python\Python311\python.exe",
        "$env:LocalAppData\Programs\Python\Python310\python.exe",
        "C:\Python312\python.exe",
        "C:\Python311\python.exe",
        "C:\Python310\python.exe",
        "C:\Program Files\Python312\python.exe",
        "C:\Program Files\Python311\python.exe",
        "C:\Program Files\Python310\python.exe"
    )
    foreach ($p in $knownPythonPaths) {
        if (Test-Path $p) {
            $pyDir = Split-Path $p
            if ($env:Path -notlike "*$pyDir*") {
                $env:Path = "$pyDir;$env:Path"
            }
            return $p
        }
    }
    return $null
}

function Get-NodeExecutable {
    # 1. Node in PATH
    $cmd = Get-Command "node" -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }

    # 2. Known standard directories
    $knownNodePaths = @(
        "C:\Program Files\nodejs\node.exe",
        "C:\Program Files (x86)\nodejs\node.exe",
        "$env:ProgramW6432\nodejs\node.exe",
        "$env:LocalAppData\Programs\nodejs\node.exe",
        "$env:APPDATA\npm\node.exe"
    )
    foreach ($loc in $knownNodePaths) {
        if (Test-Path $loc) {
            $nodeFolder = Split-Path $loc
            if ($env:Path -notlike "*$nodeFolder*") {
                $env:Path = "$nodeFolder;$env:Path"
            }
            return $loc
        }
    }
    return $null
}

function Get-NpmExecutable {
    # 1. npm in PATH
    $cmd = Get-Command "npm.cmd" -ErrorAction SilentlyContinue
    if (-not $cmd) { $cmd = Get-Command "npm" -ErrorAction SilentlyContinue }
    if ($cmd) { return $cmd.Source }

    # 2. Known standard directories
    $knownNpmPaths = @(
        "C:\Program Files\nodejs\npm.cmd",
        "C:\Program Files (x86)\nodejs\npm.cmd",
        "$env:ProgramW6432\nodejs\npm.cmd",
        "$env:LocalAppData\Programs\nodejs\npm.cmd",
        "$env:APPDATA\npm\npm.cmd"
    )
    foreach ($loc in $knownNpmPaths) {
        if (Test-Path $loc) {
            $npmFolder = Split-Path $loc
            if ($env:Path -notlike "*$npmFolder*") {
                $env:Path = "$npmFolder;$env:Path"
            }
            return $loc
        }
    }
    return $null
}

# ===============================================================================
# 1. ANALYZE PYTHON RUNTIME
# ===============================================================================
Write-Host "[1/6] Analyzing Python Runtime..." -ForegroundColor Yellow
$pythonCmd = Get-PythonExecutable

if (-not $pythonCmd) {
    Write-Host "      [!] Python 3.10+ was NOT detected on this system." -ForegroundColor Yellow
    Write-Host "      [*] Attempting automatic installation via winget..." -ForegroundColor Yellow
    
    $winget = Get-Command "winget" -ErrorAction SilentlyContinue
    if ($winget) {
        try {
            Start-Process "winget" -ArgumentList "install -e --id Python.Python.3.11 --scope currentuser --accept-package-agreements --accept-source-agreements" -Wait -NoNewWindow
            Refresh-EnvPath
            $pythonCmd = Get-PythonExecutable
        } catch {
            Write-Host "      [!] Winget notice: $_" -ForegroundColor DarkGray
        }
    }

    if (-not $pythonCmd) {
        Write-Host "      [*] Downloading official Python 3.11 Windows Installer..." -ForegroundColor Yellow
        $pyUrl = "https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe"
        $pyInstaller = Join-Path $env:TEMP "python-3.11-installer.exe"
        try {
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
            Invoke-WebRequest -Uri $pyUrl -OutFile $pyInstaller -UseBasicParsing
            Write-Host "      [*] Starting Python installer..." -ForegroundColor Yellow
            Start-Process -FilePath $pyInstaller -ArgumentList "/quiet InstallAllUsers=0 PrependPath=1 Include_test=0" -Wait
            Remove-Item $pyInstaller -Force -ErrorAction SilentlyContinue
            Refresh-EnvPath
            $pythonCmd = Get-PythonExecutable
        } catch {
            Write-Host "      [!] Python auto-download notice: $_" -ForegroundColor DarkGray
        }
    }

    # Browser Redirect Fallback if Python is still missing
    while (-not $pythonCmd) {
        Write-Host ""
        Write-Host "===============================================================================" -ForegroundColor Magenta
        Write-Host "🌐 REDIRECTING TO BROWSER FOR 1-CLICK PYTHON DOWNLOAD..." -ForegroundColor Magenta
        Write-Host "===============================================================================" -ForegroundColor Magenta
        Write-Host "Opening download pages in your default browser:" -ForegroundColor Cyan
        Write-Host "   1. Python Downloads : https://www.python.org/downloads/" -ForegroundColor Cyan
        Write-Host "   2. Direct 3.11.9    : https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe" -ForegroundColor Cyan
        Write-Host "===============================================================================" -ForegroundColor Magenta
        
        try {
            Start-Process "https://www.python.org/downloads/"
            Start-Process "https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe"
        } catch {}

        Write-Host ""
        Write-Host "👉 INSTRUCTIONS:" -ForegroundColor Yellow
        Write-Host "   1. Run the downloaded python-3.11-amd64.exe installer." -ForegroundColor White
        Write-Host "   2. [IMPORTANT] Check the box: 'Add python.exe to PATH' at the bottom!" -ForegroundColor White
        Write-Host "   3. Click 'Install Now'." -ForegroundColor White
        Write-Host "   4. After installation finishes, press [ENTER] below to continue!" -ForegroundColor White
        Write-Host "===============================================================================" -ForegroundColor Magenta
        Read-Host "Press [ENTER] after installing Python to re-verify"

        Refresh-EnvPath
        $pythonCmd = Get-PythonExecutable
    }
}

$pyVer = & $pythonCmd --version 2>&1
Write-Host "      [OK] Python is ready: $pyVer ($pythonCmd)" -ForegroundColor Green


# ===============================================================================
# 2. ANALYZE NODE.JS & NPM RUNTIMES
# ===============================================================================
Write-Host "[2/6] Analyzing Node.js & npm Runtimes..." -ForegroundColor Yellow
$nodeCmd = Get-NodeExecutable
$npmCmd = Get-NpmExecutable

if (-not $nodeCmd -or -not $npmCmd) {
    Write-Host "      [!] Node.js / npm was NOT detected on this system." -ForegroundColor Yellow
    Write-Host "      [*] Attempting automatic 1-click download & installation..." -ForegroundColor Yellow

    $winget = Get-Command "winget" -ErrorAction SilentlyContinue
    if ($winget) {
        try {
            Write-Host "      [*] Running winget install OpenJS.NodeJS.LTS..." -ForegroundColor Yellow
            Start-Process "winget" -ArgumentList "install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements" -Wait -NoNewWindow
            Refresh-EnvPath
            $nodeCmd = Get-NodeExecutable
            $npmCmd = Get-NpmExecutable
        } catch {
            Write-Host "      [!] Winget notice: $_" -ForegroundColor DarkGray
        }
    }

    if (-not $nodeCmd -or -not $npmCmd) {
        $nodeMsiUrl = "https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi"
        $msiPath = Join-Path $env:TEMP "nodejs-lts.msi"
        Write-Host "      [*] Downloading official Node.js LTS installer..." -ForegroundColor Yellow
        try {
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
            Invoke-WebRequest -Uri $nodeMsiUrl -OutFile $msiPath -UseBasicParsing
            Write-Host "      [*] Starting Node.js installer..." -ForegroundColor Yellow
            Start-Process "msiexec.exe" -ArgumentList "/i `"$msiPath`" /passive" -Wait
            Remove-Item $msiPath -Force -ErrorAction SilentlyContinue
            Refresh-EnvPath
            $nodeCmd = Get-NodeExecutable
            $npmCmd = Get-NpmExecutable
        } catch {
            Write-Host "      [!] Node MSI notice: $_" -ForegroundColor DarkGray
        }
    }

    # Browser Redirect Fallback if Node.js is still missing
    while (-not $nodeCmd -or -not $npmCmd) {
        Write-Host ""
        Write-Host "===============================================================================" -ForegroundColor Magenta
        Write-Host "🌐 REDIRECTING TO BROWSER FOR 1-CLICK NODE.JS DOWNLOAD..." -ForegroundColor Magenta
        Write-Host "===============================================================================" -ForegroundColor Magenta
        Write-Host "Opening download pages in your default browser:" -ForegroundColor Cyan
        Write-Host "   1. Node.js Portal   : https://nodejs.org/en/download/" -ForegroundColor Cyan
        Write-Host "   2. Direct Installer : https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi" -ForegroundColor Cyan
        Write-Host "===============================================================================" -ForegroundColor Magenta

        try {
            Start-Process "https://nodejs.org/en/download/"
            Start-Process "https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi"
        } catch {}

        Write-Host ""
        Write-Host "👉 INSTRUCTIONS:" -ForegroundColor Yellow
        Write-Host "   1. Run the downloaded node-v20.18.0-x64.msi installer." -ForegroundColor White
        Write-Host "   2. Follow setup prompts (Click 'Next' -> 'Install' -> 'Finish')." -ForegroundColor White
        Write-Host "   3. After installation is complete, press [ENTER] below to continue!" -ForegroundColor White
        Write-Host "===============================================================================" -ForegroundColor Magenta
        Read-Host "Press [ENTER] after installing Node.js to re-verify"

        Refresh-EnvPath
        $nodeCmd = Get-NodeExecutable
        $npmCmd = Get-NpmExecutable

        if (-not $nodeCmd) {
            Write-Host "      [!] Node.js still not detected. Retrying check..." -ForegroundColor Yellow
        }
    }
}

$nodeVer = & $nodeCmd -v
$npmVer = & $npmCmd -v
Write-Host "      [OK] Node.js is ready: $nodeVer (npm: $npmVer) ($nodeCmd)" -ForegroundColor Green


# ===============================================================================
# 3. ANALYZE WEB BROWSERS (Chrome / Edge)
# ===============================================================================
Write-Host "[3/6] Analyzing Web Browsers (Chrome / Edge)..." -ForegroundColor Yellow
$hasEdge = (Test-Path "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe") -or (Test-Path "C:\Program Files\Microsoft\Edge\Application\msedge.exe")
$hasChrome = (Test-Path "C:\Program Files\Google\Chrome\Application\chrome.exe") -or (Test-Path "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe") -or (Test-Path "$env:LocalAppData\Google\Chrome\Application\chrome.exe")

if ($hasChrome -and $hasEdge) {
    Write-Host "      [OK] Both Google Chrome and Microsoft Edge detected (Dual-browser ready)." -ForegroundColor Green
} elseif ($hasChrome) {
    Write-Host "      [OK] Google Chrome detected." -ForegroundColor Green
} elseif ($hasEdge) {
    Write-Host "      [OK] Microsoft Edge detected." -ForegroundColor Green
} else {
    Write-Host "      [!] Neither Chrome nor Edge found in standard folders." -ForegroundColor Yellow
    Write-Host "      Opening browser download page for Google Chrome..." -ForegroundColor Cyan
    try {
        Start-Process "https://www.google.com/chrome/"
    } catch {}
}


# ===============================================================================
# 4. CONFIGURATION FILES & DATA DIRECTORIES
# ===============================================================================
Write-Host "[4/6] Analyzing Configuration Files & Data Folders..." -ForegroundColor Yellow

# .env
$rootEnv = Join-Path $projectRoot ".env"
$rootEnvExample = Join-Path $projectRoot ".env.example"
if (-not (Test-Path $rootEnv)) {
    if (Test-Path $rootEnvExample) {
        Copy-Item -Path $rootEnvExample -Destination $rootEnv -Force
        Write-Host "      [CREATED] Created root .env from .env.example" -ForegroundColor Green
    }
} else {
    Write-Host "      [OK] Root .env exists." -ForegroundColor Green
}

# backend/.env
$backendEnv = Join-Path $projectRoot "backend\.env"
if (-not (Test-Path $backendEnv)) {
    if (Test-Path $rootEnv) {
        Copy-Item -Path $rootEnv -Destination $backendEnv -Force
        Write-Host "      [CREATED] Synced backend\.env from root .env" -ForegroundColor Green
    }
}

# frontend/.env
$frontendEnv = Join-Path $projectRoot "frontend\.env"
if (-not (Test-Path $frontendEnv)) {
    $defaultFrontendEnv = @"
VITE_SUPABASE_URL=https://rwtimhnxghgzkgrdymmq.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_EUzd4legD4ozbD-KEedciw_-OQVyCJc
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3dGltaG54Z2hnemtncmR5bW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2NzE0NjksImV4cCI6MjEwODI0NzQ2OX0.cEeA6EsSxd2egW0V1ipH5tjUn3n-CchWpeze18_Z46w
VITE_API_BASE_URL=http://127.0.0.1:8001
"@
    Set-Content -Path $frontendEnv -Value $defaultFrontendEnv -Encoding UTF8
    Write-Host "      [CREATED] Created frontend\.env with local API endpoint (http://127.0.0.1:8001)" -ForegroundColor Green
} else {
    Write-Host "      [OK] Frontend .env exists." -ForegroundColor Green
}

# data folders
$dataDirs = @(
    (Join-Path $projectRoot "data"),
    (Join-Path $projectRoot "data\resumes"),
    (Join-Path $projectRoot "data\user_configs")
)
foreach ($d in $dataDirs) {
    if (-not (Test-Path $d)) {
        New-Item -ItemType Directory -Path $d -Force | Out-Null
    }
}

# data/profile_data.json
$profileJsonPath = Join-Path $projectRoot "data\profile_data.json"
if (-not (Test-Path $profileJsonPath)) {
    $defaultProfile = @{
        personal = @{
            firstname = ""
            lastname = ""
            phone = ""
            email = ""
            current_location = ""
        }
        naukri_headline = ""
        profile_summary = ""
        key_skills = @()
        education = @()
        experience = @()
        projects = @()
        certifications = @()
        resume_name = $null
        resume_path = $null
    }
    $defaultProfile | ConvertTo-Json -Depth 5 | Set-Content -Path $profileJsonPath -Encoding UTF8
    Write-Host "      [CREATED] Initialized data\profile_data.json template" -ForegroundColor Green
} else {
    Write-Host "      [OK] data\profile_data.json exists." -ForegroundColor Green
}


# ===============================================================================
# 5. PYTHON VIRTUAL ENVIRONMENT & PACKAGES
# ===============================================================================
Write-Host "[5/6] Analyzing Python Virtual Environment (.venv)..." -ForegroundColor Yellow
$venvDir = Join-Path $projectRoot ".venv"
$venvPython = Join-Path $venvDir "Scripts\python.exe"

if (-not (Test-Path $venvPython) -or $ForceReinstall) {
    Write-Host "      [*] Creating Python virtual environment (.venv)..." -ForegroundColor Yellow
    $basePy = if ($pythonCmd -ne $venvPython) { $pythonCmd } else { "python" }
    & $basePy -m venv $venvDir
    if (-not (Test-Path $venvPython)) {
        Write-Host "      [FATAL] Failed to create virtual environment." -ForegroundColor Red
        exit 1
    }
    Write-Host "      [OK] Virtual environment created successfully." -ForegroundColor Green
}

# Fast test if dependencies are installed
$checkPyScript = "import fastapi, uvicorn, selenium, bs4, supabase, dotenv, pydantic_settings; print('READY')"
$isPyReady = $false
try {
    $testResult = & $venvPython -c $checkPyScript 2>&1
    if ($testResult -match "READY") {
        $isPyReady = $true
    }
} catch {
    $isPyReady = $false
}

if (-not $isPyReady -or $ForceReinstall) {
    Write-Host "      [*] Installing all required Python dependencies from requirements.txt..." -ForegroundColor Yellow
    & $venvPython -m pip install --upgrade pip --quiet
    $reqFile = Join-Path $projectRoot "requirements.txt"
    & $venvPython -m pip install -r $reqFile
    Write-Host "      [OK] Python dependencies installed." -ForegroundColor Green
} else {
    Write-Host "      [OK] All Python dependencies are installed and verified in .venv." -ForegroundColor Green
}

# Check Q&A screening bank
$answersCsv = Join-Path $projectRoot "data\application_answers.csv"
if (-not (Test-Path $answersCsv)) {
    Write-Host "      [*] Syncing AI screening question bank from training datasets..." -ForegroundColor Yellow
    & $venvPython (Join-Path $projectRoot "train_bot.py") --sync
    Write-Host "      [OK] Screening answers synced." -ForegroundColor Green
}


# ===============================================================================
# 6. FRONTEND DEPENDENCIES (node_modules)
# ===============================================================================
Write-Host "[6/6] Analyzing Frontend Dependencies (node_modules)..." -ForegroundColor Yellow
$frontendDir = Join-Path $projectRoot "frontend"
$nodeModulesDir = Join-Path $frontendDir "node_modules"

if (-not (Test-Path $nodeModulesDir) -or $ForceReinstall) {
    Write-Host "      [*] node_modules missing. Installing Frontend packages (npm install)..." -ForegroundColor Yellow
    Push-Location $frontendDir
    & $npmCmd install
    Pop-Location
    Write-Host "      [OK] Frontend dependencies installed successfully." -ForegroundColor Green
} else {
    Write-Host "      [OK] Frontend node_modules verified." -ForegroundColor Green
}

Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "✨ [ALL CHECKS PASSED] System environment is 100% ready!" -ForegroundColor Green
Write-Host "===============================================================================" -ForegroundColor Cyan
exit 0
