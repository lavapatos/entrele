import { expect, type Page } from '@playwright/test'

export function collectUnexpectedPageErrors(page: Page): string[] {
  const errors: string[] = []

  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`))

  return errors
}

export async function openPrivateDaily(page: Page): Promise<void> {
  await page.goto('?auth=in')
  await expect(page.getByRole('button', { name: 'Estadísticas' })).toBeVisible()
  await expect(page.getByLabel('Palabra de cinco letras')).toBeEnabled()
}

export async function submitGuess(page: Page, word: string): Promise<void> {
  await page.getByLabel('Palabra de cinco letras').fill(word)
  await page.getByRole('button', { name: 'Probar' }).click()
}
