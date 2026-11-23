# Pruebas en el navegador

Abren Edge (o Chrome) sin ventana y usan la aplicación con teclado y mouse reales. Sirven para el servidor de desarrollo y para la copia de Apache. No necesitan dependencias aparte de Node y el `npm install` de `frontend/`.

No llevan datos reales: las cuentas son temporales (correo `prueba-…@trdcode.local` y contraseña al azar) y se borran al terminar; la base se lee del `.env` (o de `TRDCODE_ENV`). No imprimen títulos de expedientes, correos ni contraseñas. Las capturas quedan fuera del repositorio, en `%TEMP%\trdcode-capturas` (o en la carpeta de la variable `CAPTURAS`).

| Prueba | Qué revisa | ¿Cambia datos? |
|---|---|---|
| `inicio.mjs` | Pantalla de inicio, paso a la consulta, atrás/adelante, enlaces compartidos, celular | No |
| `ingreso.mjs` | Ingreso, errores, bloqueo, menú, cambio de contraseña y salida | Solo su cuenta temporal |
| `vista.mjs` | Pestañas y ficha con el teclado, control de acceso, h2, `aria-live`, zonas táctiles; celular a 390 px en todas las pantallas | Solo su cuenta temporal |
| `menus.mjs` | Menú de la usuaria y selectores de filtros abiertos: completos dentro de la pantalla, sin pasar los márgenes y alineados a su botón, a 320, 390, 768 y 1.280 px | Solo su cuenta temporal |
| `exportar.mjs` | Menú "Exportar" e "Imprimir": descarga el PDF y el Excel de la consulta y de la ficha de 85.15, los lee y los compara con lo que se ve (los 17 expedientes, ningún nombre reservado, "Página N de M"); la impresión con la emulación de impresión del navegador (también una ficha de más de 50 expedientes); con una cuenta temporal, que con sesión la ficha, el Excel y el PDF llevan los nombres reales de los IPC e IPR y que al salir vuelven a ocultarse (#82, sin capturas); el menú a 320 y 390 px | Solo su cuenta temporal |
| `usuarios.mjs` | "Usuarios" y "Mi cuenta": crear, editar, contraseña temporal (y la ventana que obliga a cambiarla), desactivar y activar; nombre, correo y contraseña propios; celular a 390 px | Solo sus cuentas temporales |
| `actualizar.mjs` | "Actualizar datos" completo: arrastrar, vista previa, carga, historial y volver a una carga | **Sí: crea cargas.** Solo en una base temporal |
| `instalacion.mjs` | P-28: una instalación nueva del paquete (`docs/INSTALACION.md`). Que empiece sin expedientes, que no se pueda descargar nada privado (`.env`, `api/lib/`, `consola/`, `.htaccess`, listados de carpetas), rutas relativas; entra con la primera cuenta, hace la primera carga del reporte de agosto y comprueba 643 y la 85.15 con 17 | **Sí: crea la primera carga.** Solo en una instalación nueva

## Cómo correrlas

Desde la raíz del proyecto, con la aplicación encendida. El argumento es la dirección (por defecto, `http://localhost:5173/`):

```
node scripts/pruebas-navegador/inicio.mjs
node scripts/pruebas-navegador/ingreso.mjs
node scripts/pruebas-navegador/vista.mjs http://localhost/TRDCode/
```

En desarrollo: `C:\xampp\php\php.exe -S 127.0.0.1:8000 scripts/servidor_dev.php` en la raíz y `npm run dev` en `frontend/`.

## La prueba que crea cargas (`actualizar.mjs`)

Se niega a correr si la base tiene cargas guardadas además de la activa, para no tocar un historial real. Se corre contra una base temporal, con el servidor de desarrollo (Git Bash, desde la raíz):

```
C:/xampp/php/php.exe scripts/pruebas-navegador/base_temporal.php crear
export TRDCODE_ENV="$(pwd)/datos-prueba/prueba.env"                  # ruta completa: php -S no entiende una relativa
C:/xampp/php/php.exe -S 127.0.0.1:8000 scripts/servidor_dev.php      # en otra terminal, con el mismo TRDCODE_ENV
node scripts/pruebas-navegador/actualizar.mjs
unset TRDCODE_ENV
C:/xampp/php/php.exe scripts/pruebas-navegador/base_temporal.php borrar
```

Antes de crear cuentas o cargas, `ingreso.mjs`, `vista.mjs`, `menus.mjs`, `usuarios.mjs` y `actualizar.mjs` comprueban que la aplicación probada use la misma base que ellas (comparan la carga activa que entrega `datos.php`); si no coincide, se detienen sin escribir nada.

`base_temporal.php` crea `trdcode_prueba` con los scripts de `database/` y `datos-prueba/expedientes.sql`, y escribe `datos-prueba/prueba.env` (no va al repositorio). Necesita `datos-prueba/reporte-tolima-2026-08-10.xlsx`. El Excel inventado con filas con problemas lo genera la prueba al correr (los `.xlsx` no van al repositorio).

`exportar.mjs` descarga los archivos en una carpeta temporal que borra al terminar, y lee el PDF con `leer_pdf.mjs` (solo sirve para los PDF de TRDCode: jsPDF sin comprimir). Deja junto a las capturas la hoja impresa por el navegador (`exportar-impresion-*.pdf`), para revisarla a ojo.

Variables opcionales: `NAVEGADOR` (ruta de Edge o Chrome), `PHP` (por defecto `C:\xampp\php\php.exe`) y `CAPTURAS`.

## La prueba de una instalación nueva (`instalacion.mjs`, P-28)

Se corre contra una instalación hecha con el zip de `scripts/empaquetar.ps1` siguiendo `docs/INSTALACION.md` (base nueva, usuario de MySQL propio y la primera cuenta creada con `consola/crear_primera_cuenta.php`). Se niega si la instalación ya tiene una carga. Las credenciales de la primera cuenta llegan por variables de entorno y no se imprimen:

```
TRDCODE_CORREO=... TRDCODE_CLAVE=... node scripts/pruebas-navegador/instalacion.mjs http://localhost/trd-prueba/
```

Después, `exportar.mjs` contra la misma dirección revisa el PDF, el Excel y la impresión.
