-- TRDCode: estructura de la base de datos (ocho tablas).
--
-- Se ejecuta sobre una base ya creada con utf8mb4 y utf8mb4_unicode_ci:
--   CREATE DATABASE trdcode CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--
-- Cada tabla declara su cotejamiento: en MySQL 8 el de defecto es
-- utf8mb4_0900_ai_ci, y mezclar cotejamientos hace fallar los cruces.

-- Persona encargada de importar el reporte de OnBase.
CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  correo VARCHAR(120) NOT NULL UNIQUE,
  nombre VARCHAR(120) NOT NULL,
  clave_hash VARCHAR(255) NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Intentos fallidos de inicio de sesión, para bloquear tras cinco fallos en 15 minutos.
-- Los de más de un día se borran al registrar uno nuevo.
CREATE TABLE intentos_login (
  id INT AUTO_INCREMENT PRIMARY KEY,
  correo VARCHAR(120) NOT NULL,
  ip VARCHAR(45) NOT NULL,
  fecha DATETIME NOT NULL,
  KEY idx_intento (correo, ip, fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE centros (
  codigo VARCHAR(10) PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Combinaciones reales de centro y plantilla de TRD (La Granja no tiene 00.9000.2).
CREATE TABLE dependencias (
  codigo VARCHAR(12) PRIMARY KEY,
  codigo_centro VARCHAR(10) NOT NULL,
  plantilla VARCHAR(12) NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  FOREIGN KEY (codigo_centro) REFERENCES centros(codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Una fila por serie o subserie de cada versión de la TRD.
-- codigo_subserie es '' cuando la serie no tiene subseries, nunca NULL:
-- la llave única admite varios NULL y dejaría pasar duplicados.
-- soporte, clasificacion y disposicion son SET porque una fila puede tener
-- varios valores marcados (CT, E, S y MT en la TRD 11; CT, E, S, M y D en la TRD 10).
CREATE TABLE trd_registros (
  id INT AUTO_INCREMENT PRIMARY KEY,
  version VARCHAR(4) NOT NULL,
  plantilla VARCHAR(12) NOT NULL,
  proceso VARCHAR(150),
  codigo_serie VARCHAR(10) NOT NULL,
  nombre_serie VARCHAR(200) NOT NULL,
  codigo_subserie VARCHAR(12) NOT NULL DEFAULT '',
  nombre_subserie VARCHAR(250) NOT NULL DEFAULT '',
  soporte SET('P','EL'),
  clasificacion SET('IPU','IPC','IPR'),
  retencion_ag TINYINT NULL,
  retencion_ac TINYINT NULL,
  inicio_retencion VARCHAR(500),
  disposicion SET('CT','E','S','MT','M','D'),
  procedimiento TEXT,
  UNIQUE KEY uk_trd (version, plantilla, codigo_serie, codigo_subserie)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE trd_tipos_documentales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trd_id INT NOT NULL,
  orden SMALLINT NOT NULL,
  nombre VARCHAR(300) NOT NULL,
  FOREIGN KEY (trd_id) REFERENCES trd_registros(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cada importación del reporte. La consulta usa siempre la carga 'activa';
-- se conservan las dos anteriores para poder volver atrás.
CREATE TABLE cargas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  fecha_reporte DATE NOT NULL,
  fecha_carga DATETIME NOT NULL,
  archivo VARCHAR(200),
  total_esperado INT NOT NULL,
  total_expedientes INT NOT NULL DEFAULT 0,
  estado ENUM('en_proceso','activa','reemplazada','fallida') NOT NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Una fila por expediente del reporte, ya limpia y ligada a su carga.
CREATE TABLE expedientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  carga_id INT NOT NULL,
  codigo VARCHAR(20) NOT NULL,
  nombre VARCHAR(300) NOT NULL,
  trd_version VARCHAR(4) NOT NULL,
  codigo_dependencia VARCHAR(12) NOT NULL,
  codigo_serie VARCHAR(10) NOT NULL,
  codigo_subserie VARCHAR(12) NOT NULL DEFAULT '',
  nombre_serie VARCHAR(200),
  nombre_subserie VARCHAR(250),
  fecha_creacion DATE,
  anio SMALLINT,
  control_acceso VARCHAR(30),
  UNIQUE KEY uk_exp (carga_id, codigo),
  KEY idx_cruce (trd_version, codigo_dependencia, codigo_serie, codigo_subserie),
  FOREIGN KEY (carga_id) REFERENCES cargas(id) ON DELETE CASCADE,
  FOREIGN KEY (codigo_dependencia) REFERENCES dependencias(codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
