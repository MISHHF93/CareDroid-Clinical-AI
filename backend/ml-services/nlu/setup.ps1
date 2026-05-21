# Setup script for NLU service (Windows)

Write-Host "🚀 Setting up NLU Service (Windows)" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green

# Check Python version
$pythonVersion = python --version 2>&1
Write-Host "✓ Python version: $pythonVersion"

# Create virtual environment
if (-not (Test-Path "venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
} else {
    Write-Host "✓ Virtual environment already exists"
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& ".\venv\Scripts\Activate.ps1"

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
python -m pip install --upgrade pip
pip install -r requirements.txt

# Verify installation
Write-Host "Verifying installation..." -ForegroundColor Yellow
python -c "import torch; import transformers; import fastapi; print('✓ All core dependencies installed')"

# Optional: Install dev dependencies
$devDeps = Read-Host "Install development dependencies? (y/n)"
if ($devDeps -eq 'y' -or $devDeps -eq 'Y') {
    pip install -r requirements-dev.txt
}

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Activate venv:      .\venv\Scripts\Activate.ps1"
Write-Host "2. Prepare data:       python prepare_data.py"
Write-Host "3. Train model:        python train.py"
Write-Host "4. Evaluate model:     python evaluate.py"
Write-Host "5. Start service:      python -m uvicorn app:app --reload"
Write-Host ""
Write-Host "For more information, see README.md" -ForegroundColor Cyan
