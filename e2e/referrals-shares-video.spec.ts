import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const backendRoot = path.resolve(__dirname, '../../MLM-Backend')
const WEBHOOK_SECRET = 'finopal-local-webhook-secret'
const PASSWORD = 'Password123!'

test.describe.configure({ mode: 'serial' })
test.use({
  video: 'on',
  viewport: { width: 1440, height: 900 },
})

async function login(page: Page, mobile: string, role: string) {
  await page.goto('/login')
  await page.evaluate(() => {
    localStorage.removeItem('finopal.token')
    localStorage.clear()
  })
  await page.goto('/login')
  await expect(page.getByTestId('login-mobile')).toBeVisible({ timeout: 20_000 })
  await page.getByTestId('login-mobile').fill(mobile)
  await page.getByTestId('login-password').fill(PASSWORD)
  await page.getByTestId('login-submit').click()
  await expect(page).not.toHaveURL(/\/login$/, { timeout: 20_000 })

  const token = await page.evaluate(() => localStorage.getItem('finopal.token'))
  expect(token).toBeTruthy()
  const switched = await page.request.post('http://127.0.0.1:8000/api/auth/switch-role', {
    headers: { Authorization: `Bearer ${token}` },
    data: { role_slug: role },
  })
  expect(switched.ok(), await switched.text()).toBeTruthy()

  const dash = `/dashboard/${role.replaceAll('_', '-')}`
  await page.goto(dash)
  await page.reload()
  await expect(page).toHaveURL(new RegExp(dash.replaceAll('/', '\\/')))
  const switcher = page.getByTestId('role-switcher')
  if (await switcher.count()) {
    await expect(switcher).toHaveValue(role)
  }
}

async function pauseForViewer(page: Page, ms = 1200) {
  await page.waitForTimeout(ms)
}

async function postWebhook(request: APIRequestContext, merchantId: string, authority: string) {
  const res = await request.post('http://127.0.0.1:8000/api/webhooks/finopal/transaction', {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Finopal-Webhook-Secret': WEBHOOK_SECRET,
    },
    data: {
      event: 'transaction.verified',
      merchant_id: merchantId,
      authority,
      order_id: `e2e-${authority}`,
      amount: 1000000,
      profit: 100000,
      currency: 'IRT',
      status: 'OK',
      code: 100,
    },
  })
  expect(res.ok(), await res.text()).toBeTruthy()
  const body = await res.json()
  expect(body.success).toBeTruthy()
  expect(body.duplicate).toBeFalsy()
  return body
}

test('سناریوی کامل معرف + لینک اشتراکی + تقسیم پورسانت چندلایه', async ({ page, request }) => {
  test.setTimeout(300_000)

  execFileSync('php', ['artisan', 'finopal:seed-webhook-demo'], {
    cwd: backendRoot,
    stdio: 'pipe',
    encoding: 'utf8',
  })

  // 1) مدیر توسعه — صفحه معرف و لینک اشتراکی
  await login(page, '09122222222', 'development_manager')
  await page.goto('/dashboard/development-manager/referrals')
  await expect(page.getByTestId('referral-code')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId('shared-links')).toBeVisible()
  await expect(page.getByRole('heading', { name: /معرف و لینک اشتراکی/ })).toBeVisible()
  await pauseForViewer(page, 2000)

  // 2) نماینده معرف — کد معرف و معرفی‌شده‌ها
  await login(page, '09124444444', 'representative_referrer')
  await page.goto('/dashboard/representative-referrer/referrals')
  await expect(page.getByTestId('referral-code')).toContainText(/REF/i)
  await expect(page.locator('main')).toContainText(/نماینده اصلی|09125555555|اشتراکی/)
  await pauseForViewer(page, 2000)

  // 3) ساخت لینک اشتراکی ۵۰-۵۰ از UI مدیر ارشد (دایرکتوری کامل)
  await login(page, '09121111111', 'senior_manager')
  await page.goto('/dashboard/senior-manager/referrals')
  await page.getByRole('button', { name: 'لینک اشتراکی جدید' }).click()
  await expect(page.getByText('اعضای لینک و سهم‌ها')).toBeVisible()

  async function pickShareMember(rowIndex: number, mobile: string) {
    const row = page.locator('.grid.sm\\:grid-cols-\\[1fr_120px_auto\\]').nth(rowIndex)
    const trigger = row.locator('button.input').first()
    await trigger.click()
    const panel = row.locator('.absolute')
    await expect(panel).toBeVisible()
    await panel.locator('input').fill(mobile)
    await panel.locator('button').filter({ hasText: mobile }).click()
    await expect(trigger).toContainText(mobile, { timeout: 10_000 })
  }

  await pickShareMember(0, '09127777777')
  await pickShareMember(1, '09128888888')
  await pauseForViewer(page, 1000)
  await page.getByRole('button', { name: 'ایجاد و ارسال تاییدیه' }).click()
  await expect(page.getByTestId('shared-links')).toContainText(/نماینده اشتراکی الف|نماینده اشتراکی ب/)
  await expect(page.getByTestId('shared-links')).toContainText(/در انتظار|منتظر|pending/i)
  await pauseForViewer(page, 1800)

  // 4) تایید سهم توسط هر دو نماینده در UI
  await login(page, '09127777777', 'representative')
  await page.goto('/dashboard/representative/referrals')
  await page.getByRole('button', { name: 'تایید سهم من' }).first().click()
  await pauseForViewer(page, 1200)

  await login(page, '09128888888', 'representative')
  await page.goto('/dashboard/representative/referrals')
  await page.getByRole('button', { name: 'تایید سهم من' }).first().click()
  await expect(page.getByTestId('shared-links')).toContainText(/فعال|active/i)
  await pauseForViewer(page, 1800)

  // 5) وب‌هوک تراکنش‌ها برای سه مرچنت تستی
  const stamp = Date.now()
  const solo = await postWebhook(request, 'fino-seed-solo-0001', `FP_E2E_SOLO_${stamp}`)
  const share = await postWebhook(request, 'fino-seed-share-0001', `FP_E2E_SHARE_${stamp}`)
  const multib = await postWebhook(request, 'fino-seed-multib-0001', `FP_E2E_MULTIB_${stamp}`)
  expect(solo.commissions).toBeGreaterThanOrEqual(5)
  expect(share.commissions).toBeGreaterThanOrEqual(5)
  expect(multib.commissions).toBeGreaterThanOrEqual(4)

  // 6) بررسی بصری پورسانت در سطوح درخت
  await login(page, '09125555555', 'representative')
  await page.goto('/dashboard/representative/commissions')
  await expect(page.getByTestId('commission-table')).toBeVisible()
  await expect(page.getByTestId('commission-table')).toContainText(/15.?000|۱۵.?۰۰۰/, { timeout: 20_000 })
  await page.goto('/dashboard/representative/wallet')
  await expect(page.getByTestId('role-wallet').first()).toBeVisible()
  await pauseForViewer(page, 1500)

  await login(page, '09124444444', 'representative_referrer')
  await page.goto('/dashboard/representative-referrer/commissions')
  await expect(page.getByTestId('commission-table')).toContainText(/2.?000|۲.?۰۰۰/, { timeout: 20_000 })
  await pauseForViewer(page, 1500)

  await login(page, '09127777777', 'representative')
  await page.goto('/dashboard/representative/commissions')
  await expect(page.getByTestId('commission-table')).toContainText(/7.?500|۷.?۵۰۰/, { timeout: 20_000 })
  await pauseForViewer(page, 1500)

  await login(page, '09128888888', 'representative')
  await page.goto('/dashboard/representative/commissions')
  await expect(page.getByTestId('commission-table')).toContainText(/7.?500|۷.?۵۰۰/, { timeout: 20_000 })
  await pauseForViewer(page, 1500)

  await login(page, '09120202020', 'representative')
  await page.goto('/dashboard/representative/commissions')
  await expect(page.getByTestId('commission-table')).toContainText(/15.?000|۱۵.?۰۰۰/, { timeout: 20_000 })
  await pauseForViewer(page, 1500)

  await login(page, '09123333333', 'sales_manager')
  await page.goto('/dashboard/sales-manager/commissions')
  await expect(page.getByTestId('commission-table')).toContainText(/6.?000|۶.?۰۰۰/, { timeout: 20_000 })
  await pauseForViewer(page, 1500)

  await login(page, '09122222222', 'development_manager')
  await page.goto('/dashboard/development-manager/commissions')
  await expect(page.getByTestId('commission-table')).toContainText(/4.?500|۴.?۵۰۰/, { timeout: 20_000 })
  await page.goto('/dashboard/development-manager/referrals')
  await expect(page.getByTestId('referral-code')).toBeVisible()
  await pauseForViewer(page, 1800)

  await login(page, '09121111111', 'senior_manager')
  await page.goto('/dashboard/senior-manager/commissions')
  await expect(page.getByTestId('commission-table')).toContainText(/4.?000|۴.?۰۰۰/, { timeout: 20_000 })
  await page.goto('/dashboard/senior-manager/wallet')
  await expect(page.getByTestId('role-wallet').first()).toBeVisible()
  await pauseForViewer(page, 2200)
})
