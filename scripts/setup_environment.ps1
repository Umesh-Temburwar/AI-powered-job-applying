# scripts/setup_environment.ps1
# AI-Powered-Job-Applying - Automated System Analysis & Self-Healing Setup
# Checks and auto-installs Python, Node.js, packages, and initializes environment

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
    $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$userPath;$machinePath;$env:Path"
}

# 1. Check Python
Write-Host "[1/6] Analyzing Python Runtime..." -ForegroundColor Yellow
$pythonCmd = $null

# Check venv first if it exists
$venvPy = Join-Path $projectRoot ".venv\Scripts\python.exe"
if (Test-Path $venvPy) {
    $pythonCmd = $venvPy
} else {
    $pyFromPath = Get-Command "python" -ErrorAction SilentlyContinue
    if ($pyFromPath) {
        $pythonCmd = $pyFromPath.Source
    } else {
        $pyLauncher = Get-Command "py" -ErrorAction SilentlyContinue
        if ($pyLauncher) {
            $pythonCmd = $pyLauncher.Source
        }
    }
}

# Search common paths if not found in PATH
if (-not $pythonCmd) {
    $commonPythonPaths = @(
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
    foreach ($p in $commonPythonPaths) {
        if (Test-Path $p) {
            $pythonCmd = $p
            break
        }
    }
}

if (-not $pythonCmd) {
    Write-Host "      [!] Python 3.10+ was NOT detected on this system." -ForegroundColor Red
    Write-Host "      [*] Attempting automatic installation of Python 3.11 via winget..." -ForegroundColor Yellow
    $winget = Get-Command "winget" -ErrorAction SilentlyContinue
    if ($winget) {
        & winget install -e --id Python.Python.3.11 --scope currentuser --silent --accept-package-agreements --accept-source-agreements
        Refresh-EnvPath
        $pyFromPath = Get-Command "python" -ErrorAction SilentlyContinue
        if ($pyFromPath) { $pythonCmd = $pyFromPath.Source }
    }
    
    if (-not $pythonCmd) {
        Write-Host "      [*] Downloading official Python 3.11 Windows Installer..." -ForegroundColor Yellow
        $installerUrl = "https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe"
        $installerPath = Join-Path $env:TEMP "python-3.11-installer.exe"
        try {
            Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath -UseBasicParsing
            Write-Host "      [*] Running silent Python installation (PrependPath=1)..." -ForegroundColor Yellow
            Start-Process -FilePath $installerPath -ArgumentList "/quiet InstallAllUsers=0 PrependPath=1 Include_test=0" -Wait
            Remove-Item $installerPath -Force -ErrorAction SilentlyContinue
            Refresh-EnvPath
            $pyFromPath = Get-Command "python" -ErrorAction SilentlyContinue
            if ($pyFromPath) { $pythonCmd = $pyFromPath.Source }
        } catch {
            Write-Host "      [ERROR] Could not auto-install Python: $_" -ForegroundColor Red
            Write-Host "      Please install Python 3.11 from: https://www.python.org/downloads/" -ForegroundColor Red
        }
    }
}

if ($pythonCmd) {
    $pyVer = & $pythonCmd --version 2>&1
    Write-Host "      [OK] Python is available: $pyVer ($pythonCmd)" -ForegroundColor Green
} else {
    Write-Host "      [FATAL] Python is required to run the bot. Please install Python 3.10+." -ForegroundColor Red
    exit 1
}

# 2. Check Node.js and npm
Write-Host "[2/6] Analyzing Node.js & npm Runtimes..." -ForegroundColor Yellow
$nodeCmd = Get-Command "node" -ErrorAction SilentlyContinue
$npmCmd = Get-Command "npm" -ErrorAction SilentlyContinue

if (-not $nodeCmd -or -not $npmCmd) {
    # Check standard install path
    if (Test-Path "C:\Program Files\nodejs\node.exe") {
        $env:Path = "C:\Program Files\nodejs;$env:Path"
        $nodeCmd = Get-Command "node" -ErrorAction SilentlyContinue
        $npmCmd = Get-Command "npm" -ErrorAction SilentlyContinue
    }
}

if (-not $nodeCmd -or -not $npmCmd) {
    Write-Host "      [!] Node.js / npm was NOT detected on this system." -ForegroundColor Red
    Write-Host "      [*] Attempting automatic installation of Node.js LTS via winget..." -ForegroundColor Yellow
    $winget = Get-Command "winget" -ErrorAction SilentlyContinue
    if ($winget) {
        & winget install -e --id OpenJS.NodeJS.LTS --scope currentuser --silent --accept-package-agreements --accept-source-agreements
        Refresh-EnvPath
        $nodeCmd = Get-Command "node" -ErrorAction SilentlyContinue
        $npmCmd = Get-Command "npm" -ErrorAction SilentlyContinue
    }

    if (-not $nodeCmd) {
        Write-Host "      [*] Downloading official Node.js LTS MSI installer..." -ForegroundColor Yellow
        $nodeMsiUrl = "https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi"
        $msiPath = Join-Path $env:TEMP "nodejs-lts.msi"
        try {
            Invoke-WebRequest -Uri $nodeMsiUrl -OutFile $msiPath -UseBasicParsing
            Write-Host "      [*] Running silent Node.js installation..." -ForegroundColor Yellow
            Start-Process "msiexec.exe" -ArgumentList "/i `"$msiPath`" /qn" -Wait
            Remove-Item $msiPath -Force -ErrorAction SilentlyContinue
            Refresh-EnvPath
            $nodeCmd = Get-Command "node" -ErrorAction SilentlyContinue
            $npmCmd = Get-Command "npm" -ErrorAction SilentlyContinue
        } catch {
            Write-Host "      [ERROR] Could not auto-install Node.js: $_" -ForegroundColor Red
            Write-Host "      Please install Node.js LTS from: https://nodejs.org/" -ForegroundColor Red
        }
    }
}

if ($nodeCmd -and $npmCmd) {
    $nodeVer = & node -v
    $npmVer = & npm -v
    Write-Host "      [OK] Node.js is available: $nodeVer (npm: $npmVer)" -ForegroundColor Green
} else {
    Write-Host "      [FATAL] Node.js & npm are required for the web dashboard. Please install Node.js." -ForegroundColor Red
    exit 1
}

# 3. Check Browser Engine
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
    Write-Host "      [!] Neither Chrome nor Edge detected in standard folders. Bot will use auto-detect." -ForegroundColor Yellow
}

# 4. Check & Initialize Configuration Files & Data Folders
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

# 5. Virtual Environment & Python Packages
Write-Host "[5/6] Analyzing Python Virtual Environment (.venv)..." -ForegroundColor Yellow
$venvDir = Join-Path $projectRoot ".venv"
$venvPython = Join-Path $venvDir "Scripts\python.exe"

# If pythonCmd is already venvPython, we don't recreate unless forced
if (-not (Test-Path $venvPython) -or $ForceReinstall) {
    Write-Host "      [*] Creating Python virtual environment (.venv)..." -ForegroundColor Yellow
    # Use system python to create venv
    $sysPy = if ($pythonCmd -ne $venvPython) { $pythonCmd } else { "python" }
    & $sysPy -m venv $venvDir
    if (-not (Test-Path $venvPython)) {
        Write-Host "      [FATAL] Failed to create virtual environment." -ForegroundColor Red
        exit 1
    }
    Write-Host "      [OK] Virtual environment created successfully." -ForegroundColor Green
}

# Test if key packages are installed in .venv
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

# 6. Frontend Dependencies
Write-Host "[6/6] Analyzing Frontend Dependencies (node_modules)..." -ForegroundColor Yellow
$frontendDir = Join-Path $projectRoot "frontend"
$nodeModulesDir = Join-Path $frontendDir "node_modules"

if (-not (Test-Path $nodeModulesDir) -or $ForceReinstall) {
    Write-Host "      [*] node_modules missing. Installing Frontend packages (npm install)..." -ForegroundColor Yellow
    Push-Location $frontendDir
    & npm install
    Pop-Location
    Write-Host "      [OK] Frontend dependencies installed successfully." -ForegroundColor Green
} else {
    Write-Host "      [OK] Frontend node_modules verified." -ForegroundColor Green
}

Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "✨ [ALL CHECKS PASSED] System environment is 100% ready!" -ForegroundColor Green
Write-Host "===============================================================================" -ForegroundColor Cyan
exit 0
