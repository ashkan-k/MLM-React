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
    test.setTimeout(120_000)
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

  test('همه صفحات مدیر سامانه بدون خطا باز می‌شوند', async ({ page }) => {
    test.setTimeout(120_000)
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
    await expect(page.getByText(/در انتظار مدیر سامانه|تصمیم ثبت شد/).first()).toBeVisible()
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

  test('برداشت مدیر ارشد مستقیم به مدیر سامانه می‌رود و دکمه تایید خودش ندارد', async ({ page }) => {
    await login(page, '09121111111')
    await page.goto('/dashboard/senior-manager/withdrawals')
    await page.getByTestId('withdraw-open').click()
    await page.getByTestId('withdraw-amount').fill('400')
    await page.getByTestId('withdraw-submit').click()
    await expect(page.getByText('در انتظار مدیر سامانه').first()).toBeVisible()
    const pendingSuper = page.getByRole('row', { name: /در انتظار مدیر سامانه/ }).first()
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

  test('مدیر سامانه صفحه گفتگو دارد', async ({ page }) => {
    await login(page, '09120000000')
    await page.goto('/superuser/chat')
    await expect(page.getByText('مخاطبان مجاز')).toBeVisible()
    await expect(page.locator('header a[aria-label="اعلان‌ها"]')).toBeVisible()
    await expect(page.locator('header a[aria-label="گفتگو"]')).toBeVisible()
  })

  test('پرونده ارتقاء عناوین فارسی دارد و با زبان انگلیسی عوض می‌شود', async ({ page }) => {
    await login(page, '09121111111')
    await page.goto('/dashboard/senior-manager/promotions')
    await page.getByRole('button', { name: 'پرونده فعالیت' }).first().click()
    const activities = page.getByTestId('promo-activities')
    await expect(activities).toBeVisible()
    await expect(activities).not.toContainText('withdrawal.requested')
    await expect(activities).not.toContainText('promotion.approved')
    if (await activities.getByText('ثبت درخواست برداشت').count()) {
      await expect(activities.getByText('ثبت درخواست برداشت').first()).toBeVisible()
    }
    await page.getByRole('button', { name: 'بستن' }).click()
    await page.getByTestId('lang-toggle').click()
    await page.getByRole('button', { name: 'Activity file' }).first().click()
    await expect(page.getByTestId('promo-activities')).not.toContainText('withdrawal.requested')
  })

  test('رد ارتقاء علت می‌خواهد و در اعلان و داشبورد متقاضی دیده می‌شود', async ({ page, request }) => {
    const reason = `عدم احراز مصاحبه ${Date.now()}`
    const loginRes = await request.post('http://127.0.0.1:8000/api/auth/login', {
      data: { mobile: '09124444444', password: 'Password123!', role_slug: 'representative_referrer' },
    })
    expect(loginRes.ok()).toBeTruthy()
    const token = (await loginRes.json()).token as string
    const created = await request.post('http://127.0.0.1:8000/api/promotions', {
      headers: { Authorization: `Bearer ${token}` },
      data: { from_role: 'representative', target_role: 'sales_manager' },
    })
    expect(created.ok()).toBeTruthy()

    await login(page, '09121111111')
    await page.goto('/dashboard/senior-manager/promotions')
    const card = page.locator('.card').filter({ hasText: 'نماینده معرف' }).filter({ hasText: 'در انتظار' }).first()
    await card.getByRole('button', { name: 'رد' }).click()
    await expect(page.locator('.swal2-textarea')).toBeVisible()
    await page.locator('.swal2-confirm').click()
    await expect(page.locator('.swal2-validation-message')).toBeVisible()
    await page.locator('.swal2-textarea').fill(reason)
    await page.locator('.swal2-confirm').click()
    await expect(page.getByText(reason).first()).toBeVisible()

    await page.goto('/dashboard/senior-manager/notifications')
    await expect(page.getByTestId('notif-link').first()).toBeVisible()
    await page.getByTestId('notif-link').first().click()
    await expect(page).toHaveURL(/\/promotions/)

    await page.evaluate(() => localStorage.clear())
    await login(page, '09124444444')
    await page.goto('/dashboard/representative-referrer/notifications')
    await expect(page.getByText('ارتقاء رد شد').first()).toBeVisible()
    await expect(page.getByText(reason).first()).toBeVisible()
    await page.getByTestId('notif-link').first().click()
    await expect(page).toHaveURL(/\/promotions/)
    await expect(page.getByTestId('promo-reject-reason').filter({ hasText: reason })).toBeVisible()
    await page.goto('/dashboard/representative-referrer')
    await expect(page.getByTestId('dash-promo-rejected')).toContainText(reason)
  })

  test('گفتگوی سازمانی روی WebSocket وصل می‌شود', async ({ page }) => {
    await login(page, '09121111111')
    await page.goto('/dashboard/senior-manager/chat')
    await expect(page.getByText('مخاطبان مجاز')).toBeVisible()
    await expect(page.getByTestId('chat-ws-badge')).toBeVisible({ timeout: 20_000 })
    const contact = page.locator('[data-testid^="chat-user-"]').first()
    await contact.click()
    const text = `سلام از تست پلی‌رایت ${Date.now()}`
    await page.getByTestId('chat-input').fill(text)
    await page.getByRole('button', { name: 'ارسال' }).click()
    await expect(page.getByText(text)).toBeVisible()
  })
})
