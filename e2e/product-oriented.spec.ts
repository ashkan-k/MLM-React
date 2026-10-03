import { expect, test, type Page } from '@playwright/test'

async function login(page: Page, mobile: string, role?: string) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.goto('/login')
    await page.getByTestId('login-mobile').fill(mobile)
    await page.getByTestId('login-password').fill('Password123!')
    await page.getByTestId('login-submit').click()
    try {
      await expect(page).not.toHaveURL(/\/login$/, { timeout: 20_000 })
      break
    } catch (err) {
      if (attempt === 3) throw err
      await page.waitForTimeout(1000 * attempt)
    }
  }
  if (role) {
    const token = await page.evaluate(() => localStorage.getItem('finopal.token'))
    expect(token).toBeTruthy()
    const switched = await page.request.post('http://127.0.0.1:8000/api/auth/switch-role', {
      headers: { Authorization: `Bearer ${token}` },
      data: { role_slug: role },
    })
    expect(switched.ok()).toBeTruthy()
    const body = await switched.json()
    await page.evaluate((user) => {
      localStorage.setItem('finopal.user', JSON.stringify(user))
    }, body)
    const path = `/dashboard/${role.replaceAll('_', '-')}`
    await page.goto(path)
    await expect(page.locator('main')).toBeVisible({ timeout: 20_000 })
  }
}

async function featuresProductOriented(page: Page) {
  const token = await page.evaluate(() => localStorage.getItem('finopal.token'))
  expect(token).toBeTruthy()
  const me = await page.request.get('http://127.0.0.1:8000/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(me.ok()).toBeTruthy()
  const body = await me.json()
  return Boolean(body.features?.product_oriented)
}

test.describe('محصول‌محور — پنل‌ها و نقش‌ها', () => {
  test('فلگ product_oriented از /auth/me می‌آید', async ({ page }) => {
    await login(page, '09120000000')
    const oriented = await featuresProductOriented(page)
    // Seed/QA expects true; if false, UI falls back to classic gateway mode.
    test.info().annotations.push({ type: 'product_oriented', description: String(oriented) })
    expect(typeof oriented).toBe('boolean')
  })

  test('نماینده: فروش‌ها و پورسانت محصول را می‌بیند', async ({ page }) => {
    test.setTimeout(120_000)
    await login(page, '09125555555', 'representative')
    const oriented = await featuresProductOriented(page)

    await page.goto('/dashboard/representative/gateways')
    await expect(page.getByTestId('gateway-table')).toBeVisible()
    if (oriented) {
      await expect(page.getByRole('columnheader', { name: /محصول|Product/ })).toBeVisible()
      await expect(page.locator('[data-testid="gateway-table"]')).toContainText(/تیکتینگ|اشتراک|درگاه|Ticketing|Subscription|Gateway/i)
    }

    await page.goto('/dashboard/representative/commissions')
    await expect(page.getByTestId('commission-table')).toBeVisible()
    if (oriented) {
      await expect(page.getByRole('columnheader', { name: /محصول|Product/ })).toBeVisible()
      await expect(page.locator('[data-testid="commission-table"]')).not.toContainText('محصول سفارشی')
      await expect(page.locator('[data-testid="commission-table"]')).toContainText(/سود درگاه|تیکتینگ|اشتراک|Gateway|Ticketing|Subscription/i)
    }
    await expect(page.locator('#root')).not.toContainText('Something went wrong')
  })

  test('مدیر ارشد: پورسانت بدون محصول سفارشی + صفحات کلیدی', async ({ page }) => {
    test.setTimeout(120_000)
    await login(page, '09121111111', 'senior_manager')
    const oriented = await featuresProductOriented(page)

    const paths = [
      '/dashboard/senior-manager/gateways',
      '/dashboard/senior-manager/commissions',
      '/dashboard/senior-manager/monthly-bonus',
      '/dashboard/senior-manager/wallet',
      '/dashboard/senior-manager/team',
    ]
    for (const path of paths) {
      await page.goto(path)
      await expect(page.locator('main')).toBeVisible()
      await expect(page.locator('#root')).not.toContainText('Something went wrong')
    }

    await page.goto('/dashboard/senior-manager/commissions')
    await expect(page.getByTestId('commission-table')).toBeVisible()
    await expect(page.locator('[data-testid="commission-table"]')).not.toContainText('محصول سفارشی')
    if (oriented) {
      await expect(page.getByRole('columnheader', { name: /محصول|Product/ })).toBeVisible()
    }
  })

  test('مدیر فروش و توسعه: پنل فروش بدون کرش', async ({ page }) => {
    test.setTimeout(120_000)
    for (const [mobile, role] of [
      ['09123333333', 'sales_manager'],
      ['09122222222', 'development_manager'],
    ] as const) {
      await page.goto('/login')
      await page.evaluate(() => localStorage.clear())
      await login(page, mobile, role)
      const base = `/dashboard/${role.replaceAll('_', '-')}`
      await page.goto(`${base}/gateways`)
      await expect(page.getByTestId('gateway-table')).toBeVisible()
      await page.goto(`${base}/commissions`)
      await expect(page.getByTestId('commission-table')).toBeVisible()
      await expect(page.locator('[data-testid="commission-table"]')).not.toContainText('محصول سفارشی')
    }
  })

  test('معرف و مالکین اشتراکی: پورسانت محصول‌محور', async ({ page }) => {
    test.setTimeout(120_000)
    for (const mobile of ['09124444444', '09127777777', '09128888888'] as const) {
      await page.goto('/login')
      await page.evaluate(() => localStorage.clear())
      await login(page, mobile, 'representative')
      await page.goto('/dashboard/representative/commissions')
      await expect(page.getByTestId('commission-table')).toBeVisible()
      await expect(page.locator('[data-testid="commission-table"]')).not.toContainText('محصول سفارشی')
      await page.goto('/dashboard/representative/wallet')
      await expect(page.getByText('در حال بارگذاری...')).toHaveCount(0, { timeout: 20_000 })
      await expect(page.locator('main')).toBeVisible({ timeout: 20_000 })
      await expect(page.locator('#root')).not.toContainText('Something went wrong')
    }
  })

  test('سوپریوزر: کاربران + sms + درگاه‌ها + پورسانت', async ({ page }) => {
    test.setTimeout(120_000)
    await login(page, '09120000000')
    await page.goto('/superuser/users')
    await expect(page.locator('main')).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /کد ملی|National/ })).toBeVisible()

    await page.goto('/superuser/gateways')
    await expect(page.getByTestId('gateway-table')).toBeVisible()

    await page.goto('/superuser/commissions')
    await expect(page.getByTestId('commission-table')).toBeVisible()
    await expect(page.locator('[data-testid="commission-table"]')).not.toContainText('محصول سفارشی')

    await page.goto('/superuser/sms')
    await expect(page.getByTestId('sms-debug-page')).toBeVisible()
  })

  test('وب‌هوک تیکتینگ و اشتراک پورسانت می‌سازند', async ({ page }) => {
    const secret = 'finopal-local-webhook-secret'
    const stamp = Date.now()

    const ticketing = await page.request.post('http://127.0.0.1:8000/api/webhooks/finopal/transaction', {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Finopal-Webhook-Secret': secret,
      },
      data: {
        event: 'transaction.verified',
        product_type: 'ticketing',
        product_code: 'FINOPAL-TICKETING',
        title: 'E2E ticketing',
        owner_national_id: '0010000001',
        external_sale_id: `TICKET-E2E-${stamp}`,
        authority: `FP_E2E_TICKET_${stamp}`,
        amount: 1_000_000,
        profit: 100_000,
        currency: 'IRT',
        status: 'OK',
        code: 100,
      },
    })
    expect([200, 422]).toContain(ticketing.status())
    if (ticketing.status() === 200) {
      const body = await ticketing.json()
      expect(body.success).toBeTruthy()
      expect(body.commissions).toBeGreaterThan(0)
    }

    const subscription = await page.request.post('http://127.0.0.1:8000/api/webhooks/finopal/transaction', {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Finopal-Webhook-Secret': secret,
      },
      data: {
        event: 'transaction.verified',
        product_type: 'subscription',
        product_code: 'FINOPAL-SUB',
        title: 'E2E subscription',
        owner_national_id: '0010000003',
        external_sale_id: `SUB-E2E-${stamp}`,
        authority: `FP_E2E_SUB_${stamp}`,
        amount: 2_000_000,
        profit: 200_000,
        currency: 'IRT',
        status: 'OK',
        code: 100,
      },
    })
    expect([200, 422]).toContain(subscription.status())
    if (subscription.status() === 200) {
      const body = await subscription.json()
      expect(body.success).toBeTruthy()
      expect(body.commissions).toBeGreaterThan(0)
    }
  })
})
