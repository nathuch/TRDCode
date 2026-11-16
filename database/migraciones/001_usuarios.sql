-- TRDCode, migración 001: usuarios editables (RF-17).
-- Agrega a la tabla usuarios:
--   debe_cambiar_clave  1 si la cuenta tiene una contraseña temporal y debe cambiarla al entrar.
--   ultimo_ingreso      fecha y hora del último inicio de sesión.
--   sesion_version      al aumentar, se cierran las sesiones abiertas de la cuenta (al desactivarla o
--                       al ponerle una contraseña temporal).
-- Se aplica a una base existente sin perder datos y se puede volver a aplicar: cada columna se agrega
-- solo si todavía no existe. Funciona en MySQL 8 y en MariaDB 10.4 (en MySQL no existe
-- ADD COLUMN IF NOT EXISTS, por eso se revisa information_schema).
-- Las bases nuevas ya traen estas columnas en schema.sql.

SET @falta = (SELECT COUNT(*) = 0 FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'debe_cambiar_clave');
SET @sql = IF(@falta, 'ALTER TABLE usuarios ADD COLUMN debe_cambiar_clave TINYINT(1) NOT NULL DEFAULT 0', 'DO 0');
PREPARE paso FROM @sql;
EXECUTE paso;
DEALLOCATE PREPARE paso;

SET @falta = (SELECT COUNT(*) = 0 FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'ultimo_ingreso');
SET @sql = IF(@falta, 'ALTER TABLE usuarios ADD COLUMN ultimo_ingreso DATETIME NULL', 'DO 0');
PREPARE paso FROM @sql;
EXECUTE paso;
DEALLOCATE PREPARE paso;

SET @falta = (SELECT COUNT(*) = 0 FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'sesion_version');
SET @sql = IF(@falta, 'ALTER TABLE usuarios ADD COLUMN sesion_version INT UNSIGNED NOT NULL DEFAULT 0', 'DO 0');
PREPARE paso FROM @sql;
EXECUTE paso;
DEALLOCATE PREPARE paso;
