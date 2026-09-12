import { expect, test, type Page } from '@playwright/test'

async function login(page: Page, mobile: string) {
  await page.goto('/login')
  await page.getByTestId('login-mobile').fill(mobile)
  await page.getByTestId('login-password').fill('Password123!')
  await page.getByTestId('login-submit').click()
  await expect(page).not.toHaveURL(/\/login$/)
}

test.describe('Finopal sales organization', () => {
  test('representative dashboard, wallet isolation and commissions', async ({ page }) => {
    await login(page, '09125555555')
    await expect(page).toHaveURL(/dashboard\/representative/)
    await expect(page.getByTestId('wallet-balance')).toBeVisible()
    await page.getByRole('link', { name: 'پورسانت' }).click()
    await expect(page.getByTestId('commission-table')).toBeVisible()
    await page.getByRole('link', { name: 'گزارش تجمیعی' }).click()
    await expect(page.getByTestId('aggregate-finance')).toContainText('ادغام')
  })

  test('multi-role switcher changes dashboard without logout', async ({ page }) => {
    await login(page, '09126666666')
    await page.getByTestId('role-switcher').selectOption('sales_manager')
    await expect(page).toHaveURL(/dashboard\/sales-manager/)
    await expect(page.getByText('داشبورد مدیر فروش')).toBeVisible()
    await page.getByTestId('role-switcher').selectOption('representative')
    await expect(page).toHaveURL(/dashboard\/representative/)
  })

  test('shared sale commissions are visible to shared representatives', async ({ page }) => {
    await login(page, '09127777777')
    await page.getByRole('link', { name: 'پورسانت' }).click()
    await expect(page.getByTestId('commission-table')).toContainText('7.500')
  })

  test('organization tree and training flow', async ({ page }) => {
    await login(page, '09123333333')
    await page.getByRole('link', { name: 'سازمان و تیم' }).click()
    await expect(page.getByTestId('org-tree')).toBeVisible()
    await page.getByRole('link', { name: 'آموزش' }).click()
    await expect(page.getByTestId('training-list')).toContainText('آموزش سازمان فروش')
  })

  test('withdrawal request appears as senior-manager pending', async ({ page }) => {
    await login(page, '09125555555')
    await page.getByRole('link', { name: 'برداشت' }).click()
    await expect(page.getByTestId('withdraw-submit')).toBeEnabled()
    await page.getByTestId('withdraw-amount').fill('500')
    await page.getByTestId('withdraw-submit').click()
    await expect(page.getByTestId('withdraw-status').first()).toContainText('senior_manager_pending')
  })

  test('chat directory is authorized and cross-branch stays hidden or denied', async ({ page }) => {
    await login(page, '09125555555')
    await page.getByRole('link', { name: 'گفتگو' }).click()
    await expect(page.getByText('مخاطبان مجاز')).toBeVisible()
    await expect(page.getByText('شاخه جدا')).toHaveCount(0)
  })

  test('superuser admin panel, rules and permissions', async ({ page }) => {
    await login(page, '09120000000')
    await expect(page).toHaveURL(/superuser/)
    await expect(page.getByTestId('admin-stats')).toBeVisible()
    await page.getByRole('link', { name: 'قواعد پورسانت' }).click()
    await expect(page.getByTestId('commission-rules')).toContainText('نماینده')
    await page.getByRole('link', { name: 'دسترسی‌ها' }).click()
    await expect(page.getByTestId('permissions-admin')).toContainText('senior_manager.withdrawal.approve')
  })

  test('senior manager sees promotion criteria and referrals', async ({ page }) => {
    await login(page, '09121111111')
    await page.getByRole('link', { name: 'ارتقاء' }).click()
    await expect(page.getByTestId('promotion-criteria')).toBeVisible()
    await page.getByRole('link', { name: 'معرف و لینک اشتراکی' }).click()
    await expect(page.getByTestId('referral-code')).toBeVisible()
  })
})
