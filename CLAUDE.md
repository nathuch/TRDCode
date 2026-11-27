# TRDCode

Aplicación de consulta de series y subseries documentales (TRD 2020 y 2025) de los tres centros de formación de la Regional Tolima del SENA. Frontend en React + Vite (`frontend/`), API en PHP sin framework (`api/`), MySQL. El plan y el estado de cada fase están en `docs/PLAN_FASES.md`.

## Git y GitHub
- Cada fase se trabaja en su rama (`fase-N-nombre`). Las ramas de fase se pueden subir a GitHub.
- No abrir Pull Requests ni fusionar a `main` sin que el usuario lo pida.
- Nunca crear ni hacer commit de archivos `.xlsx` ni de nada en `datos-prueba/`. El `.env` tampoco va al repositorio. El reporte de OnBase trae nombres de personas: no mostrar títulos de expedientes al inspeccionarlo.
- `gh` no está en el PATH: `C:\Program Files\GitHub CLI\gh.exe`.

## PHP
- En local se usa el PHP de XAMPP (`C:\xampp\php\php.exe`: 8.2.12 en el equipo actual; el `php` del PATH es 8.4 y no se usa). Excepción: el Apache de XAMPP de este equipo carga el PHP 8.4.11 de `C:\php` (con `C:\php\php.ini`); no se cambia porque puede servir a otros proyectos.
- Todo el código PHP debe ser compatible con PHP 8.1. No usar nada de 8.2 en adelante: clases `readonly`, tipos DNF, `true`/`false`/`null` como tipos sueltos, constantes en traits, constantes de clase tipadas, `json_validate()`, `#[\Override]`, etc.
- Intelephense está en `8.1.0` en `.vscode/settings.json`, para que avise si se usa algo más nuevo. Ese archivo no se versiona: cada equipo lo configura.

## Seguridad
- Consultas preparadas (PDO) para todo dato que venga de afuera; nunca concatenar valores en el SQL.
- Contraseñas con `password_hash()` y `password_verify()`; nunca se guardan ni se escriben en claro.
- Los servicios que cambian datos exigen sesión y el token CSRF en la cabecera `X-CSRF-Token`.
- La cookie de sesión es `HttpOnly` y `SameSite=Strict`, y lleva `Secure` solo cuando la petición llega por HTTPS (así funciona por http en local).
- `ocultar_nombres_reservados` está activo por defecto: sin sesión, la API no envía el nombre de los expedientes IPC e IPR (los reemplaza en el servidor). Con sesión iniciada (y sin contraseña temporal pendiente), `datos.php` envía los nombres reales con `Cache-Control: private, no-store` y `Vary: Cookie`, y el frontend vuelve a pedir los datos al ingresar, al salir y al vencer la sesión (#82). A los 29 minutos sin actividad en ninguna pestaña, la página oculta los nombres y cierra la sesión (`frontend/src/utils/inactividad.js`), antes que el servidor (30). Solo se desactiva si el SENA lo autoriza.

## Rutas
- Rutas relativas para que la aplicación funcione en cualquier carpeta del servidor sin volver a compilar: `base: './'` en `frontend/vite.config.js` y llamadas a la API sin barra inicial (`fetch('api/datos.php')`, no `'/api/datos.php'`).

## Configuración y base de datos
- La configuración se edita solo en `.env` (plantilla: `.env.example`). No mostrar sus valores. `api/lib/config.php` lo busca en este orden: la ruta de la variable `TRDCODE_ENV`; junto a la carpeta pública, con el nombre de la carpeta de la aplicación (`C:\xampp\TRDCode.env` para `C:\xampp\htdocs\TRDCode`); y la raíz del proyecto, solo en desarrollo.
- El `.env` nunca va al repositorio ni a la carpeta pública del servidor. Además, el `.htaccess` de la raíz del paquete bloquea cualquier archivo que empiece con punto.
- En local (equipo nuevo desde noviembre de 2026; el anterior fue robado), la base es el MySQL 8.0 del equipo (servicio `MySQL80`, en el puerto 3306) y la aplicación se conecta como `root`. PHP y Apache son los de XAMPP; la MariaDB 10.4 de XAMPP no se usa para desarrollar, pero el paquete debe instalarse también en ella, así que el SQL debe funcionar en MySQL 8.0 y en MariaDB 10.4. `DB_PORT` es opcional en el `.env` (sin él, el puerto por defecto); `config.php` entrega la cadena de conexión en `db_dsn`. En producción se usa un usuario de MySQL propio con solo `SELECT`, `INSERT`, `UPDATE` y `DELETE` sobre la base, nunca `root` (así está en `docs/INSTALACION.md`).
- Prueba en MariaDB 10.4: la MySQL de XAMPP en el puerto 3307 con una carpeta de datos nueva (`C:\xampp\mysql\bin\mysql_install_db.exe --datadir=<carpeta temporal> --port=3307` y `mysqld --defaults-file=<carpeta>\my.ini`), nunca con `C:\xampp\mysql\data` ni en el 3306. Se apaga con `mysqladmin -P 3307 -u root shutdown` y se borra la carpeta.
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
- Primera cuenta: `C:\xampp\php\php.exe consola/crear_primera_cuenta.php --env=<ruta del .env>` (en desarrollo, `--env=.env`). Solo funciona sin cuentas activas; las demás se crean desde "Usuarios" en la aplicación (RF-17). Su prueba: `C:\xampp\php\php.exe scripts/probar_primera_cuenta.php [url]` (crea y borra la base `trdcode_prueba_cuenta`; necesita el `.env` con un usuario que pueda crear bases).
- Instalación de la base en un solo archivo: `node scripts/armar_instalacion_completa.mjs` arma `database/instalacion_completa.sql` (schema + datos iniciales + TRD); hay que volver a correrlo si cambia alguno de los tres. `empaquetar.ps1` se detiene si no está al día.
- Migraciones de la base: `database/migraciones/` (se aplican en orden a una base existente; las bases nuevas ya las traen en `schema.sql`). Deben funcionar en MySQL 8 y MariaDB 10.4 y poder repetirse.
- Desarrollo: en la raíz, `C:\xampp\php\php.exe -S 127.0.0.1:8000 scripts/servidor_dev.php` (solo sirve `api/*.php`), y en `frontend/`, `npm run dev`. Vite reenvía `api/` a ese PHP.
- Pruebas de la sesión: con el servidor de desarrollo encendido, `C:\xampp\php\php.exe scripts/probar_auth.php`; contra Apache, `C:\php\php.exe scripts/probar_auth.php http://localhost/TRDCode` (el mismo PHP de Apache, para la prueba de inactividad). Crea y borra sus propias cuentas temporales; nunca usa la cuenta real.
- Pruebas de las cuentas (RF-17): con el servidor encendido, `C:\xampp\php\php.exe scripts/probar_usuarios.php [url]`. Usa cuentas temporales que borra; el caso "la última cuenta activa" solo corre en la base temporal `trdcode_prueba`.
- Pruebas de la importación: con el servidor encendido, `C:\xampp\php\php.exe scripts/probar_importacion.php [url]`. Usa los expedientes de la carga activa y una cuenta temporal, y deja la base como estaba; no corre si ya hay cargas reemplazadas.
- Pruebas en el navegador: `scripts/pruebas-navegador/` (vea su README): `inicio`, `ingreso`, `vista`, `menus`, `usuarios`, `exportar`, `actualizar` e `instalacion` (P-28, solo en una instalación nueva del paquete) con `node scripts/pruebas-navegador/<prueba>.mjs [url]`. `actualizar.mjs` crea cargas: solo contra la base temporal de `base_temporal.php`, con `TRDCODE_ENV` en ruta completa (con una relativa, `php -S` vuelve al `.env` real).
- Copia en Apache: `C:\xampp\htdocs\TRDCode` (el contenido de `app/` del paquete) con `C:\xampp\TRDCode.env`. Se enciende solo Apache, nunca la MySQL de XAMPP (choca con MySQL80 en el puerto 3306).
- Frontend: `npm run dev` y `npm test` en `frontend/`. Las pruebas con cifras reales leen `datos-prueba/datos.json` (`C:\xampp\php\php.exe api/datos.php > datos-prueba/datos.json`) y se saltan si no existe.
- Expedientes del reporte: `.venv/Scripts/python scripts/generar_expedientes_sql.py` escribe `datos-prueba/expedientes.sql` (no va al repositorio).
- Documentos en PDF: se edita el `.md` de `docs/` y se genera con `node scripts/generar_manual_pdf.mjs [GUIA_USO|INSTALACION|GUIA_RAPIDA_PRUEBA|FICHA_TECNICA|ACTA_ENTREGA]` o `--todos` (usa Edge sin ventana; sin argumento, el manual). Las capturas de `docs/img/` no deben mostrar nombres de personas.
- Paquete de entrega: `powershell -ExecutionPolicy Bypass -File <raíz>\scripts\empaquetar.ps1 [-Version 1.0.0]` arma `paquete/TRDCode-v1.0.0.zip` (ignorado por git) con `app/`, `database/`, `docs/` y `.env.example`, sin datos personales (se detiene si encuentra un `.env`, un Excel, `expedientes.sql` o un `INSERT` de cuentas, cargas o expedientes). La instalación está en `docs/INSTALACION.md`; el `LEEME.txt` del paquete sale de `scripts/paquete/`.
