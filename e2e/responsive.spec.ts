import { expect, test } from '@playwright/test'

import { collectUnexpectedPageErrors } from './helpers'

const VIEWPORTS = [
  { name: '320px', width: 320, height: 700 },
  { name: 'iOS', width: 390, height: 844 },
  { name: 'Android', width: 412, height: 915 },
] as const

for (const viewport of VIEWPORTS) {
  test(`cabe y sigue siendo operable en viewport ${viewport.name}`, async ({ page }, testInfo) => {
    const errors = collectUnexpectedPageErrors(page)
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('?auth=out')

    await expect(page.getByLabel('Palabra de cinco letras')).toBeVisible()
    await expect(page.getByLabel('Teclado')).toBeVisible()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true)

    const playfieldBox = await page.getByLabel('Intervalo actual').boundingBox()
    const keyboardBox = await page.getByLabel('Teclado').boundingBox()
    expect(playfieldBox).not.toBeNull()
    expect(keyboardBox).not.toBeNull()
    expect((playfieldBox?.y ?? 0) + (playfieldBox?.height ?? 0)).toBeLessThanOrEqual(
      (keyboardBox?.y ?? 0) + 1,
    )

    await page.screenshot({
      path: testInfo.outputPath(`entrele-${viewport.name}.png`),
      fullPage: true,
    })

    await page.getByRole('button', { name: 'Cómo jugar' }).click()
    const dialog = page.getByRole('dialog', { name: 'Cómo jugar' })
    const dialogBox = await dialog.boundingBox()
    expect(dialogBox).not.toBeNull()
    expect(dialogBox?.x ?? -1).toBeGreaterThanOrEqual(0)
    expect(dialogBox?.width ?? viewport.width + 1).toBeLessThanOrEqual(viewport.width)
    expect(dialogBox?.height ?? viewport.height + 1).toBeLessThanOrEqual(viewport.height)

    expect(errors).toEqual([])
  })
}

test('desactiva el movimiento decorativo cuando se solicita movimiento reducido', async ({
  page,
}) => {
  const errors = collectUnexpectedPageErrors(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('?auth=out')

  await page.getByRole('button', { name: 'Cómo jugar' }).click()
  const demoTile = page.locator('.help-demo-word-before .help-demo-tile').first()
  await expect(demoTile).toBeVisible()
  expect(await demoTile.evaluate((element) => getComputedStyle(element).animationName)).toBe('none')

  expect(errors).toEqual([])
})

test('mantiene las dos paletas en claro y oscuro', async ({ page }, testInfo) => {
  const errors = collectUnexpectedPageErrors(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('?auth=out')

  const combinations = [
    { palette: 'A', mode: 'claro', expectedPalette: 'a', expectedMode: 'light' },
    { palette: 'B', mode: 'claro', expectedPalette: 'b', expectedMode: 'light' },
    { palette: 'A', mode: 'oscuro', expectedPalette: 'a', expectedMode: 'dark' },
    { palette: 'B', mode: 'oscuro', expectedPalette: 'b', expectedMode: 'dark' },
  ] as const

  for (const combination of combinations) {
    await page.getByRole('button', { name: 'Cambiar tema' }).click()
    const themeDialog = page.getByRole('dialog', { name: 'Tema' })
    await themeDialog.getByRole('button', { name: `Paleta ${combination.palette}` }).click()
    await themeDialog.getByRole('button', { name: `Modo ${combination.mode}` }).click()
    await themeDialog.getByRole('button', { name: 'Cerrar' }).click()

    await expect(page.locator('html')).toHaveAttribute('data-palette', combination.expectedPalette)
    await expect(page.locator('html')).toHaveAttribute('data-mode', combination.expectedMode)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true)
    await page.screenshot({
      path: testInfo.outputPath(
        `tema-${combination.expectedPalette}-${combination.expectedMode}.png`,
      ),
      fullPage: true,
    })
  }

  expect(errors).toEqual([])
})
