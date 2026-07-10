$ErrorActionPreference = "Stop"

$workspace = Split-Path -Parent $PSScriptRoot
$workspace = [System.IO.Path]::GetFullPath($workspace)
if (-not (Test-Path -LiteralPath (Join-Path $workspace "package.json"))) {
  throw "No se encontró package.json en $workspace"
}

$listeners = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
foreach ($listener in $listeners) {
  $process = Get-CimInstance Win32_Process -Filter "ProcessId = $($listener.OwningProcess)" -ErrorAction SilentlyContinue
  if ($process -and $process.CommandLine -like "*$workspace*") {
    Stop-Process -Id $listener.OwningProcess -Force
  } else {
    throw "El puerto 3000 está ocupado por un proceso ajeno al workspace. No se detuvo."
  }
}

Push-Location $workspace
try {
  npm run typecheck
  if ($LASTEXITCODE -ne 0) { throw "Falló typecheck" }
  npm run lint
  if ($LASTEXITCODE -ne 0) { throw "Falló lint" }
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "Falló build" }

  $stdout = Join-Path $workspace ".next\demo-server.out.log"
  $stderr = Join-Path $workspace ".next\demo-server.err.log"
  $server = Start-Process -FilePath "npm.cmd" -ArgumentList @("run", "start") `
    -WorkingDirectory $workspace -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput $stdout -RedirectStandardError $stderr

  $deadline = (Get-Date).AddSeconds(30)
  do {
    Start-Sleep -Milliseconds 500
    try {
      $login = Invoke-WebRequest -Uri "http://localhost:3000/login" -UseBasicParsing -TimeoutSec 3
    } catch {
      $login = $null
    }
  } while (($null -eq $login -or $login.StatusCode -ne 200) -and (Get-Date) -lt $deadline)

  if ($null -eq $login -or $login.StatusCode -ne 200) {
    Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
    throw "El servidor no superó el smoke test de /login. Revisá $stderr"
  }

  $stock = Invoke-WebRequest -Uri "http://localhost:3000/stock" -UseBasicParsing -TimeoutSec 10
  if ($stock.StatusCode -ne 200) {
    throw "El smoke test de /stock no devolvió HTTP 200."
  }

  Write-Host "Demo lista en http://localhost:3000 (PID lanzador $($server.Id))."
} finally {
  Pop-Location
}
