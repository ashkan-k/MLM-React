import { expect, test, type Page } from '@playwright/test'

async function login(page: Page, mobile: string) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.goto('/login')
    await page.getByTestId('login-mobile').fill(mobile)
    await page.getByTestId('login-password').fill('Password123!')
    await page.getByTestId('login-submit').click()
    try {
      await expect(page).not.toHaveURL(/\/login$/, { timeout: 20_000 })
      return
    } catch (err) {
      if (attempt === 3) throw err
      await page.waitForTimeout(1000 * attempt)
    }
  }
}

test.describe('ورود بی‌سر و صدای سوپریوزر به پنل کاربر', () => {
  test('سوپریوزر پنل کاربر را در تب جدید باز می‌کند و تب خودش لاگین می‌ماند', async ({ page, context }) => {
    test.setTimeout(90_000)
    await login(page, '09120000000')
    await page.goto('/superuser/users')
    await expect(page.getByTestId('admin-users')).toBeVisible()

    const search = page.locator('input[placeholder*="جستجو"], input[placeholder*="Search"]').first()
    await search.fill('09125555555')
    await expect(page.getByTestId('admin-users').getByText('09125555555')).toBeVisible({ timeout: 15_000 })

    const row = page.locator('tr', { hasText: '09125555555' }).first()
    await expect(row).toBeVisible()

    const earlyPopup = context.waitForEvent('page', { timeout: 4_000 }).catch(() => null)
    await row.getByTestId('impersonate-user').click()

    // Multi-role users get a role picker; single-role opens immediately.
    const roleModal = page.getByTestId('impersonate-role-modal')
    const needsRolePick = await roleModal.isVisible().catch(() => false)
    let popup = needsRolePick ? null : await earlyPopup
    if (needsRolePick) {
      const select = page.getByTestId('impersonate-role-select')
      const values = await select.locator('option').evaluateAll((els) => els.map((e) => (e as HTMLOptionElement).value))
      const pick = values.includes('representative') ? 'representative' : values[0]
      await select.selectOption(pick)
      const popupPromise = context.waitForEvent('page')
      await page.getByTestId('impersonate-confirm').click()
      popup = await popupPromise
    }
    if (!popup) throw new Error('تب پنل کاربر باز نشد')
    await popup.waitForLoadState('domcontentloaded')
    await expect(popup).toHaveURL(/\/(dashboard|superuser)/, { timeout: 20_000 })
    await expect(popup.getByTestId('impersonation-banner')).toBeVisible({ timeout: 20_000 })
    await expect(popup.getByTestId('impersonation-banner')).toContainText(/مشاهده|Viewing/i)

    // Original superuser tab stays on admin users and still authenticated as superuser.
    await expect(page).toHaveURL(/\/superuser\/users/)
    await page.goto('/superuser')
    await expect(page.getByTestId('admin-stats')).toBeVisible({ timeout: 20_000 })

    // Exit impersonation only affects the popup tab.
    await popup.getByTestId('impersonation-exit').click()
    await expect(popup).toHaveURL(/\/login/, { timeout: 15_000 })
    await expect(page.getByTestId('admin-stats')).toBeVisible()
  })
})
