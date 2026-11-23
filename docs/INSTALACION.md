# Instalación de TRDCode

Guía para el área de sistemas. Explica cómo instalar TRDCode en un servidor web, crear la primera cuenta, hacer la primera carga del reporte, sacar copias de seguridad y actualizar a una versión nueva.

TRDCode es una aplicación web para consultar las series y subseries documentales (TRD 2020 y 2025) de los centros de formación de la Regional Tolima, con los expedientes del "Reporte Tolima" de OnBase. Tiene un frontend ya compilado (HTML, CSS y JavaScript), una API en PHP sin framework y una base de datos MySQL o MariaDB.

**Contenido**

1. [Requisitos](#1-requisitos)
2. [Contenido del paquete](#2-contenido-del-paquete)
3. [Base de datos y usuario de MySQL](#3-base-de-datos-y-usuario-de-mysql)
4. [Archivos de la aplicación](#4-archivos-de-la-aplicación)
5. [Configuración: el archivo .env](#5-configuración-el-archivo-env)
6. [Servidor web](#6-servidor-web)
7. [Primera cuenta](#7-primera-cuenta)
8. [Primera carga del reporte](#8-primera-carga-del-reporte)
9. [Verificaciones](#9-verificaciones)
10. [Copia de seguridad](#10-copia-de-seguridad)
11. [Actualizar a una versión nueva](#11-actualizar-a-una-versión-nueva)
12. [Cuentas y acceso](#12-cuentas-y-acceso)
13. [Problemas frecuentes](#13-problemas-frecuentes)

---

## 1. Requisitos

| Componente | Versión y condiciones |
|---|---|
| PHP | 8.1 o superior, con las extensiones `pdo_mysql`, `mbstring` y `session` |
| Servidor web | Apache 2.4 con `AllowOverride` habilitado para la carpeta de la aplicación, o Nginx con PHP-FPM (hay un ejemplo de configuración en la sección 6) |
| Base de datos | MySQL 5.7 o superior, o MariaDB 10.4 o superior, con InnoDB y `utf8mb4` |
| HTTPS | Recomendado. Con HTTPS, la cookie de sesión se marca `Secure` |
| Navegador de las personas usuarias | Edge, Chrome o Firefox actualizados, en computador o celular |

Para revisar la versión y las extensiones de PHP:

```
php -v
php -m
```

La lista de `php -m` debe incluir `pdo_mysql`, `mbstring` y `session`. Ojo: el PHP de la consola puede ser distinto del que usa el servidor web. Lo que cuenta para la aplicación es el PHP del servidor web.

No se necesitan Node.js, Composer ni Python: el frontend ya viene compilado.

## 2. Contenido del paquete

El archivo `TRDCode-vX.Y.Z.zip` trae una carpeta `TRDCode-vX.Y.Z` con:

| Carpeta o archivo | Qué es | ¿Va en la carpeta pública? |
|---|---|---|
| `app/` | La aplicación: `index.html`, `assets/`, `robots.txt`, `api/` (servicios en PHP) y `consola/` (script de la primera cuenta), con sus `.htaccess` | **Sí**, su contenido |
| `database/` | `schema.sql`, `datos_iniciales.sql`, `trd.sql` y `migraciones/` | No |
| `docs/` | Esta guía y el manual de usuario en PDF | No |
| `.env.example` | Plantilla de la configuración | No |
| `LEEME.txt` | Resumen del paquete | No |

El paquete **no trae datos personales**: ni expedientes, ni reportes, ni cuentas, ni contraseñas. La base se instala con los centros, las dependencias y la TRD. Los expedientes llegan con la primera carga del reporte (sección 8).

## 3. Base de datos y usuario de MySQL

La aplicación usa **un usuario de MySQL propio, con permisos solo sobre su base**. No se debe usar `root` ni un usuario administrador.

En los ejemplos, la base se llama `trdcode` y el usuario `trdcode_app`. Se pueden usar otros nombres; deben coincidir con los del `.env` (sección 5).

### 3.1. Crear la base y el usuario

Con un usuario administrador de MySQL o MariaDB:

```sql
CREATE DATABASE trdcode CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER 'trdcode_app'@'localhost' IDENTIFIED BY 'una-contraseña-larga-y-única';
GRANT SELECT, INSERT, UPDATE, DELETE ON trdcode.* TO 'trdcode_app'@'localhost';
FLUSH PRIVILEGES;
```

- La aplicación solo necesita `SELECT`, `INSERT`, `UPDATE` y `DELETE` sobre su base. Crear las tablas y aplicar las migraciones lo hace el administrador.
- Si la base de datos está en otro servidor, se cambia `'localhost'` por la IP o el nombre del servidor web, y se deja abierto el puerto de MySQL solo para ese servidor.
- La base debe usar `utf8mb4` y `utf8mb4_unicode_ci`. Con otro cotejamiento fallan las tildes y los cruces entre tablas.

### 3.2. Crear las tablas y cargar la TRD

Se ejecutan los tres scripts **en este orden**, con un usuario administrador, desde la carpeta descomprimida del paquete:

```
mysql -u root -p --default-character-set=utf8mb4 trdcode -e "source database/schema.sql"
mysql -u root -p --default-character-set=utf8mb4 trdcode -e "source database/datos_iniciales.sql"
mysql -u root -p --default-character-set=utf8mb4 trdcode -e "source database/trd.sql"
```

- `--default-character-set=utf8mb4` es necesario. Sin él, la consola de Windows puede dañar las tildes de los nombres de los centros.
- La forma `-e "source …"` funciona igual en el Símbolo del sistema, en PowerShell y en Linux. No se recomienda `Get-Content … | mysql` en PowerShell, porque cambia la codificación.
- También se pueden importar con phpMyAdmin (base `trdcode` → pestaña "Importar"), uno por uno y en el mismo orden.
- Las bases nuevas **no** necesitan las migraciones de `database/migraciones/`: `schema.sql` y `datos_iniciales.sql` ya las incluyen. Se usan solo al actualizar (sección 11).

Para comprobar el resultado:

```sql
SELECT COUNT(*) FROM centros;        -- 3
SELECT COUNT(*) FROM dependencias;   -- 8
SELECT version, COUNT(*) FROM trd_registros GROUP BY version;   -- versiones 10 y 11
SELECT COUNT(*) FROM usuarios;       -- 0
SELECT COUNT(*) FROM expedientes;    -- 0
```

## 4. Archivos de la aplicación

Se copia **el contenido** de `app/` a la carpeta pública del servidor. La aplicación funciona en cualquier carpeta y con cualquier nombre, sin volver a compilar, porque todas sus rutas son relativas. Por ejemplo:

- Windows con XAMPP: `C:\xampp\htdocs\TRDCode\` (queda `C:\xampp\htdocs\TRDCode\index.html`).
- Linux: `/var/www/html/trdcode/`, o la raíz de un sitio propio (`/var/www/trdcode/`).

Hay que copiar también los archivos que empiezan con punto (`.htaccess`). En Linux, por ejemplo:

```
cp -r TRDCode-vX.Y.Z/app/. /var/www/html/trdcode/
```

En Linux, el usuario del servidor web (por ejemplo `www-data`) solo necesita **leer** estos archivos. No necesita escribir en ellos.

Las carpetas `database/` y `docs/`, el `.env.example` y el `.env` real **no** van en la carpeta pública.

## 5. Configuración: el archivo .env

La conexión a la base y las opciones de la aplicación se leen de un archivo `.env`. Ese archivo tiene la contraseña de la base: **debe quedar fuera de la carpeta pública**, en una ruta que el servidor web pueda leer pero que no se pueda pedir desde el navegador.

### 5.1. Crear el archivo

Se copia `.env.example` con otro nombre (por ejemplo `trdcode.env`) en una carpeta fuera de la carpeta pública, y se completan sus datos:

```
DB_HOST=localhost
DB_NAME=trdcode
DB_USER=trdcode_app
DB_PASS=una-contraseña-larga-y-única

# Opcional: solo si MySQL no usa el puerto 3306.
# DB_PORT=3306

OCULTAR_NOMBRES_RESERVADOS=true
```

- Si la contraseña tiene espacios o el carácter `#`, se escribe entre comillas: `DB_PASS="…"`.
- `OCULTAR_NOMBRES_RESERVADOS=true` viene activa: **sin sesión**, la API **no envía** el nombre de los expedientes clasificados (IPC) ni reservados (IPR), y la aplicación los muestra como "Nombre reservado". Las personas encargadas, **con sesión iniciada**, sí ven los nombres reales (en pantalla, en el Excel y en el PDF); esa respuesta lleva `Cache-Control: private, no-store` y `Vary: Cookie` para que ningún proxy ni caché compartida la guarde. Con `false`, todos ven los nombres reales, también sin sesión: solo se cambia si el SENA lo autoriza por escrito. Cualquier valor distinto de `false` deja los nombres ocultos para quien no ha ingresado.
- En Linux, el archivo debe poder leerlo el usuario del servidor web y nadie más. Por ejemplo: `chown root:www-data /etc/trdcode/trdcode.env` y `chmod 640 /etc/trdcode/trdcode.env`.

### 5.2. Indicar dónde está: TRDCODE_ENV

La aplicación busca el `.env` en este orden:

1. **La ruta de la variable de entorno `TRDCODE_ENV`.** Es la forma recomendada. Se define en el servidor web (sección 6).
2. **Junto a la raíz de documentos del servidor, con el nombre de la carpeta de la aplicación.** El archivo queda en la carpeta que contiene la raíz de documentos (la que contiene `htdocs`, por ejemplo) y se llama como la carpeta de la aplicación, más `.env`. Con la raíz de documentos en `C:\xampp\htdocs` y la aplicación en `C:\xampp\htdocs\TRDCode`, el archivo es `C:\xampp\TRDCode.env`. Sirve para instalaciones sencillas en Windows, sin tocar la configuración de Apache.
3. Dentro de la carpeta de la aplicación. Solo se usa en desarrollo: en un servidor **no** se deja ahí. El `.htaccess` lo bloquea, pero quedaría expuesto si el servidor no aplica los `.htaccess`.

## 6. Servidor web

### 6.1. Apache

Los `.htaccess` del paquete hacen esto:

- El de la raíz de la aplicación niega cualquier archivo que empiece con punto (`.env`, `.htaccess`…) y desactiva el listado de carpetas.
- Los de `api/lib/` y `consola/` niegan todo su contenido.

Para que funcionen, la carpeta de la aplicación debe tener `AllowOverride All`, o como mínimo `AllowOverride AuthConfig Options=Indexes`. La variable `TRDCODE_ENV` se define con `SetEnv` en la configuración del sitio. Ejemplo para una aplicación en `/var/www/html/trdcode`:

```apache
<Directory "/var/www/html/trdcode">
    AllowOverride All
    Require all granted
    SetEnv TRDCODE_ENV /etc/trdcode/trdcode.env
</Directory>
```

En Windows con XAMPP, el bloque va en `C:\xampp\apache\conf\extra\httpd-xampp.conf` o en `httpd.conf`, con rutas como `C:/xampp/htdocs/TRDCode` y `C:/xampp/trdcode/trdcode.env`. Después de cambiar la configuración se reinicia Apache.

Si no se puede tocar la configuración del sitio, `SetEnv TRDCODE_ENV …` también funciona dentro del `.htaccess` de la raíz de la aplicación, siempre que `AllowOverride` incluya `FileInfo`. La otra salida es la forma 2 de la sección 5.2.

**HTTPS.** Se recomienda servir la aplicación solo por HTTPS y redirigir el HTTP a HTTPS. Con HTTPS, la cookie de sesión lleva `Secure`. Por HTTP la aplicación funciona igual, pero la contraseña y la sesión viajan sin cifrar.

Si el HTTPS termina en un proxy o balanceador y Apache recibe la petición por HTTP, hay que avisarle a PHP. Si no, la cookie sale sin `Secure`:

```apache
SetEnvIf X-Forwarded-Proto "^https$" HTTPS=on
```

### 6.2. Nginx con PHP-FPM

Nginx no lee los `.htaccess`: los bloqueos se escriben en la configuración del sitio. Ejemplo con la aplicación en la raíz de un sitio propio:

```nginx
server {
    listen 443 ssl;
    server_name trdcode.ejemplo.sena.edu.co;
    # ssl_certificate y ssl_certificate_key del certificado del sitio

    root /var/www/trdcode;
    index index.html;

    # Nada que empiece con punto (.env, .htaccess...), ni la librería de la API, ni la consola.
    location ~ /\.          { deny all; }
    location ^~ /api/lib/   { deny all; }
    location ^~ /consola/   { deny all; }

    # Solo se ejecutan los servicios de api/.
    location ~ ^/api/[a-z_]+\.php$ {
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param TRDCODE_ENV /etc/trdcode/trdcode.env;
        fastcgi_param HTTPS on;   # si el HTTPS termina en este mismo Nginx
        fastcgi_pass unix:/run/php/php8.1-fpm.sock;
    }
    location ~ \.php$ { deny all; }

    location / { try_files $uri $uri/ =404; }

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
}

server {
    listen 80;
    server_name trdcode.ejemplo.sena.edu.co;
    return 301 https://$host$request_uri;
}
```

Si la aplicación va en una subcarpeta (por ejemplo `/trdcode/`), se antepone esa subcarpeta a las rutas de los `location` (`^~ /trdcode/api/lib/`, `~ ^/trdcode/api/[a-z_]+\.php$`, etc.). El socket de PHP-FPM cambia según la versión instalada.

### 6.3. PHP

- No se necesita cambiar `php.ini`. La importación manda los expedientes en lotes pequeños, así que los límites por defecto (`post_max_size`, `memory_limit` y `max_execution_time`) alcanzan.
- La sesión usa el almacenamiento normal de PHP. La carpeta de `session.save_path` debe existir y el servidor web debe poder escribir en ella.
- Se recomienda `display_errors = Off` en producción.

## 7. Primera cuenta

La primera cuenta (la de la persona encargada de actualizar los datos) se crea **desde la consola del servidor**, con el script `consola/crear_primera_cuenta.php` de la carpeta de la aplicación. No hay página web de instalación: la carpeta `consola/` está bloqueada para la web y el script se niega a correr fuera de la consola.

Desde la carpeta de la aplicación, con la ruta del `.env`:

```
php consola/crear_primera_cuenta.php --env=/etc/trdcode/trdcode.env
```

En Windows con XAMPP, por ejemplo:

```
cd C:\xampp\htdocs\TRDCode
C:\xampp\php\php.exe consola\crear_primera_cuenta.php --env=C:\xampp\trdcode\trdcode.env
```

El script:

1. Muestra el nombre de la base a la que se conectó.
2. Pide el correo, el nombre completo y la contraseña, dos veces. La contraseña tiene entre 10 y 72 caracteres y no se ve al escribirla.
3. Guarda solo el hash de la contraseña (`password_hash`).

**Solo funciona si la base todavía no tiene ninguna cuenta activa.** Si ya hay una, se niega sin cambiar nada. Las demás cuentas se crean desde la aplicación, en "Usuarios" (sección 12).

Se recomienda correrlo desde el Símbolo del sistema o PowerShell en Windows, o desde una terminal normal en Linux. En consolas que no ocultan lo que se escribe, como Git Bash (mintty) en Windows, la contraseña se vería en pantalla.

## 8. Primera carga del reporte

La base queda instalada sin expedientes. Para cargarlos:

1. Se abre la aplicación en el navegador, por ejemplo `https://servidor/trdcode/` o `http://localhost/TRDCode/`. La consulta ya muestra la TRD, pero sin expedientes.
2. Con "Ingresar" (arriba a la derecha), se entra con la cuenta de la sección 7.
3. En el menú de la cuenta se elige **"Actualizar datos"**, y se arrastra o se elige el archivo Excel del "Reporte Tolima" exportado de OnBase.
4. La aplicación lee el archivo en el navegador y muestra una vista previa: cuántos expedientes trae por centro y si hay filas con problemas. Si todo está bien, se confirma la carga.
5. Al terminar, la consulta muestra "Datos al …" con la fecha del reporte y los expedientes de los tres centros.

Cada carga reemplaza a la anterior, pero las anteriores se guardan: desde "Actualizar datos" → "Cargas guardadas" se puede volver a una carga anterior. El manual de usuario (`docs/Manual_de_usuario_TRDCode.pdf`) explica estas pantallas.

El reporte trae nombres de personas. No debe quedar en la carpeta pública ni en carpetas compartidas del servidor.

## 9. Verificaciones

Después de instalar, se revisa lo siguiente (cambiando la dirección por la de la instalación):

| Qué | Cómo | Resultado esperado |
|---|---|---|
| La aplicación abre | `https://servidor/trdcode/` | Pantalla de inicio de TRDCode |
| La API responde | `https://servidor/trdcode/api/datos.php` | Un JSON con `"ok":true` |
| La librería de la API está bloqueada | `https://servidor/trdcode/api/lib/config.php` | 403 o 404 |
| La consola está bloqueada | `https://servidor/trdcode/consola/crear_primera_cuenta.php` | 403 o 404 |
| Los archivos con punto están bloqueados | `https://servidor/trdcode/.env`, `/.env.example` y `/.htaccess` | 403 o 404 |
| No se listan carpetas | `https://servidor/trdcode/assets/` | 403 o 404 |
| Los buscadores no indexan | `https://servidor/trdcode/robots.txt` | `Disallow: /` |
| La cookie de sesión es segura | Ingresar y revisar en las herramientas del navegador (F12 → Aplicación → Cookies) la cookie `TRDCODE_SESION` | `HttpOnly`, `SameSite=Strict` y, con HTTPS, `Secure` |
| Los nombres reservados no salen sin sesión | En `api/datos.php`, sin haber ingresado (o con `curl`, sin cookie), buscar un expediente con `"control_acceso":"IPC"` | Su nombre es "Nombre reservado (IPC)" |

Con `curl`, por ejemplo:

```
curl -s -o /dev/null -w "%{http_code}\n" https://servidor/trdcode/api/lib/config.php
```

## 10. Copia de seguridad

Todo lo que cambia está en la base de datos: cuentas, cargas y expedientes. Los archivos de la aplicación se pueden volver a copiar del paquete, y el `.env` se respalda aparte.

Copia de la base:

```
mysqldump -u trdcode_app -p --single-transaction --no-tablespaces --default-character-set=utf8mb4 trdcode > trdcode_respaldo.sql
```

- `--single-transaction` saca una copia coherente sin bloquear la aplicación.
- `--no-tablespaces` evita que MySQL 8 pida el permiso `PROCESS`, que el usuario de la aplicación no tiene.
- La copia tiene nombres de personas y los hashes de las contraseñas. Se guarda con acceso restringido, igual que el reporte de OnBase.
- Se recomienda programarla (con el Programador de tareas o `cron`) antes y después de cada carga del reporte, y conservar varias copias.

Para restaurar sobre una base vacía, creada como en la sección 3.1:

```
mysql -u root -p --default-character-set=utf8mb4 trdcode -e "source trdcode_respaldo.sql"
```

## 11. Actualizar a una versión nueva

1. **Copia de seguridad** de la base (sección 10).
2. **Archivos:** se reemplaza el contenido de la carpeta pública por el `app/` del paquete nuevo. Lo más limpio es borrar el contenido anterior y copiar el nuevo, para que no queden archivos viejos en `assets/`. El `.env`, que está fuera de la carpeta pública, no se toca.
3. **Migraciones:** se aplican **en orden de número**, con un usuario administrador, las migraciones de `database/migraciones/` del paquete nuevo que la base todavía no tenga:

   ```
   mysql -u root -p --default-character-set=utf8mb4 trdcode -e "source database/migraciones/001_usuarios.sql"
   mysql -u root -p --default-character-set=utf8mb4 trdcode -e "source database/migraciones/002_granja_administracion.sql"
   ```

   | Migración | Qué hace |
   |---|---|
   | `001_usuarios.sql` | Columnas de las cuentas editables (contraseña temporal, último ingreso y cierre de sesiones). |
   | `002_granja_administracion.sql` | Agrega la dependencia Administración Educativa de Agropecuario La Granja (73.9123.2). |

   Las migraciones se pueden repetir sin riesgo: cada una revisa qué falta y solo agrega eso. Si no se sabe cuáles se aplicaron, se aplican todas en orden.
4. Se recarga la aplicación en el navegador (Ctrl + F5) y se repiten las verificaciones de la sección 9.

No se vuelven a ejecutar `schema.sql` ni `datos_iniciales.sql` sobre una base con datos. `trd.sql` solo se ejecuta otra vez si la versión nueva trae una TRD corregida: reemplaza la TRD y no toca cuentas, cargas ni expedientes.

## 12. Cuentas y acceso

- **Crear más cuentas:** cualquier cuenta activa crea las demás desde **"Usuarios"**, en la aplicación. La cuenta nueva recibe una contraseña temporal y debe cambiarla al entrar.
- **Olvido de contraseña:** otra cuenta activa le asigna una contraseña temporal desde "Usuarios".
- **Si ninguna cuenta activa puede entrar:** se desactivan las cuentas en la base y se vuelve a correr el script de la sección 7. Si se usa el correo de una cuenta existente, el script la reactiva con el nombre y la contraseña nuevos, sin duplicarla, y cierra sus sesiones anteriores:

  ```sql
  UPDATE usuarios SET activo = 0;
  ```

  ```
  php consola/crear_primera_cuenta.php --env=/etc/trdcode/trdcode.env
  ```

- Las cuentas no se borran, porque cada carga guarda quién la hizo. Se desactivan desde "Usuarios".
- La cuenta "Sistema" (`carga-inicial@trdcode.local`) puede aparecer si la base viene del prototipo. No inicia sesión ni se puede editar.
- **Bloqueo por intentos:** tras 5 contraseñas erradas con el mismo correo desde la misma IP, o 20 desde una IP con cualquier correo, el ingreso se bloquea 15 minutos. Pasado ese tiempo se desbloquea solo.
- La sesión se cierra tras 30 minutos sin actividad.

## 13. Problemas frecuentes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| La página sale en blanco o sin estilos | Se copió la carpeta `app` en lugar de su contenido, o falta `assets/` | Revisar que `index.html` y `assets/` queden directamente en la carpeta de la aplicación |
| "No se pudieron cargar los datos", y `api/datos.php` responde "No se pudieron leer los datos" | La API no encuentra el `.env` o no se conecta a la base. Por seguridad, el navegador no recibe el detalle: queda en el registro de errores de PHP o del servidor web, con el prefijo `TRDCode datos.php:` | Leer ese registro. Si dice "No se encontró el archivo .env de TRDCode" (en el registro de Apache la tilde puede verse como `\xc3\xb3`), revisar `TRDCODE_ENV` (o el nombre del archivo, forma 2 de la sección 5.2) |
| `TRDCODE_ENV` está definida pero no se encuentra el `.env` | La variable no llega a PHP, la ruta está mal escrita o el servidor web no puede leer el archivo | En Apache, revisar el `SetEnv` y reiniciar. En Nginx, revisar el `fastcgi_param` y recargar. Comprobar los permisos del archivo |
| Error de acceso a la base ("Access denied") | Usuario, contraseña o host del `.env` distintos de los de MySQL | Probar con `mysql -u trdcode_app -p -h <DB_HOST> trdcode` desde el servidor web |
| `api/lib/config.php` o `.env.example` se pueden abrir | Apache no aplica los `.htaccess` | Habilitar `AllowOverride` (sección 6.1). En Nginx, agregar los `deny` de la sección 6.2 |
| Error 500 en todas las páginas tras copiar los archivos | Apache no permite alguna directiva del `.htaccess` (`Options` o `Require`) | Dar `AllowOverride All`, o `AuthConfig Options=Indexes`, y revisar el registro de errores de Apache |
| Las tildes salen dañadas en los nombres de los centros | Los SQL se importaron sin `--default-character-set=utf8mb4` | Volver a crear la base e importar los scripts como en la sección 3.2 |
| No se puede ingresar: la página vuelve a pedir el correo | La sesión no se guarda | Revisar que `session.save_path` exista y el servidor web pueda escribir en ella. Si se entra por HTTP a un sitio que fuerza HTTPS, entrar siempre por la misma dirección |
| "Demasiados intentos fallidos" | Bloqueo por intentos (sección 12) | Esperar los minutos que indica el mensaje |
| "Correo o contraseña incorrectos" con los datos correctos | La cuenta está desactivada, o el correo tiene un error | Otra cuenta activa la revisa en "Usuarios". Si nadie puede entrar, seguir la sección 12 |
| El script de la primera cuenta dice que ya hay cuentas activas | La base ya tiene una cuenta activa | Crear la cuenta desde "Usuarios", o seguir la sección 12 si nadie puede entrar |
| La consulta muestra la TRD pero 0 expedientes | Todavía no se hizo la primera carga | Seguir la sección 8 |
| La carga del reporte se detiene con un error de la red | Un proxy o firewall limita el tamaño o la duración de las peticiones | Revisar los límites del proxy (por ejemplo `client_max_body_size` en Nginx) y volver a intentar. La carga a medias no reemplaza la anterior |
| Tras actualizar, la aplicación se ve como la versión anterior | Caché del navegador | Recargar con Ctrl + F5 |
