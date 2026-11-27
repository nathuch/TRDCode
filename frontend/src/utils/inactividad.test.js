import { afterEach, describe, expect, it } from 'vitest'
import { inactiva, INACTIVIDAD_MS, registrarActividad, ultimaActividad } from './inactividad.js'

const MINUTO = 60 * 1000

describe('cierre de la sesión por inactividad (#82)', () => {
  afterEach(() => {
    delete globalThis.localStorage
  })

  it('cierra a los 29 minutos sin actividad, antes que el servidor (30)', () => {
    expect(INACTIVIDAD_MS).toBe(29 * MINUTO)
    const ultima = 1_000_000
    expect(inactiva(ultima + 28 * MINUTO, ultima)).toBe(false)
    expect(inactiva(ultima + 29 * MINUTO, ultima)).toBe(true)
  })

  it('sin localStorage, cuenta la actividad de esta pestaña', () => {
    registrarActividad(5000)
    expect(ultimaActividad()).toBe(5000)
  })

  it('con localStorage, la actividad se comparte entre pestañas', () => {
    const guardado = new Map()
    globalThis.localStorage = { getItem: (k) => guardado.get(k) ?? null, setItem: (k, v) => guardado.set(k, v) }
    registrarActividad(7000)
    expect(ultimaActividad()).toBe(7000)
    guardado.set('trdcode-ultima-actividad', '9000') // otra pestaña tuvo actividad después
    expect(ultimaActividad()).toBe(9000)
  })

  it('si localStorage falla, no rompe la página', () => {
    globalThis.localStorage = {
      getItem: () => {
        throw new Error('bloqueado')
      },
      setItem: () => {
        throw new Error('bloqueado')
      },
    }
    expect(() => registrarActividad(11000)).not.toThrow()
    expect(ultimaActividad()).toBe(11000)
  })
})
