# Script pour redémarrer proprement le serveur de développement

Write-Host "🧹 Nettoyage du cache..." -ForegroundColor Yellow

# Arrêter tous les processus Node.js liés au projet
Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*gourmich-v2*" } | Stop-Process -Force -ErrorAction SilentlyContinue

# Tuer les processus utilisant le port 3000
try {
    $connections = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
    if ($connections) {
        Stop-Process -Id $connections.OwningProcess -Force -ErrorAction SilentlyContinue
        $connections.OwningProcess | ForEach-Object { taskkill /PID $_ /F 2>$null }
    }
} catch {
    # Port 3000 probablement libre
}

# Supprimer le dossier .next
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

Write-Host "✅ Cache nettoyé !" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Démarrage du serveur..." -ForegroundColor Cyan
Write-Host ""

# Démarrer le serveur
npm run dev
