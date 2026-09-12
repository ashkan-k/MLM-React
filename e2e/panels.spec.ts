import { expect, test, type Page } from '@playwright/test'

async function login(page: Page, mobile: string) {
  await page.goto('/login')
  await page.getByTestId('login-mobile').fill(mobile)
  await page.getByTestId('login-password').fill('Password123!')
  await page.getByTestId('login-submit').click()
  await expect(page).not.toHaveURL(/\/login$/)
}

async function visit(page: Page, path: string) {
  await page.goto(path)
  await expect(page.locator('main')).toBeVisible()
  await expect(page.locator('#root')).not.toContainText('Something went wrong')
}

test.describe('پوشش کامل پنل‌ها و باگ‌های گزارش‌شده', () => {
  test('لاگین تم و زبان دارد', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByTestId('login-submit')).toBeVisible()
    await page.getByTestId('theme-toggle').click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await page.getByTestId('theme-toggle').click()
    await expect(page.locator('html')).toHaveClass(/light/)
    await page.getByTestId('lang-toggle').click()
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
    await expect(page.getByTestId('login-submit')).toHaveText('Sign in')
  })

  test('همه صفحات پنل مدیر ارشد بدون خطا باز می‌شوند', async ({ page }) => {
    await login(page, '09121111111')
    const paths = [
      '/dashboard/senior-manager',
      '/dashboard/senior-manager/team',
      '/dashboard/senior-manager/gateways',
      '/dashboard/senior-manager/commissions',
      '/dashboard/senior-manager/wallet',
      '/dashboard/senior-manager/finance',
      '/dashboard/senior-manager/withdrawals',
      '/dashboard/senior-manager/transfers',
      '/dashboard/senior-manager/referrals',
      '/dashboard/senior-manager/promotions',
      '/dashboard/senior-manager/training',
      '/dashboard/senior-manager/chat',
      '/dashboard/senior-manager/notifications',
    ]
    for (const path of paths) await visit(page, path)
    await page.goto('/dashboard/senior-manager/commissions')
    await expect(page.getByTestId('bulk-bar')).toHaveCount(0)
    await page.goto('/dashboard/senior-manager/wallet')
    await expect(page.getByTestId('bulk-bar')).toHaveCount(0)
  })

  test('همه صفحات سوپریوزر بدون خطا باز می‌شوند', async ({ page }) => {
    await login(page, '09120000000')
    const paths = [
      '/superuser',
      '/superuser/reports',
      '/superuser/users',
      '/superuser/network',
      '/superuser/permissions',
      '/superuser/rules',
      '/superuser/courses',
      '/superuser/settings',
      '/superuser/audits',
      '/superuser/chat',
      '/superuser/notifications',
      '/superuser/frasoft',
    ]
    for (const path of paths) await visit(page, path)
  })

  test('فیلتر درخت شبکه کار می‌کند و خروجی دیاگرام دارد', async ({ page }) => {
    await login(page, '09121111111')
    await page.goto('/dashboard/senior-manager/team')
    await expect(page.getByTestId('org-tree')).toBeVisible()
    await expect(page.getByTestId('org-search')).toBeVisible()
    await expect(page.getByTestId('org-export-excel')).toBeVisible()
    await expect(page.getByTestId('org-export-tree')).toBeVisible()
    await expect(page.getByTestId('org-export-diagram')).toBeVisible()
    const firstName = (await page.locator('[data-testid="org-tree"] .text-sm.font-medium').first().textContent()) ?? ''
    if (firstName.trim()) {
      await page.getByTestId('org-search').fill(firstName.trim().slice(0, 2))
      await expect(page.locator('[data-testid="org-tree"] .text-sm.font-medium').first()).toBeVisible()
    }
    await page.getByTestId('org-search').fill('zzzz-not-found')
    await expect(page.getByTestId('org-tree')).toContainText(/زیرمجموعه‌ای|No downline/)
  })

  test('برداشت ردشده دوباره قابل تایید دسته‌ای است', async ({ page }) => {
    await login(page, '09125555555')
    await page.goto('/dashboard/representative/withdrawals')
    await page.getByTestId('withdraw-open').click()
    await page.getByTestId('withdraw-amount').fill('700')
    await page.getByTestId('withdraw-submit').click()
    await expect(page.getByText('در انتظار مدیر ارشد').first()).toBeVisible()

    await page.evaluate(() => localStorage.clear())
    await login(page, '09121111111')
    await page.goto('/dashboard/senior-manager/withdrawals')
    await page.getByRole('row', { name: /در انتظار مدیر ارشد/ }).first().getByRole('checkbox').check()
    await page.getByRole('button', { name: 'رد دسته‌ای' }).click()
    await expect(page.getByText('رد شده').first()).toBeVisible()
    await page.getByRole('checkbox', { name: /انتخاب/ }).nth(1).check()
    await page.getByRole('button', { name: 'تایید دسته‌ای' }).click()
    await expect(page.getByText(/در انتظار سوپریوزر|تصمیم ثبت شد/).first()).toBeVisible()
  })

  test('انتقال مزایا حساب‌ها را جستجوپذیر نشان می‌دهد', async ({ page }) => {
    await login(page, '09121111111')
    await page.goto('/dashboard/senior-manager/transfers')
    await page.getByRole('button', { name: 'انتقال جدید' }).click()
    await page.getByTestId('transfer-from').getByRole('button').first().click()
    const search = page.getByTestId('transfer-from').locator('input.input')
    await expect(search).toBeVisible()
    await search.fill('0912')
    await expect(page.getByTestId('transfer-from').locator('button').nth(1)).toBeVisible()
  })

  test('برداشت مدیر ارشد مستقیم به سوپریوزر می‌رود و دکمه تایید خودش ندارد', async ({ page }) => {
    await login(page, '09121111111')
    await page.goto('/dashboard/senior-manager/withdrawals')
    await page.getByTestId('withdraw-open').click()
    await page.getByTestId('withdraw-amount').fill('400')
    await page.getByTestId('withdraw-submit').click()
    await expect(page.getByText('در انتظار سوپریوزر').first()).toBeVisible()
    const pendingSuper = page.getByRole('row', { name: /در انتظار سوپریوزر/ }).first()
    await expect(pendingSuper.getByRole('button', { name: 'تایید' })).toHaveCount(0)
    await expect(pendingSuper.getByRole('button', { name: 'رد' })).toHaveCount(0)
  })

  test('لینک معرف قابل کپی است و آموزش شبکه دیده می‌شود', async ({ page }) => {
    await login(page, '09121111111')
    await page.goto('/dashboard/senior-manager/referrals')
    await expect(page.getByTestId('referral-code')).toBeVisible()
    await expect(page.getByRole('button', { name: 'کپی' }).first()).toBeVisible()
    await page.goto('/dashboard/senior-manager/training')
    await expect(page.getByTestId('training-list')).toContainText('این صفحه چطور کار می‌کند')
    await expect(page.getByTestId('training-monitor')).toBeVisible()
    await page.goto('/dashboard/senior-manager/promotions')
    await expect(page.getByTestId('promotion-criteria')).toContainText('امتیاز')
    await expect(page.getByRole('button', { name: 'ارسال برای بررسی مدیر ارشد' })).toHaveCount(0)
  })

  test('سوپریوزر صفحه گفتگو دارد', async ({ page }) => {
    await login(page, '09120000000')
    await page.goto('/superuser/chat')
    await expect(page.getByText('مخاطبان مجاز')).toBeVisible()
    await expect(page.locator('header a[aria-label="اعلان‌ها"]')).toBeVisible()
    await expect(page.locator('header a[aria-label="گفتگو"]')).toBeVisible()
  })
})
