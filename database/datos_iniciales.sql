-- TRDCode: centros de formación de la Regional Tolima y sus dependencias.
-- Se ejecuta después de schema.sql.

INSERT INTO centros (codigo, nombre) VALUES
  ('73.9226', 'Industria y Construcción'),
  ('73.9310', 'Comercio y Servicios'),
  ('73.9123', 'Agropecuario La Granja');

-- La plantilla es la TRD que aplica: el 9000 de la plantilla se reemplaza por el código del centro.
-- La Granja no lleva Administración Educativa (.2) porque no aparece en el reporte;
-- falta confirmarlo con la usuaria.
INSERT INTO dependencias (codigo, codigo_centro, plantilla, nombre) VALUES
  ('73.9226',   '73.9226', '00.9000',   'Subdirección'),
  ('73.9226.2', '73.9226', '00.9000.2', 'Administración Educativa'),
  ('73.9226.4', '73.9226', '00.9000.4', 'Formación Profesional Integral'),
  ('73.9310',   '73.9310', '00.9000',   'Subdirección'),
  ('73.9310.2', '73.9310', '00.9000.2', 'Administración Educativa'),
  ('73.9310.4', '73.9310', '00.9000.4', 'Formación Profesional Integral'),
  ('73.9123',   '73.9123', '00.9000',   'Subdirección'),
  ('73.9123.4', '73.9123', '00.9000.4', 'Formación Profesional Integral');
