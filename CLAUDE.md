# TRDCode

Aplicación de consulta de series y subseries documentales (TRD 2020 y 2025) de los tres centros de formación de la Regional Tolima del SENA. Frontend en React + Vite (`frontend/`), API en PHP sin framework (`api/`), MySQL. El plan y el estado de cada fase están en `docs/PLAN_FASES.md`.

## Git y GitHub
- Cada fase se trabaja en su rama (`fase-N-nombre`). Las ramas de fase se pueden subir a GitHub.
- No abrir Pull Requests ni fusionar a `main` sin que el usuario lo pida.
- Nunca crear ni hacer commit de archivos `.xlsx` ni de nada en `datos-prueba/`. El `.env` tampoco va al repositorio. El reporte de OnBase trae nombres de personas: no mostrar títulos de expedientes al inspeccionarlo.
- `gh` no está en el PATH: `C:\Program Files\GitHub CLI\gh.exe`.

## PHP
- En local se usa PHP 8.3 (`C:\xampp\php\php.exe`; el `php` del PATH es 8.4 y no se usa).
- Todo el código PHP debe ser compatible con PHP 8.1. No usar nada de 8.2 en adelante: clases `readonly`, tipos DNF, `true`/`false`/`null` como tipos sueltos, constantes en traits, constantes de clase tipadas, `json_validate()`, `#[\Override]`, etc.
- Intelephense está en `8.1.0` en `.vscode/settings.json`, para que avise si se usa algo más nuevo. Ese archivo no se versiona: cada equipo lo configura.

## Seguridad
- Consultas preparadas (PDO) para todo dato que venga de afuera; nunca concatenar valores en el SQL.
- Contraseñas con `password_hash()` y `password_verify()`; nunca se guardan ni se escriben en claro.
- Los servicios que cambian datos exigen sesión y el token CSRF en la cabecera `X-CSRF-Token`.
- La cookie de sesión es `HttpOnly` y `SameSite=Strict`, y lleva `Secure` solo cuando la petición llega por HTTPS (así funciona por http en local).
- `ocultar_nombres_reservados` está activo por defecto: la API no envía el nombre de los expedientes IPC e IPR. Solo se desactiva si el SENA lo autoriza.

## Rutas
- Rutas relativas para que la aplicación funcione en cualquier carpeta del servidor sin volver a compilar: `base: './'` en `frontend/vite.config.js` y llamadas a la API sin barra inicial (`fetch('api/datos.php')`, no `'/api/datos.php'`).

## Configuración y base de datos
- La configuración se edita solo en `.env` (plantilla: `.env.example`). No mostrar sus valores. `api/lib/config.php` lo busca en este orden: la ruta de la variable `TRDCODE_ENV`; junto a la carpeta pública, con el nombre de la carpeta de la aplicación (`C:\xampp\TRDCode.env` para `C:\xampp\htdocs\TRDCode`); y la raíz del proyecto, solo en desarrollo.
- El `.env` nunca va al repositorio ni a la carpeta pública del servidor. Además, el `.htaccess` de la raíz del paquete bloquea cualquier archivo que empiece con punto.
- En local, la base es el MySQL 8.0 del equipo (servicio `MySQL80`) y la aplicación se conecta como `root`. En producción se usa un usuario de MySQL propio con permisos solo sobre la base, nunca `root`: así debe quedar en `docs/INSTALACION.md`.
- `codigo_subserie` vale `''` (cadena vacía) cuando la serie no tiene subseries, nunca `NULL`: la llave única admite varios `NULL` y dejaría pasar duplicados. Vale igual en la base, en la API y en el frontend.

## Cifras esperadas con el reporte de prueba (10 de agosto)
Sirven para las pruebas; no se cambian.

| Dato | Cifra |
|---|---|
| Filas del Reporte Tolima | 7.531 |
| Expedientes de los tres centros (los que carga la aplicación) | 3.385 |
| Por centro: Industria y Construcción / Comercio y Servicios / Agropecuario La Granja | 1.781 / 1.084 / 520 |
| TRD 11, Industria y Construcción, Formación Profesional | 643 |
| En esa consulta, serie 37 Historias académicas | 308 |
| En esa consulta, subserie 85.18 "No está en la TRD" | 39 |
| En esa consulta, expedientes de la subserie 85.15 | 17 |

## Comandos
- TRD: `.venv/Scripts/python scripts/extraer_trd.py` genera `database/trd.sql`; las correcciones van en `scripts/correcciones.json`.
- Usuaria encargada: `C:\xampp\php\php.exe scripts/crear_usuario.php`.
- Desarrollo: en la raíz, `C:\xampp\php\php.exe -S 127.0.0.1:8000 scripts/servidor_dev.php` (solo sirve `api/*.php`), y en `frontend/`, `npm run dev`. Vite reenvía `api/` a ese PHP.
- Frontend: `npm run dev` y `npm test` en `frontend/`. Las pruebas con cifras reales leen `datos-prueba/datos.json` (`C:\xampp\php\php.exe api/datos.php > datos-prueba/datos.json`) y se saltan si no existe.
- Expedientes del reporte: `.venv/Scripts/python scripts/generar_expedientes_sql.py` escribe `datos-prueba/expedientes.sql` (no va al repositorio).
- Manual de usuario: se edita `docs/GUIA_USO.md` y se genera el PDF con `node scripts/generar_manual_pdf.mjs` (usa Edge sin ventana). Las capturas de `docs/img/` no deben mostrar nombres de personas.
- Paquete del prototipo: `powershell -ExecutionPolicy Bypass -File scripts\armar_prototipo.ps1` arma `prototipo/TRDCode/` (ignorado por git); los pasos de instalación están en `scripts/prototipo/LEEME.txt`.
