import { expect, test, type Page } from '@playwright/test'

async function login(page: Page, mobile: string) {
  await page.goto('/login')
  await page.evaluate(() => localStorage.removeItem('finopal.token'))
  await page.goto('/login')
  await page.getByTestId('login-mobile').fill(mobile)
  await page.getByTestId('login-password').fill('Password123!')
  await page.getByTestId('login-submit').click()
  await expect(page).not.toHaveURL(/\/login$/, { timeout: 20_000 })
}

test('سوپریوزر محصول جدید را می‌سازد و در لینک ثبت فروش دیده می‌شود', async ({ page }) => {
  const stamp = Date.now().toString().slice(-6)
  const type = `qa_play_${stamp}`
  const label = `محصول ${stamp}`

  await login(page, '09120000000')
  await page.goto('/superuser/products')
  await expect(page.getByTestId('catalog-products-page')).toBeVisible()
  await expect(page.getByText('قالب بازار')).toBeVisible()
  await page.getByTestId('catalog-product-open').click()
  await expect(page.getByText('همان product_type است')).toBeVisible()
  await expect(page.getByText('اگر وب‌هوک product_code نفرستد')).toBeVisible()
  await page.getByTestId('catalog-product-label').fill(label)
  await page.getByTestId('catalog-product-type').fill(type)
  await page.getByTestId('catalog-product-signup').fill('https://example.com/join')
  await page.getByTestId('catalog-product-save').click()
  const row = page.getByTestId('catalog-product-row').filter({ hasText: label })
  await expect(row).toBeVisible()

  await page.goto('/superuser/transactions')
  await expect(page.getByTestId('tx-product').locator('option', { hasText: label })).toHaveCount(1)

  await login(page, '09121111111')
  await page.goto('/dashboard/senior-manager/referrals')
  const card = page.getByTestId('finopal-signup-links')
  await card.getByTestId('signup-product').selectOption(type)
  await expect(card.locator('a').first()).toHaveAttribute('href', new RegExp(`^https://example\\.com/join\\?finonet_ref=`))

  await login(page, '09120000000')
  await page.goto('/superuser/products')
  await page.getByTestId('catalog-product-row').filter({ hasText: label }).getByLabel('حذف محصول').click()
  await page.getByRole('button', { name: 'حذف شود' }).click()
  await expect(page.getByTestId('catalog-product-row').filter({ hasText: label })).toHaveCount(0)
})
