-- TRDCode, migración 002: Grupo de Administración Educativa de Agropecuario La Granja (#81).
-- La usuaria confirmó que La Granja sí tiene esta dependencia; con ella, la consulta muestra en ese
-- centro las series de la plantilla 00.9000.2 (sin expedientes hasta que un reporte los traiga).
-- Se aplica a una base existente y se puede volver a aplicar: solo agrega la dependencia si no
-- existe y si el centro 73.9123 está cargado. Funciona en MySQL 8 y en MariaDB 10.4.
-- Las bases nuevas ya la traen en datos_iniciales.sql.

INSERT INTO dependencias (codigo, codigo_centro, plantilla, nombre)
SELECT '73.9123.2', c.codigo, '00.9000.2', 'Administración Educativa'
FROM centros c
WHERE c.codigo = '73.9123'
  AND NOT EXISTS (SELECT 1 FROM dependencias d WHERE d.codigo = '73.9123.2');
