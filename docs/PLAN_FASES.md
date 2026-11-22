# Plan de fases de TRDCode

Resumen del plan de desarrollo v3 ("Plan_de_desarrollo_TRDCode.pdf") con los hitos e issues de GitHub y las decisiones tomadas después de escribir el plan. El detalle de cada tarea está en su issue.

Actualizado el 15 de noviembre de 2026.

**Estados:** completa · en curso · sin empezar. Las tareas de una fase se cierran en GitHub cuando su rama se fusiona a `main`; una tarea "completa" de una fase en curso ya está hecha en la rama, pero su issue sigue abierto.

## Resumen

| Fase | Nombre | Hito | Rama | Estado |
|---|---|---|---|---|
| 0 | Entorno de desarrollo | [Fase 0](https://github.com/nathuch/TRDCode/milestone/1) | `main` | completa |
| 1 | Base de datos | [Fase 1](https://github.com/nathuch/TRDCode/milestone/2) | `fase-1-base-datos` (PR #83, fusionada) | completa |
| 2 | Extracción de las TRD | [Fase 2](https://github.com/nathuch/TRDCode/milestone/3) | `fase-2-trd` | en curso |
| 3 | API en PHP | [Fase 3](https://github.com/nathuch/TRDCode/milestone/4) | `fase-3-login` (sale de `mvp-prototipo`) | en curso: todo hecho en la rama, falta fusionar |
| 4 | Importación del Excel | [Fase 4](https://github.com/nathuch/TRDCode/milestone/5) | `fase-4-importacion` | en curso: todo hecho en la rama, falta fusionar |
| 5 | Cruce de expedientes con la TRD | [Fase 5](https://github.com/nathuch/TRDCode/milestone/6) | `main` (MVP) | completa en el código; issues abiertos |
| 6 | Filtros y buscador | [Fase 6](https://github.com/nathuch/TRDCode/milestone/7) | `main` (MVP) y `fase-7-vista` (#39 en celular) | en curso: todo hecho en la rama, falta fusionar |
| 7 | Vista de resultados y ficha | [Fase 7](https://github.com/nathuch/TRDCode/milestone/8) | `fase-7-vista` | en curso: todo hecho en la rama, falta fusionar |
| 8 | Exportar e imprimir | [Fase 8](https://github.com/nathuch/TRDCode/milestone/9) | `fase-8-exportar` | completa, fusionada a `main` (PR #89) |
| 9 | Instalación local y paquete de entrega | [Fase 9](https://github.com/nathuch/TRDCode/milestone/10) | `fase-9-entrega` | completa en `fase-9-entrega`, salvo la prueba con un celular real (#62) |
| 10 | Pruebas con la usuaria y ajustes | [Fase 10](https://github.com/nathuch/TRDCode/milestone/11) | `fase-10-ajustes` | sin empezar |
| 11 | Guía y entrega al SENA | [Fase 11](https://github.com/nathuch/TRDCode/milestone/12) | `main` | sin empezar |

Las fases 3 a 9 siguen "sin empezar" como fases, pero el MVP (rama `mvp-prototipo`) ya adelantó parte de sus tareas: el detalle está en la sección [MVP del prototipo](#mvp-del-prototipo).

## Cambios respecto al plan v3

- **Equipo nuevo desde noviembre de 2026.** El equipo de desarrollo anterior fue robado y se va a formatear; el proyecto se retomó en otro computador desde la rama `mvp-prototipo`. En este equipo:
  - PHP y Apache son los de **XAMPP 8.2.12** (PHP 8.2.12 en `C:\xampp\php\php.exe`). El `php` del PATH es 8.4 y no se usa.
  - Ojo: el Apache de XAMPP de este equipo **no carga el PHP de XAMPP**, sino el **PHP 8.4.11 de `C:\php`** (`LoadModule php_module "C:/php/php8apache2_4.dll"` en `httpd-xampp.conf`, con `C:\php\php.ini`). No se cambió porque puede servir a otros proyectos de `htdocs`. Así, la aplicación queda probada en PHP 8.2 (`php -S`) y 8.4 (Apache); la prueba con PHP 8.1 sigue pendiente (Fase 9).
  - La base de datos corre en el **MySQL 8.0 del equipo (servicio `MySQL80`, 8.0.41)**, que ocupa el puerto 3306; la MariaDB 10.4 de XAMPP no se usa aquí. El paquete del prototipo, en cambio, se instala con la MariaDB de XAMPP, así que el SQL debe funcionar en MySQL 8.0 y en MariaDB 10.4.
  - `api/lib/config.php` lee un puerto opcional (`DB_PORT`, desde la Fase 9); sin él, la conexión usa el puerto por defecto.
  - Node.js es 20.20.0; vitest 5 pide 22.12 o más nuevo y `npm install` lo avisa, pero las pruebas pasan. Actualizar Node queda pendiente.
- **PHP 8.3 en local, código compatible con PHP 8.1.** Se desarrolló con el PHP 8.3 de XAMPP (en el equipo nuevo es 8.2.12), pero el código no usa nada de PHP 8.2 en adelante, para cumplir el mínimo de PHP 8.1 del plan (RNF-04 y prueba P-29). Intelephense está configurado en 8.1 para avisarlo.
- **El `.env` nunca va al repositorio ni a la carpeta pública.** En producción queda fuera de la carpeta pública y su ruta se indica con la variable `TRDCODE_ENV`.
- **En producción se usa un usuario de MySQL propio, nunca `root`**, con permisos solo sobre la base. Así debe quedar en `docs/INSTALACION.md` (#64).
- **Pull Requests y fusiones a `main` solo cuando el usuario lo indique.** Las ramas de fase sí se suben a GitHub.
- **MySQL 8.0** del equipo local en lugar de la MariaDB de XAMPP para desarrollar. phpMyAdmin no se usa en desarrollo; la base se revisa con MySQL Workbench. El LEEME del prototipo sí usa phpMyAdmin, porque el equipo de demostración solo tiene XAMPP.
- **Configuración en `.env`** (ignorado por git) con la plantilla `.env.example`. `api/lib/config.php` ya no guarda datos y busca el `.env` en este orden:
  1. La ruta de la variable de entorno `TRDCODE_ENV`.
  2. Junto a la carpeta pública, con el nombre de la carpeta de la aplicación: con la aplicación en `C:\xampp\htdocs\TRDCode`, el archivo es `C:\xampp\TRDCode.env`. Así se instala el prototipo.
  3. La raíz del proyecto, solo en desarrollo.
- **En local la aplicación se conecta como `root`**: el usuario `trdcode_app` (#4) se cerró sin hacer en el equipo local.
- **`scripts/crear_usuario.php`** creaba la usuaria encargada o cambiaba su contraseña sin mostrarla y guardaba solo el hash; reemplazó el `php -r` del plan. En la Fase 9 lo reemplazó `consola/crear_primera_cuenta.php`, que va en el paquete.
- **El correo con los requisitos al SENA (#7)** pasó de la Fase 1 a la Fase 11, para hacerlo al final.
- **Columna `grupo` en `trd_tipos_documentales`**: guarda el subtítulo de la TRD 11 bajo el que aparece cada tipo documental (por ejemplo "Modalidad Licitación Pública" en los contratos).
- **El "Reporte Tolima" de OnBase es la fuente de expedientes.** No se sube al repositorio.
- **La propuesta de pantallas** no está en el repositorio; las decisiones de diseño quedaron en los issues #27, #39, #43 y #49.
- **Prototipo (MVP) antes de terminar las fases.** Se armó una versión de solo consulta para mostrarla a la usuaria; ver la sección siguiente.
- **RF-17, usuarios editables (nuevo requisito).** Las cuentas se administran desde la aplicación ("Usuarios" y "Mi cuenta"); la primera cuenta se crea por consola (`consola/crear_primera_cuenta.php` desde la Fase 9). Ver la sección "RF-17".
- **Paquete de entrega sin datos personales (Fase 9).** El zip no trae expedientes, reportes, cuentas ni `.env`: la base se instala con la TRD y la encargada hace la primera carga desde "Actualizar datos". `database/` y `docs/` quedan fuera de la carpeta pública (`app/`).

---

## MVP del prototipo

Versión de **solo consulta** para mostrar a la usuaria e instalar en un equipo de demostración con XAMPP. No tiene inicio de sesión ni carga de reportes desde la pantalla.

- **Rama:** `mvp-prototipo`, que sale de `fase-2-trd`. Se fusionó a `main` con el PR #84 (5 de noviembre de 2026).
- **Etiquetas** (puntos de respaldo, en GitHub):
  - `mvp-v1` (`a6d3955`): MVP antes del rediseño de la interfaz.
  - `mvp-v2` (`77ba212`): MVP con el rediseño de la interfaz y el manual de usuario.
- **Paquete:** `scripts/armar_prototipo.ps1` armaba `prototipo/TRDCode/` (ignorado por git) con los pasos de `scripts/prototipo/LEEME.txt`; el `.env` y `expedientes.sql` se entregaban aparte. En la Fase 9 los reemplazaron `scripts/empaquetar.ps1` y `docs/INSTALACION.md`.

**Qué incluye**
- `api/datos.php`: un solo JSON público con centros, dependencias, la TRD con sus tipos documentales y los expedientes de la carga activa. Los nombres de los expedientes que no son IPU se reemplazan en el servidor por "Nombre reservado (IPC/IPR)".
- Carga de expedientes por script: `scripts/generar_expedientes_sql.py` convierte el Reporte Tolima en `datos-prueba/expedientes.sql` (no va al repositorio), con una carga activa y un usuario técnico inactivo que la registra.
- Cruce con la TRD, filtros en cascada (TRD → centro → dependencia → serie → subserie, más el año) y buscador, todo en el navegador.
- Interfaz: barra de consulta con buscador, versión de la TRD, panel de filtros plegable y etiquetas de lo consultado; total, pestañas (Todas, Con expedientes, Sin expedientes, Fuera de la TRD), aviso de lo que no está en la TRD y tabla agrupada por serie; ficha lateral con retención, disposición, tipos documentales, procedimiento y expedientes.
- Exportación a Excel con tres hojas y la consulta guardada en la dirección (`#centros=…&ficha=…`).
- Servidor de desarrollo de PHP que solo sirve `api/*.php` (`scripts/servidor_dev.php`).
- Manual de usuario (`docs/GUIA_USO.md` y su PDF).

**Qué quedó por fuera:** inicio de sesión, CSRF y límite de intentos; importar el Excel desde la pantalla, historial de cargas y volver a una carga anterior; exportar a PDF e imprimir; `docs/INSTALACION.md` y la prueba con PHP 8.1.

**Tareas de las fases 3 a 9 hechas en `mvp-prototipo`.** Sus issues siguen abiertos: se cierran cuando se haga cada fase.

| Fase | Issue | Tarea | En el MVP |
|---|---|---|---|
| 3 | #15 | `api/lib/db.php` | hecha |
| 3 | #16 | `api/lib/respuesta.php` | hecha |
| 3 | #20 | `api/datos.php` | hecha (sin nombres IPC e IPR) |
| 3 | #21 | Copia en el Apache de XAMPP | parcial: paquete del prototipo para `htdocs/TRDCode` (se instaló y probó en `fase-3-login`) |
| 3 | #23 | `frontend/src/api/cliente.js` | parcial: solo `obtenerDatos()` (se completó en `fase-3-login`) |
| 3 | #17, #18, #19, #22 | Sesión, CSRF, login, logout, cambio de clave y pruebas de la API | no (se hicieron en `fase-3-login`) |
| 4 | #24 a #33 | Importación desde la pantalla | no; la reemplaza `generar_expedientes_sql.py` (normaliza como el plan y da los 3.385 expedientes). Se hizo en `fase-4-importacion` |
| 5 | #34, #35, #36 | `cruce.js`: `armarIndice()`, cuatro estados y `resumen()` | hechas |
| 5 | #37 | Cargar los datos en `App.jsx` | hecha |
| 5 | #38 | Pruebas de `cruce.js` (A-06 a A-08) | hecha |
| 6 | #39, #40 | Estructura de la página y estado de los filtros en `App.jsx` | #40 hecha; #39 completada en `fase-7-vista` (ver la Fase 6) |
| 6 | #41, #42 | `opcionesDisponibles()` y `aplicarFiltros()` | hechas |
| 6 | #43 | Panel de filtros | hecha, como `BarraConsulta.jsx` y `SelectorMultiple.jsx` |
| 6 | #44 | Buscador | hecha |
| 6 | #45 | Pruebas de `filtros.js` (A-09, A-10) y rendimiento | hecha |
| 7 | #46 | Resumen | hecha de otra forma: total y pestañas en `App.jsx`, sin tarjetas |
| 7 | #47, #48, #49, #50 | Tabla, aviso de lo que no está en la TRD, ficha y "Datos al [fecha]" | hechas; #49 se completó en `fase-7-vista` (ver la Fase 7) |
| 7 | #51, #52 | Vista para celular y accesibilidad | completadas en `fase-7-vista` (ver la Fase 7) |
| 8 | #53, #54 | `exportar.js` y Excel con tres hojas | hechas |
| 8 | #55, #56 | PDF e impresión | no |
| 8 | #57 | Probar las exportaciones | parcial: pruebas del Excel |
| 9 | #58 | Frontend con rutas relativas | hecha |
| 9 | #60 | `robots.txt` y `.htaccess` de `api/lib` | hecha |
| 9 | #63 | Script de empaquetado | parcial: `armar_prototipo.ps1` en lugar de `empaquetar.ps1` (se hizo en `fase-9-entrega`) |
| 9 | #64 | `docs/INSTALACION.md` | no; el prototipo trae `LEEME.txt` (se hizo en `fase-9-entrega`) |

De la Fase 11, `docs/GUIA_USO.md` (#72) ya existe como manual del prototipo.

---

## Fase 0 – Entorno de desarrollo · completa

**Objetivo:** dejar listo el equipo, el repositorio y el proyecto base con sus dos partes.
**Requisitos:** RNF-04, RNF-07 y RNF-10.

| Issue | Tarea | Estado |
|---|---|---|
| — | Node.js, Git, VS Code, Python 3 y XAMPP con PHP 8.3 (Intelephense en 8.1) | completa |
| — | Repositorio en GitHub con GitHub CLI y carpetas `frontend/`, `api/`, `database/`, `scripts/`, `docs/` | completa |
| — | Frontend con Vite + React, SheetJS, jsPDF, jspdf-autotable y Vitest; `vite.config.js` con `base: './'` y proxy a `api/` | completa |
| — | Entorno de Python `.venv` con pdfplumber | completa |
| — | `.gitignore` y los seis PDF en `scripts/trd-pdf/` (commits `579065d` y `f4a1919`) | completa |

**Criterios de aceptación**
- [x] `npm run dev` abre la página base y `npm test` corre sin errores.
- [x] `php -S localhost:8000` responde.
- [x] `git status` no muestra archivos `.xlsx`, `.env` ni `config.php` con datos.

## Fase 1 – Base de datos · completa

**Objetivo:** crear la base de datos local con sus ocho tablas, los centros, las dependencias y la usuaria encargada.
**Requisitos:** RF-12, RF-14, RNF-04, RNF-06 y RNF-09.

| Issue | Tarea | Estado |
|---|---|---|
| #1 | Crear la base de datos trdcode | completa |
| #2 | Escribir `database/schema.sql` con las ocho tablas | completa |
| #3 | Escribir `database/datos_iniciales.sql` con centros y dependencias | completa |
| #4 | Crear el usuario de MySQL `trdcode_app` | completa (cerrada sin hacer: en local se usa `root`) |
| #5 | Crear el `.env` y su plantilla `.env.example` | completa |
| #6 | Crear la usuaria encargada con el hash de su contraseña (`scripts/crear_usuario.php`) | completa |

**Criterios de aceptación**
- [x] Las ocho tablas existen con `utf8mb4_unicode_ci`, y la base también.
- [x] Los 3 centros y las 8 dependencias están cargados (La Granja sin Administración Educativa).
- [x] La usuaria encargada existe con su contraseña guardada como hash.
- [x] El `.env` no está en el repositorio.

## Fase 2 – Extracción de las TRD · en curso

**Objetivo:** pasar los seis PDF de las TRD a la base de datos.
**Requisitos:** RF-01, RF-06, RF-07 y RNF-08.

| Issue | Tarea | Estado |
|---|---|---|
| #8 | Revisar la estructura de los seis PDF de las TRD | completa |
| #9 | Crear `scripts/extraer_trd.py` | completa |
| #10 | Normalizar plantilla, códigos y versión en el extractor | completa |
| #11 | Generar `scripts/salida/trd.json` y `database/trd.sql` | completa |
| #12 | Validar la extracción contra los PDF y el reporte de OnBase | completa (revisión manual en `docs/revision_trd.md`) |
| #13 | Registrar los casos especiales en `scripts/correcciones.json` | completa |
| #14 | Importar `trd.sql` y comprobar los conteos | completa |

**Criterios de aceptación**
- [x] Las seis TRD están en MySQL: 109 series y subseries y 4.281 tipos documentales.
  - Nota: antes eran 4.283. Los 2 que salieron eran títulos en cursiva que se contaban como tipos documentales, en las páginas 8 y 23 de la TRD 2020 de Formación Profesional ("Extensión/ ampliación, modificación Registro Calificado" en la serie 63 e "Identificación del perfil del emprendedor" en la subserie 60.04).
- [x] Los códigos de serie y subserie coinciden con un conteo independiente hecho sobre cada PDF.
- [x] En la TRD 11, los tipos documentales coinciden con las viñetas del PDF (salvo dos viñetas sin texto en la TRD de la Subdirección, págs. 45 y 47).
- [x] Del reporte de agosto, solo la subserie 85.18 queda fuera de la TRD.
- [x] La revisión manual de al menos diez registros por PDF no tiene errores (`docs/revision_trd.md`: 55 registros; los 2 errores, títulos en cursiva pegados a un tipo, se corrigieron en el extractor).

## Fase 3 – API en PHP · en curso

**Objetivo:** construir los servicios de consulta, sesión y contraseña, y probarlos desde ya en Apache.
**Requisitos:** RF-12, RF-13, RF-15, RNF-04, RNF-06 y RNF-09.
**Rama:** `fase-3-login`, que sale de `mvp-prototipo` (las tareas #15, #16 y #20 llegaron con el MVP).

| Issue | Tarea | Estado |
|---|---|---|
| #15 | Crear `api/lib/db.php` | completa (MVP) |
| #16 | Crear `api/lib/respuesta.php` | completa (MVP; en `fase-3-login` suma `exigirMetodo()` y datos extra en los errores) |
| #17 | Crear `api/lib/auth.php` con sesión, CSRF y límite de intentos | completa |
| #18 | Crear `api/login.php` | completa |
| #19 | Crear `api/logout.php`, `api/sesion.php` y `api/cambiar_clave.php` | completa |
| #20 | Crear `api/datos.php` | completa (MVP) |
| #21 | Instalar una copia en el Apache de XAMPP desde esta fase | completa (ver abajo) |
| #22 | Probar los servicios de la API con sus casos de error | completa (`scripts/probar_auth.php`) |
| #23 | Crear `frontend/src/api/cliente.js` | completa |

**Cómo quedó el inicio de sesión**
- Cookie `TRDCODE_SESION`, `HttpOnly` y `SameSite=Strict`, con `Secure` solo por HTTPS y limitada a la carpeta de la aplicación. La sesión solo se abre si llega la cookie: la consulta pública no crea sesiones.
- Al entrar se regenera el id de sesión y se crea un token CSRF nuevo. La sesión se cierra tras 30 minutos sin actividad, o en la siguiente petición si la usuaria se desactiva.
- `login.php` solo acepta POST con JSON y solo deja entrar usuarios activos. Ante cualquier fallo responde 401 "Correo o contraseña incorrectos." (si el correo no existe, igual verifica contra un hash ficticio, para no delatarlo por el tiempo de respuesta).
- **Regla de bloqueo** (en los últimos 15 minutos, contando la tabla `intentos_login`):
  - 5 fallos de la **misma pareja correo + IP** bloquean esa pareja 15 minutos.
  - 20 fallos desde **una misma IP, con cualquier correo**, bloquean esa IP 15 minutos.
  - **No hay bloqueo solo por correo**: así nadie puede bloquear a la encargada sabiendo su correo, ni la bloquean los errores de otros funcionarios que salen por la misma IP.
  - El bloqueo dura hasta 15 minutos después del fallo que completó la cuenta. Responde 429 con el tiempo que falta (`espera_segundos` y la cabecera `Retry-After`). Los fallos de la contraseña actual en `cambiar_clave.php` también cuentan.
- Códigos: 401 sin sesión, 403 sin token CSRF válido en `X-CSRF-Token`, 405 con otro método, 415 si no llega JSON y 429 con bloqueo. Los errores internos van a `error_log`, sin contraseñas ni hashes.
- `cambiar_clave.php` pide la actual y una nueva de 10 a 72 caracteres (bcrypt ignora lo que pase de 72 bytes), distinta de la actual.
- Frontend: enlace discreto "Ingresar" en el encabezado (`Acceso.jsx`); con sesión, el nombre de la usuaria abre un menú con "Cambiar contraseña" y "Salir". Los formularios (`DialogoIngreso.jsx`, `DialogoClave.jsx` sobre `Dialogo.jsx`) tienen etiquetas, foco visible, Enter envía, Esc cierra y el foco no sale de la ventana. La consulta no cambia.
- Pruebas: `C:\xampp\php\php.exe scripts/probar_auth.php [url]` hace 51 comprobaciones con cuentas temporales que crea y borra; no usa la cuenta real. Sin `url` prueba el servidor de desarrollo (`http://127.0.0.1:8000`); con `http://localhost/TRDCode`, Apache. La prueba de inactividad modifica el archivo de la sesión, así que debe correrse con el mismo PHP del servidor: con Apache, `C:\php\php.exe` (ver "Equipo nuevo").

**Copia en Apache (#21)**, el 15 de noviembre de 2026, siguiendo `scripts/prototipo/LEEME.txt`:
- `scripts/armar_prototipo.ps1` armó el paquete y se copió a `C:\xampp\htdocs\TRDCode` (el paquete anterior quedó en `prototipo/TRDCode-mvp-v2`).
- La base es la de MySQL80, ya cargada; no se usaron phpMyAdmin ni la MySQL de XAMPP, que choca con MySQL80 en el puerto 3306. El `.env` del proyecto se copió como `C:\xampp\TRDCode.env`, fuera de `htdocs`.
- Resultado: `datos.php` responde lo mismo en Apache que con `php -S` (mismo SHA-256); `probar_auth.php` pasa las 51 comprobaciones en los dos; la interfaz entra, cambia la contraseña y sale en Apache (prueba en Edge sin ventana).
- Descargas bloqueadas en Apache: `.env` (con un archivo ficticio puesto a propósito y borrado después), `.env.example`, `.htaccess`, `api/lib/` y sus archivos, `api/` y `database/` responden 403; `datos-prueba/` no está en el paquete (404); `C:\xampp\TRDCode.env` queda fuera de la carpeta pública (404). Con `php -S`, `.env`, `api/lib/` y `datos-prueba/` responden 404.

**Criterios de aceptación**
- [x] `datos.php` devuelve la TRD completa y sin nombres reservados (IPC e IPR). Sigue siendo público y no crea sesión.
- [x] El inicio de sesión funciona y se bloquea durante 15 minutos tras cinco intentos fallidos (de la misma pareja correo + IP; o 20 desde una IP).
- [x] Un servicio protegido responde 401 sin sesión.
- [x] Todo responde igual en Apache que con `php -S`.
- [x] El `.env` no se puede descargar desde el navegador, ni con `php -S` ni con Apache.

## Pantalla de inicio (antes de la Fase 4) · completa en `fase-3-login`

La aplicación ya no abre con todos los resultados a la vista.

- **Inicio** (dirección sin filtros, búsqueda ni ficha): el mismo encabezado con "Ingresar" o el menú de la usuaria; "¿Qué serie o subserie busca?" con el buscador grande, el botón Buscar y el selector TRD 11 · vigente / TRD 10 · 2020; una tarjeta por centro (Industria y Construcción, Comercio y Servicios, Agropecuario La Granja) con "Ver series"; el enlace "Ver todas las series" y, abajo, "Datos al [fecha de la carga activa]". Sin tabla, totales ni panel de filtros (`components/Inicio.jsx`).
- **Paso a la consulta:** buscar (Enter o Buscar), elegir un centro o "Ver todas" abre la consulta con ese filtro y con la TRD elegida. Las tarjetas y "Ver todas" son enlaces reales (`#centros=73.9226`, `#consulta`): se pueden abrir en otra pestaña. El paso crea una entrada en el historial: "atrás" vuelve al inicio y "adelante" a la consulta. El título del encabezado (TRDCode) también es un enlace al inicio. Al cambiar de vista, el foco pasa al título de la vista nueva.
- **Direcciones:** `estadoUrl.js` decide la vista (`leerUrl()` devuelve `vista`: inicio o consulta). Una dirección con filtros, búsqueda o ficha abre directo la consulta, así que los enlaces compartidos siguen funcionando. La consulta completa sin filtros se guarda como `#consulta`, para no volver al inicio al recargar.
- **Pruebas:** `estadoUrl.test.js` (10 pruebas de la decisión inicio/consulta y del hash; `npm test` pasa con 31). En el navegador (Edge sin ventana), 35 comprobaciones en desarrollo y en la copia de Apache: tarjetas en orden, enlaces reales, atrás/adelante, título del encabezado, búsqueda con Enter y con el botón, TRD 10, enlace compartido con la ficha de 85.15 (643), teclado y celular sin desplazamiento horizontal.

## Fase 4 – Importación del Excel · en curso

**Objetivo:** que la encargada cargue el reporte de OnBase, vea antes qué filas tienen problemas y pueda volver a una carga anterior.
**Requisitos:** RF-12, RF-13, RF-14, RF-16, RNF-05 y RNF-06.
**Rama:** `fase-4-importacion`, que sale de `main` después del PR #85.

| Issue | Tarea | Estado |
|---|---|---|
| #24 | Crear `frontend/src/datos/leerExcel.js` | completa |
| #25 | Crear `frontend/src/datos/normalizar.js` | completa |
| #26 | Escribir las pruebas de `normalizar.js` (A-01 a A-05) | completa |
| #27 | Crear `frontend/src/components/ActualizarDatos.jsx` | completa |
| #28 | Crear `api/lib/validar.php` | completa |
| #29 | Crear `api/importar_iniciar.php` | completa |
| #30 | Crear `api/importar_lote.php` | completa |
| #31 | Crear `api/importar_finalizar.php` | completa |
| #32 | Crear `api/cargas.php` y `api/restaurar_carga.php` | completa |
| #33 | Probar la importación completa | completa (`scripts/probar_importacion.php` y prueba en el navegador) |

**Cómo quedó la importación**
- **Lectura** (`leerExcel.js`): solo `.xlsx` de hasta 15 MB; si faltan columnas obligatorias, dice cuáles. SheetJS se carga solo al usarlo. Las celdas de texto se leen del XML original de la celda (como el script de Python), porque el valor procesado de SheetJS cambia `\r\n` por `\n`: con eso el reporte de agosto da exactamente lo mismo que `expedientes.sql`.
- **Normalización** (`normalizar.js`): las mismas reglas de `scripts/generar_expedientes_sql.py`, en el mismo orden (tres centros, dependencia con o sin puntos, serie y subserie, fecha desde el número de Excel o texto, IPU/IPC/IPR, recortes por caracteres). Los códigos repetidos no se cargan en ninguna de sus filas, igual que en el script, pero cada fila queda marcada con su número y las demás filas donde aparece.
- **Pantalla** (`ActualizarDatos.jsx`, `#actualizar`, solo con sesión; opción "Actualizar datos" del menú): 1. archivo y fecha del reporte (se propone la del nombre del archivo); 2. vista previa sin cargar nada: filas, expedientes por centro, descartadas de otros centros, aviso de lo que no está en la TRD (no impide cargar) y tabla de filas con problemas con fila, código y motivo, nunca el título; 3. carga en lotes de 500 con barra de progreso; 4. resultado con la nueva fecha "Datos al…", y la consulta se recarga. Debajo, el historial (la activa y las 2 anteriores, con fecha, quién y cantidad) con "Volver a esta carga" y confirmación. El historial va siempre por fecha de carga, de la más reciente a la más antigua: al volver a una carga solo se mueve la etiqueta "En uso", no las filas. Como dos cargas pueden tener la misma fecha de datos, el cuadro de confirmación y el mensaje identifican la carga por fecha y hora de carga, quién la hizo y fecha de datos ("La consulta volvió a la carga del 15 de nov de 2026, 10:57 a. m. (Carga inicial del prototipo), con datos al 10 de agosto de 2026").
- **API:** el servidor revalida todo (`lib/validar.php`). `importar_iniciar.php` crea la carga `en_proceso` y pasa a `fallida` (borrando sus expedientes) toda carga en proceso sin actividad por más de 30 minutos. `importar_lote.php` acepta hasta 500, solo para una carga en proceso de la misma sesión y usuaria, en una transacción; si un expediente es inválido o ya se recibió, rechaza el lote entero y señala fila, código y motivo. `importar_finalizar.php` comprueba que llegaron todos y, en una transacción, activa la nueva, pasa la anterior a `reemplazada` y borra lo más viejo que la activa y las 2 anteriores (y las fallidas); si faltan expedientes, la carga pasa a `fallida`. `cargas.php` (GET con sesión) y `restaurar_carga.php` (sesión y CSRF; solo activa una `reemplazada`). Todo lo que cambia datos exige sesión y CSRF. `datos.php` sigue público y solo lee la carga activa, así que una importación a medias o cortada no cambia lo que se ve. Los errores en `error_log` omiten los valores citados por MySQL, para no registrar partes de títulos.
- **Pruebas:**
  - `npm test`: 45 pruebas; 14 nuevas de lectura y normalización (A-01 a A-05, formato, tamaño, columnas, fecha del nombre) y la comparación del reporte real con `expedientes.sql` campo por campo (se salta si no están los archivos de `datos-prueba/`).
  - `C:\xampp\php\php.exe scripts/probar_importacion.php [url]`: 56 comprobaciones, en desarrollo y en Apache. Envía por la API los expedientes de la carga activa (los del reporte de agosto) y deja la base como estaba; no corre si ya hay cargas reemplazadas, para no tocar un historial real.
  - En el navegador (desarrollo y Apache), con el `.xlsx` real: rechazo de otros formatos, fecha propuesta, vista previa (7.531 filas, 3.385 expedientes, 4.146 descartadas, aviso de 85.18 con 119), rechazo de una fecha futura sin cambiar la consulta, barra de progreso, resultado, historial, volver a la carga anterior con confirmación y celular.
  - El borrado de cargas viejas se probó aparte, en una base temporal (`trdcode_prueba`, borrada después): tras cuatro importaciones quedan siempre la activa y las 2 anteriores.

**Criterios de aceptación**
- [x] Al importar el reporte de agosto quedan 3.385 expedientes en la carga activa: Industria y Construcción 1.781, Comercio y Servicios 1.084 y Agropecuario La Granja 520 (y los mismos conteos por serie y subserie: 643, 308, 85.18 con 39 y 85.15 con 17).
- [x] Las pruebas de Vitest pasan.
- [x] Una importación cortada no cambia los datos que se ven.
- [x] "Volver a esta carga" recupera la carga anterior.

> **Revisión del 15 de noviembre de 2026.** Las Fases 5, 6 y 7 se revisaron contra el código de `main` (todo llegó con el MVP y está fusionado con el PR #84). Las pruebas citadas son de `npm test` (`cruce.test.js`, `filtros.test.js`, `exportar.test.js`, `estadoUrl.test.js`) salvo cuando dice "navegador": esas comprobaciones se hicieron en Edge sin ventana con scripts de prueba que no están en el repositorio (auditoría de solo lectura de la consulta, celular de 390 px y pruebas de la pantalla de inicio). Los issues siguen abiertos en GitHub.
> Después, en `fase-7-vista`, se completaron #39 (con la decisión de la usuaria), #49, #51, #52 y lo pendiente de #27; las pruebas en el navegador sumaron los casos de teclado y de celular a 390 px, y quedaron versionadas en `scripts/pruebas-navegador/` (inicio, ingreso, vista, menus y actualizar; 122 comprobaciones, sin datos reales). Los menús desplegables (el de la usuaria y los selectores de filtros) se encajan al abrirse para quedar completos en la pantalla, alineados a su botón y sin pasar los márgenes, a 320, 390, 768 px y en computador; a 768 px la tabla de resultados cabe sin desplazarse de lado, y a 320 px la tarjeta pone la disposición en su propia línea.

## Fase 5 – Cruce de expedientes con la TRD · completa en `main` (MVP)

**Objetivo:** unir cada expediente con su serie o subserie de la TRD y calcular los conteos.
**Requisitos:** RF-06 y RF-08.

| Issue | Tarea | Estado | Prueba |
|---|---|---|---|
| #34 | Crear `frontend/src/datos/cruce.js` con `armarIndice()` | hecha (devuelve una lista de entradas en lugar de un `Map`) | A-07 y "un código que no está en la TRD se muestra con el nombre del reporte" (`cruce.test.js`) |
| #35 | Clasificar cada entrada en sus cuatro estados | hecha (`clasificar()`: con, sin, sin en el período, fuera de la TRD) | A-06 (85.18 fuera de la TRD) y A-08 (`cruce.test.js`) |
| #36 | Crear `resumen()` para las tarjetas de totales | hecha; lo usa el total de la consulta (las tarjetas se reemplazaron, ver #46) | A-06: 643 con `resumen()` |
| #37 | Cargar los datos en `App.jsx` | hecha: `obtenerDatos()` al abrir, "Cargando datos…" y el índice con `useMemo` | navegador: la consulta carga 2.530 expedientes |
| #38 | Escribir las pruebas de `cruce.js` (A-06 a A-08) | hecha | `cruce.test.js` |

**Criterios de aceptación**
- [x] El Grupo de Formación Profesional de Industria y Construcción con TRD 11 suma 643 expedientes. *(A-06)*
- [x] La serie 37 Historias académicas tiene 308. *(A-06)*
- [x] La subserie 85.18 aparece como "No está en la TRD" con 39. *(A-06)*
- [x] La Granja no muestra series de la plantilla 00.9000.2. *(A-07, con datos de ejemplo y con el reporte real)*

## Fase 6 – Filtros y buscador · en curso (todo hecho; #39 en `fase-7-vista`)

**Objetivo:** construir el panel de filtros en cascada y el buscador.
**Requisitos:** RF-01 a RF-05 y RNF-03.

| Issue | Tarea | Estado | Prueba |
|---|---|---|---|
| #39 | Maquetar la estructura general de la página | hecha, con la **decisión de la usuaria del 15 de noviembre de 2026** (anotada en el issue): se mantiene el panel de filtros **arriba de la tabla**, el diseño aprobado del MVP, que reemplaza la columna lateral del issue. En computador arranca abierto; en celular (hasta 640 px) arranca **cerrado**, con el botón "Filtros" y su contador visibles, y la tabla empieza en la primera pantalla. El título y "Actualizar datos" (en el menú de la usuaria) también cambiaron con el MVP | navegador: panel abierto a 1.280 px; cerrado a 390 px con "Filtros" y su contador en la primera pantalla |
| #40 | Guardar el estado de los filtros en `App.jsx` | hecha (`ESTADO_INICIAL` en `filtros.js`; además se guarda en la dirección) | A-09; `estadoUrl.test.js` |
| #41 | Crear `opcionesDisponibles()` en `datos/filtros.js` | hecha | P-02 (`filtros.test.js`) |
| #42 | Crear `aplicarFiltros()` en `datos/filtros.js` | hecha; la usan la tabla y las exportaciones | P-03, P-05 (`filtros.test.js`); P-09 (`exportar.test.js`) |
| #43 | Crear `frontend/src/components/Filtros.jsx` | hecha como `BarraConsulta.jsx`, `SelectorMultiple.jsx` y `SelectorTrd.jsx`: TRD segmentada con `fieldset` y radios, desplegables con casillas ("Todos los centros", el nombre o "2 centros"), año como botones, limpieza de los dependientes y el texto de ayuda. Diferencia menor: "Limpiar filtros" se ve siempre, no solo con filtros aplicados | A-09; navegador |
| #44 | Implementar el buscador | hecha: sin tildes ni mayúsculas, código y nombre de serie, subserie y expediente, 300 ms después de la última tecla, y aviso con botón para la otra versión | A-10, P-04 (`filtros.test.js`) |
| #45 | Escribir las pruebas de `filtros.js` (A-09 y A-10) y medir el rendimiento | hecha | A-09, A-10 y RNF-03/P-27 (cada cambio de filtro en menos de un segundo con 3.385) |

**Criterios de aceptación**
- [x] Cada filtro solo muestra opciones que existen con los anteriores. *(P-02)*
- [x] El buscador encuentra por código y nombre, y avisa si hay resultados en la otra versión de la TRD. *(A-10, P-04)*
- [x] Con los 3.385 expedientes, cada cambio de filtro responde en menos de un segundo. *(RNF-03)*

## Fase 7 – Vista de resultados y ficha · en curso (todo hecho en `fase-7-vista`)

**Objetivo:** mostrar las series y subseries filtradas y la ficha de cada subserie con su listado de expedientes.
**Requisitos:** RF-06, RF-07, RF-08, RF-13 y RNF-02.

| Issue | Tarea | Estado | Prueba |
|---|---|---|---|
| #46 | Crear `frontend/src/components/Resumen.jsx` | hecha de otra forma (rediseño del MVP): sin las cuatro tarjetas; el total grande y las pestañas Todas / Con / Sin / Fuera de la TRD, cada una con su número | navegador |
| #47 | Crear `frontend/src/components/TablaResultados.jsx` | hecha: agrupada por serie (grupos plegables), disposición con sigla y nombre completo, etiquetas de estado y orden por código. La retención va en una columna ("2 + 8 años") en lugar de AG y AC por separado | P-09 (las filas de la pantalla); navegador |
| #48 | Mostrar el aviso de subseries que no están en la TRD | hecha (recuadro amarillo con código, nombre y cantidad) | A-06 (85.18); navegador |
| #49 | Crear `frontend/src/components/Ficha.jsx` | hecha: panel a la derecha, pantalla completa en celular, Esc y ×, **"N expedientes" en el encabezado**, retención con cuándo empieza a contar, disposición, clasificación, soporte, tipos documentales, listado en páginas de 50 del más reciente al más antiguo, "Nombre reservado (IPC/IPR)", **el control de acceso de cada expediente** ("Público", "Clasificado" o "Reservado", con candado en los dos últimos) y "Exportar a Excel". "Exportar a PDF" e "Imprimir" se hicieron en la Fase 8 | navegador: 85.15 con "17 expedientes" y 17 "Clasificado" con candado; 37 con "Público" sin candado |
| #50 | Mostrar "Datos al [fecha]" de la carga activa | hecha (en la consulta y abajo en el inicio) | navegador: "Datos al 10 de agosto de 2026" |
| #51 | Ajustar la vista para celular | hecha. En pantallas de hasta 640 px la tabla de resultados pasa a **tarjetas**, sin desplazamiento lateral: arriba el código y el nombre, y debajo, en una fila, la retención, la disposición (su etiqueta de color) y los expedientes. Los grupos de serie se pliegan igual; las pestañas pasan a una segunda línea; el historial de cargas y la lista de problemas se apilan con el rótulo de cada dato; la ficha ocupa toda la pantalla y el panel de filtros arranca cerrado (#39) | navegador a 390 px: inicio, consulta (filtros cerrados y abiertos), ficha, ingreso y actualizar datos (revisión con problemas) sin desplazamiento lateral; 29 de 29 tarjetas con el orden pedido; grupo 02 plegado y desplegado |
| #52 | Revisar la accesibilidad básica | hecha. Ya estaban: contraste sin fallas, botones reales, controles con nombre, foco visible y `lang="es"`. Se corrigió: al cerrar la ficha el foco **vuelve a la fila que la abrió** (o a los resultados si ya no se ve); con la ficha abierta **Tab y Mayús+Tab no salen de ella** (`utils/foco.js`, también en los diálogos); las pestañas siguen el patrón de ARIA (**flechas**, Inicio y Fin; un solo punto de Tab); encabezados **h2 por sección** ("Buscar y filtrar" y "Resultados de la consulta", para lectores de pantalla); el total se anuncia con **`aria-live`** al filtrar; las zonas táctiles miden **24 px o más** (la × de las etiquetas, "Quitar selección" y los nombres de las filas) | navegador: flechas, Inicio y Fin; 30 Tab y 8 Mayús+Tab dentro de la ficha; foco de vuelta en 85.15 (Esc) y en 37 (×); h2; `aria-live`; ninguna zona táctil de menos de 24 px en computador ni en celular |

**Criterios de aceptación**
- [x] La vista sigue las decisiones de diseño de los issues #27, #39, #43 y #49. *#43 se cumple; #39 con la decisión de la usuaria (panel arriba, cerrado en celular); #49 completa salvo PDF e imprimir (Fase 8); de #27 se agregaron en `fase-7-vista` la zona grande para arrastrar el archivo, el rango de fechas de creación en la vista previa, la lista de filas con problemas plegable y el campo de fecha que no permite fechas futuras (el servidor las sigue rechazando). Diferencias decididas antes: la fecha se propone desde el nombre del archivo (Fase 4) y el ingreso está en el encabezado (Fase 3).* *(navegador: prueba de "Actualizar datos" con un Excel inventado con problemas y con el reporte real)*
- [x] La ficha de 85.15 muestra retención de 2 + 8 años, cuándo empieza a contar, conservación total y 17 expedientes (P-07). *(navegador: "10 años en total, 2 años en gestión + 8 en archivo central", el texto de inicio de la retención, "CT Conservación total" y "Expedientes (17)" con los 17 reservados; `exportar.test.js` comprueba los 17 al exportar desde la ficha)*
- [x] La vista se usa sin zoom en un celular. *(navegador a 390 px: sin desplazamiento lateral en ninguna pantalla, resultados en tarjetas con los expedientes a la vista y filtros cerrados al entrar; ver #51)*

## Fase 8 – Exportar e imprimir · completa, fusionada a `main` (PR #89)

**Objetivo:** que el usuario pueda llevarse exactamente lo que está viendo.
**Requisitos:** RF-09, RF-10, RF-11 y RNF-09.

La rama `fase-8-exportar` sale de `main` después de los PR #87 (`fase-7-vista`) y #88 (`usuarios`). En la consulta, el botón "Exportar a Excel" pasó a un menú **"Exportar"** (Excel o PDF) con un botón **"Imprimir"** al lado; la ficha tiene los mismos (`components/BotonesExportar.jsx`). El menú usa `encajarMenu()`, como los demás, y se cierra con Esc (en la ficha, Esc cierra el menú y no la ficha) o con un clic fuera.

| Issue | Tarea | Estado | Prueba |
|---|---|---|---|
| #53 | Crear `frontend/src/utils/exportar.js` | hecha (MVP), revisada: todo sale de las filas de `aplicarFiltros()` y de la pestaña elegida, o de la ficha abierta, igual que en pantalla (RNF-09). Se agregaron los filtros aplicados en texto (`filtrosAplicados()` y `lineaFiltros()`), que usan el PDF y la impresión, y el agrupado de la tabla pasó a `utils/agrupar.js`, compartido por la tabla, el PDF y la impresión | `exportar.test.js`, `pdf.test.js` |
| #54 | Exportar a Excel con tres hojas | hecha (MVP), revisada con y sin ficha: "Series y subseries", "Expedientes" y "Filtros", con las mismas filas que se ven. Dos ajustes: la hoja "Filtros" dice de dónde sale ("Consulta, pestaña …" o "Ficha de 85.15") y el control de acceso usa las palabras de la ficha (Público, Clasificado, Reservado). Nombre: igual que el PDF, `TRDCode_consulta_AAAA-MM-DD.xlsx` o, desde la ficha, `TRDCode_ficha_<código>_AAAA-MM-DD.xlsx` (decisión de la revisión de la Fase 8, anotada en el issue; antes `TRDCode-AAAA-MM-DD.xlsx`) | P-09: 643 expedientes; pestaña "Con expedientes": 16 filas y 604 expedientes; ficha de 85.15: 1 fila y 17 expedientes |
| #55 | Exportar a PDF | hecha (`utils/pdf.js`, con jsPDF y jspdf-autotable, que se cargan solo al exportar). Hoja A4 horizontal. Sin ficha: título, "Datos al…", filtros en texto, total y la tabla (código, serie o subserie, retención, disposición y expedientes) agrupada como en pantalla, con una sección por dependencia si hay varias. Desde la ficha: lo mismo de esa serie o subserie más su detalle (retención, cuándo empieza a contar, disposición, soporte, clasificación, procedimiento y tipos documentales) y el listado completo de expedientes con su control de acceso. En cada página: TRDCode · SENA Regional Tolima, fecha de generación y "Página N de M". Nombre: `TRDCode_consulta_AAAA-MM-DD.pdf` o `TRDCode_ficha_85.15_AAAA-MM-DD.pdf`. Con las fuentes estándar, jsPDF solo escribe bien hasta el carácter 255: las tildes, la ñ, ¿ y ¡ salen bien; la raya, las comillas curvas y los puntos suspensivos se cambian por equivalentes simples (`textoPdf()`), para que nunca salga basura. Los nombres IPC e IPR llegan ya ocultos de la API ("Nombre reservado (IPC)"), igual que en pantalla | P-10 |
| #56 | Imprimir con estilos de impresión | hecha (`@media print` en `styles.css`). Se imprime solo lo que se ve, sin el encabezado interactivo, los filtros, los botones, las pestañas ni los menús; arriba va una línea con la fecha de los datos y los filtros aplicados. Con la ficha abierta se imprime solo la ficha, completa: todos los expedientes (no solo la página de 50), todos los tipos documentales y el procedimiento. Cada grupo de serie va en su propio `<tbody>` y no se corta entre páginas, igual que las tarjetas y los expedientes; la cabecera de la tabla se repite en cada hoja | P-11 |
| #57 | Probar las exportaciones y la impresión | hecha: `pdf.test.js` en `npm test` y `scripts/pruebas-navegador/exportar.mjs` (ver abajo) | — |

**Pruebas:**
- `npm test`: 61 pruebas. `pdf.test.js` (14) revisa el armado del PDF con el reporte de agosto: título, "Datos al", filtros, total, la tabla agrupada como en pantalla (grupos, subseries bajo su serie, 85.18 "No está en la TRD" con 39), la pestaña en los filtros, las secciones por dependencia, la ficha de 85.15 con su detalle y sus 17 expedientes, y `textoPdf()`. También dibuja los dos PDF con jsPDF y los lee: encabezado y pie en cada página, los 17 códigos y ningún nombre reservado.
- `scripts/pruebas-navegador/exportar.mjs` (44 comprobaciones; solo lee, no crea cuentas ni cargas):
  - Descarga de verdad el PDF y el Excel, de la consulta y de la ficha de 85.15, y los lee: el PDF con `leer_pdf.mjs` (jsPDF no comprime el texto) y el Excel con SheetJS. Compara con lo que se ve: los códigos de la tabla, los 17 expedientes, ningún nombre reservado y "Página N de M" en cada página.
  - Revisa la impresión con la emulación de impresión del navegador (`Emulation.setEmulatedMedia`): la consulta sin controles y con la línea de filtros, la ficha sola, y una ficha con 308 expedientes (serie 37) que imprime los 308.
  - Revisa el menú "Exportar" a 320 y 390 px, en la consulta y en la ficha.
  - Deja junto a las capturas la hoja impresa (`exportar-impresion-*.pdf`) para revisarla a ojo.
- Pasan en desarrollo y en Apache, con todas las demás: `inicio` (25), `ingreso` (15), `vista` (27), `menus` (20), `usuarios` (31), `probar_auth.php` (51) y `probar_usuarios.php` (62). En la base temporal pasan también `actualizar` (35), `probar_importacion.php` (56) y `probar_usuarios.php` (64).

**Criterios de aceptación**
- [x] El Excel tiene las tres hojas con lo que se ve. *(navegador y `exportar.test.js`: pestaña "Con expedientes", 16 series y subseries y 604 expedientes; desde la ficha de 85.15, 1 fila y sus 17 expedientes; sin ficha, P-09 con 643)*
- [x] El PDF sin ficha trae solo el resumen; con la ficha de 85.15 abierta incluye los 17 expedientes (P-10). *(navegador: el PDF de la consulta tiene los 37 códigos de la tabla y ningún expediente; el de la ficha, los 17 códigos, cada uno con "Nombre reservado (IPC)" y "Clasificado"; `pdf.test.js` lo mismo con el PDF dibujado)*
- [x] La impresión no muestra filtros ni botones (P-11). *(navegador con la emulación de impresión: ni encabezado interactivo, ni filtros, ni pestañas, ni botones ni menús; la línea de filtros y "Datos al" arriba; desde la ficha, todos sus expedientes)*

## Fase 9 – Instalación local y paquete de entrega · completa en `fase-9-entrega`, salvo el celular real (#62)

**Objetivo:** dejar la aplicación funcionando en Apache como en un servidor real y preparar el paquete para que el SENA la instale en cualquier carpeta.
**Requisitos:** RNF-01, RNF-04, RNF-07 y RNF-10.

La rama `fase-9-entrega` sale de `main` después del PR #89 (Fase 8).

| Issue | Tarea | Estado | Prueba |
|---|---|---|---|
| #58 | Construir el frontend con rutas relativas | hecha (MVP): `base: './'` y llamadas a la API sin barra inicial | P-28: el mismo build funciona en `htdocs/trd-prueba` sin volver a compilar; `instalacion.mjs` revisa que `index.html` no tenga rutas absolutas |
| #59 | Instalar la aplicación en `htdocs/TRDCode` | hecha (desde la Fase 3). Desde ahora la copia es el contenido de `app/` del paquete, con `C:\xampp\TRDCode.env` | `inicio` (25), `ingreso` (15), `vista` (27), `menus` (20), `usuarios` (31), `exportar` (44), `probar_auth` (51, con el PHP de Apache) y `probar_usuarios` (62) contra Apache |
| #60 | Agregar `robots.txt` y el `.htaccess` de `api/lib` | hecha (MVP): `robots.txt` con `Disallow: /`; `.htaccess` en `api/lib/` y en `consola/` con `Require all denied`; el de la raíz niega todo archivo que empiece con punto y el listado de carpetas | `instalacion.mjs`: 14 rutas privadas responden 403 o 404 |
| #61 | Probar la instalación en Apache (P-25) | hecha | `.env`, `.env.example`, `.htaccess`, `api/lib/config.php` y `consola/…` → 403, en `TRDCode` y en `trd-prueba` |
| #62 | Probar desde un celular en la misma red (P-26) | **pendiente**: el Firewall de Windows bloquea el puerto 80 y la regla propuesta (solo red privada y subred local) espera la confirmación del usuario y una terminal de administrador. La vista de celular está probada con emulación a 320 y 390 px | — |
| #63 | Crear `scripts/empaquetar.ps1` | hecha: reemplaza a `armar_prototipo.ps1`. Genera `paquete/TRDCode-v1.0.0.zip` (69 archivos, 1,5 MB): `app/` (frontend, `robots.txt`, `api/`, `consola/` y los `.htaccess`), `database/` (`schema.sql`, `datos_iniciales.sql`, `trd.sql` y `migraciones/`), `docs/` (`INSTALACION.md` y el manual en PDF), `.env.example` y `LEEME.txt`. **Sin datos personales:** se detiene si encuentra un `.env`, un Excel, un JSON, `expedientes.sql`, algo de `datos-prueba`, un `INSERT` en usuarios, cargas, expedientes o intentos, una contraseña en `.env.example` o un `.htaccess` con BOM. El zip usa `/` como separador, para abrirse bien en Linux | P-28 |
| — | Primera cuenta en una instalación nueva | hecha: `consola/crear_primera_cuenta.php --env=<ruta del .env>`, en `app/consola/` (bloqueada por `.htaccess`; además se niega a correr fuera de la consola). Pide correo, nombre y contraseña dos veces sin mostrarla, con las mismas reglas de la API. Solo funciona si no hay ninguna cuenta activa; si el correo es de una cuenta desactivada, la reactiva (así se recupera el acceso si nadie puede entrar) y cierra sus sesiones. Reemplaza a `scripts/crear_usuario.php`. No hay página web de instalación | `scripts/probar_primera_cuenta.php` (22 comprobaciones en MySQL 8.0 con PHP 8.2 y 8.1; 18 en MariaDB 10.4 con PHP 8.1, sin las de la web) |
| #64 | Redactar `docs/INSTALACION.md` para el área de sistemas del SENA | hecha, en estilo impersonal y sin fechas: requisitos (PHP 8.1+ con `pdo_mysql`, `mbstring` y `session`; Apache con `AllowOverride` o Nginx; MySQL 5.7+ o MariaDB 10.4+), base `utf8mb4_unicode_ci` y usuario propio con solo `SELECT`, `INSERT`, `UPDATE` y `DELETE` (nunca `root`), los scripts con `--default-character-set=utf8mb4`, el `.env` fuera de la carpeta pública con `TRDCODE_ENV` (`SetEnv` o `fastcgi_param`) o junto a la raíz de documentos, configuración de Apache y de Nginx (con gzip y HTTPS), HTTPS detrás de un proxy, primera cuenta, primera carga, verificaciones, copia de seguridad con `mysqldump`, actualización con las migraciones, cuentas y acceso, y problemas frecuentes | P-28 se hizo siguiendo solo la guía |
| — | `DB_PORT` opcional en el `.env` | hecha: `config.php` entrega la cadena de conexión (`db_dsn`) y la usan la API y los scripts de prueba | Prueba en MariaDB (puerto 3307) |
| — | [MANUAL] Instalar PHP 8.1 antes de P-29 | hecha: Laragon solo tenía 8.0 y 8.3; con la confirmación del usuario se descargó PHP 8.1.34 portátil (NTS x64, SHA-256 verificado) en `C:\php81`, sin cambiar el PATH ni el PHP de Apache | — |
| #65 | Probar el paquete en una instalación limpia (P-28 y P-29) | hecha (ver abajo) | — |
| — | Probar en MariaDB 10.4 la instalación completa | hecha (ver abajo) | — |

**P-28: instalación limpia siguiendo solo `docs/INSTALACION.md`**
- El zip se descomprimió en una carpeta temporal. Se creó la base `trdcode_p28` en MySQL80 con el usuario `trdcode_p28@localhost` (solo `SELECT`, `INSERT`, `UPDATE` y `DELETE`); se importaron los tres scripts; el contenido de `app/` se copió a `C:\xampp\htdocs\trd-prueba`; el `.env` quedó en `C:\xampp\trdcode-p28\trdcode.env` con `SetEnv TRDCODE_ENV` en el `.htaccess` de la aplicación (sección 6.1). La primera cuenta se creó con `consola/crear_primera_cuenta.php --env=…`; la segunda vez se negó.
- `instalacion.mjs` (31 comprobaciones): la instalación empieza sin carga ni expedientes y con los nombres de los centros con tildes; 14 rutas privadas responden 403 o 404; `robots.txt` y rutas relativas; la primera cuenta entra, carga el reporte de agosto desde "Actualizar datos" (7.531 filas; 3.385 expedientes: 1.781 / 1.084 / 520); la consulta da **643** y la ficha de 85.15, **17** expedientes, todos con "Nombre reservado".
- Contra la misma instalación pasan `exportar.mjs` (44), `probar_auth.php` (51, con el PHP de Apache), `probar_usuarios.php` (60) y `probar_importacion.php` (56).
- También funciona la forma 2 del `.env` (sin `SetEnv`, en `C:\xampp\trd-prueba.env`). Sin `.env`, la API responde un mensaje genérico y el detalle queda en el registro de Apache.
- Al terminar se borraron la carpeta, el `.env`, la base y el usuario de MySQL.

**P-29: PHP 8.1 (8.1.34)**
- `php -l` sin errores en los 30 archivos PHP del repositorio.
- Con `php -S` de PHP 8.1: `probar_auth` (51), `probar_usuarios` (64) y `probar_importacion` (56) contra MariaDB 10.4; `probar_auth` (51) y `probar_usuarios` (62) contra MySQL80 con el `.env` real; y sobre la instalación de P-28 servida en `/trd-prueba/`, `probar_auth` (51), `probar_usuarios` (60) y `probar_importacion` (56).
- `exportar.mjs` no se pudo correr directo contra `php -S`: el `fetch` de Node 24 (undici) se cae al leer la respuesta grande de `datos.php` cuando `php -S` cierra la conexión. `curl` y PHP la leen bien, y con Apache o con el proxy de Vite no pasa. No es un problema de la aplicación.

**MariaDB 10.4 (10.4.32 de XAMPP)**
- Encendida en el puerto 3307 con una carpeta de datos nueva (`mysql_install_db.exe`), sin tocar MySQL80 ni `C:\xampp\mysql\data`; al terminar se apagó y se borró la carpeta.
- Instalación completa con un usuario propio de cuatro permisos: `schema.sql`, `datos_iniciales.sql`, `trd.sql`, `expedientes.sql` y la migración `001_usuarios.sql` dos veces. Quedan 3.385 expedientes (1.781 / 1.084 / 520) y 109 registros de TRD.
- La migración sobre una base con el `schema.sql` anterior a RF-17 (con una cuenta), aplicada dos veces: agrega las tres columnas, conserva la cuenta y deja las columnas iguales a las de una base nueva (tipo, nulo y valor por defecto).
- Las pruebas de la API pasan contra ella (ver P-29) y `probar_primera_cuenta.php` (18).

**Criterios de aceptación**
- [ ] La aplicación funciona en `http://localhost/TRDCode/` y desde el celular. *(En `localhost/TRDCode` pasan todas las pruebas. Falta el celular real (#62), por el firewall. Falta también reinstalar `htdocs/TRDCode` con el `app/` del paquete nuevo: el permiso automático no dejó borrar la copia anterior y queda para el usuario)*
- [x] Ni `api/lib/config.php` ni el `.env` se pueden abrir desde el navegador. *(403 en `TRDCode` y en `trd-prueba`; también `consola/`, `.env.example`, `.htaccess` y los listados de carpetas. `database/` ya no va en la carpeta pública)*
- [x] El paquete se instala con PHP 8.1 en una carpeta con otro nombre siguiendo solo la guía (P-28 y P-29). *(P-28 en `htdocs/trd-prueba` con el PHP 8.4 de Apache. P-29: la misma instalación servida con PHP 8.1 pasa las pruebas de la API, y `php -l` pasa en todo el código)*
- [x] `docs/INSTALACION.md` indica crear un usuario de MySQL propio para la aplicación, no `root`, y dejar el `.env` fuera de la carpeta pública. *(secciones 3.1 y 5; P-28 se instaló así)*

## Fase 10 – Pruebas con la usuaria y ajustes · sin empezar

**Objetivo:** validar la aplicación con quien la va a usar y corregir lo necesario.
**Requisitos:** todos.

| Issue | Tarea | Estado |
|---|---|---|
| #66 | Ejecutar el plan de pruebas completo | sin empezar |
| #67 | Hacer la sesión de prueba guiada con la usuaria | sin empezar |
| #68 | Probar con la encargada el inicio de sesión y la carga de un reporte real | sin empezar |
| #69 | Registrar y corregir los ajustes de la usuaria | sin empezar |
| #70 | Repetir las pruebas afectadas por los ajustes | sin empezar |

**Criterios de aceptación**
- [ ] Pasan las pruebas automáticas A-01 a A-10 y las manuales P-01 a P-29.
- [ ] La usuaria aprueba la aplicación.

## Fase 11 – Guía y entrega al SENA · sin empezar

**Objetivo:** entregar la aplicación con su documentación para que el SENA la revise y la instale.
**Requisitos:** RNF-01 y RNF-08.

| Issue | Tarea | Estado |
|---|---|---|
| #7 | Enviar al área de sistemas del SENA los requisitos del servidor (movida desde la Fase 1) | sin empezar |
| #71 | Publicar el Release v1.0.0 | sin empezar |
| #72 | Redactar `docs/GUIA_USO.md` | sin empezar |
| #73 | Completar el README del repositorio | sin empezar |
| #74 | Hacer la demostración a la usuaria | sin empezar |
| #75 | Entregar el paquete y las guías al SENA | sin empezar |
| #76 | Revisar la lista de verificación de entrega | sin empezar |

**Criterios de aceptación**
- [ ] Se cumple la lista de verificación de la sección 15 del plan (#76).
- [ ] El SENA recibió el correo de requisitos, el paquete, la guía de instalación y la guía de uso.

---

## RF-17 – Usuarios editables (fuera del plan original) · completo en la rama `usuarios`

**Requisito:** las personas encargadas administran sus cuentas desde la aplicación, sin scripts ni SQL. Todas las cuentas activas son administradoras. Se pidió el 15 de noviembre de 2026; la rama `usuarios` sale de `main` después del PR #87 (la Fase 8 todavía no está hecha).

**Mi cuenta** (`#cuenta`, en el menú de la usuaria; reemplaza "Cambiar contraseña"):
- Editar el nombre completo (`api/mi_cuenta.php`).
- Cambiar el correo de ingreso (`api/cambiar_correo.php`): pide la contraseña actual, valida el formato y que no lo use otra cuenta.
- Cambiar la contraseña, como antes (`api/cambiar_clave.php`); ahora cierra las otras sesiones de la cuenta.
- Los fallos con la contraseña actual (al cambiar el correo o la contraseña) cuentan para el bloqueo.

**Usuarios** (`#usuarios`, en el menú):
- Lista de cuentas con nombre, correo, estado (activa o inactiva, y si tiene contraseña temporal) y último ingreso (`api/usuarios.php`). La propia sale como "Usted" y se edita en "Mi cuenta"; el usuario técnico de `expedientes.sql` (`carga-inicial@trdcode.local`) sale como "Sistema", sin acciones.
- Crear una cuenta con nombre, correo y contraseña temporal; editar el nombre y el correo de otra (`api/usuario_guardar.php`).
- Poner una contraseña temporal a otra cuenta (`api/usuario_clave_temporal.php`).
- Activar y desactivar (`api/usuario_estado.php`). Nadie puede desactivarse a sí misma y siempre queda al menos una cuenta activa. Las cuentas no se borran, porque las cargas guardan quién las hizo.
- Con una contraseña temporal, al entrar una ventana que no se puede cerrar obliga a cambiarla; el servidor responde 403 (`debe_cambiar_clave`) a todo menos ver la sesión, cambiar la contraseña y salir.
- Al desactivar una cuenta o ponerle una contraseña temporal, sus sesiones abiertas se cierran (`sesion_version`).
- Todo lo que cambia datos exige sesión y CSRF; las respuestas nunca traen contraseñas ni hashes.

**Base de datos:** `database/migraciones/001_usuarios.sql` agrega a `usuarios` las columnas `debe_cambiar_clave`, `ultimo_ingreso` y `sesion_version`. Se aplica a una base existente sin perder datos y se puede repetir (revisa `information_schema` antes de cada `ALTER TABLE`, porque MySQL 8 no tiene `ADD COLUMN IF NOT EXISTS`). Se probó dos veces sobre una copia con el `schema.sql` anterior en MySQL 8.0.41 y se aplicó a la base del equipo sin cambios en sus datos; en MariaDB 10.4 no se ejecutó (en este equipo no se enciende la MySQL de XAMPP), pero solo usa lo que MariaDB 10.4 también tiene (`PREPARE`, `information_schema`, `IF()`, `DO`). `schema.sql` ya trae las columnas y el LEEME del prototipo explica cómo importar la migración en una instalación anterior.

**Pruebas:**
- `scripts/probar_usuarios.php`: 64 comprobaciones con cuentas temporales que se borran (401, 403 y 405; lista sin hashes; cuenta "Sistema"; crear; correo repetido o inválido; contraseña temporal que obliga a cambiarla; editar; contraseña temporal y desactivar que cierran la sesión; no desactivarse a sí misma; la última cuenta activa, solo en la base temporal; Mi cuenta; bloqueo; las demás cuentas y cargas no cambian).
- `scripts/pruebas-navegador/usuarios.mjs`: 31 comprobaciones, también a 390 px.
- Siguen pasando `npm test` (45), `probar_auth.php` (51), `probar_importacion.php` (56) y las demás pruebas en el navegador (`inicio`, `ingreso`, `vista`, `menus` y `actualizar`).

## Pendientes para la entrega

- Probar desde un celular real (#62, P-26): necesita la regla del Firewall de Windows para el puerto 80 (solo red privada y subred local), que debe aplicar el usuario en una terminal de administrador.
- Reinstalar `C:\xampp\htdocs\TRDCode` con el contenido de `app/` del paquete nuevo (borrar el contenido anterior, que todavía es el del prototipo con `database/` y `LEEME.txt` dentro), y volver a correr las pruebas contra Apache.
- Borrar `C:\php81` (PHP 8.1 portátil de la prueba P-29) cuando ya no haga falta.
- Adjuntar `TRDCode-v1.0.0.zip` al Release cuando se fusione la Fase 9.

- La encargada crea su cuenta desde "Usuarios", con su correo institucional (entra con la contraseña temporal y la cambia), y desde esa cuenta desactiva la cuenta de prueba. Las cuentas no se borran: las cargas guardan quién las hizo.
- Actualizar el manual de usuario (`docs/GUIA_USO.md`, las capturas de `docs/img/` y el PDF): todavía dice que la aplicación abre con los 2.530 expedientes a la vista y no describe la pantalla de inicio, el ingreso de la encargada ni "Actualizar datos" (la sección 11 todavía dice que la carga de reportes llegará después).

## Decisiones pendientes

No dependen del desarrollo; tienen la etiqueta `decision-pendiente` y no pertenecen a ninguna fase.

| Issue | Decisión | Decide | Antes de |
|---|---|---|---|
| #77 | A nombre de quién queda el repositorio de GitHub | Desarrollador y usuaria | — |
| #78 | Quién revisa los Pull Requests | Desarrollador | — |
| #79 | Fecha de sustentación o de entrega | Usuaria | — |
| #80 | Si la usuaria y la encargada de Gestión Documental son la misma persona | Usuaria | Fase 4 |
| #81 | Si La Granja tiene Grupo de Administración Educativa (.2) | Usuaria | Fase 5 |
| #82 | Si en producción se muestran los nombres de los expedientes IPC e IPR | Usuaria y SENA | Instalación en el SENA |
