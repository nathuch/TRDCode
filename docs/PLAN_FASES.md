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
| 3 | API en PHP | [Fase 3](https://github.com/nathuch/TRDCode/milestone/4) | `fase-3-login` (sale de `mvp-prototipo`) | en curso: falta probar en Apache (#21) |
| 4 | Importación del Excel | [Fase 4](https://github.com/nathuch/TRDCode/milestone/5) | `fase-4-importacion` | sin empezar (el MVP carga por script) |
| 5 | Cruce de expedientes con la TRD | [Fase 5](https://github.com/nathuch/TRDCode/milestone/6) | `fase-5-cruce` | sin empezar (hecha en el MVP) |
| 6 | Filtros y buscador | [Fase 6](https://github.com/nathuch/TRDCode/milestone/7) | `fase-6-filtros` | sin empezar (hecha en el MVP) |
| 7 | Vista de resultados y ficha | [Fase 7](https://github.com/nathuch/TRDCode/milestone/8) | `fase-7-vista` | sin empezar (casi toda hecha en el MVP) |
| 8 | Exportar e imprimir | [Fase 8](https://github.com/nathuch/TRDCode/milestone/9) | `fase-8-exportar` | sin empezar (Excel hecho en el MVP) |
| 9 | Instalación local y paquete de entrega | [Fase 9](https://github.com/nathuch/TRDCode/milestone/10) | `fase-9-entrega` | sin empezar (parte hecha en el MVP) |
| 10 | Pruebas con la usuaria y ajustes | [Fase 10](https://github.com/nathuch/TRDCode/milestone/11) | `fase-10-ajustes` | sin empezar |
| 11 | Guía y entrega al SENA | [Fase 11](https://github.com/nathuch/TRDCode/milestone/12) | `main` | sin empezar |

Las fases 3 a 9 siguen "sin empezar" como fases, pero el MVP (rama `mvp-prototipo`) ya adelantó parte de sus tareas: el detalle está en la sección [MVP del prototipo](#mvp-del-prototipo).

## Cambios respecto al plan v3

- **Equipo nuevo desde noviembre de 2026.** El equipo de desarrollo anterior fue robado y se va a formatear; el proyecto se retomó en otro computador desde la rama `mvp-prototipo`. En este equipo:
  - PHP y Apache son los de **XAMPP 8.2.12** (PHP 8.2.12 en `C:\xampp\php\php.exe`). El `php` del PATH es 8.4 y no se usa.
  - La base de datos corre en el **MySQL 8.0 del equipo (servicio `MySQL80`, 8.0.41)**, que ocupa el puerto 3306; la MariaDB 10.4 de XAMPP no se usa aquí. El paquete del prototipo, en cambio, se instala con la MariaDB de XAMPP, así que el SQL debe funcionar en MySQL 8.0 y en MariaDB 10.4.
  - `api/lib/config.php` no lee un puerto (`DB_PORT`): la conexión usa siempre el puerto por defecto.
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
- **`scripts/crear_usuario.php`** crea la usuaria encargada o cambia su contraseña sin mostrarla y guarda solo el hash. Reemplaza el `php -r` del plan.
- **El correo con los requisitos al SENA (#7)** pasó de la Fase 1 a la Fase 11, para hacerlo al final.
- **Columna `grupo` en `trd_tipos_documentales`**: guarda el subtítulo de la TRD 11 bajo el que aparece cada tipo documental (por ejemplo "Modalidad Licitación Pública" en los contratos).
- **El "Reporte Tolima" de OnBase es la fuente de expedientes.** No se sube al repositorio.
- **La propuesta de pantallas** no está en el repositorio; las decisiones de diseño quedaron en los issues #27, #39, #43 y #49.
- **Prototipo (MVP) antes de terminar las fases.** Se armó una versión de solo consulta para mostrarla a la usuaria; ver la sección siguiente.

---

## MVP del prototipo

Versión de **solo consulta** para mostrar a la usuaria e instalar en un equipo de demostración con XAMPP. No tiene inicio de sesión ni carga de reportes desde la pantalla.

- **Rama:** `mvp-prototipo`, que sale de `fase-2-trd`. Se fusionó a `main` con el PR #84 (5 de noviembre de 2026).
- **Etiquetas** (puntos de respaldo, en GitHub):
  - `mvp-v1` (`a6d3955`): MVP antes del rediseño de la interfaz.
  - `mvp-v2` (`77ba212`): MVP con el rediseño de la interfaz y el manual de usuario.
- **Paquete:** `scripts/armar_prototipo.ps1` arma `prototipo/TRDCode/` (ignorado por git) con los pasos de `scripts/prototipo/LEEME.txt`. El `.env` y `expedientes.sql` se entregan aparte.

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
| 3 | #21 | Copia en el Apache de XAMPP | parcial: paquete del prototipo para `htdocs/TRDCode` |
| 3 | #23 | `frontend/src/api/cliente.js` | parcial: solo `obtenerDatos()` (se completó en `fase-3-login`) |
| 3 | #17, #18, #19, #22 | Sesión, CSRF, login, logout, cambio de clave y pruebas de la API | no (se hicieron en `fase-3-login`) |
| 4 | #24 a #33 | Importación desde la pantalla | no; la reemplaza `generar_expedientes_sql.py` (normaliza como el plan y da los 3.385 expedientes) |
| 5 | #34, #35, #36 | `cruce.js`: `armarIndice()`, cuatro estados y `resumen()` | hechas |
| 5 | #37 | Cargar los datos en `App.jsx` | hecha |
| 5 | #38 | Pruebas de `cruce.js` (A-06 a A-08) | hecha |
| 6 | #39, #40 | Estructura de la página y estado de los filtros en `App.jsx` | hechas |
| 6 | #41, #42 | `opcionesDisponibles()` y `aplicarFiltros()` | hechas |
| 6 | #43 | Panel de filtros | hecha, como `BarraConsulta.jsx` y `SelectorMultiple.jsx` |
| 6 | #44 | Buscador | hecha |
| 6 | #45 | Pruebas de `filtros.js` (A-09, A-10) y rendimiento | hecha |
| 7 | #46 | Resumen | hecha de otra forma: total y pestañas en `App.jsx`, sin tarjetas |
| 7 | #47, #48, #49, #50 | Tabla, aviso de lo que no está en la TRD, ficha y "Datos al [fecha]" | hechas |
| 7 | #51, #52 | Vista para celular y accesibilidad | parcial: estilos para pantallas angostas y roles ARIA, sin revisión formal |
| 8 | #53, #54 | `exportar.js` y Excel con tres hojas | hechas |
| 8 | #55, #56 | PDF e impresión | no |
| 8 | #57 | Probar las exportaciones | parcial: pruebas del Excel |
| 9 | #58 | Frontend con rutas relativas | hecha |
| 9 | #60 | `robots.txt` y `.htaccess` de `api/lib` | hecha |
| 9 | #63 | Script de empaquetado | parcial: `armar_prototipo.ps1` en lugar de `empaquetar.ps1` |
| 9 | #64 | `docs/INSTALACION.md` | no; el prototipo trae `LEEME.txt` |

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
| #21 | Instalar una copia en el Apache de XAMPP desde esta fase | sin empezar (solo existe el paquete del prototipo) |
| #22 | Probar los servicios de la API con sus casos de error | completa (`scripts/probar_auth.php`) |
| #23 | Crear `frontend/src/api/cliente.js` | completa |

**Cómo quedó el inicio de sesión**
- Cookie `TRDCODE_SESION`, `HttpOnly` y `SameSite=Strict`, con `Secure` solo por HTTPS y limitada a la carpeta de la aplicación. La sesión solo se abre si llega la cookie: la consulta pública no crea sesiones.
- Al entrar se regenera el id de sesión y se crea un token CSRF nuevo. La sesión se cierra tras 30 minutos sin actividad, o en la siguiente petición si la usuaria se desactiva.
- `login.php` solo acepta POST con JSON y solo deja entrar usuarios activos. Ante cualquier fallo responde 401 "Correo o contraseña incorrectos." (si el correo no existe, igual verifica contra un hash ficticio, para no delatarlo por el tiempo de respuesta).
- Bloqueo: 5 fallos en 15 minutos bloquean el correo y, por separado, la IP, hasta 15 minutos después del quinto fallo. Responde 429 con el tiempo que falta (`espera_segundos` y la cabecera `Retry-After`). Los fallos de la contraseña actual en `cambiar_clave.php` también cuentan.
- Códigos: 401 sin sesión, 403 sin token CSRF válido en `X-CSRF-Token`, 405 con otro método, 415 si no llega JSON y 429 con bloqueo. Los errores internos van a `error_log`, sin contraseñas ni hashes.
- `cambiar_clave.php` pide la actual y una nueva de 10 a 72 caracteres (bcrypt ignora lo que pase de 72 bytes), distinta de la actual.
- Frontend: enlace discreto "Ingresar" en el encabezado (`Acceso.jsx`); con sesión, el nombre de la usuaria abre un menú con "Cambiar contraseña" y "Salir". Los formularios (`DialogoIngreso.jsx`, `DialogoClave.jsx` sobre `Dialogo.jsx`) tienen etiquetas, foco visible, Enter envía, Esc cierra y el foco no sale de la ventana. La consulta no cambia.
- Pruebas: `C:\xampp\php\php.exe scripts/probar_auth.php` (con el servidor de desarrollo encendido) hace 48 comprobaciones con cuentas temporales que crea y borra; no usa la cuenta real.

**Criterios de aceptación**
- [x] `datos.php` devuelve la TRD completa y sin nombres reservados (IPC e IPR). Sigue siendo público y no crea sesión.
- [x] El inicio de sesión funciona y se bloquea durante 15 minutos tras cinco intentos fallidos.
- [x] Un servicio protegido responde 401 sin sesión.
- [ ] Todo responde igual en Apache que con `php -S`. Falta instalar la copia en Apache (#21).
- [ ] El `.env` no se puede descargar desde el navegador, ni con `php -S` ni con Apache. Con `php -S` responde 404 (`scripts/servidor_dev.php`); falta comprobarlo en Apache.

## Fase 4 – Importación del Excel · sin empezar

**Objetivo:** que la encargada cargue el reporte de OnBase, vea antes qué filas tienen problemas y pueda volver a una carga anterior.
**Requisitos:** RF-12, RF-13, RF-14, RF-16, RNF-05 y RNF-06.

| Issue | Tarea | Estado |
|---|---|---|
| #24 | Crear `frontend/src/datos/leerExcel.js` | sin empezar |
| #25 | Crear `frontend/src/datos/normalizar.js` | sin empezar |
| #26 | Escribir las pruebas de `normalizar.js` (A-01 a A-05) | sin empezar |
| #27 | Crear `frontend/src/components/ActualizarDatos.jsx` | sin empezar |
| #28 | Crear `api/lib/validar.php` | sin empezar |
| #29 | Crear `api/importar_iniciar.php` | sin empezar |
| #30 | Crear `api/importar_lote.php` | sin empezar |
| #31 | Crear `api/importar_finalizar.php` | sin empezar |
| #32 | Crear `api/cargas.php` y `api/restaurar_carga.php` | sin empezar |
| #33 | Probar la importación completa | sin empezar |

**Criterios de aceptación**
- [ ] Al importar el reporte de agosto quedan 3.385 expedientes en la carga activa: Industria y Construcción 1.781, Comercio y Servicios 1.084 y Agropecuario La Granja 520.
- [ ] Las pruebas de Vitest pasan.
- [ ] Una importación cortada no cambia los datos que se ven.
- [ ] "Volver a esta carga" recupera la carga anterior.

## Fase 5 – Cruce de expedientes con la TRD · sin empezar

**Objetivo:** unir cada expediente con su serie o subserie de la TRD y calcular los conteos.
**Requisitos:** RF-06 y RF-08.

| Issue | Tarea | Estado |
|---|---|---|
| #34 | Crear `frontend/src/datos/cruce.js` con `armarIndice()` | sin empezar |
| #35 | Clasificar cada entrada en sus cuatro estados | sin empezar |
| #36 | Crear `resumen()` para las tarjetas de totales | sin empezar |
| #37 | Cargar los datos en `App.jsx` | sin empezar |
| #38 | Escribir las pruebas de `cruce.js` (A-06 a A-08) | sin empezar |

**Criterios de aceptación**
- [ ] El Grupo de Formación Profesional de Industria y Construcción con TRD 11 suma 643 expedientes.
- [ ] La serie 37 Historias académicas tiene 308.
- [ ] La subserie 85.18 aparece como "No está en la TRD" con 39.
- [ ] La Granja no muestra series de la plantilla 00.9000.2.

## Fase 6 – Filtros y buscador · sin empezar

**Objetivo:** construir el panel de filtros en cascada y el buscador.
**Requisitos:** RF-01 a RF-05 y RNF-03.

| Issue | Tarea | Estado |
|---|---|---|
| #39 | Maquetar la estructura general de la página | sin empezar |
| #40 | Guardar el estado de los filtros en `App.jsx` | sin empezar |
| #41 | Crear `opcionesDisponibles()` en `datos/filtros.js` | sin empezar |
| #42 | Crear `aplicarFiltros()` en `datos/filtros.js` | sin empezar |
| #43 | Crear `frontend/src/components/Filtros.jsx` | sin empezar |
| #44 | Implementar el buscador | sin empezar |
| #45 | Escribir las pruebas de `filtros.js` (A-09 y A-10) y medir el rendimiento | sin empezar |

**Criterios de aceptación**
- [ ] Cada filtro solo muestra opciones que existen con los anteriores.
- [ ] El buscador encuentra por código y nombre, y avisa si hay resultados en la otra versión de la TRD.
- [ ] Con los 3.385 expedientes, cada cambio de filtro responde en menos de un segundo.

## Fase 7 – Vista de resultados y ficha · sin empezar

**Objetivo:** mostrar las series y subseries filtradas y la ficha de cada subserie con su listado de expedientes.
**Requisitos:** RF-06, RF-07, RF-08, RF-13 y RNF-02.

| Issue | Tarea | Estado |
|---|---|---|
| #46 | Crear `frontend/src/components/Resumen.jsx` | sin empezar |
| #47 | Crear `frontend/src/components/TablaResultados.jsx` | sin empezar |
| #48 | Mostrar el aviso de subseries que no están en la TRD | sin empezar |
| #49 | Crear `frontend/src/components/Ficha.jsx` | sin empezar |
| #50 | Mostrar "Datos al [fecha]" de la carga activa | sin empezar |
| #51 | Ajustar la vista para celular | sin empezar |
| #52 | Revisar la accesibilidad básica | sin empezar |

**Criterios de aceptación**
- [ ] La vista sigue las decisiones de diseño de los issues #27, #39, #43 y #49.
- [ ] La ficha de 85.15 muestra retención de 2 + 8 años, cuándo empieza a contar, conservación total y 17 expedientes (P-07).
- [ ] La vista se usa sin zoom en un celular.

## Fase 8 – Exportar e imprimir · sin empezar

**Objetivo:** que el usuario pueda llevarse exactamente lo que está viendo.
**Requisitos:** RF-09, RF-10, RF-11 y RNF-09.

| Issue | Tarea | Estado |
|---|---|---|
| #53 | Crear `frontend/src/utils/exportar.js` | sin empezar |
| #54 | Exportar a Excel con tres hojas | sin empezar |
| #55 | Exportar a PDF | sin empezar |
| #56 | Imprimir con estilos de impresión | sin empezar |
| #57 | Probar las exportaciones y la impresión | sin empezar |

**Criterios de aceptación**
- [ ] El Excel tiene las tres hojas con lo que se ve.
- [ ] El PDF sin ficha trae solo el resumen; con la ficha de 85.15 abierta incluye los 17 expedientes (P-10).
- [ ] La impresión no muestra filtros ni botones.

## Fase 9 – Instalación local y paquete de entrega · sin empezar

**Objetivo:** dejar la aplicación funcionando en Apache como en un servidor real y preparar el paquete para que el SENA la instale en cualquier carpeta.
**Requisitos:** RNF-01, RNF-04, RNF-07 y RNF-10.

| Issue | Tarea | Estado |
|---|---|---|
| #58 | Construir el frontend con rutas relativas | sin empezar |
| #59 | Instalar la aplicación en `htdocs/TRDCode` | sin empezar |
| #60 | Agregar `robots.txt` y el `.htaccess` de `api/lib` | sin empezar |
| #61 | Probar la instalación en Apache | sin empezar |
| #62 | Probar desde un celular en la misma red | sin empezar |
| #63 | Crear `scripts/empaquetar.ps1` | sin empezar |
| #64 | Redactar `docs/INSTALACION.md` para el área de sistemas del SENA | sin empezar |
| — | [MANUAL] Instalar PHP 8.1 (por ejemplo con Laragon) antes de la prueba P-29 | sin empezar |
| #65 | Probar el paquete en una instalación limpia | sin empezar |

**Criterios de aceptación**
- [ ] La aplicación funciona en `http://localhost/TRDCode/` y desde el celular.
- [ ] Ni `api/lib/config.php` ni el `.env` se pueden abrir desde el navegador.
- [ ] El paquete se instala con PHP 8.1 en una carpeta con otro nombre siguiendo solo la guía (P-28 y P-29).
- [ ] `docs/INSTALACION.md` indica crear un usuario de MySQL propio para la aplicación, no `root`, y dejar el `.env` fuera de la carpeta pública.

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

## Pendientes para la entrega

- Crear la cuenta real de la encargada con su correo institucional (`scripts/crear_usuario.php`) y desactivar la cuenta de prueba (`UPDATE usuarios SET activo = 0 WHERE correo = ...`).

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
