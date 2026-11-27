// Arma database/instalacion_completa.sql: schema.sql, datos_iniciales.sql y trd.sql en un solo archivo,
// para instalar la base con una sola importación (phpMyAdmin o la consola de MySQL).
// Uso, desde la raíz del proyecto:
//   node scripts/armar_instalacion_completa.mjs            lo escribe
//   node scripts/armar_instalacion_completa.mjs --revisar  sale con error si no está al día (empaquetar.ps1)
// No lleva cuentas, cargas ni expedientes: solo la estructura, los centros, las dependencias y la TRD.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const database = join(raiz, 'database')
const destino = join(database, 'instalacion_completa.sql')
const partes = ['schema.sql', 'datos_iniciales.sql', 'trd.sql']

const leer = (archivo) => readFileSync(join(database, archivo), 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n').trimEnd()

const encabezado = `-- TRDCode: instalación completa de la base de datos en un solo archivo.
-- Generado por scripts/armar_instalacion_completa.mjs. No editar a mano: se arma con
-- ${partes.map((p) => `database/${p}`).join(', ')}.
--
-- Se importa UNA sola vez, en una base NUEVA y vacía, creada con:
--   CREATE DATABASE trdcode CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- Con la consola:
--   mysql -u root -p --default-character-set=utf8mb4 trdcode -e "source database/instalacion_completa.sql"
-- o con phpMyAdmin: base trdcode -> Importar -> este archivo.
-- Funciona en MySQL 5.7 u 8 y en MariaDB 10.4 o más nueva. No necesita las migraciones.
-- No trae cuentas, cargas ni expedientes: la primera cuenta se crea con consola/crear_primera_cuenta.php
-- y los expedientes llegan con la primera carga del reporte desde "Actualizar datos".

SET NAMES utf8mb4;
`

const contenido =
  encabezado +
  partes.map((p) => `\n-- ===================================================================\n-- ${p}\n-- ===================================================================\n\n${leer(p)}\n`).join('') +
  '\n-- Fin de la instalación completa.\n'

if (process.argv.includes('--revisar')) {
  const actual = existsSync(destino) ? readFileSync(destino, 'utf8').replace(/\r\n/g, '\n') : ''
  if (actual !== contenido) {
    console.error('database/instalacion_completa.sql no está al día: corra node scripts/armar_instalacion_completa.mjs')
    process.exit(1)
  }
  console.log('database/instalacion_completa.sql está al día.')
} else {
  writeFileSync(destino, contenido, 'utf8')
  console.log(`Listo: ${destino}`)
}
