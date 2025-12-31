# Script to cleanly restart the development server

# Force UTF-8 encoding for proper display
chcp 65001 > $null
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "Cleaning cache..." -ForegroundColor Yellow

# Stop all Node.js processes related to the project
Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*yumiso*" } | Stop-Process -Force -ErrorAction SilentlyContinue

# Kill processes using port 3000
try {
    $connections = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
    if ($connections) {
        Stop-Process -Id $connections.OwningProcess -Force -ErrorAction SilentlyContinue
        $connections.OwningProcess | ForEach-Object { taskkill /PID $_ /F 2>$null }
    }
} catch {
    # Port 3000 is probably free
}

# Remove .next folder
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

Write-Host "Cache cleaned!" -ForegroundColor Green
Write-Host ""
Write-Host "Starting server..." -ForegroundColor Cyan
Write-Host ""

# Start the server
npm run dev
