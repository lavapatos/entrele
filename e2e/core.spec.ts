import { expect, test } from '@playwright/test'

import { collectUnexpectedPageErrors, openPrivateDaily, submitGuess } from './helpers'

test('la primera visita pública abre práctica y explica el juego', async ({ page }) => {
  const errors = collectUnexpectedPageErrors(page)

  await page.goto('?auth=out')

  await expect(page.getByRole('heading', { name: 'ENTRELE' })).toBeVisible()
  await expect(page.getByLabel('Modo práctica')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
  await expect(page.getByLabel('Palabra de cinco letras')).toBeEnabled()

  await page.getByRole('button', { name: 'Cómo jugar' }).click()
  const helpDialog = page.getByRole('dialog', { name: 'Cómo jugar' })
  await expect(helpDialog).toBeVisible()
  await expect(helpDialog.getByText('Escribe una palabra de cinco letras.')).toBeVisible()
  await expect(helpDialog.getByText(/según el orden alfabético/)).toBeVisible()
  await helpDialog.getByRole('button', { name: 'Cerrar' }).click()
  await expect(helpDialog).toBeHidden()

  expect(errors).toEqual([])
})

test('carga las tipografías locales de la interfaz', async ({ page }) => {
  const errors = collectUnexpectedPageErrors(page)
  await page.goto('?auth=out')

  const fontsLoaded = await page.evaluate(async () => {
    await document.fonts.ready
    return {
      comfortaa: document.fonts.check('700 32px "Comfortaa Variable"'),
      lato: document.fonts.check('400 16px "Lato"'),
    }
  })

  expect(fontsLoaded).toEqual({ comfortaa: true, lato: true })
  expect(errors).toEqual([])
})

test('permite operar los diálogos y el acceso usando el teclado', async ({ page }) => {
  const errors = collectUnexpectedPageErrors(page)
  await page.goto('?auth=out')

  const helpButton = page.getByRole('button', { name: 'Cómo jugar' })
  await helpButton.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Cómo jugar' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Cómo jugar' })).toBeHidden()
  await expect(helpButton).toBeFocused()

  const accessButton = page.getByRole('button', { name: 'Entrar' })
  await accessButton.focus()
  await page.keyboard.press('Enter')
  const accessDialog = page.getByRole('dialog', { name: 'Entrar' })
  await accessDialog.getByLabel('Usuario').fill('tester')
  await accessDialog.getByLabel('Contraseña').fill('incorrecta')
  await accessDialog.getByLabel('Contraseña').press('Enter')
  await expect(accessDialog.getByRole('alert')).toContainText('Usuario o contraseña incorrectos.')

  expect(errors).toEqual([])
})

test('permite ganar la diaria local de prueba', async ({ page }) => {
  const errors = collectUnexpectedPageErrors(page)
  await openPrivateDaily(page)

  await submitGuess(page, 'mango')

  await expect(page.getByRole('status')).toContainText('¡Ganaste!')
  const resultDialog = page.getByRole('dialog', { name: 'Ganaste' })
  await expect(resultDialog).toBeVisible()
  await expect(resultDialog.getByText('MANGO')).toBeVisible()
  await expect(resultDialog.getByText('1 intento')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Probar' })).toBeDisabled()

  expect(errors).toEqual([])
})

test('permite perder después de diez intentos válidos', async ({ page }) => {
  const errors = collectUnexpectedPageErrors(page)
  const losingGuesses = [
    'manco',
    'manda',
    'mande',
    'mando',
    'manea',
    'manee',
    'manen',
    'maneo',
    'manes',
    'manga',
  ]

  await openPrivateDaily(page)
  for (const guess of losingGuesses) await submitGuess(page, guess)

  const resultDialog = page.getByRole('dialog', { name: 'La palabra era' })
  await expect(resultDialog).toBeVisible()
  await expect(resultDialog.getByText('MANGO')).toBeVisible()
  await expect(resultDialog.getByText('10 intentos')).toBeVisible()
  await expect(page.getByLabel('10 de 10 intentos usados')).toBeVisible()

  expect(errors).toEqual([])
})

test('conserva el intervalo y el borrador al recargar', async ({ page }) => {
  const errors = collectUnexpectedPageErrors(page)
  await openPrivateDaily(page)

  await submitGuess(page, 'radio')
  await expect(page.getByLabel('Límite superior: RADIO')).toBeVisible()
  await page.getByLabel('Palabra de cinco letras').fill('mang')

  await page.reload()

  await expect(page.getByRole('button', { name: 'Estadísticas' })).toBeVisible()
  await expect(page.getByLabel('1 de 10 intentos usados')).toBeVisible()
  await expect(page.getByLabel('Límite superior: RADIO')).toBeVisible()
  await expect(page.getByLabel('Palabra de cinco letras')).toHaveValue('mang')

  expect(errors).toEqual([])
})
