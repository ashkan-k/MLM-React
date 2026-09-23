import { expect, test, type Page } from '@playwright/test'

async function login(page: Page, mobile: string, rolePath: string) {
  await page.goto('/login')
  await page.getByTestId('login-mobile').fill(mobile)
  await page.getByTestId('login-password').fill('Password123!')
  await page.getByTestId('login-submit').click()
  await expect(page).not.toHaveURL(/\/login$/)
  await page.goto(rolePath)
  await expect(page.locator('main')).toBeVisible()
}

test.describe('سناریوی کارفرما — پوشش UI مرتبط با پورسانت/پاداش/سازمان', () => {
  test('صفحه پورسانت نماینده ستون نوع و badge پاداش/پایه را نشان می‌دهد', async ({ page }) => {
    await login(page, '09125555555', '/dashboard/representative/commissions')
    await expect(page.getByTestId('commission-table')).toBeVisible()
    await expect(page.getByText('نوع', { exact: true }).first()).toBeVisible()
    // حداقل یکی از برچسب‌ها در جدول دیده شود (بسته به داده دمو)
    const baseOrBonus = page.getByText(/پورسانت پایه|پاداش ماهانه|مابقی پاداش/)
    await expect(baseOrBonus.first()).toBeVisible({ timeout: 15_000 })
  })

  test('مانیتورینگ امتیاز ارشد و پاداش ماهانه ارشد بدون خطا باز می‌شوند', async ({ page }) => {
    await login(page, '09121111111', '/dashboard/senior-manager/points')
    await expect(page.getByTestId('points-monitor-page')).toBeVisible({ timeout: 15_000 })
    await page.goto('/dashboard/senior-manager/monthly-bonus')
    await expect(page.getByTestId('monthly-bonus-page')).toBeVisible()
    await page.goto('/dashboard/senior-manager/org-managers')
    await expect(page.locator('main')).toContainText(/الحاق از پایین به بالا|جابجایی/)
  })

  test('سوپریوزر صفحه مانیتورینگ امتیاز را می‌بیند', async ({ page }) => {
    await login(page, '09120000000', '/superuser/points')
    await expect(page.getByTestId('points-monitor-page')).toBeVisible({ timeout: 15_000 })
  })
})
