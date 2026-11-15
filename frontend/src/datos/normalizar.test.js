import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { leerFilas, revisarArchivo } from './leerExcel.js'
import { COLUMNAS, dependencia, fecha, fechaDelNombre, MOTIVOS, normalizar, porCentro } from './normalizar.js'

// Fila de ejemplo con las columnas en el orden de COLUMNAS; `cambios` reemplaza las que se indiquen.
const ENCABEZADO = [...COLUMNAS, 'Estado Expediente']
function fila(cambios = {}) {
  const base = {
    Código: '2025EX-000001',
    Título: 'Expediente de prueba',
    TRD: '11',
    'Serie Código': '73.9226.4-85',
    'Subserie Serie Nombre': 'PROGRAMAS',
    'Subserie Código': '73.9226.4-85.15',
    Subserie: 'Programas de Emprendimiento',
    'Fecha Creación': '45886',
    'Control de Acceso': 'PÚBLICO CLASIFICADO',
    'Estado Expediente': 'ABIERTO',
  }
  return ENCABEZADO.map((c) => (c in cambios ? cambios[c] : base[c]))
}

describe('normalizar con datos de ejemplo', () => {
  it('A-01: "Serie Código" da la dependencia y la serie, con o sin puntos en la dependencia', () => {
    const { validos } = normalizar([ENCABEZADO, fila(), fila({ Código: '2025EX-000002', 'Serie Código': '7392264-85' })])
    expect(validos.map((e) => [e.codigo_dependencia, e.codigo_serie])).toEqual([
      ['73.9226.4', '85'],
      ['73.9226.4', '85'],
    ])
    expect(dependencia('739310')).toBe('73.9310')
    expect(dependencia(' 73.9123.4 ')).toBe('73.9123.4')
  })

  it('A-02: la subserie sale de "Subserie Código"; sin subserie queda en cadena vacía, nunca null', () => {
    const { validos } = normalizar([
      ENCABEZADO,
      fila(),
      fila({ Código: '2025EX-000002', 'Serie Código': '73.9226.4-27', 'Subserie Código': '', Subserie: '' }),
    ])
    expect(validos.map((e) => e.codigo_subserie)).toEqual(['85.15', ''])
  })

  it('A-03: la fecha de creación llega a AAAA-MM-DD desde el número de Excel o desde texto, y da el año', () => {
    expect(fecha('45886')).toBe('2025-08-17')
    expect(fecha('45886.75')).toBe('2025-08-17')
    expect(fecha('2026-08-10')).toBe('2026-08-10')
    expect(fecha('10/08/2026')).toBe('2026-08-10')
    expect(fecha('8/10/2026 3:45:00 PM')).toBe('2026-08-10')
    expect(fecha('31/02/2026')).toBeNull()
    expect(fecha('')).toBeNull()
    const { validos } = normalizar([ENCABEZADO, fila()])
    expect(validos[0]).toMatchObject({ fecha_creacion: '2025-08-17', anio: 2025 })
  })

  it('A-04: el control de acceso pasa a IPU, IPC o IPR, con o sin tildes', () => {
    const control = (valor, i) => fila({ Código: `2025EX-00000${i}`, 'Control de Acceso': valor })
    const { validos } = normalizar([
      ENCABEZADO,
      control('PÚBLICO', 1),
      control('Público Clasificado', 2),
      control('PUBLICO RESERVADO', 3),
      control('OTRO', 4),
    ])
    expect(validos.map((e) => e.control_acceso)).toEqual(['IPU', 'IPC', 'IPR', 'OTRO'])
  })

  it('A-05: las filas de otros centros se descartan y las inválidas o repetidas quedan marcadas con su fila', () => {
    const resultado = normalizar([
      ENCABEZADO,
      fila(),
      fila({ Código: '2025EX-000002', 'Serie Código': '1.7073-39', 'Subserie Código': '1.7073-39.11' }),
      fila({ Código: 'ABC', 'Serie Código': '73.9310-27', 'Subserie Código': '' }),
      fila({ Código: '2025EX-000004', TRD: '9' }),
      fila({ Código: '2025EX-000005', 'Fecha Creación': '' }),
      fila({ Código: '2025EX-000006', 'Subserie Código': '73.9226.4-02.14' }),
      fila({ Código: '2025EX-000007', 'Serie Código': 'sin guion' }),
      fila({ Código: '2025EX-000001' }),
      ['', '', '', '', '', '', '', '', '', ''],
    ])
    expect(resultado.filas).toBe(8)
    expect(resultado.validos).toEqual([])
    expect(resultado.descartados).toEqual({ '1.7073': 1 })
    expect(resultado.problemas).toEqual([
      { fila: 2, codigo: '2025EX-000001', motivo: `${MOTIVOS.REPETIDO} (también en la fila 9)` },
      { fila: 4, codigo: 'ABC', motivo: MOTIVOS.CODIGO },
      { fila: 5, codigo: '2025EX-000004', motivo: MOTIVOS.TRD },
      { fila: 6, codigo: '2025EX-000005', motivo: MOTIVOS.FECHA },
      { fila: 7, codigo: '2025EX-000006', motivo: MOTIVOS.SUBSERIE },
      { fila: 8, codigo: '2025EX-000007', motivo: MOTIVOS.SIN_SERIE },
      { fila: 9, codigo: '2025EX-000001', motivo: `${MOTIVOS.REPETIDO} (también en la fila 2)` },
    ])
  })

  it('si faltan columnas obligatorias, dice cuáles', () => {
    expect(() => normalizar([['Código', 'Título']])).toThrow(/TRD, Serie Código/)
  })

  it('el título se recorta a 300 caracteres sin partir los que ocupan dos unidades', () => {
    const titulo = '😀'.repeat(310)
    const { validos } = normalizar([ENCABEZADO, fila({ Título: titulo })])
    expect(Array.from(validos[0].nombre)).toHaveLength(300)
  })
})

describe('archivo y fecha del reporte', () => {
  it('rechaza otros formatos, archivos vacíos y de más de 15 MB', () => {
    expect(revisarArchivo({ name: 'reporte.xls', size: 10 })).toMatch(/\.xlsx/)
    expect(revisarArchivo({ name: 'reporte.csv', size: 10 })).toMatch(/\.xlsx/)
    expect(revisarArchivo({ name: 'reporte.xlsx', size: 16 * 1024 * 1024 })).toMatch(/15 MB/)
    expect(revisarArchivo({ name: 'reporte.xlsx', size: 0 })).toMatch(/vacío/)
    expect(revisarArchivo({ name: 'Reporte.XLSX', size: 1000 })).toBeNull()
  })

  it('un archivo que no es Excel no se puede leer', async () => {
    await expect(leerFilas(new TextEncoder().encode('no es un excel'))).rejects.toThrow()
  })

  it('propone la fecha que trae el nombre del archivo', () => {
    expect(fechaDelNombre('reporte-tolima-2026-08-10.xlsx')).toBe('2026-08-10')
    expect(fechaDelNombre('Reporte_20260908.xlsx')).toBe('2026-09-08')
    expect(fechaDelNombre('reporte 10-08-2026.xlsx')).toBe('2026-08-10')
    expect(fechaDelNombre('reporte.xlsx')).toBe('')
    expect(fechaDelNombre('reporte-2026-13-40.xlsx')).toBe('')
  })
})

// Con el reporte real: el navegador debe dar exactamente lo mismo que scripts/generar_expedientes_sql.py.
// Los dos archivos están en datos-prueba/ (no van al repositorio); si no existen, la prueba se salta.
const raiz = (ruta) => fileURLToPath(new URL(`../../../datos-prueba/${ruta}`, import.meta.url))
const REPORTE = raiz('reporte-tolima-2026-08-10.xlsx')
const SQL = raiz('expedientes.sql')
const hayReporte = existsSync(REPORTE) && existsSync(SQL)
const CAMPOS = ['codigo', 'nombre', 'trd_version', 'codigo_dependencia', 'codigo_serie', 'codigo_subserie',
  'nombre_serie', 'nombre_subserie', 'fecha_creacion', 'anio', 'control_acceso']

/** Lee los expedientes de los INSERT de expedientes.sql (cadenas con '' y \\, NULL y números). */
function expedientesDelSql(texto) {
  const registros = []
  for (const sentencia of texto.split('INSERT INTO expedientes').slice(1)) {
    let i = sentencia.indexOf('VALUES') + 6
    while (i < sentencia.length && sentencia[i] !== ';') {
      if (sentencia[i] !== '(') {
        i++
        continue
      }
      i++
      const valores = []
      while (sentencia[i] !== ')') {
        if (sentencia[i] === ' ' || sentencia[i] === ',') i++
        else if (sentencia[i] === "'") {
          let valor = ''
          i++
          for (;;) {
            if (sentencia[i] === '\\') {
              valor += sentencia[i + 1]
              i += 2
            } else if (sentencia[i] === "'" && sentencia[i + 1] === "'") {
              valor += "'"
              i += 2
            } else if (sentencia[i] === "'") {
              i++
              break
            } else valor += sentencia[i++]
          }
          valores.push(valor)
        } else {
          const fin = sentencia.slice(i).search(/[,)]/)
          const crudo = sentencia.slice(i, i + fin).trim()
          valores.push(crudo === 'NULL' ? null : crudo.startsWith('@') ? crudo : Number(crudo))
          i += fin
        }
      }
      i++
      registros.push(Object.fromEntries(CAMPOS.map((c, n) => [c, valores[n + 1]])))
    }
  }
  return registros
}

describe.skipIf(!hayReporte)('reporte de agosto en el navegador = expedientes.sql (datos-prueba/)', async () => {
  const { filas, primera } = hayReporte ? await leerFilas(new Uint8Array(readFileSync(REPORTE))) : {}
  const resultado = hayReporte ? normalizar(filas, primera) : null
  const esperados = hayReporte ? expedientesDelSql(readFileSync(SQL, 'utf8')) : []

  it('7.531 filas y 3.385 expedientes (1.781 / 1.084 / 520)', () => {
    expect(resultado.filas).toBe(7531)
    expect(resultado.validos).toHaveLength(3385)
    expect(porCentro(resultado.validos)).toEqual({ '73.9226': 1781, '73.9310': 1084, '73.9123': 520 })
  })

  it('cada expediente coincide campo por campo con expedientes.sql, en el mismo orden', () => {
    expect(esperados).toHaveLength(3385)
    // Solo se informa el código y el campo que difiere: los títulos traen nombres de personas.
    const diferencias = []
    resultado.validos.forEach((e, n) => {
      for (const campo of CAMPOS) {
        if (e[campo] !== esperados[n]?.[campo]) diferencias.push(`${e.codigo} (${n}): ${campo}`)
      }
    })
    expect(diferencias.slice(0, 20)).toEqual([])
  })

  it('las filas que no se cargan son de otros centros o tienen problemas, y todas están contadas', () => {
    const descartadas = Object.values(resultado.descartados).reduce((a, b) => a + b, 0)
    expect(descartadas + resultado.problemas.length + resultado.validos.length).toBe(resultado.filas)
  })
})
