# Guía rápida de prueba de TRDCode

Pasos cortos para instalar TRDCode en un computador con Windows y XAMPP, probarla y quitarla después. Sirve para conocer la aplicación o revisar el paquete antes de instalarlo en el servidor. Para la instalación definitiva (Linux, Nginx, HTTPS, copias de seguridad) está la **Guía de instalación** (`docs/INSTALACION.pdf`).

Tiempo aproximado: 20 minutos.

---

## 1. Lo que se necesita

- **XAMPP** con Apache y PHP 8.1 o más nuevo.
- **MySQL 5.7 u 8, o MariaDB 10.4 o más nueva**: la de XAMPP sirve.
- El archivo **`TRDCode-v1.0.0.zip`**.
- Para cargar expedientes, el **Reporte Tolima** de OnBase en Excel. Sin él, la aplicación muestra solo la TRD.

En los ejemplos, la aplicación queda en `C:\xampp\htdocs\TRDCode` y la base se llama `trdcode`. Se pueden usar otros nombres; en cada paso se dice qué cambia.

## 2. Descomprimir el paquete

Descomprima el zip en una carpeta de trabajo, por ejemplo `C:\TRDCode-instalador`. Queda la carpeta `C:\TRDCode-instalador\TRDCode-v1.0.0` con `app`, `database`, `docs`, `.env.example` y `LEEME.txt`.

## 3. Crear la base de datos

1. Encienda MySQL (o MariaDB) en el panel de XAMPP, si no está encendido.
2. Abra **phpMyAdmin** (`http://localhost/phpmyadmin`) → pestaña **SQL**, o la consola de MySQL, y ejecute (cambie la contraseña por una propia):

   ```sql
   CREATE DATABASE trdcode CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'trdcode_app'@'localhost' IDENTIFIED BY 'una-contraseña-larga';
   GRANT SELECT, INSERT, UPDATE, DELETE ON trdcode.* TO 'trdcode_app'@'localhost';
   FLUSH PRIVILEGES;
   ```

3. Importe **un solo archivo**, `database\instalacion_completa.sql`, en la base `trdcode`:

   - En phpMyAdmin: elija la base `trdcode` → pestaña **Importar** → el archivo → **Importar**.
   - O desde el Símbolo del sistema, en la carpeta del paquete:

   ```
   cd C:\TRDCode-instalador\TRDCode-v1.0.0
   C:\xampp\mysql\bin\mysql.exe -u root -p --default-character-set=utf8mb4 trdcode -e "source database/instalacion_completa.sql"
   ```

4. Compruebe que quedaron **3 centros** y **9 dependencias** (en phpMyAdmin, las tablas `centros` y `dependencias`).

## 4. Copiar la aplicación

Copie **el contenido** de la carpeta `app` a `C:\xampp\htdocs\TRDCode`, incluido el archivo `.htaccess`. Desde el Símbolo del sistema:

```
robocopy C:\TRDCode-instalador\TRDCode-v1.0.0\app C:\xampp\htdocs\TRDCode /E
```

Debe quedar `C:\xampp\htdocs\TRDCode\index.html`. La carpeta puede tener otro nombre (por ejemplo `trd-prueba`); funciona igual.

## 5. Crear el archivo de configuración (.env)

1. Copie `.env.example` del paquete a **`C:\xampp\TRDCode.env`**: junto a la carpeta `htdocs`, **no** dentro de ella. El archivo se llama como la carpeta de la aplicación más `.env` (con la carpeta `trd-prueba`, sería `C:\xampp\trd-prueba.env`).
2. Ábralo con el Bloc de notas y complete los datos de la base del paso 3:

   ```
   DB_HOST=localhost
   DB_NAME=trdcode
   DB_USER=trdcode_app
   DB_PASS=una-contraseña-larga
   OCULTAR_NOMBRES_RESERVADOS=true
   ```

   Si MySQL no usa el puerto 3306, agregue la línea `DB_PORT=` con el puerto.

## 6. Abrir la aplicación

1. Encienda **Apache** en el panel de XAMPP.
2. Abra **`http://localhost/TRDCode/`** en el navegador. Debe aparecer la pantalla de inicio con los tres centros. Como todavía no hay reporte cargado, la consulta muestra solo la TRD.

Si sale un mensaje de error de conexión, revise los datos del `.env` (paso 5).

## 7. Crear la primera cuenta

En el Símbolo del sistema (no en Git Bash, porque ahí se vería la contraseña):

```
cd C:\xampp\htdocs\TRDCode
C:\xampp\php\php.exe consola\crear_primera_cuenta.php --env=C:\xampp\TRDCode.env
```

El script pide el correo, el nombre completo y la contraseña dos veces (de 10 a 72 caracteres; no se ve al escribirla). Solo funciona mientras no haya ninguna cuenta activa. Las demás cuentas se crean después desde **Usuarios**, dentro de la aplicación.

## 8. Cargar el reporte

1. En la aplicación, pulse **Ingresar** (arriba a la derecha) y entre con la cuenta del paso 7.
2. En el menú de la cuenta, elija **Actualizar datos**.
3. Arrastre o elija el Excel del Reporte Tolima. Revise la vista previa (expedientes por centro y filas con problemas) y confirme la carga.
4. Arriba debe aparecer **"Datos al …"** con la fecha del reporte.

## 9. Comprobar

| Qué | Cómo | Debe pasar |
|---|---|---|
| La consulta funciona | Elija un centro y una dependencia, o busque "historias" | Aparecen series y subseries con su cantidad de expedientes |
| Los nombres reservados se ocultan sin sesión | Salga de la cuenta y abra la ficha de una subserie con expedientes clasificados (por ejemplo, la 85.15 de Industria y Construcción) | Los nombres dicen "Nombre reservado (IPC)" |
| Con sesión se ven | Ingrese y abra la misma ficha | Se ven los nombres reales |
| La configuración no se puede descargar | Abra `http://localhost/TRDCode/.env` y `http://localhost/TRDCode/api/lib/config.php` | Error 403 (acceso prohibido) |
| La consola no se puede abrir desde la web | Abra `http://localhost/TRDCode/consola/crear_primera_cuenta.php` | Error 403 |
| Exportar | En la consulta, **Exportar** → **Excel** y **PDF** | Se descargan los dos archivos |

El reporte trae nombres de personas: no lo deje en `htdocs` ni en carpetas compartidas.

## 10. Quitar la instalación de prueba

1. Borre la carpeta `C:\xampp\htdocs\TRDCode` y el archivo `C:\xampp\TRDCode.env`.
2. En phpMyAdmin → **SQL**, o en la consola de MySQL:

   ```sql
   DROP DATABASE trdcode;
   DROP USER 'trdcode_app'@'localhost';
   ```

3. Borre la carpeta de trabajo `C:\TRDCode-instalador`.
