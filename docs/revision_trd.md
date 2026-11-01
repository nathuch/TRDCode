# Revisión manual de la extracción de las TRD (tarea #12)

Muestra de 55 registros de los seis PDF para comparar a mano con el PDF original de `scripts/trd-pdf/`. Las validaciones automáticas ya revisaron los códigos, la cantidad de tipos documentales y el cruce con el reporte de OnBase; esta revisión busca lo que no detectan, como una "X" leída en la columna equivocada.

**Cómo revisar**
1. Abre el PDF en la página indicada. La página es donde empieza el registro; sus tipos documentales pueden seguir en la siguiente.
2. Compara el código, el nombre, la retención (AG y AC), la disposición final y los primeros tres tipos documentales.
3. Si todo coincide, marca la casilla `[x]`. Si algo no coincide, déjala sin marcar y escribe debajo qué dice el PDF.

Las diferencias se corrigen en `scripts/correcciones.json` y se vuelve a ejecutar `scripts/extraer_trd.py`.

**Cómo se eligió la muestra**
- Diez registros al azar de cada PDF, o todos si tiene menos de diez. De la Subdirección 2025 se toman 15, porque tiene 110 páginas.
- Siempre está la subserie 85.15 de la TRD 11, que es la de la ficha de la propuesta de pantallas.
- Registros con varias disposiciones:
  - TRD 10: 4 registros tienen varias disposiciones; 4 están en esta muestra.
  - TRD 11: ningún registro extraído tiene varias disposiciones marcadas. Si al revisar encuentras uno con dos marcas, anótalo: sería un error de extracción.
- Semilla del azar: 20261101. Generado a partir de `scripts/salida/trd.json` (commit `4b8b624`).

## trd-2020_00.9000_subdireccion-centro.pdf

TRD 10, plantilla 00.9000: 9 de 9 registros.

- [ ] **02.01** Actas Comité de Baja de Bienes (serie 02 ACTAS)
  - Archivo: `trd-2020_00.9000_subdireccion-centro.pdf`, página 1
  - Retención: AG 1 año, AC 9 años
  - Disposición: CT (Conservación total)
  - Tipos documentales (3 de 15): Listado de bien objeto de baja; Concepto técnico de bien; Ofrecimiento de bien

- [ ] **02.26** Actas de Comité Primario (serie 02 ACTAS)
  - Archivo: `trd-2020_00.9000_subdireccion-centro.pdf`, página 1
  - Retención: AG 2 años, AC 3 años
  - Disposición: CT (Conservación total)
  - Tipos documentales (3 de 4): Citación; Agenda; Listado de Asistencia

- [ ] **02.34** Actas de Comité Técnico de Centro (serie 02 ACTAS)
  - Archivo: `trd-2020_00.9000_subdireccion-centro.pdf`, página 2
  - Retención: AG 2 años, AC 8 años
  - Disposición: CT (Conservación total)
  - Tipos documentales (3 de 4): Citación; Agenda; Listado de Asistencia

- [ ] **03.02** Resoluciones (serie 03 ACTOS ADMINISTRATIVOS)
  - Archivo: `trd-2020_00.9000_subdireccion-centro.pdf`, página 3
  - Retención: AG 1 año, AC 9 años
  - Disposición: CT (Conservación total), D (Digitalizar)
  - Tipos documentales (3 de 4): Resolución; Acta de Posesión; Acta de Notificación

- [ ] **30** DERECHOS DE PETICION
  - Archivo: `trd-2020_00.9000_subdireccion-centro.pdf`, página 4
  - Retención: AG 1 año, AC 9 años
  - Disposición: S (Selección)
  - Tipos documentales (3 de 4): Petición; Comunicación de traslado por competencia; Respuesta a derecho de petición

- [ ] **39.02** Informes a Entes de Control (serie 39 INFORMES)
  - Archivo: `trd-2020_00.9000_subdireccion-centro.pdf`, página 5
  - Retención: AG 1 año, AC 9 años
  - Disposición: CT (Conservación total)
  - Tipos documentales (3 de 4): Requerimiento; Solicitud de Información; Informe Consolidado

- [ ] **39.03** Informes a Entidades del Estado (serie 39 INFORMES)
  - Archivo: `trd-2020_00.9000_subdireccion-centro.pdf`, página 5
  - Retención: AG 1 año, AC 9 años
  - Disposición: CT (Conservación total)
  - Tipos documentales (3 de 6): Solicitud de información; Solicitud de información al Área respectiva; Respuesta del Área

- [ ] **39.11** Informes de Gestión (serie 39 INFORMES)
  - Archivo: `trd-2020_00.9000_subdireccion-centro.pdf`, página 6
  - Retención: AG 1 año, AC 2 años
  - Disposición: E (Eliminación)
  - Tipos documentales (2 de 2): Informe de gestión; Informe de seguimiento

- [ ] **40.04** Inventarios Documentales de Archivo de Gestión (serie 40 INSTRUMENTOS ARCHIVISTICOS)
  - Archivo: `trd-2020_00.9000_subdireccion-centro.pdf`, página 7
  - Retención: AG 2 años, AC 8 años
  - Disposición: CT (Conservación total), D (Digitalizar)
  - Tipos documentales (1 de 1): Inventario

## trd-2020_00.9000-2_administracion-educativa.pdf

TRD 10, plantilla 00.9000.2: 5 de 5 registros.

- [ ] **12** BANCOS DE PRUEBAS TALLER SELECCIÓN DE ASPIRANTES
  - Archivo: `trd-2020_00.9000-2_administracion-educativa.pdf`, página 1
  - Retención: AG 2 años, AC 8 años
  - Disposición: S (Selección)
  - Tipos documentales (3 de 8): Formato de verificación de perfil; Formato de perfil de ingreso; Listado de asistencia

- [ ] **30** DERECHOS DE PETICION
  - Archivo: `trd-2020_00.9000-2_administracion-educativa.pdf`, página 2
  - Retención: AG 1 año, AC 9 años
  - Disposición: S (Selección)
  - Tipos documentales (3 de 4): Petición; Comunicación de traslado por competencia; Respuesta a derecho de petición

- [ ] **39.11** Informes de Gestión (serie 39 INFORMES)
  - Archivo: `trd-2020_00.9000-2_administracion-educativa.pdf`, página 3
  - Retención: AG 1 año, AC 2 años
  - Disposición: E (Eliminación)
  - Tipos documentales (2 de 2): Informe de gestión; Informe de seguimiento

- [ ] **40.04** Inventarios Documentales de Archivo de Gestión (serie 40 INSTRUMENTOS ARCHIVÍSICOS)
  - Archivo: `trd-2020_00.9000-2_administracion-educativa.pdf`, página 4
  - Retención: AG 2 años, AC 8 años
  - Disposición: CT (Conservación total), D (Digitalizar)
  - Tipos documentales (1 de 1): Inventario

- [ ] **56** PROGRAMACIÓNES Y DIVULGACIÓNES DE LA OFERTA DE FORMACIÓN TITULADA
  - Archivo: `trd-2020_00.9000-2_administracion-educativa.pdf`, página 5
  - Retención: AG 1 año, AC 2 años
  - Disposición: E (Eliminación)
  - Tipos documentales (3 de 12): Resolución calendario académico; Reporte de oferta abierta por convocatoria; Reporte de publicación de la oferta abierta educativa en la página web

## trd-2020_00.9000-4_formacion-profesional-integral.pdf

TRD 10, plantilla 00.9000.4: 10 de 28 registros.

- [ ] **30** DERECHOS DE PETICION
  - Archivo: `trd-2020_00.9000-4_formacion-profesional-integral.pdf`, página 1
  - Retención: AG 1 año, AC 9 años
  - Disposición: S (Selección)
  - Tipos documentales (3 de 4): Petición; Comunicación de traslado por competencia; Respuesta a derecho de petición

- [ ] **40.04** Inventarios Documentales de Archivo de Gestión (serie 40 INSTRUMENTOS ARCHIVÍSTICOS)
  - Archivo: `trd-2020_00.9000-4_formacion-profesional-integral.pdf`, página 4
  - Retención: AG 2 años, AC 8 años
  - Disposición: CT (Conservación total), D (Digitalizar)
  - Tipos documentales (1 de 1): Inventario ARTICULACIÓN CON LA EDUCACIÓN MEDIA

- [ ] **57.04** Programas de Articulación con la Educación Media (serie 57 PROGRAMAS)
  - Archivo: `trd-2020_00.9000-4_formacion-profesional-integral.pdf`, página 5
  - Retención: AG 2 años, AC 8 años
  - Disposición: CT (Conservación total)
  - Tipos documentales (3 de 14): Autodiagnóstico; Plan Operativo; Acta de Socialización del Programa

- [ ] **35.02** Historias Académicas Formación Virtual Titulada (serie 35 HISTORIAS ACADEMICAS)
  - Archivo: `trd-2020_00.9000-4_formacion-profesional-integral.pdf`, página 11
  - Retención: AG 2 años, AC 8 años
  - Disposición: CT (Conservación total)
  - Tipos documentales (3 de 15): Cronograma; Circular condiciones de oferta; Listado de centros participante de oferta virtual

- [ ] **35.03** Historias Académicas Formación Virtual complementaria (serie 35 HISTORIAS ACADEMICAS)
  - Archivo: `trd-2020_00.9000-4_formacion-profesional-integral.pdf`, página 12
  - Retención: AG 2 años, AC 8 años
  - Disposición: CT (Conservación total)
  - Tipos documentales (2 de 2): Copia cedula ciudadanía; Ficha de inscripción BIENESTAR AL APRENDIZ

- [ ] **57.09** Programas de Bienestar al Aprendiz (serie 57 PROGRAMAS)
  - Archivo: `trd-2020_00.9000-4_formacion-profesional-integral.pdf`, página 18
  - Retención: AG 2 años, AC 8 años
  - Disposición: CT (Conservación total)
  - Tipos documentales (3 de 8): Lineamiento para el Bienestar del Aprendiz; Programa de bienestar al aprendiz; Evaluación actividades de bienestar

- [ ] **02.41** Actas de Consejo General de Mesa Sectorial (serie 02 ACTAS)
  - Archivo: `trd-2020_00.9000-4_formacion-profesional-integral.pdf`, página 30
  - Retención: AG 2 años, AC 8 años
  - Disposición: CT (Conservación total)
  - Tipos documentales (3 de 4): Citación; Carta de interés de participación; Lista de asistencia

- [ ] **52.02** Mapas Funcionales (serie 52 PLANES DE MESAS SECTORIALES)
  - Archivo: `trd-2020_00.9000-4_formacion-profesional-integral.pdf`, página 32
  - Retención: AG 1 año, AC 4 años
  - Disposición: CT (Conservación total)
  - Tipos documentales (3 de 4): Ficha caracterización del Comité Técnico; Lista Verificación Metodológica Mapa Funcional; Lista de Validación Técnica del Mapa Funcional

- [ ] **52.03** Normas Sectoriales de Competencia Laboral (serie 52 PLANES DE MESAS SECTORIALES)
  - Archivo: `trd-2020_00.9000-4_formacion-profesional-integral.pdf`, página 33
  - Retención: AG 2 años, AC 8 años
  - Disposición: CT (Conservación total)
  - Tipos documentales (3 de 6): Ficha caracterización del Comité Técnico; Lista de Verificación Metodológica Norma Sectorial; Lista de Validación Técnica Norma Sectorial de Competencia Laboral

- [ ] **02.11** Actas de Comité de Evaluación y Certificación de Competencias Laborales (serie 02 ACTAS)
  - Archivo: `trd-2020_00.9000-4_formacion-profesional-integral.pdf`, página 34
  - Retención: AG 2 años, AC 8 años
  - Disposición: CT (Conservación total)
  - Tipos documentales (3 de 8): Citación; Agenda; Oferta de Evaluación y Competencias Laborales

## trd-2025_00.9000_subdireccion-centros.pdf

TRD 11, plantilla 00.9000: 15 de 33 registros.

- [ ] **01.03** Acciones de Tutela (serie 01 ACCIONES CONSTITUCIONALES)
  - Archivo: `trd-2025_00.9000_subdireccion-centros.pdf`, página 1
  - Retención: AG 1 año, AC 9 años
  - Disposición: S (Selección)
  - Tipos documentales (3 de 8): Escrito de tutela; Auto de admisión de tutela y/o traslado; Contestación de la tutela

- [ ] **02.11** Actas de Comité de Convenios (serie 02 ACTAS)
  - Archivo: `trd-2025_00.9000_subdireccion-centros.pdf`, página 2
  - Retención: AG 2 años, AC 8 años
  - Disposición: CT (Conservación total)
  - Tipos documentales (1 de 1): Acta de comité de convenios

- [ ] **02.38** Actas de Comité Técnico de Centro (serie 02 ACTAS)
  - Archivo: `trd-2025_00.9000_subdireccion-centros.pdf`, página 2
  - Retención: AG 2 años, AC 8 años
  - Disposición: CT (Conservación total)
  - Tipos documentales (1 de 1): Acta de comité técnico de centro

- [ ] **22.02** Contratos de Arrendamiento (serie 22 CONTRATOS)
  - Archivo: `trd-2025_00.9000_subdireccion-centros.pdf`, página 6
  - Retención: AG 1 año, AC 19 años
  - Disposición: S (Selección)
  - Tipos documentales (3 de 189): Modalidad Contratación Directa: Solicitud inicio de trámite de proceso contractual; Modalidad Contratación Directa: Estudios previos; Modalidad Contratación Directa: Evidencia de inclusión en el plan de adquisiciones

- [ ] **22.05** Contratos de Consultoría (serie 22 CONTRATOS)
  - Archivo: `trd-2025_00.9000_subdireccion-centros.pdf`, página 23
  - Retención: AG 1 año, AC 19 años
  - Disposición: CT (Conservación total)
  - Tipos documentales (3 de 187): Modalidad Concurso de Méritos: Designación comité estructurador; Modalidad Concurso de Méritos: Solicitud inicio de trámite de proceso contractual; Modalidad Concurso de Méritos: Estudios previos

- [ ] **22.08** Contratos de Licenciamiento (serie 22 CONTRATOS)
  - Archivo: `trd-2025_00.9000_subdireccion-centros.pdf`, página 43
  - Retención: AG 1 año, AC 19 años
  - Disposición: CT (Conservación total)
  - Tipos documentales (3 de 450): Modalidad Acuerdo Marco de Precios: Solicitud inicio de trámite de proceso contractual; Modalidad Acuerdo Marco de Precios: Estudios previos; Modalidad Acuerdo Marco de Precios: Evidencia de inclusión en el plan de adquisiciones

- [ ] **22.09** Contratos de Prestación de Servicios (serie 22 CONTRATOS)
  - Archivo: `trd-2025_00.9000_subdireccion-centros.pdf`, página 56
  - Retención: AG 1 año, AC 19 años
  - Disposición: S (Selección)
  - Tipos documentales (3 de 425): Modalidad Acuerdo Marco de Precios: Solicitud inicio de trámite de proceso contractual; Modalidad Acuerdo Marco de Precios: Estudios previos; Modalidad Acuerdo Marco de Precios: Evidencia de inclusión en el plan de adquisiciones

- [ ] **22.11** Contratos de Obra (serie 22 CONTRATOS)
  - Archivo: `trd-2025_00.9000_subdireccion-centros.pdf`, página 70
  - Retención: AG 1 año, AC 19 años
  - Disposición: CT (Conservación total)
  - Tipos documentales (3 de 201): Modalidad Concurso de Méritos: Designación comité estructurador; Modalidad Concurso de Méritos: Solicitud inicio de trámite de proceso contractual; Modalidad Concurso de Méritos: Estudios previos

- [ ] **22.13** Contratos de Suministros (serie 22 CONTRATOS)
  - Archivo: `trd-2025_00.9000_subdireccion-centros.pdf`, página 86
  - Retención: AG 1 año, AC 19 años
  - Disposición: S (Selección)
  - Tipos documentales (3 de 419): Modalidad Procedimiento Acuerdo Marco de Precios: Solicitud inicio de trámite de proceso contractual; Modalidad Procedimiento Acuerdo Marco de Precios: Estudios previos; Modalidad Procedimiento Acuerdo Marco de Precios: Evidencia de inclusión en el plan de adquisiciones

- [ ] **25.02** Convenios de Asociación (serie 25 CONVENIOS)
  - Archivo: `trd-2025_00.9000_subdireccion-centros.pdf`, página 100
  - Retención: AG 1 año, AC 19 años
  - Disposición: S (Selección)
  - Tipos documentales (3 de 66): Solicitud radicada; Estudios previos; Documento de invitación publica para proceso competitivo

- [ ] **42.01** Informes a Entes de Control (serie 42 INFORMES)
  - Archivo: `trd-2025_00.9000_subdireccion-centros.pdf`, página 106
  - Retención: AG 1 año, AC 9 años
  - Disposición: CT (Conservación total)
  - Tipos documentales (2 de 2): Solicitud de informe por Entes de Control y Vigilancia; Informe

- [ ] **42.02** Informe a Entidades del Estado (serie 42 INFORMES)
  - Archivo: `trd-2025_00.9000_subdireccion-centros.pdf`, página 107
  - Retención: AG 1 año, AC 9 años
  - Disposición: CT (Conservación total)
  - Tipos documentales (2 de 2): Requerimiento; Informe

- [ ] **42.29** Informes de Gestión (serie 42 INFORMES)
  - Archivo: `trd-2025_00.9000_subdireccion-centros.pdf`, página 107
  - Retención: AG 1 año, AC 4 años
  - Disposición: E (Eliminación)
  - Tipos documentales (2 de 2): Informes de gestión; Comunicación de Remisión del informe consolidado a la Dirección de Planeación y Direccionamiento Corporativo

- [ ] **79** PROCESOS DE RESPONSABILIDAD FÍSCAL
  - Archivo: `trd-2025_00.9000_subdireccion-centros.pdf`, página 109
  - Retención: AG 1 año, AC 9 años
  - Disposición: E (Eliminación)
  - Tipos documentales (3 de 11): Denuncia de perdida; Informe al ordenador del gasto; Designación de investigador administrativo

- [ ] **65** PROCESOS CONTRACTUALES REVOCADOS
  - Archivo: `trd-2025_00.9000_subdireccion-centros.pdf`, página 110
  - Retención: AG 1 año, AC 19 años
  - Disposición: E (Eliminación)
  - Tipos documentales (3 de 4): Documentos precontractuales; Resolución por la cual se declara revocado el proceso; Comunicación de declaración de revocatoria del proceso

## trd-2025_00.9000.2_administracion-educativa.pdf

TRD 11, plantilla 00.9000.2: 6 de 6 registros.

- [ ] **07** BANCO DE INSTRUMENTOS DE EVALUACIÓN DE ASPIRANTES A PROGRAMAS DE FORMACIÓN
  - Archivo: `trd-2025_00.9000.2_administracion-educativa.pdf`, página 1
  - Retención: AG 2 años, AC 8 años
  - Disposición: E (Eliminación)
  - Tipos documentales (3 de 10): Lista verificación perfil de ingreso; Perfiles de ingreso; Evaluación diagnóstica de Ítems

- [ ] **27** DERECHOS DE PETICIÓN
  - Archivo: `trd-2025_00.9000.2_administracion-educativa.pdf`, página 1
  - Retención: AG 1 año, AC 9 años
  - Disposición: S (Selección)
  - Tipos documentales (2 de 2): Derecho de petición; Respuesta a derecho de petición

- [ ] **42.29** Informes de Gestión (serie 42 INFORMES)
  - Archivo: `trd-2025_00.9000.2_administracion-educativa.pdf`, página 2
  - Retención: AG 1 año, AC 4 años
  - Disposición: E (Eliminación)
  - Tipos documentales (2 de 2): Informe de gestión; Comunicación de remisión informe

- [ ] **53.38** Planes Institucionales de la oferta Abierta Titulada (serie 53 PLANES)
  - Archivo: `trd-2025_00.9000.2_administracion-educativa.pdf`, página 2
  - Retención: AG 2 años, AC 8 años
  - Disposición: CT (Conservación total)
  - Tipos documentales (3 de 7): Plan de acción de la vigencia; Resolución calendario académico; Resolución convocatoria de la oferta

- [ ] **53.39** Planes Institucionales de la Oferta Especial Complementaria (serie 53 PLANES)
  - Archivo: `trd-2025_00.9000.2_administracion-educativa.pdf`, página 3
  - Retención: AG 2 años, AC 8 años
  - Disposición: CT (Conservación total)
  - Tipos documentales (3 de 5): Plan de acción de la vigencia; Registro de solicitudes; Acta de compromiso entre la empresa y el SENA

- [ ] **53.40** Planes Institucionales de la oferta Especial Titulada (serie 53 PLANES)
  - Archivo: `trd-2025_00.9000.2_administracion-educativa.pdf`, página 3
  - Retención: AG 2 años, AC 8 años
  - Disposición: CT (Conservación total)
  - Tipos documentales (3 de 5): Comunicación de solicitud de matricula; Reporte de novedades de los ambientes de aprendizaje de formación; Comunicación de observaciones a solicitud de matricula

## trd-2025_00.9000.4_formacion-profesional-integral.pdf

TRD 11, plantilla 00.9000.4: 10 de 28 registros.

- [ ] **02.45** Actas de Equipo Pedagógico de Centros (serie 02 ACTAS)
  - Archivo: `trd-2025_00.9000.4_formacion-profesional-integral.pdf`, página 1
  - Retención: AG 2 años, AC 8 años
  - Disposición: CT (Conservación total)
  - Tipos documentales (1 de 1): Acta de equipo pedagógico de centros - EPC

- [ ] **28** DISEÑO CURRICULAR DE LOS PROGRAMAS DE FORMACIÓN PROFESIONAL INTEGRAL
  - Archivo: `trd-2025_00.9000.4_formacion-profesional-integral.pdf`, página 2
  - Retención: AG 1 año, AC 9 años
  - Disposición: CT (Conservación total)
  - Tipos documentales (3 de 21): Plan de trabajo para actualización del los programas de Formación; Acta de designación de responsables; Matriz perfil de egreso

- [ ] **81.02** Proceso de Ventas de Productos y Servicios Clientes Internos (serie 81 PROCESOS DE VENTA DE PRODUCTOS)
  - Archivo: `trd-2025_00.9000.4_formacion-profesional-integral.pdf`, página 3
  - Retención: AG 1 año, AC 4 años
  - Disposición: E (Eliminación)
  - Tipos documentales (3 de 9): Correo solicitando información del producto o servicio; Solicitud de la cotización; Respuesta a la solicitud de la cotización

- [ ] **85.16** Programas de Formación Presencial y a Distancia (serie 85 PROGRAMAS)
  - Archivo: `trd-2025_00.9000.4_formacion-profesional-integral.pdf`, página 5
  - Retención: AG 1 año, AC 9 años
  - Disposición: CT (Conservación total)
  - Tipos documentales (3 de 18): Proyecto de viabilidad (articulación con la media); Autodiagnóstico institución educativa (articulación con la media); Notificación novedades ambientes de formación

- [ ] **85.15** Programas de Emprendimiento (serie 85 PROGRAMAS)
  - Archivo: `trd-2025_00.9000.4_formacion-profesional-integral.pdf`, página 6
  - Retención: AG 2 años, AC 8 años
  - Disposición: CT (Conservación total)
  - Tipos documentales (3 de 3): Plan de acción y seguimiento; Lista de asistencia a eventos de orientación; Lista de asistencia a eventos de entrenamiento

- [ ] **85.04** Programas de Apoyos de Sostenimiento Regular (serie 85 PROGRAMAS)
  - Archivo: `trd-2025_00.9000.4_formacion-profesional-integral.pdf`, página 7
  - Retención: AG 1 año, AC 4 años
  - Disposición: CT (Conservación total)
  - Tipos documentales (3 de 14): Circular de apertura convocatoria; Acta de evidencia de divulgación de la convocatoria; Reporte de inscritos

- [ ] **85.06** Programas de Apoyos Socioeconómicos de Transporte (serie 85 PROGRAMAS)
  - Archivo: `trd-2025_00.9000.4_formacion-profesional-integral.pdf`, página 8
  - Retención: AG 1 año, AC 4 años
  - Disposición: CT (Conservación total)
  - Tipos documentales (3 de 11): Circular de apertura convocatoria; Acta de evidencia de divulgación de la convocatoria; Reporte de inscritos

- [ ] **85.09** Programas de Asignación de Monitorias por Excelencia (serie 85 PROGRAMAS)
  - Archivo: `trd-2025_00.9000.4_formacion-profesional-integral.pdf`, página 10
  - Retención: AG 1 año, AC 4 años
  - Disposición: CT (Conservación total)
  - Tipos documentales (3 de 6): Circular de apertura convocatoria; Informe verificación de requisitos; Acta de desempate

- [ ] **51** NORMAS DE COMPETENCIAS LABORALES
  - Archivo: `trd-2025_00.9000.4_formacion-profesional-integral.pdf`, página 13
  - Retención: AG 1 año, AC 4 años
  - Disposición: CT (Conservación total)
  - Tipos documentales (3 de 27): Identificación de perfil consecución expertos técnico; Solicitud consecución expertos técnico; Invitación a confirmación comité técnico

- [ ] **77** PROCESOS DE EVALUACIÓN Y CERTIFICACIÓN DE COMPETENCIAS LABORALES
  - Archivo: `trd-2025_00.9000.4_formacion-profesional-integral.pdf`, página 15
  - Retención: AG 2 años, AC 8 años
  - Disposición: CT (Conservación total)
  - Tipos documentales (3 de 24): Acuerdo de confidencialidad de los actores del proceso de ECCL; Declaración juramentada de la no existencia de conflicto de interés; Solicitud del servicio por línea organización
