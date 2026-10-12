param([string]$WebsiteOrigin = 'http://localhost:5173', [int]$Port = 8765)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
Write-Host 'Starting Faculty Companion. Keep this terminal open while using local PC features.'
$venvPython = Join-Path (Get-Location) 'backend/.venv/Scripts/python.exe'
if (Test-Path -LiteralPath $venvPython) {
    & $venvPython -m companion.server --website-origin $WebsiteOrigin --port $Port
} else {
    python -m companion.server --website-origin $WebsiteOrigin --port $Port
}
