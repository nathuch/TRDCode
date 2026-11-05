<#
  Arma el paquete del prototipo en prototipo\TRDCode\ (ignorado por git), listo para
  copiar a C:\xampp\htdocs\ de otro computador.

  Uso, desde la raiz del proyecto:  powershell -ExecutionPolicy Bypass -File scripts\armar_prototipo.ps1

  Contenido: frontend compilado en la raiz, api\ (sin .env), .htaccess que bloquean
  api\lib\, database\ y los archivos que empiezan con punto, robots.txt, los tres scripts
  SQL, .env.example y LEEME.txt. El .env y expedientes.sql NO van: se copian a mano.
#>
$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
$destino = Join-Path $raiz 'prototipo\TRDCode'

Write-Host 'Compilando el frontend (npm run build)...'
Push-Location (Join-Path $raiz 'frontend')
try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'Fallo npm run build.' }
} finally {
    Pop-Location
}

if (Test-Path $destino) { Remove-Item $destino -Recurse -Force }
New-Item -ItemType Directory -Path $destino -Force | Out-Null

# Frontend compilado (incluye robots.txt y favicon.svg de frontend\public).
Copy-Item -Path (Join-Path $raiz 'frontend\dist\*') -Destination $destino -Recurse

# API, sin ningun .env que pudiera haber quedado ahi.
Copy-Item -Path (Join-Path $raiz 'api') -Destination (Join-Path $destino 'api') -Recurse
Get-ChildItem -Path $destino -Recurse -Force -File | Where-Object { $_.Name -like '*.env' } | Remove-Item -Force

# Scripts SQL de la base de datos.
$database = Join-Path $destino 'database'
New-Item -ItemType Directory -Path $database -Force | Out-Null
foreach ($archivo in 'schema.sql', 'datos_iniciales.sql', 'trd.sql') {
    Copy-Item -Path (Join-Path $raiz "database\$archivo") -Destination $database
}

Copy-Item -Path (Join-Path $raiz '.env.example') -Destination $destino
Copy-Item -Path (Join-Path $raiz 'scripts\prototipo\LEEME.txt') -Destination $destino
# Manual de usuario (se genera con: node scripts\generar_manual_pdf.mjs).
$manual = Join-Path $raiz 'docs\GUIA_USO.pdf'
if (Test-Path $manual) {
    Copy-Item -Path $manual -Destination (Join-Path $destino 'Manual_de_usuario_TRDCode.pdf')
} else {
    Write-Warning 'No se encontro docs\GUIA_USO.pdf: el paquete va sin manual de usuario.'
}

# Bloqueos de Apache. Se escriben en ASCII: Apache no acepta .htaccess con BOM.
Set-Content -Path (Join-Path $destino 'api\lib\.htaccess') -Value 'Require all denied' -Encoding ascii
Set-Content -Path (Join-Path $database '.htaccess') -Value 'Require all denied' -Encoding ascii
$raizHtaccess = @(
    '# Bloquea los archivos que empiezan con punto (.env, .env.example, .htaccess).'
    '<FilesMatch "^\.">'
    '    Require all denied'
    '</FilesMatch>'
    'Options -Indexes'
)
Set-Content -Path (Join-Path $destino '.htaccess') -Value $raizHtaccess -Encoding ascii

# Comprobaciones: nada de .env, .xlsx ni expedientes.sql dentro del paquete.
$prohibidos = Get-ChildItem -Path $destino -Recurse -Force -File |
    Where-Object { $_.Name -like '*.env' -or $_.Name -like '*.xlsx' -or $_.Name -eq 'expedientes.sql' }
if ($prohibidos) { throw "El paquete tiene archivos que no deben ir: $($prohibidos.FullName -join ', ')" }

$archivos = (Get-ChildItem -Path $destino -Recurse -Force -File).Count
Write-Host "Listo: $destino ($archivos archivos)."
Write-Host 'Falta copiar a mano: el .env (como C:\xampp\TRDCode.env) y datos-prueba\expedientes.sql.'
