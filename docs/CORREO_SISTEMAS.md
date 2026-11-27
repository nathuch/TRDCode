**Para:** Área de sistemas, SENA Regional Tolima
**Asunto:** Entrega de TRDCode v1.0.0 — requisitos del servidor e instalación

---

Respetado equipo del Área de sistemas, SENA Regional Tolima:

Reciban un cordial saludo.

Por medio de este correo les presentamos **TRDCode v1.0.0**, una aplicación web para consultar las series y subseries documentales de las Tablas de Retención Documental (TRD 2020 y 2025) de los centros de formación Industria y Construcción, Comercio y Servicios y Agropecuario La Granja. La aplicación cruza la TRD con los expedientes del "Reporte Tolima" de OnBase. Fue desarrollada para el área de Gestión Documental, que ya la revisó y aprobó.

Les solicitamos su apoyo para instalarla en un servidor de la Regional, de modo que pueda consultarse desde la red institucional.

**Qué se entrega**

- `TRDCode-v1.0.0.zip`: el paquete de instalación (aplicación, scripts de la base de datos y plantilla de configuración). No contiene datos personales, expedientes ni cuentas.
- `INSTALACION.pdf`: la guía de instalación para el servidor.
- `GUIA_RAPIDA_PRUEBA.pdf`: pasos para probar la aplicación en un computador con XAMPP antes de instalarla.
- `FICHA_TECNICA.pdf`: arquitectura, tecnologías, modelo de datos, seguridad y mantenimiento.
- `GUIA_USO.pdf`: el manual de usuario.

El paquete también está publicado en https://github.com/nathuch/TRDCode/releases/tag/v1.0.0.

**Requisitos del servidor**

| Componente | Requisito |
|---|---|
| PHP | 8.1 o superior, con las extensiones `pdo_mysql`, `mbstring` y `session` |
| Servidor web | Apache 2.4 con `AllowOverride` habilitado, o Nginx con PHP-FPM |
| Base de datos | MySQL 5.7 o superior, o MariaDB 10.4 o superior (InnoDB, `utf8mb4`) |
| Usuario de la base | Uno propio, con permisos solo de `SELECT`, `INSERT`, `UPDATE` y `DELETE` sobre su base (no `root`) |
| Espacio | Unos 2 MB para la aplicación y alrededor de 10 MB para la base de datos |
| Certificado | **HTTPS**, recomendado (ver abajo) |

No se necesitan Node.js, Composer ni Python en el servidor: la aplicación viene compilada.

**Pasos generales** (el detalle está en `INSTALACION.pdf`)

1. Crear la base de datos (`utf8mb4_unicode_ci`) y su usuario, e importar `database/instalacion_completa.sql`.
2. Copiar el contenido de la carpeta `app/` a la carpeta pública del servidor. Funciona en cualquier carpeta o subdominio.
3. Crear el archivo de configuración `.env` a partir de `.env.example`, **fuera de la carpeta pública**, e indicar su ruta con la variable `TRDCODE_ENV`.
4. Crear la primera cuenta desde la consola del servidor con `consola/crear_primera_cuenta.php`. Será la de la encargada de Gestión Documental, con su correo institucional.
5. Verificar que los archivos privados (`.env`, `api/lib/`, `consola/`) respondan 403, como indica la guía.
6. La encargada ingresa y carga el reporte de OnBase desde "Actualizar datos".

**Recomendación: HTTPS.** Recomendamos publicar la aplicación con HTTPS. Las personas encargadas ingresan con usuario y contraseña, y con la sesión iniciada ven los nombres de expedientes clasificados y reservados. Con HTTPS, la cookie de sesión viaja cifrada y marcada como `Secure`. Si el HTTPS termina en un proxy, la guía explica cómo indicárselo a PHP.

**Mantenimiento.** La encargada carga el reporte cada mes desde la aplicación; no requiere intervención de sistemas. Sí recomendamos una copia de seguridad periódica de la base con `mysqldump` (sección 10 de la guía de instalación). Esas copias contienen nombres de personas, por lo que deben guardarse con las mismas medidas que el reporte de OnBase.

Quedamos atentos a cualquier inquietud y a coordinar la instalación.

Cordialmente,

&nbsp;

_______________________________
Nombre:
Cargo:
Correo:
Teléfono:
