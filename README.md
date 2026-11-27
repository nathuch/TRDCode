# TRDCode

Aplicación web para consultar las **series y subseries documentales** de las Tablas de Retención Documental (TRD 2020 y 2025) de los tres centros de formación del **SENA, Regional Tolima** (Industria y Construcción, Comercio y Servicios y Agropecuario La Granja), cruzadas con los **expedientes registrados en OnBase**.

- Consulta sin usuario: búsqueda, filtros en cascada por TRD, centro, dependencia, serie, subserie y año; ficha con retención, disposición final, tipos documentales y expedientes; exportar a Excel y PDF e imprimir; también en el celular.
- Las personas encargadas de Gestión Documental ingresan para cargar el reporte mensual de OnBase (con historial y vuelta a una carga anterior), administrar las cuentas y ver los nombres de los expedientes clasificados y reservados.

**Versión actual:** 1.0.0 · [Releases](https://github.com/nathuch/TRDCode/releases)

## Documentación

| Documento | Para quién |
|---|---|
| [Guía de instalación](docs/INSTALACION.md) ([PDF](docs/INSTALACION.pdf)) | Área de sistemas: instalación en el servidor, configuración, copias de seguridad y actualización |
| [Guía rápida de prueba](docs/GUIA_RAPIDA_PRUEBA.md) ([PDF](docs/GUIA_RAPIDA_PRUEBA.pdf)) | Instalar y probar en un computador con XAMPP |
| [Ficha técnica](docs/FICHA_TECNICA.md) ([PDF](docs/FICHA_TECNICA.pdf)) | Área de sistemas: arquitectura, tecnologías, modelo de datos, API, seguridad, pruebas y mantenimiento |
| [Manual de usuario](docs/GUIA_USO.md) ([PDF](docs/GUIA_USO.pdf)) | Personas que consultan y personas encargadas |
| [Acta de entrega](docs/ACTA_ENTREGA.md) ([PDF](docs/ACTA_ENTREGA.pdf)) | Plantilla para la entrega al SENA |
| [Plan de fases](docs/PLAN_FASES.md) | Historia del desarrollo y decisiones |

## Tecnologías

React 19 + Vite (frontend compilado, sin servidor de Node), PHP 8.1+ sin framework (API JSON con PDO), MySQL 5.7+ o MariaDB 10.4+. La TRD se extrajo de los PDF oficiales con Python (`pdfplumber`). Detalle y versiones en la [ficha técnica](docs/FICHA_TECNICA.md).

## Estructura

| Carpeta | Contenido |
|---|---|
| `frontend/` | Aplicación en React y sus pruebas unitarias |
| `api/` | Servicios en PHP; `api/lib/` con configuración, conexión, sesión y validaciones |
| `consola/` | Creación de la primera cuenta por consola |
| `database/` | `instalacion_completa.sql`, `schema.sql`, `datos_iniciales.sql`, `trd.sql` y `migraciones/` |
| `scripts/` | Extracción de las TRD, pruebas de la API y en el navegador, empaquetado y generación de los PDF |
| `docs/` | Guías, ficha técnica, manual y plan |

## Instalar

El paquete `TRDCode-v1.0.0.zip` está en el [Release v1.0.0](https://github.com/nathuch/TRDCode/releases/tag/v1.0.0). En resumen:

1. Crear una base `utf8mb4_unicode_ci` y un usuario de MySQL con solo `SELECT`, `INSERT`, `UPDATE` y `DELETE`, e importar `database/instalacion_completa.sql`.
2. Copiar el contenido de `app/` a la carpeta pública del servidor.
3. Crear el `.env` (desde `.env.example`) **fuera** de la carpeta pública.
4. Crear la primera cuenta con `php consola/crear_primera_cuenta.php --env=<ruta del .env>`.
5. Ingresar y cargar el reporte de OnBase desde "Actualizar datos".

Los detalles, la configuración de Apache o Nginx y HTTPS están en la [guía de instalación](docs/INSTALACION.md).

## Desarrollo

Requisitos: PHP 8.1+ (en el equipo de desarrollo, el de XAMPP), MySQL o MariaDB, Node.js 22+ y, para extraer la TRD, Python 3 con `scripts/requirements.txt`.

```
# Base de datos (una vez): crear la base e importar database/instalacion_completa.sql
# Configuración: copiar .env.example a .env (no va al repositorio) y completarlo

# API (desde la raíz)
php -S 127.0.0.1:8000 scripts/servidor_dev.php

# Frontend (en frontend/), con la API reenviada por Vite
npm install
npm run dev
```

Pruebas:

```
cd frontend && npm test                                  # unitarias
php scripts/probar_auth.php                              # sesión y nombres reservados
php scripts/probar_usuarios.php                          # cuentas
php scripts/probar_importacion.php                       # importación (en una base temporal)
node scripts/pruebas-navegador/<prueba>.mjs [url]        # en el navegador (ver su README)
```

Las pruebas que crean cargas se corren solo contra la base temporal de `scripts/pruebas-navegador/base_temporal.php`.

Paquete de entrega: `powershell -ExecutionPolicy Bypass -File scripts\empaquetar.ps1 -Version 1.0.0`.

## Datos personales

El reporte de OnBase y los nombres de los expedientes traen datos de personas. Por eso:

- El repositorio y el paquete **no** llevan expedientes, reportes, cuentas ni `.env` (los `.xlsx` y `datos-prueba/` están en `.gitignore`).
- Sin sesión, la API no envía el nombre de los expedientes clasificados (IPC) ni reservados (IPR).
- Las pruebas y las capturas usan cuentas inventadas y nunca muestran nombres de expedientes.

## Licencia y créditos

Desarrollado para el SENA, Regional Tolima, Centros de Formación (2026).
