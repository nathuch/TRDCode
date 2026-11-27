<#
  Arma el paquete de entrega de TRDCode: paquete\TRDCode-v<version>.zip (ignorado por git).

  Uso, desde cualquier carpeta:
    powershell -ExecutionPolicy Bypass -File <raiz>\scripts\empaquetar.ps1 [-Version 1.0.0]

  Contenido del zip (carpeta TRDCode-v<version>\):
    app\        lo que se copia a la carpeta publica del servidor: el frontend compilado,
                robots.txt, api\ y consola\ (script de la primera cuenta), con sus .htaccess.
    database\   instalacion_completa.sql (todo en un archivo), schema.sql, datos_iniciales.sql,
                trd.sql y migraciones\.
    docs\       INSTALACION.md y, en PDF: la guia de instalacion, la guia rapida de prueba, el
                manual de usuario y la ficha tecnica (se generan con
                node scripts\generar_manual_pdf.mjs --todos).
    .env.example y LEEME.txt.

  SIN datos personales: no lleva expedientes ni reportes (la primera carga se hace desde
  "Actualizar datos"), ni .env, ni datos-prueba, ni cuentas o contrasenas. El script se
  detiene si encuentra algo de eso.
#>
param([string]$Version = '1.0.0')

$ErrorActionPreference = 'Stop'
if ($Version -notmatch '^\d+\.\d+\.\d+$') { throw "Version invalida: $Version (ejemplo: 1.0.0)." }

$raiz = Split-Path -Parent $PSScriptRoot
$nombre = "TRDCode-v$Version"
$salida = Join-Path $raiz 'paquete'
$destino = Join-Path $salida $nombre
$zip = Join-Path $salida "$nombre.zip"

# instalacion_completa.sql debe estar armado con los SQL actuales.
node (Join-Path $raiz 'scripts\armar_instalacion_completa.mjs') --revisar
if ($LASTEXITCODE -ne 0) { throw 'database\instalacion_completa.sql no esta al dia: node scripts\armar_instalacion_completa.mjs' }

Write-Host 'Compilando el frontend (npm run build)...'
Push-Location (Join-Path $raiz 'frontend')
try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'Fallo npm run build.' }
} finally {
    Pop-Location
}

if (Test-Path $destino) { Remove-Item $destino -Recurse -Force }
if (Test-Path $zip) { Remove-Item $zip -Force }
$app = Join-Path $destino 'app'
New-Item -ItemType Directory -Path $app -Force | Out-Null

# app\: frontend compilado (incluye robots.txt y favicon.svg de frontend\public), api\ y consola\.
Copy-Item -Path (Join-Path $raiz 'frontend\dist\*') -Destination $app -Recurse
Copy-Item -Path (Join-Path $raiz 'api') -Destination (Join-Path $app 'api') -Recurse
Copy-Item -Path (Join-Path $raiz 'consola') -Destination (Join-Path $app 'consola') -Recurse

# Bloqueos de Apache. Se escriben en ASCII: Apache no acepta .htaccess con BOM.
Set-Content -Path (Join-Path $app 'api\lib\.htaccess') -Value 'Require all denied' -Encoding ascii
Set-Content -Path (Join-Path $app 'consola\.htaccess') -Value 'Require all denied' -Encoding ascii
$raizHtaccess = @(
    '# TRDCode: bloquea los archivos que empiezan con punto (.env, .env.example, .htaccess)'
    '# y el listado de carpetas. api\lib\ y consola\ tienen su propio .htaccess.'
    '<FilesMatch "^\.">'
    '    Require all denied'
    '</FilesMatch>'
    'Options -Indexes'
)
Set-Content -Path (Join-Path $app '.htaccess') -Value $raizHtaccess -Encoding ascii

# database\: scripts de instalacion y migraciones. Fuera de app\: no van a la carpeta publica.
$database = Join-Path $destino 'database'
New-Item -ItemType Directory -Path $database -Force | Out-Null
foreach ($archivo in 'instalacion_completa.sql', 'schema.sql', 'datos_iniciales.sql', 'trd.sql') {
    Copy-Item -Path (Join-Path $raiz "database\$archivo") -Destination $database
}
Copy-Item -Path (Join-Path $raiz 'database\migraciones') -Destination (Join-Path $database 'migraciones') -Recurse

# docs\: guias en PDF (se generan con: node scripts\generar_manual_pdf.mjs --todos) y INSTALACION.md.
# Cada PDF debe ser mas nuevo que su Markdown, para no entregar una version vieja.
$docs = Join-Path $destino 'docs'
New-Item -ItemType Directory -Path $docs -Force | Out-Null
Copy-Item -Path (Join-Path $raiz 'docs\INSTALACION.md') -Destination $docs
$pdfs = [ordered]@{
    'INSTALACION'        = 'INSTALACION.pdf'
    'GUIA_RAPIDA_PRUEBA' = 'GUIA_RAPIDA_PRUEBA.pdf'
    'GUIA_USO'           = 'Manual_de_usuario_TRDCode.pdf'
}
foreach ($doc in $pdfs.Keys) {
    $md = Join-Path $raiz "docs\$doc.md"
    $pdf = Join-Path $raiz "docs\$doc.pdf"
    if (-not (Test-Path $pdf)) { throw "Falta docs\$doc.pdf: node scripts\generar_manual_pdf.mjs $doc" }
    if ((Get-Item $pdf).LastWriteTime -lt (Get-Item $md).LastWriteTime) { throw "docs\$doc.pdf es mas viejo que su .md: node scripts\generar_manual_pdf.mjs $doc" }
    Copy-Item -Path $pdf -Destination (Join-Path $docs $pdfs[$doc])
}

Copy-Item -Path (Join-Path $raiz '.env.example') -Destination $destino
Copy-Item -Path (Join-Path $raiz 'scripts\paquete\LEEME.txt') -Destination $destino

# ---- Comprobaciones: nada privado dentro del paquete ----
$todos = Get-ChildItem -Path $destino -Recurse -Force -File
$prohibidos = $todos | Where-Object {
    ($_.Name -like '*.env' -or $_.Name -like '.env*' -and $_.Name -ne '.env.example') -or
    $_.Extension -in '.xlsx', '.xls', '.csv', '.json', '.log', '.zip' -or
    $_.Name -eq 'expedientes.sql' -or $_.FullName -like '*datos-prueba*'
}
if ($prohibidos) { throw "El paquete tiene archivos que no deben ir: $($prohibidos.FullName -join ', ')" }

# Los SQL solo crean tablas, centros, dependencias y la TRD: ni cuentas, ni cargas, ni expedientes.
foreach ($sql in Get-ChildItem -Path $database -Recurse -File -Filter '*.sql') {
    $texto = Get-Content -Path $sql.FullName -Raw -Encoding UTF8
    if ($texto -match '(?i)INSERT\s+INTO\s+`?(usuarios|cargas|expedientes|intentos)\b') {
        throw "$($sql.Name) inserta datos en $($Matches[1]): no debe ir en el paquete."
    }
}

# La plantilla del .env va sin contrasena.
$plantilla = Get-Content -Path (Join-Path $destino '.env.example') -Encoding UTF8
if ($plantilla | Where-Object { $_ -match '^\s*DB_PASS\s*=\s*\S' }) { throw '.env.example trae una contrasena.' }

# Los .htaccess no pueden llevar BOM.
foreach ($h in $todos | Where-Object { $_.Name -eq '.htaccess' }) {
    $b = [System.IO.File]::ReadAllBytes($h.FullName)
    if ($b.Length -ge 3 -and $b[0] -eq 0xEF -and $b[1] -eq 0xBB -and $b[2] -eq 0xBF) { throw "$($h.FullName) tiene BOM." }
}
foreach ($necesario in 'app\index.html', 'app\robots.txt', 'app\.htaccess', 'app\api\lib\.htaccess',
    'app\consola\.htaccess', 'app\consola\crear_primera_cuenta.php', 'database\instalacion_completa.sql', 'database\schema.sql',
    'database\datos_iniciales.sql', 'database\trd.sql', 'docs\INSTALACION.md', '.env.example') {
    if (-not (Test-Path -LiteralPath (Join-Path $destino $necesario))) { throw "Falta $necesario en el paquete." }
}

# ---- Zip (con / como separador, para que tambien se abra bien en Linux) ----
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archivoZip = [System.IO.Compression.ZipFile]::Open($zip, 'Create')
try {
    foreach ($f in $todos) {
        $relativa = $nombre + '/' + $f.FullName.Substring($destino.Length + 1).Replace('\', '/')
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archivoZip, $f.FullName, $relativa, 'Optimal') | Out-Null
    }
} finally {
    $archivoZip.Dispose()
}

$tamano = [math]::Round((Get-Item $zip).Length / 1MB, 2)
Write-Host "Listo: $zip ($($todos.Count) archivos, $tamano MB)."
Write-Host "Carpeta sin comprimir: $destino"
