import { expect, test, type Page } from '@playwright/test'

const PASSWORD = 'Password123!'

async function loginAsRepresentative(page: Page) {
  await page.goto('/login')
  await page.evaluate(() => localStorage.clear())
  await page.goto('/login')
  await expect(page.getByTestId('login-mobile')).toBeVisible({ timeout: 20_000 })
  await page.getByTestId('login-mobile').fill('09125555555')
  await page.getByTestId('login-password').fill(PASSWORD)
  await page.getByTestId('login-submit').click()
  await expect(page).not.toHaveURL(/\/login$/, { timeout: 20_000 })

  const token = await page.evaluate(() => localStorage.getItem('finopal.token'))
  expect(token).toBeTruthy()
  const switched = await page.request.post('http://127.0.0.1:8000/api/auth/switch-role', {
    headers: { Authorization: `Bearer ${token}` },
    data: { role_slug: 'representative' },
  })
  expect(switched.ok(), await switched.text()).toBeTruthy()
  await page.goto('/dashboard/representative/referrals')
  await page.reload()
  await expect(page).toHaveURL(/\/dashboard\/representative\/referrals/)
}

test.describe('اشتراک لینک + QR + پیامک', () => {
  test('مودال اشتراک بدون تکرار لینک و مودال جداگانه پیامک', async ({ page }) => {
    test.setTimeout(120_000)
    await loginAsRepresentative(page)

    await expect(page.getByTestId('referral-codes')).toBeVisible({ timeout: 20_000 })
    const bar = page.getByTestId('referral-codes').getByTestId('share-link-bar').first()
    await expect(bar.getByTestId('share-open-modal')).toBeVisible()
    await expect(bar.getByTestId('share-sms-open')).toBeVisible()

    // مودال شبکه‌ها — لینک در URL تلگرام یک‌بار، text بدون لینک تکراری
    await bar.getByTestId('share-open-modal').click()
    await expect(page.getByTestId('share-modal')).toBeVisible()
    await expect(page.getByTestId('share-qr-preview').locator('img')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('share-sms-box')).toHaveCount(0)

    const linkText = (await page.getByTestId('share-modal').locator('a.text-prim').first().textContent())?.trim() ?? ''
    expect(linkText.length).toBeGreaterThan(10)

    const popupPromise = page.waitForEvent('popup')
    await page.getByTestId('share-net-telegram').click()
    const popup = await popupPromise
    const tgUrl = popup.url()
    await popup.close()

    const tg = new URL(tgUrl)
    expect(tg.hostname).toMatch(/t\.me/)
    const sharedUrl = tg.searchParams.get('url') ?? ''
    const sharedText = tg.searchParams.get('text') ?? ''
    expect(sharedUrl).toBe(linkText)
    // لینک نباید داخل text دوباره آمده باشد
    expect(sharedText).not.toContain('http')
    expect(sharedText).toMatch(/فینونت/)
    expect((sharedText.match(new RegExp(linkText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length).toBe(0)

    await page.keyboard.press('Escape')
    await expect(page.getByTestId('share-modal')).toHaveCount(0)

    // مودال جداگانه پیامک + پیش‌نمایش
    await bar.getByTestId('share-sms-open').click()
    await expect(page.getByTestId('share-sms-modal')).toBeVisible()
    await expect(page.getByTestId('share-sms-preview')).toContainText('دعوت به سازمان فروش فینونت')
    await expect(page.getByTestId('share-sms-preview')).toContainText(linkText)
    // لینک فقط یک‌بار در پیش‌نمایش
    const preview = await page.getByTestId('share-sms-preview').innerText()
    expect(preview.split(linkText).length - 1).toBe(1)

    await page.getByTestId('share-sms-mobile').fill('09396988720')
    await expect(page.getByTestId('share-sms-preview')).toContainText('09396988720')

    const smsResponse = page.waitForResponse((r) =>
      r.url().includes('/api/referrals/share-sms') && r.request().method() === 'POST',
    )
    await page.getByTestId('share-sms-send').click()
    const res = await smsResponse
    expect(res.ok(), await res.text()).toBeTruthy()
    const body = await res.json()
    expect(body.success).toBeTruthy()
    expect(body.mobile).toBe('09396988720')
  })

  test('API پیامک لینک دیگران را رد می‌کند', async ({ request }) => {
    const login = await request.post('http://127.0.0.1:8000/api/auth/login', {
      data: { mobile: '09125555555', password: PASSWORD, role_slug: 'representative' },
    })
    expect(login.ok()).toBeTruthy()
    const token = (await login.json()).token as string

    const denied = await request.post('http://127.0.0.1:8000/api/referrals/share-sms', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        mobile: '09396988720',
        link: 'https://finonet.ir/register?ref=FOREIGNCODE',
        kind: 'register',
      },
    })
    expect(denied.status()).toBe(422)
  })
})
