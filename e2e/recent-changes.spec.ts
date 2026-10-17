import { expect, test, type Locator, type Page } from '@playwright/test'

async function login(page: Page, mobile: string) {
  await page.goto('/login')
  await page.getByTestId('login-mobile').fill(mobile)
  await page.getByTestId('login-password').fill('Password123!')
  await page.getByTestId('login-submit').click()
  await expect(page).not.toHaveURL(/\/login$/, { timeout: 20_000 })
}

async function paddingStart(locator: Locator) {
  return locator.evaluate((el) => parseFloat(getComputedStyle(el).paddingInlineStart))
}

test.describe('تغییرات اخیر — پاداش پیش‌فرض، جستجو، لینک فینوپال', () => {
  test('صفحه پاداش پیش‌فرض جدا است و آیکن جستجو روی متن نمی‌افتد', async ({ page }) => {
    await login(page, '09121111111')
    await page.goto('/dashboard/senior-manager/bonus-default')
    const finder = page.getByTestId('bonus-default-finder')
    await expect(finder).toBeVisible()
    await expect(page.getByTestId('bonus-default-page').getByRole('heading', { name: 'پاداش پیش‌فرض' })).toBeVisible()
    const search = finder.getByPlaceholder('نام یا موبایل')
    expect(await paddingStart(search)).toBeGreaterThanOrEqual(40)

    await page.goto('/dashboard/senior-manager/points')
    await expect(page.getByTestId('points-monitor-page')).toBeVisible()
    await expect(page.getByTestId('bonus-default-finder')).toHaveCount(0)
    const pointsSearch = page.getByPlaceholder('نام یا موبایل')
    expect(await paddingStart(pointsSearch)).toBeGreaterThanOrEqual(40)

    await page.goto('/dashboard/senior-manager/monthly-bonus')
    await expect(page.getByTestId('monthly-bonus-page')).toBeVisible()
    await expect(page.getByTestId('bonus-default-finder')).toHaveCount(0)
  })

  test('فعال و لغو پاداش در مانیتور ماهانه دیده می‌شود و بعد به حالت قبل برمی‌گردد', async ({ page }) => {
    test.setTimeout(120_000)
    await login(page, '09121111111')
    await page.goto('/dashboard/senior-manager/bonus-default')
    const finder = page.getByTestId('bonus-default-finder')
    await finder.getByPlaceholder('نام یا موبایل').fill('09125555555')
    await finder.getByRole('button', { name: 'جستجو' }).click()
    const card = finder.getByTestId('bonus-default-user').filter({ hasText: '09125555555' })
    await expect(card).toBeVisible({ timeout: 15_000 })

    const enable = card.getByRole('button', { name: 'فعال کردن پاداش' })
    const cancel = card.getByRole('button', { name: 'لغو پاداش' })
    const alreadyOn = await cancel.count()
    while (await enable.count()) {
      await enable.first().click()
      await expect(card.getByText('پاداش فعال است').first()).toBeVisible({ timeout: 20_000 })
    }
    expect(await cancel.count()).toBeGreaterThan(0)

    await page.goto('/dashboard/senior-manager/monthly-bonus')
    await page.getByPlaceholder('نام یا موبایل').fill('09125555555')
    await page.getByRole('button', { name: 'جستجو' }).click()
    const row = page.getByTestId('monthly-bonus-monitor').locator('tr').filter({ hasText: '09125555555' })
    await expect(row.getByText('پاداش پیش‌فرض فعال').first()).toBeVisible({ timeout: 20_000 })
    await expect(row.getByText('هنوز به حد نصاب نرسیده‌اید')).toHaveCount(0)

    await page.goto('/dashboard/senior-manager/bonus-default')
    await finder.getByPlaceholder('نام یا موبایل').fill('09125555555')
    await finder.getByRole('button', { name: 'جستجو' }).click()
    await expect(card).toBeVisible()
    while ((await cancel.count()) > alreadyOn) {
      await cancel.first().click()
      await expect(card.getByRole('button', { name: 'فعال کردن پاداش' }).first()).toBeVisible({ timeout: 20_000 })
    }
  })

  test('لینک ثبت فروش فینوپال finonet_ref دارد و لینک ثبت‌نام نماینده جدا مانده', async ({ page }) => {
    await login(page, '09121111111')
    await page.goto('/dashboard/senior-manager/referrals')
    const own = page.getByTestId('referral-codes').locator('a').first()
    await expect(own).toHaveAttribute('href', /\/register\?ref=/)
    const finopalCard = page.getByTestId('finopal-signup-links')
    const finopal = finopalCard.locator('a').first()
    await expect(finopal).toHaveAttribute('href', /^https:\/\/finopal\.ir\/login\?finonet_ref=/)
    await finopalCard.getByTestId('signup-product').selectOption('ghalebazar')
    await expect(finopalCard.locator('a').first()).toHaveAttribute('href', /^https:\/\/ghalebazar\.ir\/account\/profile\?finonet_ref=/)
    const href = await finopal.getAttribute('href')
    expect(href).not.toContain('code=')
    expect(href).not.toContain('/register')
    const codeBox = await finopalCard.locator('code').first().boundingBox()
    const linkBox = await finopal.boundingBox()
    expect(codeBox && linkBox && linkBox.x < codeBox.x).toBeTruthy()
  })

  test('سوپریوزر هم صفحه پاداش پیش‌فرض را جدا دارد', async ({ page }) => {
    await login(page, '09120000000')
    await page.goto('/superuser/bonus-default')
    const finder = page.getByTestId('bonus-default-finder')
    await expect(finder).toBeVisible()
    expect(await paddingStart(finder.getByPlaceholder('نام یا موبایل'))).toBeGreaterThanOrEqual(40)
    await page.goto('/superuser/users')
    const adminSearch = page.getByPlaceholder(/نام|موبایل|جستجو/)
    expect(await paddingStart(adminSearch.first())).toBeGreaterThanOrEqual(40)
  })
})
