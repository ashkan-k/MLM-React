import { expect, test, type Page } from '@playwright/test'

async function login(page: Page, mobile: string) {
  await page.goto('/login')
  await page.getByTestId('login-mobile').fill(mobile)
  await page.getByTestId('login-password').fill('Password123!')
  await page.getByTestId('login-submit').click()
  await page.waitForURL(/\/(dashboard|superuser)/)
}

async function apiToken(page: Page) {
  return page.evaluate(() => localStorage.getItem('finopal.token'))
}

test.describe('Goals Bank', () => {
  test('senior creates parts; monitor/access pages; rep receives batch', async ({ page, request }) => {
    const stamp = Date.now()

    await login(page, '09121111111')
    await page.goto('/dashboard/senior-manager/goals-bank')
    await expect(page.getByTestId('goals-bank-page')).toBeVisible()

    const seniorToken = await apiToken(page)
    expect(seniorToken).toBeTruthy()

    const accessRes = await request.get('http://127.0.0.1:8000/api/goals/access?search=09125555555', {
      headers: { Authorization: `Bearer ${seniorToken}`, Accept: 'application/json' },
    })
    expect(accessRes.ok()).toBeTruthy()
    const accessJson = await accessRes.json()
    const target = (accessJson.data as Array<{
      user_id: number
      mobile: string
      enabled: boolean
      max_concurrent: number
      roles: Array<{ role_id: number }>
    }>).find((row) => row.mobile === '09125555555')
    expect(target).toBeTruthy()
    const setRes = await request.post('http://127.0.0.1:8000/api/goals/access', {
      headers: { Authorization: `Bearer ${seniorToken}`, Accept: 'application/json' },
      data: {
        user_id: target!.user_id,
        enabled: true,
        max_concurrent: 2,
        province: 'تهران',
        city: 'تهران',
        role_id: target!.roles[0]?.role_id,
      },
    })
    expect(setRes.ok()).toBeTruthy()

    const mineRes = await request.get('http://127.0.0.1:8000/api/goals/bank?scope=in_progress', {
      headers: { Authorization: `Bearer ${seniorToken}`, Accept: 'application/json' },
    })
    if (mineRes.ok()) {
      const mineJson = await mineRes.json()
      for (const item of mineJson.data as Array<{ id: number; status: string; claimant?: { id: number } }>) {
        if (item.claimant?.id === target!.user_id && item.status === 'in_progress') {
          await request.post(`http://127.0.0.1:8000/api/goals/bank/${item.id}/fail`, {
            headers: { Authorization: `Bearer ${seniorToken}`, Accept: 'application/json' },
            data: { failure_reason: 'پاکسازی خودکار تست Playwright' },
          })
        }
      }
    }

    for (const name of [`هدف الف ${stamp}`, `هدف ب ${stamp}`, `هدف ج ${stamp}`]) {
      await page.getByTestId('goals-create').click()
      await page.getByTestId('goals-field-name').fill(name)
      await page.getByTestId('goals-field-platform').fill('ایتا')
      await page.getByTestId('goals-field-platform_url').fill('https://eitaa.com/test')
      await page.getByTestId('goals-field-audience_count').fill('1200')
      await page.getByTestId('goals-field-phone').fill('02188776655')
      await page.getByTestId('goals-field-mobile').fill('09121112233')
      await page.getByTestId('goals-field-description').fill('سناریوی Playwright')
      await page.getByTestId('goals-save').click()
      await expect(page.getByText(name).first()).toBeVisible({ timeout: 10000 })
    }

    await expect(page.getByText('شماره تماس', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('شماره موبایل', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('02188776655', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('09121112233', { exact: true }).first()).toBeVisible()

    // ریسپانسیو موبایل: شماره کامل و بدون truncate
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.getByText('02188776655', { exact: true }).first()).toBeVisible()
    await expect(page.locator('[data-testid^="goal-item-"]').first().locator('.badge')).toBeVisible()
    await page.setViewportSize({ width: 1280, height: 800 })

    // صفحه دسترسی جدا — یک بانک اهداف مشترک (نه per-role)
    await page.goto('/dashboard/senior-manager/goals-access')
    await expect(page.getByTestId('goals-access-page')).toBeVisible()
    await page.getByTestId('goals-access-search').fill('09125555555')
    await expect(page.getByTestId(`goals-access-user-${target!.user_id}`)).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId(`goals-access-enabled-${target!.user_id}`)).toBeVisible()
    await expect(page.getByTestId(`goals-access-max-${target!.user_id}`)).toBeVisible()
    await expect(page.getByTestId(`goals-access-province-${target!.user_id}`)).toBeVisible()
    await expect(page.getByTestId(`goals-access-city-${target!.user_id}`)).toBeVisible()
    await expect(page.getByText('مشترک', { exact: false }).first()).toBeVisible()

    // ورود یکجای اکسل روی لیست پارت‌ها
    await page.goto('/dashboard/senior-manager/goals-bank')
    await page.getByTestId('goals-import').click()
    await expect(page.getByTestId('goals-import-modal')).toBeVisible()
    await expect(page.getByTestId('goals-import-sample')).toBeVisible()
    await expect(page.getByTestId('goals-import-file')).toBeVisible()
    await page.getByText('بستن').click()

    // صفحه مانیتورینگ جدا — وضعیت همیشه فعال + صفحه‌بندی کاربران
    await page.goto('/dashboard/senior-manager/goals-monitor')
    await expect(page.getByTestId('goals-monitor-page')).toBeVisible()
    await expect(page.getByTestId('goals-monitor-status')).toBeEnabled()
    await expect(page.getByTestId('goals-monitor-users-meta')).toContainText(/کاربر/, { timeout: 15000 })

    const page1Count = await page.locator('[data-testid^="goals-monitor-pick-"]').count()
    expect(page1Count).toBeGreaterThan(0)
    expect(page1Count).toBeLessThanOrEqual(15)

    await page.getByTestId('goals-monitor-search').fill('09125555555')
    await expect(page.getByTestId(`goals-monitor-pick-${target!.user_id}`)).toBeVisible({ timeout: 10000 })
    await page.getByTestId(`goals-monitor-pick-${target!.user_id}`).click()
    await expect(page.getByTestId('goals-monitor-selected')).toBeVisible()
    await expect(page.getByTestId('goals-monitor-analytics')).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('goals-monitor-stat-cards')).toBeVisible()
    await expect(page.getByTestId('goals-monitor-bar-chart')).toBeVisible()
    await expect(page.getByTestId('goals-monitor-pct-chart')).toBeVisible()
    await page.getByTestId('goals-monitor-status').selectOption('')
    const anyCard = page.locator('[data-testid^="goal-item-"]').first()
    if (await anyCard.count()) {
      await expect(anyCard.locator('.badge').first()).toBeVisible()
      const badgeText = (await anyCard.locator('.badge').first().innerText()).trim()
      expect(['آزاد', 'در حال انجام', 'انجام‌شده', 'انجام‌نشده']).toContain(badgeText)
      // فیلدهای تماس تمام‌عرض و بدون سه‌نقطه
      await expect(anyCard.getByText('شماره تماس', { exact: true })).toBeVisible()
      await expect(anyCard.getByText('شماره موبایل', { exact: true })).toBeVisible()
    }
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.getByTestId('goals-monitor-sidebar')).toBeVisible()
    await expect(page.getByTestId('goals-monitor-selected')).toBeVisible()
    await page.setViewportSize({ width: 1280, height: 800 })

    await page.evaluate(() => localStorage.clear())
    await login(page, '09125555555')

    const roleSelect = page.locator('header select, select').first()
    if (await roleSelect.count()) {
      const options = await roleSelect.locator('option').allTextContents()
      const repIdx = options.findIndex((t) => t.includes('نماینده') && !t.includes('معرف'))
      if (repIdx >= 0) {
        await roleSelect.selectOption({ index: repIdx })
        await page.waitForTimeout(600)
      }
    }

    const path = page.url().includes('representative-referrer')
      ? '/dashboard/representative-referrer/goals-bank'
      : '/dashboard/representative/goals-bank'
    await page.goto(path)
    await expect(page.getByTestId('goals-bank-page')).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId('goals-assign')).toBeVisible()

    const repToken = await apiToken(page)
    const repMine = await request.get('http://127.0.0.1:8000/api/goals/bank?scope=mine', {
      headers: { Authorization: `Bearer ${repToken}`, Accept: 'application/json' },
    })
    if (repMine.ok()) {
      const body = await repMine.json()
      for (const item of body.data as Array<{ id: number; status: string }>) {
        if (item.status === 'in_progress') {
          await request.post(`http://127.0.0.1:8000/api/goals/bank/${item.id}/fail`, {
            headers: { Authorization: `Bearer ${repToken}`, Accept: 'application/json' },
            data: { failure_reason: 'پاکسازی خودکار قبل از سناریوی اصلی' },
          })
        }
      }
      await page.reload()
      await expect(page.getByTestId('goals-assign')).toBeVisible()
    }

    await page.getByTestId('goals-assign').click()
    await expect(page.locator('[data-testid^="goal-complete-"]')).toHaveCount(2, { timeout: 15000 })

    const completeBtns = page.locator('[data-testid^="goal-complete-"]')
    const idA = (await completeBtns.nth(0).getAttribute('data-testid'))!.replace('goal-complete-', '')
    const idB = (await completeBtns.nth(1).getAttribute('data-testid'))!.replace('goal-complete-', '')
    expect(idA).not.toEqual(idB)

    await page.locator(`[data-testid="goal-complete-${idA}"]`).click()
    await page.getByTestId('goals-dispose-text').fill('گزارش کار تستی انجام شد با موفقیت.')
    await page.getByTestId('goals-dispose-submit').click()
    await expect(page.locator('[role="dialog"]')).toHaveCount(0, { timeout: 15000 })

    const failRes = await request.post(`http://127.0.0.1:8000/api/goals/bank/${idB}/fail`, {
      headers: { Authorization: `Bearer ${repToken}`, Accept: 'application/json' },
      data: { failure_reason: 'مخاطب پاسخگو نبود و تماس برقرار نشد.' },
    })
    expect(failRes.ok()).toBeTruthy()
    await page.reload()
    await expect(page.getByTestId('goals-assign')).toBeEnabled({ timeout: 10000 })

    await page.getByTestId('goals-assign').click()
    await expect(page.locator('[data-testid^="goal-complete-"]').first()).toBeVisible({ timeout: 10000 })
  })

  test('user without access sees blocked state on goals bank', async ({ page, request }) => {
    await login(page, '09121111111')
    const seniorToken = await apiToken(page)
    const accessRes = await request.get('http://127.0.0.1:8000/api/goals/access?search=09123333333', {
      headers: { Authorization: `Bearer ${seniorToken}`, Accept: 'application/json' },
    })
    expect(accessRes.ok()).toBeTruthy()
    const accessJson = await accessRes.json()
    const target = (accessJson.data as Array<{
      user_id: number
      mobile: string
      max_concurrent: number
      roles: Array<{ role_id: number }>
    }>).find((row) => row.mobile === '09123333333')
    expect(target).toBeTruthy()
    await request.post('http://127.0.0.1:8000/api/goals/access', {
      headers: { Authorization: `Bearer ${seniorToken}`, Accept: 'application/json' },
      data: {
        user_id: target!.user_id,
        enabled: false,
        max_concurrent: target!.max_concurrent || 10,
        role_id: target!.roles[0]?.role_id,
      },
    })

    await page.evaluate(() => localStorage.clear())
    await login(page, '09123333333')
    await page.goto('/dashboard/sales-manager/goals-bank')
    await expect(page.getByTestId('goals-bank-page')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('دسترسی ندارید')).toBeVisible({ timeout: 10000 })
  })

  test('rep scope labels distinguish current batch vs history', async ({ page, request }) => {
    await login(page, '09121111111')
    const seniorToken = await apiToken(page)
    const accessRes = await request.get('http://127.0.0.1:8000/api/goals/access?search=09125555555', {
      headers: { Authorization: `Bearer ${seniorToken}`, Accept: 'application/json' },
    })
    const accessJson = await accessRes.json()
    const target = (accessJson.data as Array<{ user_id: number; mobile: string; roles: Array<{ role_id: number }> }>)
      .find((row) => row.mobile === '09125555555')
    await request.post('http://127.0.0.1:8000/api/goals/access', {
      headers: { Authorization: `Bearer ${seniorToken}`, Accept: 'application/json' },
      data: {
        user_id: target!.user_id,
        enabled: true,
        max_concurrent: 2,
        province: 'تهران',
        city: 'تهران',
        role_id: target!.roles[0]?.role_id,
      },
    })

    await page.evaluate(() => localStorage.clear())
    await login(page, '09125555555')
    const roleSelect = page.locator('header select, select').first()
    if (await roleSelect.count()) {
      const options = await roleSelect.locator('option').allTextContents()
      const repIdx = options.findIndex((t) => t.includes('نماینده') && !t.includes('معرف'))
      if (repIdx >= 0) {
        await roleSelect.selectOption({ index: repIdx })
        await page.waitForTimeout(600)
      }
    }
    const path = page.url().includes('representative-referrer')
      ? '/dashboard/representative-referrer/goals-bank'
      : '/dashboard/representative/goals-bank'
    await page.goto(path)
    await expect(page.getByTestId('goals-scope')).toBeVisible({ timeout: 15000 })
    const labels = await page.getByTestId('goals-scope').locator('option').allTextContents()
    expect(labels.some((t) => t.includes('نوبت جاری'))).toBeTruthy()
    expect(labels.some((t) => t.includes('تاریخچه'))).toBeTruthy()
    expect(labels.some((t) => t.includes('همه وضعیت'))).toBeTruthy()
  })
})
