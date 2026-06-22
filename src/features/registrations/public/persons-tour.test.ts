import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock driver.js so the tutorial can be tested without a real DOM overlay.
const { driverFactory, driveMock } = vi.hoisted(() => {
  const driveMock = vi.fn()
  const driverFactory = vi.fn(() => ({ drive: driveMock }))
  return { driverFactory, driveMock }
})
vi.mock('driver.js', () => ({ driver: driverFactory }))

import { personsTourSteps, startPersonsTour } from './public-registration-page'

describe('Tutorial guiado del paso "Personas"', () => {
  beforeEach(() => {
    driverFactory.mockClear()
    driveMock.mockClear()
  })

  it('resalta las secciones clave en el orden correcto', () => {
    const selectors = personsTourSteps.map((step) => step.element)
    expect(selectors).toEqual([
      '[data-tour="owners-section"]',
      '[data-tour="owners-warning"]',
      '[data-tour="person-photo"]',
      '[data-tour="add-owner"]',
      '[data-tour="tenants-section"]',
      '[data-tour="add-tenant"]',
    ])
  })

  it('explica que el propietario es el dueño y advierte sobre la inmobiliaria', () => {
    const ownersStep = personsTourSteps.find((s) => s.element.includes('owners-section'))
    const warningStep = personsTourSteps.find((s) => s.element.includes('owners-warning'))

    expect(ownersStep?.popover.description.toLowerCase()).toContain('dueños del apartamento')
    expect(warningStep?.popover.description.toLowerCase()).toContain('inmobiliaria')
    expect(warningStep?.popover.description.toLowerCase()).toContain('no uses')
  })

  it('cada paso tiene título y descripción para guiar al usuario', () => {
    expect(personsTourSteps).toHaveLength(6)
    for (const step of personsTourSteps) {
      expect(step.popover.title.length).toBeGreaterThan(0)
      expect(step.popover.description.length).toBeGreaterThan(0)
    }
  })

  it('startPersonsTour inicia el recorrido con los pasos definidos', () => {
    startPersonsTour()

    expect(driverFactory).toHaveBeenCalledTimes(1)
    const config = driverFactory.mock.calls[0][0] as { steps: unknown }
    expect(config.steps).toBe(personsTourSteps)
    expect(driveMock).toHaveBeenCalledTimes(1)
  })
})
