import { describe, expect, it } from 'vitest'
import { nombreOculto, nombreReservado, ocultarNombres } from './formato.js'

// Nombres inventados: las pruebas nunca usan títulos del reporte.
const datos = {
  carga: null,
  expedientes: [
    { codigo: 'A', nombre: 'EXPEDIENTE PÚBLICO DE PRUEBA', control_acceso: 'IPU' },
    { codigo: 'B', nombre: 'EXPEDIENTE CLASIFICADO DE PRUEBA', control_acceso: 'IPC' },
    { codigo: 'C', nombre: 'EXPEDIENTE RESERVADO DE PRUEBA', control_acceso: 'IPR' },
    { codigo: 'D', nombre: 'EXPEDIENTE SIN CLASIFICAR DE PRUEBA', control_acceso: '' },
    { codigo: 'E', nombre: 'Nombre reservado (IPC)', control_acceso: 'IPC' },
  ],
}

describe('nombres de los expedientes IPC e IPR (#82)', () => {
  it('el nombre oculto es igual al que envía la API', () => {
    expect(nombreReservado('IPC')).toBe('Nombre reservado (IPC)')
    expect(nombreReservado('IPR')).toBe('Nombre reservado (IPR)')
    expect(nombreReservado('')).toBe('Nombre reservado (sin clasificar)')
    expect(nombreReservado(null)).toBe('Nombre reservado (sin clasificar)')
  })

  it('al salir, ocultarNombres() reemplaza los nombres de todo lo que no es IPU', () => {
    const ocultos = ocultarNombres(datos).expedientes.map((e) => e.nombre)
    expect(ocultos).toEqual([
      'EXPEDIENTE PÚBLICO DE PRUEBA',
      'Nombre reservado (IPC)',
      'Nombre reservado (IPR)',
      'Nombre reservado (sin clasificar)',
      'Nombre reservado (IPC)',
    ])
    expect(datos.expedientes[1].nombre).toBe('EXPEDIENTE CLASIFICADO DE PRUEBA') // no cambia el original
    expect(ocultarNombres(null)).toBe(null)
  })

  it('nombreOculto() distingue el nombre real del oculto', () => {
    expect(datos.expedientes.map(nombreOculto)).toEqual([false, false, false, false, true])
    expect(ocultarNombres(datos).expedientes.map(nombreOculto)).toEqual([false, true, true, true, true])
  })
})
